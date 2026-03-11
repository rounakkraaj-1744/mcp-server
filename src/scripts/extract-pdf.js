const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = '/Users/rounakk/Documents/projects/nextjs-mcp/powerpoint.pdf';
const outputPath = '/Users/rounakk/Documents/projects/nextjs-mcp/mcp-next/powerpoint_extracted.txt';

let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync(outputPath, data.text);
    console.log('Successfully extracted PDF text to ' + outputPath);
}).catch(err => {
    console.error('Error extracting PDF:', err);
    process.exit(1);
});
