const mongoose = require('mongoose')

// 1- Create Schema
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category required'],
      unique: [true, 'Category must be unique'],
      minlength: [3, 'Too short category name'],
      maxlength: [32, 'Too long category name'],
    },
    // A and B => shopping.com/a-and-b
    slug: {
      type: String,
      lowercase: true,
    },
    image: String,
    showOnHomePage: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

// ✅ التعديل هنا: التأكد من أن الصورة ليست رابط خارجي (Cloudinary)
const setImageURL = (doc) => {
  if (doc.image) {
    // لو الرابط مش بيبدأ بـ http (يعني صورة محلية)، ضيف الدومين
    if (!doc.image.startsWith('http')) {
      const imageUrl = `${process.env.BASE_URL}/categories/${doc.image}`
      doc.image = imageUrl
    }
    // لو بيبدأ بـ http (زي Cloudinary)، سيبه زي ما هو
  }
}

// findOne, findAll and update
categorySchema.post('init', (doc) => {
  setImageURL(doc)
})

// create
categorySchema.post('save', (doc) => {
  setImageURL(doc)
})

// 2- Create model
const CategoryModel = mongoose.model('Category', categorySchema)

module.exports = CategoryModel
