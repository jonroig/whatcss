const config = {
  serverPort: 3000,
  viewports: [
    { height: 800, width: 480, deviceScaleFactor: 2 },
    { height: 100, width: 576, deviceScaleFactor: 2 },
    { height: 1280, width: 768, deviceScaleFactor: 2 },
    { height: 1920, width: 992, deviceScaleFactor: 2 },
    { height: 2560, width: 1200, deviceScaleFactor: 2 },
  ],
  screenshotsArchive: {
    active: true,
    numberToArchive: 6,
    width: 1280,
    height: 1024,
    deviceScaleFactor: 2,
  },
  minification: {
    level: 2,
  },
  puppeteer: {
    launchConfig: {
      // headless: true,
      // executablePath: '/usr/bin/google-chrome-stable',
    },
    waitUntil: 'domcontentloaded',
    userAgent: 'WhatCSS.info/bot',
  },
  analytics: `
    <!-- google analytics code might go here -->
  `,

};

module.exports = config;
