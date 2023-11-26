// generate the patch object of old.txt to new.txt from the test dir
// apply the patch to the contents of old.txt and store the output in a newfile called out.txt

const fs = require("fs");
const diff = require("diff");

let oldfilestrs = fs
  .readFileSync("test/old.txt", "utf-8")
  .replace(/\r\n/g, "\n");
let newfilestrs = fs
  .readFileSync("test/new.txt", "utf-8")
  .replace(/\r\n/g, "\n");

let outfilestr = "";
let outfilepath = "out.txt";

let patchConfig = {
  context: 3,
};
let patch = diff.structuredPatch("old", "new", oldfilestrs, newfilestrs,"","", patchConfig);
fs.writeFileSync('out.txt',JSON.stringify(patch,null,2))
// console.log(JSON.stringify(patch,null,2));

fs.writeFileSync('base.txt',oldfilestrs);

// apply the patch on base.txt
let hunks = patch.hunks;
let oldLines = oldfilestrs.split('\n');
let newLines = [];
let tillNextHunk=0;
let currentLineInOld = 0;
for(let hunk of hunks){
  // add lies till next hunk
  tillNextHunk = hunk.oldStart-1;
  while(currentLineInOld<tillNextHunk){
    newLines.push(oldLines[currentLineInOld]);
    currentLineInOld++;
  }
  // apply the patch
  for(let line of hunk.lines){
    if(line[0]==" "){
      newLines.push(oldLines[currentLineInOld]);
      currentLineInOld++;
    }
    if(line[0]=="+"){
      newLines.push(line.slice(1));
    }
    if(line[0]=="-"){
      // dont push
      currentLineInOld++;
    }
  }
}
// add the stuff at the end of the file
while(currentLineInOld<oldLines.length){
  newLines.push(oldLines[currentLineInOld]);
  currentLineInOld++;
}

// update base.txt
fs.writeFileSync('base.txt',newLines.join('\n'));