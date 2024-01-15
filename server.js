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
    if (result.status == 0) {
      let newEvent = await new EventModel(result.savedata).save()
      return res.status(200).json({
        status: true,
        message: "Event watched! A message was sent to you through the bot.",
        html: result.html
      })
    } else {
      return res.status(200).json({
        status: false,
        message: "Resale link is not supported now, please try other link",
      })
    }
  }
  return res.status(500).json({
    status: false,
    message: "An error occured. Check the url or try again"
  })
})

const watchEvent = async (eventUrl, user) => {
  try {
    var formData = new FormData();
    formData.append('eventurl', eventUrl);
    formData.append('responsive', '1');
    formData.append('frompage', 'events');

    const res = await axios.post('https://www.droppedtickets.com/events/newevent', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': '_ga=GA1.2.2091108946.1704484115; _gid=GA1.2.1008499319.1705009841; _csrf-frontend=0e0cb5a4b6a36e912416c08edf83ed8fb17e492479c1bbc73fb570b0483fa6eea%3A2%3A%7Bi%3A0%3Bs%3A14%3A%22_csrf-frontend%22%3Bi%3A1%3Bs%3A32%3A%22PDf4_7iuPFOSuhiGK-vIitcy-UoMS4em%22%3B%7D; FRONTENDSESSID2=494i5lr0ccfo2fpck0pgsv9rj6; _frontendIdentity2=269fe7bd13a915d844ed208fb127bb1ba7a2a90964172a22555e1232361acbbea%3A2%3A%7Bi%3A0%3Bs%3A18%3A%22_frontendIdentity2%22%3Bi%3A1%3Bs%3A49%3A%22%5B1795%2C%22uphMOpS452a8OipVTIa6OlhqvgxOeIBd%22%2C1209600%5D%22%3B%7D; _gat=1; _ga_079MQD69LK=GS1.2.1705241180.23.0.1705241180.0.0.0',
        'X-Csrf-Token': 'dVY0dXNEejglElJBLHMTTSUQeyYGLBN/PntCPBowGUFYA1s4IHAfVQ=='
      },
    })
    let html = res.data;
    if (html[0] != '<') {
      return {
        status: 1,
      }
    } else {
      const $ = cheerio.load(html);
      const eventNameElement = $('.col-lg-9');
      const eventArray = eventNameElement.map((index, element) => $(element).text().trim()).get();

      const toSend = `Ticket available for ${eventUrl}: \n\n\t\t Date to Open: ${eventArray[1]} \n\n\t\t sits: 'not prepared yet.'`
     
      bot.telegram.sendMessage(user.chatId, toSend)

      return {
        status: 0,
        savedata: {
          name: eventArray[0],
          date: eventArray[1],
          url: eventUrl,
          place: eventArray[2],
          user: user._id,
        },
      }
    }
  } catch (err) {
    console.log('error scraping: ', err.message)
    return false
  } finally {

  }

}

const htmlStringPaser = async (str) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, "text/html");
  return doc;
}

module.exports = { watchEvent }

// bot.start((ctx) => {
//   const userId = ctx.message.from.id;
//   console.log(userId);
//   ctx.reply(`Your unique ID is: ${userId}`);
// });
