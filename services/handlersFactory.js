const asyncHandler = require('express-async-handler')
const ApiError = require('../utils/apiError')
const ApiFeatures = require('../utils/apiFeatures')

// ✅ دالة جلب الكل المصلحة تماماً
exports.getAll = (Model, modelName = '') =>
  asyncHandler(async (req, res) => {
    let filter = {}
    if (req.filterObj) {
      filter = req.filterObj
    }
    
    // لضمان عمل الأقسام المدمجة
    if (req.params.categoryId) {
      filter = { category: req.params.categoryId };
    }

    // الخطوة 1: بناء استعلام للفلترة فقط من أجل "عد" المنتجات الصحيحة
    // نستخدم clone() لكي لا نؤثر على الاستعلام الأصلي
    const countFeatures = new ApiFeatures(Model.find(filter), req.query)
      .filter()
      .search(modelName);
    
    // ✅ هنا نحصل على العدد الحقيقي للمنتجات داخل هذا القسم فقط (مثلاً 10)
    const documentsCounts = await countFeatures.mongooseQuery.countDocuments();

    // الخطوة 2: بناء الاستعلام النهائي للبيانات مع الترتيب الصحيح للعمليات
    const apiFeatures = new ApiFeatures(Model.find(filter), req.query)
      .filter()      // 1. فلترة أولاً
      .search(modelName) // 2. بحث ثانياً
      .sort()        // 3. ترتيب ثالثاً
      .limitFields() // 4. اختيار الحقول رابعاً
      .paginate(documentsCounts); // 5. تقسيم أخيراً بناءً على العدد الصحيح

    // الخطوة 3: تنفيذ الاستعلام
    const { mongooseQuery, paginationResult } = apiFeatures
    const documents = await mongooseQuery

    res.status(200).json({
      status: 200,
      results: documents.length,
      paginationResult, // الآن numberOfPages سيكون 1 إذا كان عدد المنتجات 10
      data: documents,
    })
  })

// بقية الدوال (deleteOne, updateOne, createOne, getOne) تبقى كما هي
exports.deleteOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const document = await Model.findByIdAndDelete(id)
    if (!document) {
      return next(new ApiError(`No document for this id ${id}`, 404))
    }
    res.status(204).send()
  })

exports.updateOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
    if (!document) {
      return next(new ApiError(`No document for this id ${req.params.id}`, 404))
    }
    document.save()
    res.status(200).json({ status: 200, messsage: 'Updated successfully', data: document })
  })

exports.createOne = (Model) =>
  asyncHandler(async (req, res) => {
    const newDoc = await Model.create(req.body)
    res.status(201).json({ status: 200, messsage: 'Created successfully', data: newDoc })
  })

exports.getOne = (Model, populationOpt) =>
  asyncHandler(async (req, res, next) => {
    const { id } = req.params
    let query = Model.findById(id)
    if (populationOpt) {
      query = query.populate(populationOpt)
    }
    const document = await query
    if (!document) {
      return next(new ApiError(`No document for this id ${id}`, 404))
    }
    res.status(200).json({ status: 200, messsage: ' getted successfully', data: document })
  })