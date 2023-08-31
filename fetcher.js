// REFACTOR
// GOT ERROR FROM OPENAI: "This model's maximum context length is 4097 tokens, however you requested 4164 tokens (2115 in your prompt; 2049 for the completion). Please reduce your prompt; or completion length.",

const { default: axios } = require('axios');
const moment = require('moment/moment');
const schedule = require('node-schedule');
let Parser = require('rss-parser');
const Article = require('./models/article');
const { convert } = require('html-to-text');
let parser = new Parser();
let Configuration = require("openai").Configuration;

let fetchData = async function(){
  console.log('scheduler started at ' + new Date())

  let feeds = process.env.RSS_FEEDS.split(',').map(el => {
    try {
      return {
        medium: el.split('|')[0].toLowerCase(),
        url: el.split('|')[1].toLowerCase()
      }
    } catch {}
  });

  loop1: for (let feed of feeds) {
    try {
      if (feed.medium && feed.url && feed.url.startsWith('http')) {
        feed.data = await parser.parseURL(feed.url)
      }


      if (feed.data && feed.data.items?.length >= 1) {
        for (let [i, item] of feed.data.items.entries()) {
          if (item.link) {
            let data = {
              source: feed.medium
            }
      
            if (item.title) data.title = item.title
            if (item.link) data.link = item.link.replace('?ref=rss', '')
            if (item.isoDate) data.publishedAt = moment(new Date(item.isoDate)).unix()
    
            let nowMinusOneHour = moment(new Date()).subtract(1, 'hours').unix()
    
            if (data.publishedAt < nowMinusOneHour) continue;
      
            if (item.categories) data.categories = item.categories.map(cat => `${data.source}_${cat._}`)
            else data.categories = []
      
            let count = await Article.count({title: data.title})
            let latest100Articles = await Article.find({}, {title: 1}).limit(100)
            let latest100ArticlesString = latest100Articles.map(article => `${article._id}: ${article.title}`).join(', ')
    
            if (count === 0) {
              const html = await axios.get(item.link)
              if (html) {
                let body = html.data.split('</head>').at(-1)
        
                let prompt = `
                  Füge den Artikel von der folgenden HTML-Seite in maximal 5 Sätzen auf Deutsch zusammen. Bitte überlege dir auch eine neue Überschrift. Erwähne Fotos dabei nicht.
                  Bitte schreibe den Text so, dass man nicht erkennt, dass es sich um eine Zusammenfassung handelt, sondern schreibe deinen eigenen Beitrag. Ein Beispiel für Einleitungen, 
                  die du NICHT verwenden sollst: "In diesem Artikel geht es um...". 
                  
                  Bitte sieh dir auch die letzten Artikel aus unserer Datenbank an und überprüfe ob es sich bei einem davon
                  um das selbe Thema handelt, nur von einer anderen News-Seite. Wenn das der Fall ist, speichere auch bitte die Unique ID von diesem. Hier ist die Liste: ${latest100ArticlesString}
                  
                  Am Ende sollst du bitte nur Titel und Zusammenfassung in folgendem Format ausgeben: "<Überschrift>|||<Zusammenfassung>|||<Unique ID (falls vorhanden)>"
        
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
                  if (res.data?.choices && res.data.choices[0] && res.data.choices[0].text) {
                    let text = res.data.choices[0].text
                    text = text.replaceAll('\r\n', '')
                    data.text = text
                  }
                })
                .catch(e => {
                  console.log(e.response)
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
        }
      }
    } catch(e) {console.log(e.data?.error)}
  }

  setTimeout(() => {
    fetchData()
    return
  }, 60000) // wait one minute for next fetch
};

module.exports = fetchData()