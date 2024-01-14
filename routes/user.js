const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getUser,
  updateUser,
  deleteAcc
} = require("../controllers/user");
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route("/").get(protect, getUser);
router.route("/update").post(protect, upload.single('avatar'), updateUser);
router.route("/:ids").delete(protect, deleteAcc);

module.exports = router;
