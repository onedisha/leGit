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
  fullCommitHash,
  getCurrentBranch
} = require('../util/util.js');
const {
    updateFilesFromTrees
} = require('./checkout');

function resetCaller(...args) {
    if (!["--soft", "--mixed", "--hard"].includes(args[0])) {
      reset("--mixed", args[0]);
    } else reset(args[0], args[1]);
  }

  function reset(mode, commit) {
    if (!fullCommitHash(commit)) {
      console.log("invalid Commit");
      return;
    }
    let currCommit = getLastCommit();
    let currBranch = getCurrentBranch();
    writeToFile(globals.headsDir + currBranch, fullCommitHash(commit));
  
    if (mode == "--mixed") {
      writeToFile(globals.indexDir, "");
    } else if (mode == "--hard") {
      writeToFile(globals.indexDir, "");
      let currTreeHash = getObjectFromHash(currCommit)
        .split("\n")[0]
        .split(" ")[1];
      let nextTreeHash = getObjectFromHash(fullCommitHash(commit))
        .split("\n")[0]
        .split(" ")[1];
      updateFilesFromTrees(currTreeHash, nextTreeHash);
    }
  }

  module.exports = {
    resetCaller,
    reset
  }