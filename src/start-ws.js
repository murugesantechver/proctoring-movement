const http = require("http");
const { initializeSharedServices } = require("./init");
const { initializeWebSocket } = require("./shared/utils/websocket");

const PORT = process.env.WS_PORT || 4000;

async function start() {
  await initializeSharedServices();
  const server = http.createServer();
  await initializeWebSocket(server);
  server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
  });
}

start();
