const { PDFParse } = require('pdf-parse');

try {
    const parser = new PDFParse();
    console.log('Parser properties:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
    console.log('Parser keys:', Object.keys(parser));
} catch (err) {
    console.error(err.message);
}
