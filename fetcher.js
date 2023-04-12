const { default: axios } = require('axios');
const moment = require('moment/moment');
const schedule = require('node-schedule');
let Parser = require('rss-parser');
const Article = require('./models/article');
let parser = new Parser();
let Configuration = require("openai").Configuration;

let fetchData = async function(){
  console.log('scheduler started at ' + new Date())

  let feed = await parser.parseURL('https://www.derstandard.at/rss');

  console.log(feed.items?.length + ' feed items fetched')
  
  if (feed.items?.length >= 1) for (let [i, item] of feed.items.entries()) {
    try {
      if (item.link) {
        let data = {
          source: 'Standard'
        }
  
        if (item.title) data.title = item.title
        if (item.link) data.link = item.link.replace('?ref=rss', '')
        if (item.isoDate) data.publishedAt = moment(new Date(item.isoDate)).unix()

        let nowMinusOneDay = moment(new Date()).subtract(1, 'days').unix()

        if (data.publishedAt < nowMinusOneDay) continue;
  
        if (item.categories) data.categories = item.categories.map(cat => `sta_${cat._}`)
        else data.categories = []
  
        let count = await Article.count({title: data.title})

        if (count === 0) {
          let html = await axios.get(item.link)
          if (html) {
            let body = html.data.split('</head>').at(-1)
    
            let prompt = `
              Füge den Artikel von der folgenden HTML-Seite in 4-6 Sätzen auf Deutsch zusammen. Erwähne Fotos dabei nicht.
    
              ${body}
            `
    
            let request = {
              "model": "text-davinci-003", 
              prompt, 
              "temperature": 0, 
              "max_tokens": 2049,
            }
    
            await axios.post('https://api.openai.com/v1/completions', request, {headers: {Authorization: `Bearer ${process.env.OPENAI_API_KEY}`}})
            .then(res => {
              console.log('new openai request:', res.data)
              if (res.data?.choices && res.data.choices[0] && res.data.choices[0].text) {
                let text = res.data.choices[0].text
                text = text.replaceAll('\r\n', '')
                data.text = text
              }
            })
            .catch(err => {
              console.log('err', err)
            })
          }
        }

        if (data.source && data.title && data.link && data.publishedAt && data.categories && data.text) {
          await Article.create(data)
          .then((article) => {
            console.log('new article created:', article.title)
          })
          .catch(err => console.log(err))
          
        }
      }
    } catch(e) {
      console.log('catch:', e)
    }
  }

  setTimeout(() => {
    fetchData()
    return
  }, 60000) // wait one minute for next fetch
};

module.exports = fetchData()