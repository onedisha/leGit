const zlib = require('node:zlib')
const fs = require('fs');

let str = "helo hogy\n wdf";
let compressedFile = zlib.deflateSync(str);
fs.writeFileSync('sample3.txt',compressedFile,{
    encoding:'binary'
});
console.log(zlib.deflateSync(str));
let comp =fs.readFileSync('sample3.txt',{
    encoding:null
});
console.log(comp);
let decomp = zlib.inflateSync(comp)

console.log(decomp.toString());