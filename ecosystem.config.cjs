module.exports = {
  apps: [{
    name: 'youtube-stream-01',
    script: 'bun',
    args: 'start',
    autorestart: true,  // Garante que o PM2 reinicie o aplicativo em caso de falha
    env: {
      NODE_ENV: 'production'
    }
  }]
};
