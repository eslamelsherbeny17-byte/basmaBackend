// controllers/handlersFactory.js
const asyncHandler = require('express-async-handler')
const ApiError = require('../utils/apiError')
const ApiFeatures = require('../utils/apiFeatures')

exports.getAll = (Model, modelName = '') =>
  asyncHandler(async (req, res) => {
    let filter = {};
    if (req.filterObj) { filter = req.filterObj; }
    if (req.params.categoryId) { filter = { category: req.params.categoryId }; }

    // 1) حساب العدد الحقيقي بناءً على الفلاتر المدخلة (لحل مشكلة الصفحات الزائدة)
    const countFeatures = new ApiFeatures(Model.find(filter), req.query)
      .filter()
      .search(modelName);
    const documentsCounts = await countFeatures.mongooseQuery.countDocuments();

    // 2) جلب البيانات الفعلية
    const apiFeatures = new ApiFeatures(Model.find(filter), req.query)
      .filter()
      .search(modelName)
      .sort()
      .limitFields()
      .paginate(documentsCounts);

    const { mongooseQuery, paginationResult } = apiFeatures;
    const documents = await mongooseQuery;

    res.status(200).json({
      status: 200,
      results: documents.length,
      paginationResult,
      data: documents,
    });
  });
// الدوال الأخرى (deleteOne, updateOne, createOne, getOne) تبقى كما هي في كودك الأصلي
exports.deleteOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const document = await Model.findByIdAndDelete(id);
    if (!document) { return next(new ApiError(`No document for this id ${id}`, 404)); }
    res.status(204).send();
  });

exports.updateOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!document) { return next(new ApiError(`No document for this id ${req.params.id}`, 404)); }
    document.save();
    res.status(200).json({ status: 200, messsage: 'Updated successfully', data: document });
  });

exports.createOne = (Model) =>
  asyncHandler(async (req, res) => {
    const newDoc = await Model.create(req.body);
    res.status(201).json({ status: 200, messsage: 'Created successfully', data: newDoc });
  });

exports.getOne = (Model, populationOpt) =>
  asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    let query = Model.findById(id);
    if (populationOpt) { query = query.populate(populationOpt); }
    const document = await query;
    if (!document) { return next(new ApiError(`No document for this id ${id}`, 404)); }
    res.status(200).json({ status: 200, messsage: ' getted successfully', data: document });
  });