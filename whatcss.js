// Command Line Implementation of WhatCSS
// v0.1

const program = require('commander');
const urlParse = require('url-parse');
const fetchCSS = require('./lib/fetchCSS');
const superpuny = require('./lib/superpuny');

// set up the options...
program
  .version('0.1')
  .description('WhatCSS Command Line Utility\n\nExample:\nwhatcss https://example.com -e www.facebook.com,www.google.com')
  .option('-i, --include [list of domains]', 'include: domains.com,domain2.com')
  .option('-e, --exclude [list of domains]', 'exclude: domains.com,domain2.com')
  .option('-s, --screenshot', 'do screenshot: returns base64 encoded PNG')
  .parse(process.argv);

// should show help if there aren't any args...
if (!program.args || !program.args.length) {
  program.help();
}

// do a little cleanup on the input...
let theWebsite = program.args[0];
if (theWebsite.toLowerCase().indexOf('http://') !== 0 && theWebsite.toLowerCase().indexOf('https://') !== 0) {
  theWebsite = `http://${theWebsite}`;
}

// gotta support emoji domains... duh!
const thePageObj = urlParse(theWebsite);
thePageObj.hostname = superpuny.toAscii(thePageObj.hostname);
let thePage = thePageObj.protocol;
if (thePageObj.slashes) {
  thePage += '//';
}
thePage += `${thePageObj.hostname}${thePageObj.pathname}${thePageObj.query}`;

// bundle things up for the css fetcher
const params = {
  includeString: program.include || '',
  excludeString: program.exclude || '',
  doScreenshot: program.screenshot || false,
};

// run the css fetcher
return fetchCSS.get(thePage, params).then((results) => {
  if (results.err) {
    return console.log({
      error: results.err.message,
    });
  }

  return console.log(results);
});
