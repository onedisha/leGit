// var hashFiles = require('hash-files');



// hashFiles(["-f","a/sample.txt"], function(error, hash) {
//     // hash will be a string if no error occurred 
//     if(error){ 
//         console.log(error); return;
//     }
    
//     console.log(hash);
// });

// const {
//     createHash,
//   } = require('node:crypto');
  
//   const hash = createHash('sha1');
  
//   hash.on('readable', () => {
//     // Only one element is going to be produced by the
//     // hash stream.
//     const data = hash.read();
//     if (data) {
//       console.log(data.toString('hex'));
//       // Prints:
//       //   6a2da20943931e9834fc12cfe5bb47bbd9ae43489a30726962b576f4e3993e50
//     }
//   });
  
//   hash.update('I am a test file here to test your hash functio');
//   hash.end();

// const hash2 = require('object-hash');

// console.log(hash2("I am a test file here to test your hash functio",{
//     algorithm: 'sha1'
// }));

const Diff = require('diff');
const fs = require('fs');
let path1 = './a/sample.txt';
let path2 = './a/sample2.txt';
let str1 = fs.readFileSync(path1,'utf-8');
let str2 = fs.readFileSync(path2,'utf-8');


// finding diff between two files/strings
let patch  = Diff.parsePatch(Diff.createTwoFilesPatch('old.txt','new.txt',str1,str2,{
    context: 3
}));

console.log(patch[0].hunks)


// step one, get two files f1,f2
// copy the contents in a temp directory
// 
