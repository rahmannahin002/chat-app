const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

// GET all users except current user
router.get("/", auth, async (req, res) => {
  try {
    //const users = await User.find({ _id: { $ne: req.user.id } }).select("-password");
    const users = await User.find({ _id: { $ne: req.user.id } }).select("username avatar");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});


// Upload avatar
router.post("/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: req.file.filename },
      { new: true }
    );
    res.status(500).json({ message: "Upload success" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
});

// Remove avatar
router.delete("/avatar", auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: "" },
      { new: true }
    );
    res.status(500).json({ message: "Remove success" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Remove failed" });
  }
});

module.exports = router;
