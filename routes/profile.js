const express = require("express");
const { protect } = require("../middleware/auth");
const { updateProfile, getProfile, createProfile } = require("../controllers/profile");
const router = express.Router();

router.route("/").post(protect, createProfile);
router.route("/:id").post(protect, updateProfile);
router.route("/:id").get(protect, getProfile);

module.exports = router;
