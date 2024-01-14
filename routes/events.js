const express = require('express')
const { watchEvent } = require('../server')
const { protect } = require('../middleware/auth')
const EventModel = require('../models/Events')

const router = express.Router()


router.get('/events', protect, async (req, res, next) => {
    try {
        const events = await EventModel.find({ user: req.user._id })
        res.status(200).json(events)
    } catch (err) {
        console.log(err.message)
        res.status(500).json({ message: "failed. Try again" })
    }
})
async function getDocumentsAddedThreeDaysAgo() {
    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const result = await EventModel.find({
            createdAt: {
                $gte: threeDaysAgo.toISOString(),
            }
        });

        return result
    } catch (error) {
        console.error('Error:', error.message);
    }
}

router.get("/live-drops", async (req, res, next) => {
    try {
        const liveDrops = await getDocumentsAddedThreeDaysAgo()
        if (!liveDrops) throw new Error()
        res.status(200).json({ status: true, liveDrops })
    } catch (err) {
        console.log(err.message)
        res.status(500).json({ message: "failed. Try again" })
    }
})

router.delete('/events', protect, async (req, res, next) => {
    try {
        const data = JSON.parse(req.headers.data)
        if (!req.headers.data) return res.status(400).json({ message: "provide data to delete" })
        await EventModel.deleteMany({ _id: data })
        return res.status(200).json({ status: true, message: "deleted successfully" })
    } catch (err) {
        console.log(err.message)
        res.status(500).json({ message: "failed. Try again" })
    }
})



router.post("/add-watch", protect, async (req, res, next) => {
    try {
        let event = await EventModel.findOne({ _id: req.body._id })
        if (!event) return res.status(404).json({ status: false, message: "Event not found" })

        await EventModel.findOneAndUpdate({ _id: req.body._id }, {
            $push: {
                watches: {
                    ticketType: req.body.ticketType,
                    blockedType: req.body.blockedType,
                    quantity: req.body.quantity,
                    section: req.body.section,
                    priceLevel: req.body.priceLevel,
                }
            }
        })

        event = await EventModel.findOne({ _id: req.body._id })

        res.status(201).json({
            status: true,
            message: 'watch created successfully',
            event
        })
    } catch (error) {
        console.log('error', error.message)
        res.status(500).json({ message: "An error occurred" })
    }
})

router.post('/delete-watch', protect, async (req, res, next) => {
    try {
        const event = await EventModel.findByIdAndUpdate({ _id: req.body.eventId }, {
            $pull: {
                watches: { _id: req.body.watchId }
            }
        })
        event.watches = event.watches.filter(watch => watch?._id !== req.body._id)
        await event.save()
        res.status(200).json({ status: true, message: 'deleted successfully' })
    } catch (error) {
        console.log('error', error.message)
        res.status(500).json({ message: "An error occurred" })
    }
})

router.get('/events/:id', async (req, res, next) => {
    try {
        const event = await EventModel.findById(req.params.id)
        if (!event) return res.status(404).json({ status: false, message: 'event not found' })
        res.status(200).json({
            status: true,
            event
        })
    } catch (error) {
        console.log('error', error.message)
        res.status(500).json({ message: "An error occurred" })
    }
})

router.put('/events/:id', async (req, res, next) => {
    try {
        let event = await EventModel.findById(req.params.id)
        if (!event) return res.status(404).json({ status: false, message: 'event not found' })

        event = await EventModel.findOneAndUpdate(event._id, { ...req.body })
        res.status(200).json({
            status: true,
            message: 'updated',
            event
        })
    } catch (error) {
        console.log('error', error.message)
        res.status(500).json({ message: "An error occurred" })
    }
})


module.exports = router 