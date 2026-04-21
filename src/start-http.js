const http = require("http");
const app = require("./app");
const { initializeSharedServices } = require("./init");

const PORT = process.env.PORT || 3000;

async function start() {
  await initializeSharedServices();
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });
}

start();
