const mongoose = require('mongoose')

const EventSchema = new mongoose.Schema({
    name: String,
    date: Date,
    url: String,
    place: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    ticketTypeArr : Array,
    blockedTypeArr : Array,
    sectionArr : Array,
    priceArr : Array,
    time: String,
    watches: [{
        ticketType: String,
        blockedType: [String],
        quantity: Number,
        section: String,
        priceLevel: String
    }]
},
    { timestamps: true }
) 


module.exports = mongoose.model('Events', EventSchema)