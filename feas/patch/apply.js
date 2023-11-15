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
let patch = diff.createPatch("old", "new", oldfilestrs, newfilestrs, patchConfig);
console.log(patch);
