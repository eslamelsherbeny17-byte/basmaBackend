// utils/apiFeatures.js
class ApiFeatures {
  constructor(mongooseQuery, queryString) {
    this.mongooseQuery = mongooseQuery;
    this.queryString = queryString;
  }

  filter() {
    const queryStringObj = { ...this.queryString };
    const excludesFields = ['page', 'sort', 'limit', 'fields', 'keyword'];
    excludesFields.forEach((field) => delete queryStringObj[field]);

    // تحويل gte, gt إلى $gte, $gt
    let queryStr = JSON.stringify(queryStringObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // ✅ تحويل سعر البحث إلى finalPrice
    queryStr = queryStr.replace(/\bprice\b/g, 'finalPrice');

    const finalFilters = JSON.parse(queryStr);

    // ✅ إضافة منطق خاص للـ Flash Sale (المنتجات التي لديها خصم حقيقي)
    // إذا أرسل الفرونت إند ?isDiscounted=true
    if (this.queryString.isDiscounted === 'true') {
      finalFilters.priceAfterDiscount = { $gt: 0 };
      // نستخدم $expr لمقارنة حقلين ببعضهما (السعر بعد الخصم أقل من السعر الأصلي)
      this.mongooseQuery = this.mongooseQuery.find({
        $and: [
          finalFilters,
          { $expr: { $lt: ["$priceAfterDiscount", "$price"] } }
        ]
      });
    } else {
      this.mongooseQuery = this.mongooseQuery.find(finalFilters);
    }

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      const finalSortBy = sortBy.replace(/\bprice\b/g, 'finalPrice');
      this.mongooseQuery = this.mongooseQuery.sort(finalSortBy);
    } else {
      this.mongooseQuery = this.mongooseQuery.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.mongooseQuery = this.mongooseQuery.select(fields);
    } else {
      this.mongooseQuery = this.mongooseQuery.select('-__v');
    }
    return this;
  }

  search(modelName) {
    if (this.queryString.keyword) {
      let query = {};
      if (modelName === 'Products') {
        query.$or = [
          { title: { $regex: this.queryString.keyword, $options: 'i' } },
          { description: { $regex: this.queryString.keyword, $options: 'i' } },
        ];
      } else {
        query = { name: { $regex: this.queryString.keyword, $options: 'i' } };
      }
      this.mongooseQuery = this.mongooseQuery.find(query);
    }
    return this;
  }

  paginate(countDocuments) {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 50;
    const skip = (page - 1) * limit;
    const endIndex = page * limit;

    const pagination = {};
    pagination.currentPage = page;
    pagination.limit = limit;
    pagination.numberOfPages = Math.ceil(countDocuments / limit);

    if (endIndex < countDocuments) {
      pagination.next = page + 1;
    }
    if (skip > 0) {
      pagination.prev = page - 1;
    }
    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);
    this.paginationResult = pagination;
    return this;
  }
}

module.exports = ApiFeatures;