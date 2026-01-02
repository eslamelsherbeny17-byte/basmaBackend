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
    
    // 1. تجميع الفلاتر (الأقسام المدمجة في الرابط)
    if (req.filterObj) {
      filter = req.filterObj
    }
    
    // 2. إذا كان هناك categoryId في الرابط (المسارات المتداخلة)
    if (req.params.categoryId) {
      filter = { category: req.params.categoryId };
    }

    // 💡 التعديل الجوهري: نمرر الـ filter داخل countDocuments
    // لكي نعد فقط المنتجات التي تنتمي للقسم المختار
    const documentsCounts = await Model.countDocuments(filter) 
    
    // 3. بناء الاستعلام باستخدام ApiFeatures
    const apiFeatures = new ApiFeatures(Model.find(filter), req.query)
      .filter()      // تفعيل الفلترة (Query Params)
      .search(modelName) 
      .sort()        
      .limitFields() 
      .paginate(documentsCounts) // الآن سيحسب الصفحات بناءً على الـ 10 منتجات فقط

    // 4. تنفيذ الاستعلام
    const { mongooseQuery, paginationResult } = apiFeatures
    const documents = await mongooseQuery

    res.status(200).json({
      status: 200,
      messsage: ' getted successfully',
      results: documents.length,
      paginationResult, // سيحتوي الآن على numberOfPages = 1
      data: documents,
    })
  })