const globals = require("./../globals");
const {
  createEmptyFile,
  deleteFile,
  deleteDir,
  createDir,
  listPathsInDir,
  writeToFile,
  readFile,
  pathExists,
  isFile,
  isDir
} = require('../util/fs_util');
const {
  isInit,
  createObjectFromFileContent,
  debug,
  logMessage,
  setRootDir,
  hash,
  compress,
  decompress,
  getObjectFromHash,
  getLastCommit,
  createCommitStr,
  updateRefsWithCommit,
  formatTimestamp,
  parseCommit,
  getBranches,
  isDetached,
  getCurrentBranch
} = require('../util/util.js');
const { getCommitFromBranch } = require("./checkout.js");

function logCaller(...args) {
  log();
}

function logCommit(file, commitHash) {
  // let author = file[1].split(" ")[1];
  // let timestamp = file[1].split(" ")[3];
  // let commitMsg = file[4];
  // if (file[1].split(" ")[0] != "author") {
  //   //if parent exists
  //   author = file[2].split(" ")[1];
  //   timestamp = file[2].split(" ")[3];
  //   commitMsg = file[5];
  // }
  // console.log(
  //   `${globals.yellowColor}commit ${commitHash}${globals.resetColor}`
  // );
  // console.log("Author:", author);
  // console.log("Date:", formatTimestamp(parseInt(timestamp)));
  // console.log(`\n${commitMsg}\n`);
  let parsed = parseCommit(commitHash);
  let lastCommit = getLastCommit();
  let commitTags = [];
  let tags = "";
  if(lastCommit==commitHash){
    if(isDetached()){
      commitTags.push("HEAD");
    }
    else{
      commitTags.push(`HEAD->${getCurrentBranch()}`);
    }
  }
  getBranches().forEach(branch=>{
    if(getCommitFromBranch(branch)==commitHash && branch!=getCurrentBranch()){
      commitTags.push(branch);
    }
  })
  if(commitTags.length!=0){
    tags = ` (${commitTags.join(" ,")})`;
  }
  // commit str
  let logMsg = "";
  logMsg += `${globals.yellowColor}commit ${commitHash}${globals.resetColor}${tags}\n`;
  if(parsed.merge != undefined){
    logMsg += `Merge: ${parsed.incoming.slice(0,7)} ${parsed.current.slice(0,7)}\n`;
  }
  logMsg += `Author: ${parsed.author} <${parsed.email}>\n`;
  logMsg += `Date: ${ formatTimestamp(parseInt(parsed.time))}\n`;
  logMsg +=  `\n${parsed.message}\n`;
  console.log(logMsg);
}

function log() {
  // TODO log is not functioning coz of merge fix it
  let lastCommit = getLastCommit();
  if (!lastCommit) {
    console.log("You haven't committed anything");
    return;
  }
  let file = getObjectFromHash(lastCommit).split("\n");
  let parent = file[1].split(" ")[0];

  while (parent === "parent") {
    logCommit(file, lastCommit);
    lastCommit = file[1].split(" ")[1];
    file = getObjectFromHash(lastCommit).split("\n");
    parent = file[1].split(" ")[0];
  }
  logCommit(file, lastCommit);
}

module.exports = {
  logCaller,
  log,
  logCommit
}