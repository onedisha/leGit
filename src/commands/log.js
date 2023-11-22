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
} = require('../util/util.js');

function logCaller(...args) {
  log();
}

function logCommit(file, commitHash) {
  let author = file[1].split(" ")[1];
  let timestamp = file[1].split(" ")[3];
  let commitMsg = file[4];
  if (file[1].split(" ")[0] != "author") {
    //if parent exists
    author = file[2].split(" ")[1];
    timestamp = file[2].split(" ")[3];
    commitMsg = file[5];
  }
  console.log(
    `${globals.yellowColor}commit ${commitHash}${globals.resetColor}`
  );
  console.log("Author:", author);
  console.log("Date:", formatTimestamp(parseInt(timestamp)));
  console.log(`\n${commitMsg}\n`);
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