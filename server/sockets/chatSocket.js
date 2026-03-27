const Message = require("../models/Message");
const User = require("../models/User");

const onlineUsers = new Map(); // userId -> socketId

const chatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // When user comes online
    socket.on("userOnline", async (userId) => {
      onlineUsers.set(userId, socket.id);
      await User.findByIdAndUpdate(userId, { status: "online" });
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // Send message
    socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
      const message = await Message.create({
        senderId,
        receiverId,
        content,
      });

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", message);
      }

      // Also send back to sender (for UI update)
      socket.emit("receiveMessage", message);
    });

    // On disconnect
    socket.on("disconnect", async () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { status: "offline" });
          io.emit("onlineUsers", Array.from(onlineUsers.keys()));
          break;
        }
      }
    });
  });
};

module.exports = chatSocket;