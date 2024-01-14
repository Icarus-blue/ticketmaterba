const express = require("express");
const router = express.Router();

const {
  login,
  loginGoogle,
  register,
  registerGoogle,
  accountActivation,
  forgotPassword,
  resetPassword,
  refreshToken,
  resendOtpEmail,
} = require("../controllers/auth");

router.route("/register").post(register);
router.route("/registerGoogle").post(registerGoogle);
router.route("/verify-otp/:otp").put(accountActivation);
router.route("/resend-otp-email/:email").put(resendOtpEmail);
router.route("/login").post(login);
router.route("/loginGoogle").post(loginGoogle);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:resetToken").put(resetPassword);
router.route("/refreshtoken").post(refreshToken);

module.exports = router;
