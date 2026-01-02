// utils/apiFeatures.js
class ApiFeatures {
  constructor(mongooseQuery, queryString) {
    this.mongooseQuery = mongooseQuery;
    this.queryString = queryString;
  }

  // 1) الفلترة (Filtering)
  filter() {
    const queryStringObj = { ...this.queryString };
    // الحقول التي يجب استبعادها من عملية الفلترة المباشرة
    const excludesFields = ['page', 'sort', 'limit', 'fields', 'keyword'];
    excludesFields.forEach((field) => delete queryStringObj[field]);

    // تحويل الروابط (gte, gt, lte, lt) إلى صيغة MongoDB ($gte, $gt...)
    let queryStr = JSON.stringify(queryStringObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // ✅ استبدال "price" بـ "finalPrice" لدعم البحث بالسعر بعد الخصم
    queryStr = queryStr.replace(/\bprice\b/g, 'finalPrice');

    // تطبيق الاستعلام على Mongoose
    // نستخدم .find() هنا لدمج الفلاتر (مثل categoryId) إذا كانت موجودة مسبقاً
    this.mongooseQuery = this.mongooseQuery.find(JSON.parse(queryStr));

    return this;
  }

  // 2) الترتيب (Sorting)
  sort() {
    if (this.queryString.sort) {
      // تحويل الفاصلة إلى مسافة (مثلاً: -sold,price تصبح -sold price)
      const sortBy = this.queryString.sort.split(',').join(' ');
      
      // ✅ دعم الترتيب بـ finalPrice بدلاً من price تلقائياً
      const finalSortBy = sortBy.replace(/\bprice\b/g, 'finalPrice');
      
      this.mongooseQuery = this.mongooseQuery.sort(finalSortBy);
    } else {
      // الترتيب الافتراضي: الأحدث أولاً
      this.mongooseQuery = this.mongooseQuery.sort('-createdAt');
    }
    return this;
  }

  // 3) اختيار حقول معينة (Field Limiting)
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.mongooseQuery = this.mongooseQuery.select(fields);
    } else {
      // استبعاد حقل الـ __v الخاص بـ MongoDB افتراضياً
      this.mongooseQuery = this.mongooseQuery.select('-__v');
    }
    return this;
  }

  // 4) البحث (Search)
  search(modelName) {
    if (this.queryString.keyword) {
      let query = {};
      if (modelName === 'Products') {
        // البحث في العنوان والوصف للمنتجات
        query.$or = [
          { title: { $regex: this.queryString.keyword, $options: 'i' } },
          { description: { $regex: this.queryString.keyword, $options: 'i' } },
        ];
      } else {
        // البحث بالاسم للفئات أو الماركات
        query = { name: { $regex: this.queryString.keyword, $options: 'i' } };
      }
      this.mongooseQuery = this.mongooseQuery.find(query);
    }
    return this;
  }

  // 5) التقسيم (Pagination)
  paginate(countDocuments) {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 50;
    const skip = (page - 1) * limit;
    const endIndex = page * limit;

    // نتائج التقسيم (تفيد الفرونت إند في عد الصفحات)
    const pagination = {};
    pagination.currentPage = page;
    pagination.limit = limit;
    pagination.numberOfPages = Math.ceil(countDocuments / limit);

    // هل توجد صفحة تالية؟
    if (endIndex < countDocuments) {
      pagination.next = page + 1;
    }
    // هل توجد صفحة سابقة؟
    if (skip > 0) {
      pagination.prev = page - 1;
    }

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);
    this.paginationResult = pagination;

    return this;
  }
}

module.exports = ApiFeatures;