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
let patch = diff.structuredPatch(
  "old",
  "new",
  oldfilestrs,
  newfilestrs,
  patchConfig
);
if (!patch) exit();
let hunks = patch.hunks;
console.log(hunks);
let oldfilelist = oldfilestrs.split("\n");

let nextOffset = 0;
let startFromLine = 0;
for (let hunk of hunks) {
  let line = hunk.oldStart - 1 + nextOffset;
  startFromLine = line + hunk.newLines - 1;
  for (let i = line; i < startFromLine; i++) {
    outfilestr += hunk.lines[i].slice(1);
  }
  nextOffset = hunk.newLines - hunk.oldLines;

  for (let i in hunk.lines) {
    let line = hunk.lines[i];
    let action = line[0];
    line = line.slice(1) + "\n";
    if (action == " ") {
      outfilestr += line;
      i++;
    } else if (action == "+") {
      outfilestr += line;
      line++;
    } else if (action == "-") {
    }
  }
}

fs.writeFileSync(outfilepath, outfilestr, "utf-8");
