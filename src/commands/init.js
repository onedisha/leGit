const globals = require("./../globals");
const {
  createEmptyFile,
  createDir,
  writeToFile,
} = require('../util/fs_util');

function initCaller(...args) {
  globals.rootDir = process.cwd().replace(/\\/g, "/") + "/";
  init();
}

function init() {
  for (let dir of globals.baseDirs) {
    createDir(dir);
  }
  for (let file of globals.baseFiles) {
    createEmptyFile(file);
  }
  writeToFile(".legit/HEAD", globals.baseRef);
  writeToFile(".legit/config", `name lemon\nemail lemon@hoggymail.com`);
}

module.exports = {
  init,
  initCaller
}