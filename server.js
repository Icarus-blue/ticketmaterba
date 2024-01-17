const express = require("express");
const { protect } = require('./middleware/auth')
const EventModel = require('./models/Events')
require("dotenv").config({ path: "./.env" });
const errorHandler = require("./middleware/error");
const session = require("express-session");
const connectDB = require("./config/db");
const axios = require('axios')
const { Telegraf } = require('telegraf')
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

  const formData = {
    eventurl: url,
    responsive: 1,
    frompage: 'events',
  };

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Cookie': '_ga=GA1.2.2091108946.1704484115; _gid=GA1.2.1008499319.1705009841; _csrf-frontend=0e0cb5a4b6a36e912416c08edf83ed8fb17e492479c1bbc73fb570b0483fa6eea%3A2%3A%7Bi%3A0%3Bs%3A14%3A%22_csrf-frontend%22%3Bi%3A1%3Bs%3A32%3A%22PDf4_7iuPFOSuhiGK-vIitcy-UoMS4em%22%3B%7D; _frontendIdentity2=269fe7bd13a915d844ed208fb127bb1ba7a2a90964172a22555e1232361acbbea%3A2%3A%7Bi%3A0%3Bs%3A18%3A%22_frontendIdentity2%22%3Bi%3A1%3Bs%3A49%3A%22%5B1795%2C%22uphMOpS452a8OipVTIa6OlhqvgxOeIBd%22%2C1209600%5D%22%3B%7D; FRONTENDSESSID2=6natvtuk8b0t6h98uq0sta4a35; _ga_079MQD69LK=GS1.2.1705506795.32.0.1705506795.0.0.0',
    'X-Csrf-Token': 'Wm1kVUlLaWIKKQJhFnwAFworKwY8IwAlEUASHCA/Cht3OAsYGn8MDw=='

  };

  await axios.post('https://www.droppedtickets.com/events/newevent', formData, { headers })
    .then(response => {
      const $ = cheerio.load(response.data);

      const firstRow = $('.container .row').first();
      const secondRow = $('.container .row').eq(1);
      const thirdRow = $('.container .row').eq(2);
      const eventName = firstRow.find('.col-lg-9').text().trim();
      const eventDate = secondRow.find('.col-lg-9').text().trim();
      const eventPlace = thirdRow.find('.col-lg-9').text().trim();

      const form = $('#followForm');

      const firstRow_Form = form.find('.row').first();
      const firstselect = firstRow_Form.find('select');
      const ticketTypeArr = firstselect
        .children()
        .map((_, option) => $(option).text())
        .get();

      const secondRow_Form = form.find('.row').eq(1);
      const secondselect = secondRow_Form.find('select');
      const blockedTypeArr = secondselect
        .children()
        .map((_, option) => $(option).text())
        .get();

      const thirdRow_Form = form.find('.row').eq(3);
      const thirdselect = thirdRow_Form.find('select');
      const sectionArr = thirdselect
        .children()
        .map((_, option) => $(option).text())
        .get();

      const fourthRow_Form = form.find('.row').eq(4);
      const fourthselect = fourthRow_Form.find('select');
      const priceArr = fourthselect
        .children()
        .map((_, option) => $(option).text())
        .get();

      const result = {
        eventName: eventName,
        eventDate: eventDate,
        eventPlace: eventPlace,
        ticketTypeArr: ticketTypeArr,
        blockedTypeArr: blockedTypeArr,
        sectionArr: sectionArr,
        priceArr: priceArr
      }

      if (result) {

        const eventInfoToSave = {
          name: result.eventName,
          date: result.eventDate,
          url: url,
          place: result.eventPlace,
          user: req.user._id,
          ticketTypeArr: result.ticketTypeArr,
          blockedTypeArr: result.blockedTypeArr,
          sectionArr: result.sectionArr,
          priceArr: result.priceArr
        }

        new EventModel(eventInfoToSave).save()

        const toSend = `Drop available for ${url}: \n\n\t\t Date to Open: ${result.eventDate} \n\n\t\t sales:\n\n\t\t\t\t`

        bot.telegram.sendMessage(req.user.chatId, toSend)

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
    .catch(error => {
      console.error(error);
    });


  // const result = await  watchEvent(url, req.user) 



})

const watchEvent = async (eventUrl, user) => {
  try {


  } catch (err) {
    console.log('error scraping: ', err.message)
    return false
  } finally {

  }

}


module.exports = { watchEvent }















