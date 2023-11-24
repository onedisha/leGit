const { execSync } = require("child_process");
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
  getBranches,
  getCurrentBranch,
  parseCommit
} = require('../util/util.js');
const {
  updateFilesFromTrees
} = require('./checkout.js');