// based on code from
// https://stackoverflow.com/questions/45106841/chrome-devtools-coverage-how-to-save-or-capture-code-used-code
// thx stereobooster!
const puppeteer = require('puppeteer');
const urlParse = require('url-parse');
const CleanCSS = require('clean-css');
const sqlite3 = require('sqlite3').verbose();
const config = require('../config');

const screenshotDb = new sqlite3.Database('./db/screenshots.db');

// single browser thread to control 'em all
let browser = null;
const fetchBrowser = async () => {
  if (browser) {
    return browser;
  }
  browser = await puppeteer.launch(config.puppeteer.launchConfig);
  const browserVersion = await browser.version();
  console.log('Launched browser', browserVersion);
  return browser;
};

const closeBrowser = async () => {
  if (browser) {
    await browser.close();
    browser = null;
    console.log('closed browser');
  }
};

fetchBrowser();

// the "main function"
// fetches CSS... and take screenshots...
const fetchCSS = {
  grabPage: async (thePage, viewportObj, includeArray, excludeArray) => {
    const output = {
      styleSheets: {},
      filteredStyleSheets: {},
      styleSheetContents: {},
    };

    const theBrowser = await fetchBrowser();
    const page = await theBrowser.newPage({ waitUntil: config.puppeteer.waitUntil });

    // Start sending raw DevTools Protocol commands are sent using `client.send()`
    // First off enable the necessary "Domains" for the DevTools commands we care about
    const client = await page.target().createCDPSession();
    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('CSS.enable');

    // handle new styleSheets
    client.on('CSS.styleSheetAdded', async (stylesheet) => {
      const { header } = stylesheet;

      // this is the filter
      let shouldInclude = includeArray.length === 0;

      if (!excludeArray.includes('inline') || (includeArray.includes('inline') && (
        header.isInline
        || header.sourceURL === ''
        || header.sourceURL.startsWith('blob:')
      ))) {
        shouldInclude = true;
      }

      if (includeArray.length > 0) {
        const urlObj = urlParse(header.sourceURL);
        if (includeArray.includes(urlObj.hostname)) {
          shouldInclude = true;
        }
      }

      if (excludeArray.length > 0) {
        const urlObj = urlParse(header.sourceURL);
        if (excludeArray.includes(urlObj.hostname)) {
          shouldInclude = false;
        }
      }

      if (shouldInclude) {
        output.originalSize += header.length;
        output.styleSheets[header.styleSheetId] = {
          styleSheetId: header.styleSheetId,
          sourceURL: header.sourceURL,
          origin: header.origin,
          disabled: header.disabled,
          isInline: header.isInline,
          length: header.length,
        };
      } else {
        output.filteredStyleSheets[header.styleSheetId] = {
          styleSheetId: header.styleSheetId,
          sourceURL: header.sourceURL,
          origin: header.origin,
          disabled: header.disabled,
          isInline: header.isInline,
          length: header.length,
        };
      }

      output.styleSheetContents[header.styleSheetId] = await client.send('CSS.getStyleSheetText', {
        styleSheetId: header.styleSheetId,
      });
    });

    // Start tracking CSS coverage
    await client.send('CSS.startRuleUsageTracking');

    // set the user agent
    const userAgent = await theBrowser.userAgent();
    await page.setUserAgent(`${config.puppeteer.userAgent} ${userAgent}`);
    await page.evaluate('navigator.userAgent');

    // set the viewport...
    const viewport = {
      width: viewportObj.width,
      height: viewportObj.height,
      deviceScaleFactor: viewportObj.deviceScaleFactor,
    };

    await page.setViewport(viewport);
    console.log(thePage, viewport);

    // navigate and wait...
    await page.goto(thePage);

    // const content = await page.content();
    // console.log(content);

    // get the coverage delta
    output.rules = await client.send('CSS.takeCoverageDelta');


    //
    // // go through the coverage data and gather all the style
    // // we're actually using...
    // for (const rule of rules.coverage) {
    //   const stylesheet = await client.send('CSS.getStyleSheetText', {
    //     styleSheetId: rule.styleSheetId
    //   });
    //
    //   if (rule.used) {
    //     output.usedSlices.push(stylesheet.text.slice(rule.startOffset, rule.endOffset));
    //   }
    // }
    // console.log('viewportObj', viewportObj, output);

    await page.close();
    console.log('output',output);
    return output;
  },

  get: async (thePage, params) => {

    // a little input cleanup
    const includeString = params.includeString || false;
    const excludeString = params.excludeString || false;
    const doScreenshot = params.doScreenshot || false;

    try {
      const includeArray = includeString ? includeString.split(',') : [];
      const excludeArray = excludeString ? excludeString.split(',') : [];

      console.log(`Fetching ${thePage}\n`);

      const output = {
        id: thePage,
        includeArray,
        excludeArray,
        styleSheets: {},
        filteredStyleSheets: {},
        bootCSS: '',
        bootSize: 0,
        originalSize: 0,
      };

      const usedSlices = [];
      const promiseArray = [];
      config.viewports.forEach(async (viewportObj) => {
        promiseArray.push(fetchCSS.grabPage(thePage, viewportObj, includeArray, excludeArray));
      });
      console.log('promiseArray', promiseArray);
      Promise.all(promiseArray).then(async (results) => {
        console.log('results', results);
        // clean up the output...
        // const cleanCSSOutput = new CleanCSS(config.minification).minify(usedSlices.join(''));
        // console.log('cleanCSS', cleanCSSOutput.stats, cleanCSSOutput.errors, cleanCSSOutput.warnings);
        // output.bootCSS = cleanCSSOutput.styles;
        // output.bootSize = cleanCSSOutput.styles.length;
        //
        // // screenshot setup...
        // const fullPage = false;
        // const opts = {
        //   fullPage,
        //   // omitBackground: true
        //   clip: {
        //     x: 0,
        //     y: 0,
        //     width: config.screenshotsArchive.width,
        //     height: config.screenshotsArchive.height,
        //   },
        // };
        //
        // // take the screenshot
        // if (doScreenshot) {
        //   const buffer = await page.screenshot(opts);
        //   console.log('Screenshot', thePage, config.screenshotsArchive.width, config.screenshotsArchive.height);
        //   output.screenshotPng = buffer.toString('base64');
        //
        //   if (config.screenshotsArchive.active) {
        //     // screenshots are stored in sqlite
        //     // clear out the old ones first...
        //     const deleteSQL = `
        //     DELETE FROM screenshots WHERE id >
        //     ( SELECT max(id) FROM
        //       ( SELECT id FROM screenshots ORDER BY dateTS DESC LIMIT ${config.screenshotsArchive.numberToArchive} )
        //     AS screenshots)
        //     `;
        //     screenshotDb.run(deleteSQL);
        //
        //     // insert the new screenshot
        //     const insertSQL = `
        //       INSERT INTO screenshots
        //       (thePage, pngData, originalSize, newSize)
        //       VALUES
        //       (?, ?, ?, ?)`;
        //     screenshotDb.run(insertSQL, [
        //       thePage,
        //       buffer.toString('base64'),
        //       output.originalSize,
        //       output.bootSize,
        //     ]);
        //   }
        // }

        // close everything up


        return output;
      })


    } catch (e) {
      // just spit the error back to the browser... (for now)
      console.log('e', e);
      return {
        err: e,
      };
    }
  },
};

module.exports = {
  fetchCSS,
  closeBrowser,
};
