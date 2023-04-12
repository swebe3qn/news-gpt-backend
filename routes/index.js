let express = require('express');
const Article = require('../models/article');
var router = express.Router();

router.get('/', async function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/categories', async (req, res, next) => {
  let data = await Article.find({}, {categories: 1})

  let categories = []

  data.forEach(art => art.categories.forEach(cat => {
    if (!categories.includes(cat)) categories.push(cat)
  }))

  return res.status(200).json({
    success: true,
    data: categories
  })
})

router.post('/data', async (req, res, next) => {
  let {categories, skip} = req.body
  if (categories?.length >= 1) categories = categories.map(cat => `sta_${cat}`)

  let data = await Article.find(categories?.length >= 1 ? {categories: {$in: categories}} : {}).sort({publishedAt: -1}).limit(20).skip(skip || 0)

  let totalCount = await Article.count()

  return res.status(200).json({
    success: true,
    data,
    totalCount
  })
})

module.exports = router;
