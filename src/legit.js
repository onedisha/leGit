const globals = require("./globals");

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
  isDir,
  lsCaller
} = require('./util/fs_util');

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
  getBranches,
  fullCommitHash,
  getCurrentBranch,
  parseCommit,
  isDetached,
  setUpGlobals,
} = require('./util/util.js');

const {
  init,
  initCaller
} = require('./commands/init');

const {
  addCaller,
  add,
  addAll
} = require('./commands/add');

const {
  commitCaller,
  commit,
  indexToTree,
  addTreeToObjects,
  createTree,
  noChangesToCommit
} = require('./commands/commit');

const {
  logCaller,
  log,
  logCommit
} = require('./commands/log');

const {
  checkoutCaller,
  checkoutCommit,
  checkoutBranch,
  getCommitFromBranch,
  updateFilesFromTrees
} = require('./commands/checkout');

const {
  branchCaller,
  createBranch,
  listBranches
} = require('./commands/branch');

const {
  merge,
  mergeCaller,
  getMergedTree,
  getTreeFromHash,
  getCommonAncestor
}= require('./commands/merge');

const {
  resetCaller,
  reset
} = require('./commands/reset');

// commandline parser
let commands = {
  init: initCaller,
  add: addCaller,
  ls: lsCaller,
  commit: commitCaller,
  log: logCaller,
  branch: branchCaller,
  checkout: checkoutCaller,
  reset: resetCaller,
  merge: mergeCaller
};

commandlineParser();
function commandlineParser() {
  let args = process.argv.slice(2);
  if (args.length == 0) {
    // tests in progress
    return;
  }
  if (!(args[0] in commands)) {
    console.log("invalid command, please try again");
    return;
  }
  if (args[0] != "init") setUpGlobals();
  commands[args[0]](...args.slice(1));
}