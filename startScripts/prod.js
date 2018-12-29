// simple prod start script
// uses pm2, ignores changes to /db
const pm2 = require('pm2');

pm2.connect(() => {
  pm2.start([
    {
      script: 'index.js',
      name: 'WhatCSS',
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ], (err) => {
    if (err) throw new Error(err);
    pm2.disconnect();
  });
});
