// models/productModel.js
const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, 'Too short product title'],
      maxlength: [100, 'Too long product title'],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      minlength: [20, 'Too short product description'],
    },
    quantity: {
      type: Number,
      required: [true, 'Product quantity is required'],
    },
    sold: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      trim: true,
      max: [200000, 'Too long product price'],
    },
    priceAfterDiscount: {
      type: Number,
    },
    // ✅ إضافة حقل محسوب للسعر الفعلي
    finalPrice: {
      type: Number,
    },
    colors: {
      type: [String],
    },
    sizes: {
      type: [String],
    },
    imageCover: {
      type: String,
      required: [true, 'Product Image cover is required'],
    },
    images: [String],
    category: {
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
      required: [true, 'Product must be belong to category'],
    },
    subcategories: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'SubCategory',
      },
    ],
    brand: {
      type: mongoose.Schema.ObjectId,
      ref: 'Brand',
    },
    ratingsAverage: {
      type: Number,
      min: [1, 'Rating must be above or equal 1.0'],
      max: [5, 'Rating must be below or equal 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// ✅ Middleware: حساب السعر النهائي قبل الحفظ
productSchema.pre('save', function (next) {
  this.finalPrice = this.priceAfterDiscount || this.price
  next()
})

// ✅ Middleware: تحديث السعر النهائي عند التعديل
productSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate()
  if (update.price || update.priceAfterDiscount !== undefined) {
    update.finalPrice = update.priceAfterDiscount || update.price
  }
  next()
})


productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id',
})

// Mongoose query middleware
productSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'category',
    select: 'name',
  }).populate({
    path: 'subcategories',
    select: 'name',
  })

  next()
})

const setImageURL = (doc) => {
  if (doc.imageCover) {
    if (!doc.imageCover.startsWith('http')) {
      const imageUrl = `${process.env.BASE_URL}/products/${doc.imageCover}`
      doc.imageCover = imageUrl
    }
  }

  if (doc.images) {
    const imagesList = []
    doc.images.forEach((image) => {
      if (!image.startsWith('http')) {
        const imageUrl = `${process.env.BASE_URL}/products/${image}`
        imagesList.push(imageUrl)
      } else {
        imagesList.push(image)
      }
    })
    doc.images = imagesList
  }
}


productSchema.post('init', (doc) => {
  setImageURL(doc)
})

productSchema.post('save', (doc) => {
  setImageURL(doc)
})

module.exports = mongoose.model('Product', productSchema)