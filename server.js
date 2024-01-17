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
const request = require("request");
const fs = require('fs');

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
  console.log(result);
  if (result) {

    let eventInfoToSave = {
      name : result.eventName,
      date : result.eventDate,   
      url : url,
      place : result.eventPlace,
      eventId : result.discoEventId,
      user : req.user._id,
      secnames : result.secnames,
      prices : result.prices,
      staticMaplink : result.staticMaplink,
      eventStreetAddress : result.eventStreetAddress,
      eventCity : result.eventCity,
      eventStartDate : result.eventStartDate,
      endDate : result.endDate,
      onsaleDate : result.onsaleDate,
      offsaleDate : result.offsaleDate,
      presaleDates : result.presaleDates,      
    }
   
    await new EventModel(eventInfoToSave).save()

    const toSend = `Drop available for ${url}: \n\n\t\t Date to Open: ${result.eventDate} \n\n\t\t sales:\n\n\t\t\t\t`

    bot.telegram.sendMessage(req.user.chatId,toSend)


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
    console.log(eventUrl);
    request(eventUrl, function (error, response, html) {
      if (!error && response.statusCode == 200) {

        const $ = cheerio.load(html);
        const scriptContent = $('#__NEXT_DATA__').html();
        const jsonData = JSON.parse(scriptContent);

        const eventInfo = jsonData.props.pageProps.initialReduxState.eventInfo;
        const discoEventId = eventInfo.discoEventId;
        const countryCode = eventInfo.venue.country;
        const eventName = eventInfo.name;
        const eventPlace = eventInfo.venue.name;

        const eventDate = eventInfo.dates.eventDate;
        const eventStartDate = eventInfo.dates.startDate;
        const endDate = eventInfo.dates.endDate;
        const onsaleDate = eventInfo.dates.onsaleDate;
        const offsaleDate = eventInfo.dates.offsaleDate;
        const presaleDates = eventInfo.dates.presaleDates;

        const eventCity =  eventInfo.venue.city;
        const eventStreetAddress = eventInfo.venue.streetAddress;
        const staticMaplink = eventInfo.venue.staticMap;

        const secnames = eventInfo.secnames;
        const prices = jsonData.props.pageProps.initialReduxState.ticketSelection.ticketTypes.prices;

        const result = {
          discoEventId  : discoEventId,
          countryCode :  countryCode,
          eventName :  eventName,
          eventPlace :  eventPlace,
          eventDate : eventDate,
          eventStartDate : eventStartDate,
          endDate : endDate,
          onsaleDate :  onsaleDate,
          offsaleDate : offsaleDate,
          presaleDates : presaleDates,
          eventCity : eventCity,
          eventStreetAddress : eventStreetAddress,
          staticMaplink : staticMaplink,
          secnames : secnames,
          prices : prices
        }

        return result
      }
  });
   
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


// const watchEvent = async (eventUrl, user) => {
//   try {    
//     var eventurlarr = eventUrl.split('/');
//     var domain = eventurlarr[2].split('.').at(-1);    
    
//     if(domain=='ie'){
//       let keywordarr = eventurlarr[3].split('-');                
//       let keyword = keywordarr.slice(0, 4).join(' ');
 
//       const res = await axios.get(`https://app.ticketmaster.com/discovery/v2/events?keyword=${keyword}&countryCode=IE&apikey=EZ6bALdFYeGViAbL5HvHYx7hEEnAZpdf`);    
//       const data = await res.data; 
       
//       if(!data._embedded) {
//         let keyword = keywordarr.slice(0, 3).join(' ');
//         const res = await axios.get(`https://app.ticketmaster.com/discovery/v2/events?keyword=${keyword}&countryCode=IE&apikey=EZ6bALdFYeGViAbL5HvHYx7hEEnAZpdf`);    
//         const data = await res.data; 
//         if(!data._embedded){
//           let keyword = keywordarr.slice(0, 2).join(' ');
//           const res = await axios.get(`https://app.ticketmaster.com/discovery/v2/events?keyword=${keyword}&countryCode=IE&apikey=EZ6bALdFYeGViAbL5HvHYx7hEEnAZpdf`);    
//           const data = await res.data; 
//           let eventdataarr = data._embedded.events;
//           let filteredarr = eventdataarr.filter(item=>item.url==eventUrl);
//           return filteredarr[0];
//         }else {
//           let eventdataarr = data._embedded.events;
//           let filteredarr = eventdataarr.filter(item=>item.url==eventUrl);
//           return filteredarr[0];
//         }
//       }else {        
//         let eventdataarr = data._embedded.events;
//         let filteredarr = eventdataarr.filter(item=>item.url==eventUrl);
//         return filteredarr[0];
//       }
//     }else if(domain=='uk'){
      
//     }
   
//   } catch (err) {
//     console.log('error scraping: ', err.message)
//     return false
//   } finally {

//   }

// }