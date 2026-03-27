require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const chatSocket = require("./sockets/chatSocket");
const Message = require("./models/Message");
const onlineUsers = new Map(); // userId → socketId

dotenv.config();
const connectDB = require("./config/db");
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});



// Middleware
//app.use(cors());
app.use(cors({
  origin: "*"
}));
app.use(express.json());
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/messages", require("./routes/messages"));
app.use("/uploads", express.static("uploads"));



// Test route
app.get("/", (req, res) => {
  res.send("Server is running...");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 🔥 When user joins
  socket.on("join", (userId) => {
    onlineUsers.set(userId, socket.id);

    // Broadcast updated online users
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  // 🔥 Message sending (keep existing)
  socket.on("sendMessage", async (msg) => {
    try {
      const message = new Message({
        sender: msg.senderId,
        receiver: msg.receiverId,
        content: msg.content
      });

      const saved = await message.save();

      io.emit("receiveMessage", saved);
    } catch (err) {
      console.error(err);
    }
  });

  // 🔥 On disconnect
  socket.on("disconnect", () => {
    let disconnectedUser = null;

    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        disconnectedUser = userId;
        onlineUsers.delete(userId);
        break;
      }
    }

    if (disconnectedUser) {
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    }

    console.log("User disconnected:", socket.id);
  });

  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
  
    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", { senderId });
    }
  });
  
  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
  
    if (receiverSocket) {
      io.to(receiverSocket).emit("stopTyping", { senderId });
    }
  });

  socket.on("markRead", async ({ senderId, receiverId }) => {
    try {
      await Message.updateMany(
        {
          sender: senderId,
          receiver: receiverId,
          read: false
        },
        { read: true }
      );
  
      const senderSocket = onlineUsers.get(senderId);
  
      if (senderSocket) {
        io.to(senderSocket).emit("messagesRead", {
          by: receiverId
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

});


// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

const protect = require("./middleware/authMiddleware");

app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "You accessed a protected route!", userId: req.user.id });
});

