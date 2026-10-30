// pm2 en un VPS: pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [{
    name: "redcafe",
    script: "dist/index.js",
    node_args: "--enable-source-maps",
    instances: 1, // las tareas internas (respaldos, precios) asumen una sola instancia
    env: { NODE_ENV: "production" },
    max_memory_restart: "512M",
  }],
};
