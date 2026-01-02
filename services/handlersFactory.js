const asyncHandler = require('express-async-handler')
const ApiError = require('../utils/apiError')
const ApiFeatures = require('../utils/apiFeatures')

// ✅ دالة الحذف المعدلة
exports.deleteOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const { id } = req.params

    // 1. الحذف المباشر من قاعدة البيانات
    const document = await Model.findByIdAndDelete(id)

    // 2. لو مفيش منتج بالرقم ده
    if (!document) {
      return next(new ApiError(`No document for this id ${id}`, 404))
    }

    // ❌ تم حذف السطر المسبب للمشكلة: document.remove();

    // 3. إرسال رد النجاح (204 No Content)
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
    // Trigger "save" event when update document
    document.save()
    res
      .status(200)
      .json({ status: 200, messsage: 'Updated successfully', data: document })
  })

exports.createOne = (Model) =>
  asyncHandler(async (req, res) => {
    const newDoc = await Model.create(req.body)
    res
      .status(201)
      .json({ status: 200, messsage: 'Created successfully', data: newDoc })
  })

exports.getOne = (Model, populationOpt) =>
  asyncHandler(async (req, res, next) => {
    const { id } = req.params
    // 1) Build query
    let query = Model.findById(id)
    if (populationOpt) {
      query = query.populate(populationOpt)
    }

    // 2) Execute query
    const document = await query

    if (!document) {
      return next(new ApiError(`No document for this id ${id}`, 404))
    }
    res
      .status(200)
      .json({ status: 200, messsage: ' getted successfully', data: document })
  })

exports.getAll = (Model, modelName = '') =>
  asyncHandler(async (req, res) => {
    let filter = {}
    if (req.filterObj) {
      filter = req.filterObj
    }

    // 1) بناء الاستعلام (بدون تنفيذ)
    const documentsCounts = await Model.countDocuments()
    
    // ✅ الترتيب الصحيح: الفلترة والبحث والترتيب أولاً، ثم التقسيم أخيراً
    const apiFeatures = new ApiFeatures(Model.find(filter), req.query)
      .filter()      // 1. فلترة (مثلاً حسب القسم)
      .search(modelName) // 2. بحث (بالكلمة المفتاحية)
      .sort()        // 3. ترتيب (هنا سيتم ترتيب الـ sold)
      .limitFields() // 4. اختيار الحقول
      .paginate(documentsCounts) // 5. التقسيم (هنا سيتم تطبيق limit: 4)

    // 2) تنفيذ الاستعلام بعد بناء كل الخصائص
    const { mongooseQuery, paginationResult } = apiFeatures
    const documents = await mongooseQuery

    res.status(200).json({
      status: 200,
      results: documents.length,
      paginationResult,
      data: documents,
    })
  })