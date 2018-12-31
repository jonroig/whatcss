const uts46 = require('idna-uts46');
const punycode = require('punycode');

const superpuny = {
  toAscii: (unicodeString) => {
    let punycodeDomainLookup = false;
    try {
      punycodeDomainLookup = uts46.toAscii(unicodeString);
      return punycodeDomainLookup;
    } catch (e) {
      punycodeDomainLookup = punycode.toASCII(unicodeString);
    }
    return punycodeDomainLookup;
  },

  toUnicode: (asciiString) => {
    let unicodeDomainLookup = 'fail';

    try {
      unicodeDomainLookup = uts46.toUnicode(asciiString);
    } catch (e) {
      try {
        unicodeDomainLookup = punycode.toUnicode(asciiString);
      } catch (e) {
        // nothing
      }
    }

    // recentLookupArray.splice(0,0,unicodeDomainLookup);
    // recentLookupArray = recentLookupArray.slice(0,100);

    return unicodeDomainLookup;
  },
};

module.exports = superpuny;
