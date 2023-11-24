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

const {
  statusCaller,
} = require('./commands/status');

module.exports = {
  lsCaller,
  initCaller,
  addCaller,
  commitCaller,
  logCaller,
  checkoutCaller,
  branchCaller,
  mergeCaller,
  resetCaller,
  statusCaller,
  setUpGlobals
}