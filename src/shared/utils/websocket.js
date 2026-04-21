const { Server } = require("socket.io");
const sessionManager = require("../services/sessionManager.service");
const { handleMessage } = require("../services/messageHandler.service");

async function initializeWebSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    maxHttpBufferSize: 5 * 1024 * 1024,
  });

  await sessionManager.attachSocketServer(io);

  io.on("connection", (socket) => {
    console.log(`[WS] Socket.IO connected: ${socket.id}`);

    socket.on("message", async (payload) => {
      try {
        const messageStr = typeof payload === "string" ? payload : JSON.stringify(payload);
        await handleMessage(messageStr, socket);
      } catch (err) {
        console.error("[WS] Error in messageHandler:", err);
        socket.emit("socket_error", { status: "error", message: "Internal server error" });
      }
    });

    socket.on("disconnect", async () => {
      if (socket.session_id) {
        const current = sessionManager.getWebSocket(socket.session_id);
        if (current && current.id === socket.id) {
          await sessionManager.removeSession(socket.session_id);
        }
      }
      console.log(`[WS] Socket.IO disconnected: ${socket.id}`);
    });

    socket.on("error", (err) => {
      console.error("[WS] Socket.IO error", err);
    });
  });
}

module.exports = { initializeWebSocket };
