const express = require("express");
const { protect } = require('./middleware/auth')
const EventModel = require('./models/Events')
require("dotenv").config({ path: "./.env" });
const errorHandler = require("./middleware/error");
const session = require("express-session");
const connectDB = require("./config/db");
const axios = require('axios')
const { Telegraf, Markup } = require('telegraf')
const dotenv = require('dotenv')
const cheerio = require('cheerio');

const {
  app, serve, io
} = require('./config/app.config')
const cors = require("cors");
const User = require("./models/User");

dotenv.config()

const bot = new Telegraf(process.env.TEL_BOT_TOKEN);


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true },
  })
);



app.get("/", (req, res, next) => {
  res.send("server is running!");
  next()
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));
app.use("/", require("./routes/events"));


app.use(errorHandler);

const PORT = process.env.PORT || 5000;

serve.listen(PORT || 5000, async () => {
  console.log(`server is fire on ${PORT}`)
  await connectDB();
})

bot.command('start', async context => {
  try {
    context.reply("Enter your email you signed up with event management system")
    bot.on('text', async ctx => {
      try {
        const email = ctx.message.text
        let user = await User.findOne({ email })
        if (!user) { ctx.reply("User not found. Create account first") }
        else {
          await User.findOneAndUpdate({ email }, { chatId: context.chat.id, userId: context.from.id })
          ctx.reply("Your account has been updated. You will now start receiving notifications")
        }
      } catch (error) {
        console.log("error creatint ids", error.message)
      }
    })
  } catch (err) {
    console.log('error starting bot', err.message)
  }
})

bot.launch()

app.get('/watch', protect, async (req, res, next) => {
  const url = req.query?.url

  if (!url) {
    return res.status(400).json({
      message: "event url is required"
    })
  }

  const result = await watchEvent(url, req.user) 
  if (result) {
    //result : all event info is stored in result variable

    let eventInfoToSave = {
      name : result.name,
      date : result.dates.start.dateTime,
      timezone : result.dates.timezone,
      url : url,
      place : result._embedded.venues[0].name,
      user : req.user._id,
      eventId : result.id
    }
   
    let newEvent = await new EventModel(eventInfoToSave).save()

    const toSend = `Drop available for ${url}: \n\n\t\t Date to Open: ${result.dates.start.dateTime} at ${result.dates.timezone}\n\n\t\t sales:\n\n\t\t\t\t Public :\n\n\t\t\t\t  Date to Open : ${result?.sales?.public?.startDateTime}\n\n\t\t\t\t  Date to End :  ${result?.sales?.public?.endDateTime} 
    \n\n\t\t\t\t  presales: ${result?.sales?.presales.length} types of presale available `

    let imgurl = result?.seatmap?.staticUrl;

    bot.telegram.sendMessage(req.user.chatId,toSend)
    bot.telegram.sendMessage(req.user.chatId,imgurl,{toSend})

    return res.status(200).json({
          status: true,
          message: "Event watched! A message was sent to you through the bot.",  
        })   
  }

  return res.status(500).json({
    status: false,
    message: "An error occured. Check the url or try again"
  })
  
})

const watchEvent = async (eventUrl, user) => {
  try {    
    var eventurlarr = eventUrl.split('/');
    var domain = eventurlarr[2].split('.').at(-1);    
    
    if(domain=='ie'){
      let keywordarr = eventurlarr[3].split('-');                
      let keyword = keywordarr.slice(0, 4).join(' ');
 
      const res = await axios.get(`https://app.ticketmaster.com/discovery/v2/events?keyword=${keyword}&countryCode=IE&apikey=EZ6bALdFYeGViAbL5HvHYx7hEEnAZpdf`);    
      const data = await res.data; 
       
      if(!data._embedded) {
        let keyword = keywordarr.slice(0, 3).join(' ');
        const res = await axios.get(`https://app.ticketmaster.com/discovery/v2/events?keyword=${keyword}&countryCode=IE&apikey=EZ6bALdFYeGViAbL5HvHYx7hEEnAZpdf`);    
        const data = await res.data; 
        if(!data._embedded){
          let keyword = keywordarr.slice(0, 2).join(' ');
          const res = await axios.get(`https://app.ticketmaster.com/discovery/v2/events?keyword=${keyword}&countryCode=IE&apikey=EZ6bALdFYeGViAbL5HvHYx7hEEnAZpdf`);    
          const data = await res.data; 
          let eventdataarr = data._embedded.events;
          let filteredarr = eventdataarr.filter(item=>item.url==eventUrl);
          return filteredarr[0];
        }else {
          let eventdataarr = data._embedded.events;
          let filteredarr = eventdataarr.filter(item=>item.url==eventUrl);
          return filteredarr[0];
        }
      }else {        
        let eventdataarr = data._embedded.events;
        let filteredarr = eventdataarr.filter(item=>item.url==eventUrl);
        return filteredarr[0];
      }
    }else if(domain=='uk'){
      
    }
   
  } catch (err) {
    console.log('error scraping: ', err.message)
    return false
  } finally {

  }

}


module.exports = { watchEvent }

// bot.start((ctx) => {
//   const userId = ctx.message.from.id;
//   console.log(userId);
//   ctx.reply(`Your unique ID is: ${userId}`);
// });

