const User = require("../models/User");
const jwt = require("jsonwebtoken");
const ErrorResponse = require("../utils/errorResponse");
// const { login } = require("telegraf/typings/button");


exports.updateUser = async (req, res, next) => {
  try {
    const {
      body: { fullName, email, location, role, bio }
    } = req;
    let token = req.headers.authorization.split(" ")[1];
    const tokenUser = jwt.verify(token, process.env.ACCESS_SECRET);
    const user = await User.findById(tokenUser._id);

    if (!user) res.status(400).json({
      status: false,
      message: 'there is no user!'
    })

    user.fullName = fullName;
    user.email = email;
    user.location = location;
    user.role = role;
    user.bio = bio;

    if (req.file) {
      user.avatar.data = req.file.buffer;
      user.avatar.contentType = req.file.mimetype;
    }

    const updateduser = await user.save();

    res.status(200).json({
      status: true,
      message: "user was updated successfully",
      updateduser: updateduser
    });

  } catch (err) {
    next(err);
  }
};


exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user._id })
    if (!user) return next(new ErrorResponse(404, "User not found"));
    res.status(200).json({ success: true, user: user });
  } catch (err) {
    next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findOne({ _id: req.user._id })
    .select("+password");
    
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    const isMatch = await user.matchPassword(current_password);
    if (!isMatch) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    user.password = new_password;
    await user.save();

    res.status(200).json({ success: true, user: user });
  } catch (err) {
    next(err);
  }
};

exports.deleteAcc = async (req, res, next) => {
  try {
    const userIds = req.params.ids;
    User.deleteMany({ _id: { $in: userIds } })
      .then(() => {
        res.status(200).json({ message: 'User(s) deleted successfully' });
      })
      .catch((error) => {
        res.status(500).json({ error: 'An error occurred while deleting user(s)' });
      });
  } catch (err) {
    next(err);
  }
}




