const stripe = require("stripe")(
  "sk_test_51QJabJHCDjFVghwlSpM4Ia9VMRPRT5LbQJMNRTGVR2p9ms9jFF8BJwtjN2OlxR7MVHdwPBh0Ux9pWYGpVqRdSKbJ00E7Xb2HjB"
);
const asyncHandler = require("express-async-handler");
const factory = require("./handlersFactory");
const ApiError = require("../utils/apiError");

const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");

// @desc    create cash order
// @route   POST /api/v1/orders/cartId
// @access  Protected/User
exports.createCashOrder = asyncHandler(async (req, res, next) => {
  // app settings
  const taxPrice = 0;
  const shippingPrice = 0;

  // 1) Get cart depend on cartId
  const cart = await Cart.findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no such cart with id ${req.params.cartId}`, 404)
    );
  }

  // 2) Get order price depend on cart price "Check if coupon apply"
  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;

  const totalOrderPrice = cartPrice + taxPrice + shippingPrice;

  // 3) Create order with default paymentMethodType cash
  const order = await Order.create({
    user: req.user._id,
    cartItems: cart.cartItems,
    shippingAddress: req.body.shippingAddress,
    totalOrderPrice,
  });

  // 4) After creating order, decrement product quantity, increment product sold
  if (order) {
    const bulkOption = cart.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
      },
    }));
    await Product.bulkWrite(bulkOption, {});

    // 5) Clear cart depend on cartId
    await Cart.findByIdAndDelete(req.params.cartId);
  }

  res.status(201).json({ status: 200, message: "Order created", data: order });
});

exports.filterOrderForLoggedUser = asyncHandler(async (req, res, next) => {
  if (req.user.role === "user") req.filterObj = { user: req.user._id };
  next();
});
// @desc    Get all orders
// @route   POST /api/v1/orders
// @access  Protected/User-Admin-Manager
exports.findAllOrders = factory.getAll(Order);

// @desc    Get all orders
// @route   POST /api/v1/orders
// @access  Protected/User-Admin-Manager
exports.findSpecificOrder = factory.getOne(Order);

// @desc    Update order paid status to paid
// @route   PUT /api/v1/orders/:id/pay
// @access  Protected/Admin-Manager
exports.updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(
      new ApiError(
        `There is no such a order with this id:${req.params.id}`,
        404
      )
    );
  }

  // update order to paid
  order.isPaid = true;
  order.paidAt = Date.now();

  const updatedOrder = await order.save();

  res
    .status(200)
    .json({ status: 200, message: "Order paid", data: updatedOrder });
});
// ✅ أضف هذه الدالة الجديدة لتحديث حالة الطلب
// @desc    Update order status (pending, shipped, etc)
// @route   PUT /api/v1/orders/:id/status
// @access  Protected/Admin-Manager
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new ApiError(`No order found with id ${req.params.id}`, 404));
  }

  order.status = req.body.status;
  
  // تحديث الحقول المساعدة تلقائياً
  if (req.body.status === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
  }

  const updatedOrder = await order.save();
  res.status(200).json({ status: 200, data: updatedOrder });
});
// @desc    Update order delivered status
// @route   PUT /api/v1/orders/:id/deliver
// @access  Protected/Admin-Manager
exports.updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(
      new ApiError(
        `There is no such a order with this id:${req.params.id}`,
        404
      )
    );
  }

  // update order to paid
  order.isDelivered = true;
  order.deliveredAt = Date.now();

  const updatedOrder = await order.save();

  res
    .status(200)
    .json({ status: 200, message: "Order delivered", data: updatedOrder });
});

// @desc    Get checkout session from stripe and send it as response
// @route   GET /api/v1/orders/checkout-session/cartId
// @access  Protected/User
exports.checkoutSession = asyncHandler(async (req, res, next) => {
  // app settings
  const taxPrice = 0;
  const shippingPrice = 0;

  // 1) Get cart depend on cartId
  const cart = await Cart.findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no such cart with id ${req.params.cartId}`, 404)
    );
  }

  // 2) Get order price depend on cart price "Check if coupon apply"
  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;

  const totalOrderPrice = cartPrice + taxPrice + shippingPrice;

  // 3) Create stripe checkout session
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "egp",
          product_data: {
            name: "Total Order Price",
          },
          unit_amount: totalOrderPrice * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${req.protocol}://${req.get("host")}/orders`,
    cancel_url: `${req.protocol}://${req.get("host")}/cart`,
    customer_email: req.user.email,
    client_reference_id: req.params.cartId,
    metadata: req.body.shippingAddress,
  });

  // 4) send session to response
  res
    .status(200)
    .json({ status: 200, message: "Checkout session created", session });
});

const createCardOrder = async (session, next) => {
  try {
    console.log("Session data:", session);

    const cartId = session.client_reference_id;
    console.log("Cart ID:", cartId);

    const shippingAddress = session.metadata;
    const orderPrice = session.amount_total / 100;
    const customerEmail = session.customer_email;
    console.log("Customer email:", customerEmail);

    if (!cartId || !customerEmail) {
      console.error("Missing necessary data for creating order.");
      return;
    }

    const cart = await Cart.findById(cartId);
    console.log("Cart found:", cart);

    const user = await User.findOne({ email: customerEmail });
    console.log("User found:", user);

    if (!cart) {
      console.error("Cart not found");
      return next(new ApiError("Cart not found", 404));
    }

    if (!user) {
      console.error("User not found for email:", customerEmail);
      return next(new ApiError("User not found", 404));
    }

    const order = await Order.create({
      user: user._id,
      cartItems: cart.cartItems,
      shippingAddress,
      totalOrderPrice: orderPrice,
      isPaid: true,
      paidAt: Date.now(),
      paymentMethodType: "Card",
    });

    console.log("Order created:", order);

    if (order) {
      const bulkOption = cart.cartItems.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
        },
      }));

      await Product.bulkWrite(bulkOption, {});
      await Cart.findByIdAndDelete(cart._id);

      console.log("Order processed successfully");
    }
  } catch (error) {
    console.error("Error creating order:", error);
  }
};

exports.webhookCheckout = asyncHandler(async (req, res, next) => {
  console.log("Webhook received:", req.body);

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      "whsec_aXLBoL23HaAs6IiTWNqYKnPmmvho5mHW"
    );
    console.log("Webhook verified:", event.id);
  } catch (err) {
    console.log("Webhook Error:", err.message);
    return res
      .status(400)
      .send(`Webhook Error-------------------------: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    console.log("Webhook completed -------:");
    await createCardOrder(event.data.object, next);
  }

  res
    .status(200)
    .json({ status: 200, message: "Checkout session created", received: true });
});

// new