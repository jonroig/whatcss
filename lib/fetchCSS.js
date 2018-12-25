// based on code from
// https://stackoverflow.com/questions/45106841/chrome-devtools-coverage-how-to-save-or-capture-code-used-code
// thx stereobooster!
const puppeteer = require('puppeteer');
const urlParse = require('url-parse');

const fetchCSS = {
  get: async (thePage, includeString) => {
    const includeArray = includeString ? includeString.split('|') : [];
    console.log(`Fetching ${thePage}`);
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
      styleSheets: {},
    };
    const styleSheetHeadersIdArray = [];
    client.on('CSS.styleSheetAdded', (stylesheet) => {
      console.log('stylesheet', stylesheet);
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

    await page.goto(thePage);
    const content = await page.content();
    // console.log(content);

    const rules = await client.send('CSS.takeCoverageDelta');
    // console.log(rules);
    //
    // const rulesObj = {
    //   usedRules: [],
    //   unusedRules: [],
    // };
    //
    // rules.coverage.forEach(rule => {
    //   if (rule.used) {
    //     rulesObj.usedRules.push(rule);
    //   } else {
    //     rulesObj.unusedRules.push(rule);
    //   }
    // });
    //
    //
    // const slices = [];
    // for (const usedRule of rulesObj.usedRules) {
    //   // console.log(usedRule.styleSheetId)
    //   if (inlineStylesheetIndex.has(usedRule.styleSheetId)) {
    //     continue;
    //   }
    //
    //   const stylesheet = await client.send('CSS.getStyleSheetText', {
    //     styleSheetId: usedRule.styleSheetId
    //   });
    //
    //   slices.push(stylesheet.text.slice(usedRule.startOffset, usedRule.endOffset));
    // }
    //
    // console.log(slices.join(''));

    await page.close();
    await browser.close();

    return output;
  },
};

module.exports = fetchCSS;
