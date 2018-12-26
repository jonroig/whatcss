// based on code from
// https://stackoverflow.com/questions/45106841/chrome-devtools-coverage-how-to-save-or-capture-code-used-code
// thx stereobooster!
const puppeteer = require('puppeteer');
const urlParse = require('url-parse');
const CleanCSS = require('clean-css');
const sqlite3 = require('sqlite3').verbose();

const config = require('../config');
const screenshotDb = new sqlite3.Database('./db/screenshots.db');

const fetchCSS = {
  get: async (thePage, includeString, excludeString) => {
    try {
      const includeArray = includeString ? includeString.split('|') : [];
      const excludeArray = excludeString ? excludeString.split('|') : [];

      console.log(`Fetching ${thePage}\n`);
      const browser = await puppeteer.launch();
      const page = await browser.newPage({ waitUntil: 'networkidle0' });

      // Start sending raw DevTools Protocol commands are sent using `client.send()`
      // First off enable the necessary "Domains" for the DevTools commands we care about
      const client = await page.target().createCDPSession();
      await client.send('Page.enable');
      await client.send('DOM.enable');
      await client.send('CSS.enable');
      const output = {
        id: thePage,
        includeArray: includeArray,
        excludeArray: excludeArray,
        styleSheets: {},
        bootCSS: '',
        bootSize: 0,
        originalSize: 0,
      };

      // handle new styleSheets
      client.on('CSS.styleSheetAdded', (stylesheet) => {
        const { header } = stylesheet;
        let shouldInclude = includeArray.length === 0;

        if (includeArray.includes('inline') && (
          header.isInline
          || header.sourceURL === ''
          || header.sourceURL.startsWith('blob:')
        )) {
          shouldInclude = true;
        }

        if (includeArray.length > 0) {
          const urlObj = urlParse(header.sourceURL);
          if (includeArray.includes(urlObj.hostname)) {
            shouldInclude = true;
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
        }
      });

      // Start tracking CSS coverage
      await client.send('CSS.startRuleUsageTracking');

      // navigate and wait...
      await page.goto(thePage);
      const content = await page.content();
      // console.log(content);

      // get the coverage delta
      const rules = await client.send('CSS.takeCoverageDelta');

      // go through the coverage data and gather all the style
      // we're actually using...
      const usedSlices = [];
      for (const rule of rules.coverage) {
        const stylesheet = await client.send('CSS.getStyleSheetText', {
          styleSheetId: rule.styleSheetId
        });

        if (rule.used) {
          usedSlices.push(stylesheet.text.slice(rule.startOffset, rule.endOffset));
        }
      }

      // clean up the output...
      const cleanCSSOutput = new CleanCSS({}).minify(usedSlices.join(''));
      console.log('cleanCSS', cleanCSSOutput.stats, cleanCSSOutput.errors, cleanCSSOutput.warnings);
      output.bootCSS = cleanCSSOutput.styles;
      output.bootSize = cleanCSSOutput.styles.length;

      if (config.recentlyTestedScreenshots > 0) {
        const viewport = {
          width: 1280,
          height: 1024,
          deviceScaleFactor: 2
        };
        await page.setViewport(viewport);
        const fullPage = true;

        const opts = {
          fullPage,
          // omitBackground: true
        };

        const buffer = await page.screenshot(opts);
        const insertSQL = `
          INSERT INTO screenshots
          (thePage, pngData, originalSize, newSize)
          VALUES
          (?, ?, ?, ?)`;
        screenshotDb.run(insertSQL, [
          thePage,
          buffer.toString('base64'),
          output.originalSize,
          output.bootSize,
        ]);

      }
      await page.close();
      await browser.close();

      return output;
    } catch (e) {
      console.log('e', e);
      return {
        err: e
      };
    }

  },
};

module.exports = fetchCSS;
