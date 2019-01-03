# WhatCSS
WhatCSS: CSS StyleSheet Pageload Analyser/Optimizer 🤷

**Demo / Documentation: https://WhatCSS.info**

# About
WhatCSS.info automatically generates a minified version of the bare minimum CSS a user needs to begin interacting with your site.

# Install
* ```git clone https://github.com/jonroig/whatcss.git```
* ```npm install```
* ```node index.js```

# PM2 
There are PM2 start script here:
```node startScripts/test.js``` (includes watching)

```node startScripts/prod.js```

# Installing on AWS
It might be helpful to install Chrome from scratch on AWS using this script:

```curl https://intoli.com/install-google-chrome.sh | bash```

... then uncomment these lines in the config.js

```
// headless: true,
// executablePath: '/usr/bin/google-chrome-stable',
```

# To do
* Handle different screensizes and combine the CSS usage information into a single critical path
* Deal with unused CSS more efficiently
* Work on scaling issues (maybe use a single browser instance?)
* CLI support
