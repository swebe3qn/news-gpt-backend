var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ArticleSchema = new Schema({
    source: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    link: {
        type: String,
        required: true,
        trim: true
    },
    publishedAt: {
        type: Number,
        required: true,
    },
    categories: {
        type: [String],
        required: true,
        trim: true,
        default: []
    },
},
{
    timestamps: true
});

var Article = mongoose.model('Article', ArticleSchema);

module.exports = Article;
