/**
WhatCSS
... a CSS analyser and minification helper.

* Copyright 2018 Jon Roig. All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const exphbs = require('express-handlebars');
const favicon = require('serve-favicon');
const sqlite3 = require('sqlite3').verbose();
const urlParse = require('url-parse');

const config = require('./config');
const fetchCSS = require('./lib/fetchCSS');
const superpuny = require('./lib/superpuny');

const screenshotDb = new sqlite3.Database('./db/screenshots.db');


// app setup...
const app = express();
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use(compression({ threshold: 0 }));
app.use(morgan('combined'));
app.use(favicon(`${__dirname}/webcontent/favicon.ico`));
app.use('/images', express.static(`${__dirname}/webcontent/images`));


// home
app.get('/', (req, res) => {
  const selectSQL = `SELECT id, dateTS, thePage, originalSize, newSize FROM screenshots ORDER BY dateTS DESC LIMIT ${config.screenshotsArchive.numberToArchive}`;
  screenshotDb.all(selectSQL, [], (err, rows) => {
    const screenshotArray = rows.map(row => ({
      ...row,
      percentage: ((row.newSize / row.originalSize) * 100).toFixed(2),
      urlEncodedPage: encodeURIComponent(row.thePage),
    }));

    res.render('home', {
      config,
      screenshotArray,
    });
  })
});


// the analyser
app.get('/getcss', (req, res) => {
  let thePageInput = req.query.page || false;
  const theFormat = req.query.format || false;
  const includeString = req.query.include || false;
  const excludeString = req.query.exclude || false;
  if (!thePageInput) {
    return res.redirect(301, '/getcss?page=whatcss.info');
  }
  if (thePageInput.indexOf('http://') !== 0 && thePageInput.indexOf('https://') !== 0) {
    thePageInput = `http://${thePageInput}`;
  }

  // do a little cleanup on the input...
  // gotta support emoji domains... duh!
  const thePageObj = urlParse(thePageInput);
  thePageObj.hostname = superpuny.toAscii(thePageObj.hostname);
  let thePage = thePageObj.protocol;
  if (thePageObj.slashes) {
    thePage += '//';
  }
  thePage += `${thePageObj.hostname}${thePageObj.pathname}${thePageObj.query}`;

  return fetchCSS.get(thePage, includeString, excludeString, theFormat !== 'json').then((results) => {
    if (results.err) {
      if (theFormat === 'json') {
        return res.send({
          error: results.err.message,
        });
      }

      return res.send(`Error: ${results.err.message}`);
    }

    if (theFormat === 'json') {
      return res.send(results);
    }

    // do a little cleanup on the results to make them more
    // user friendly...
    Object.keys(results.styleSheets).forEach((styleSheet) => {
      results.styleSheets[styleSheet].sourceIsURL =
        results.styleSheets[styleSheet].sourceURL &&
        (results.styleSheets[styleSheet].sourceURL.indexOf('http://')
        || results.styleSheets[styleSheet].sourceURL.indexOf('https://'));
    });

    Object.keys(results.filteredStyleSheets).forEach((styleSheet) => {
      results.filteredStyleSheets[styleSheet].sourceIsURL =
        results.filteredStyleSheets[styleSheet].sourceURL &&
        (results.filteredStyleSheets[styleSheet].sourceURL.indexOf('http://')
        || results.filteredStyleSheets[styleSheet].sourceURL.indexOf('https://'));
    });


    const output = {
      ...results,
      percentage: ((results.bootSize / results.originalSize) * 100).toFixed(2),
      urlEncodedPage: encodeURIComponent(results.id),
      includeString: results.includeArray.join(','),
      excludeString: results.excludeArray.join(','),
      hasFilteredStylesheets: Object.keys(results.filteredStyleSheets).length > 0,
    };

    return res.render('results', {
      thePage,
      results: output,
    });
  });
});

// access images from screenshots...
// they're stored in a sqlite db
app.get('/img/:id', (req, res) => {
  const imgId = req.params.id || false;
  if (!imgId) {
    return res.send();
  }

  const selectSQL = 'SELECT pngData from screenshots WHERE id = ?';
  screenshotDb.all(selectSQL, [imgId], (err, rows) => {
    if (err || !rows[0] || !rows[0].pngData) {
      console.log(err || 'no img data');
      return res.send();
    }
    const img = Buffer.from(rows[0].pngData, 'base64');
    return res.type('image/png').send(img);
  });
});

// start the app
app.listen(config.serverPort);
console.log(`WhatCSS started on port ${config.serverPort}`);
