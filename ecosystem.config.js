module.exports = {
  apps: [
    {
      name: "chat-ai", // Name of your app
      script: "node_modules/next/dist/bin/next", // Path to the Next.js start script
      args: "start", // Start the app in production mode
      instances: 1, // Number of instances (can set to "max" for all CPUs)
      autorestart: true,
      watch: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3001, // Port to run the app on
      },
    },
  ],
};
