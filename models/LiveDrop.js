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
    time: String,   
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
},
    { timestamps: true }
) 


module.exports = mongoose.model('LiveDrops', LiveDropSchema)