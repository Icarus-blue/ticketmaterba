const mongoose = require('mongoose')

const LiveDropSchema = new mongoose.Schema({
    name: String,
    date: Date,
    url: String,
    place: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    criteria : String,
    droptime : String,
    section : String,
    row : String, 
    time : Date
},
    { timestamps: true }
) 


module.exports = mongoose.model('LiveDrops', LiveDropSchema)