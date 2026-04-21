module.exports = {
  apps: [
    {
      name: "proctoring-server-staging",
      script: "src/server.js",
      cwd: "/var/www/node-backend/proctoring-server",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "bis_staging"
      }
    }
  ]
};
