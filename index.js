/**
WhatCSS.info
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
const fetchCSS = require('./lib/fetchCSS');


// app setup...
const app = express();
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use(compression({ threshold: 0 }));
app.use(morgan('combined'));
app.use(favicon(`${__dirname}/webcontent/favicon.ico`));


// home
app.get('/', (req, res) => (
  res.render('home', {})
));


// the analyser
app.get('/getcss', (req, res) => {
  let thePage = req.query.page || false;
  const theFormat = req.query.format || false;
  const includeString = req.query.include || false;
  if (!thePage) {
    return res.redirect(301, '/getcss?page=whatcss.info');
  }
  if (thePage.indexOf('http://') !== 0 && thePage.indexOf('https://') !== 0) {
    thePage = `http://${thePage}`;
  }

  return fetchCSS.get(thePage, includeString).then((results) => {
    if (theFormat === 'json') {
      return res.send(results);
    }

    return res.render('results', {
      thePage,
    });
  });
});


// console
const thePort = 3000;
app.listen(thePort);
console.log(`App started on port ${thePort}`);
