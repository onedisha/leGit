let rootDir = "./../playground/"; // tells you 
const baseDirs = [".legit/refs/heads", ".legit/objects"];
const baseFiles = [".legit/HEAD", ".legit/index",".legit/config"];
const baseRef = "ref: refs/heads/main";
const indexDir = ".legit/index";
const objectDir = ".legit/objects/";
const headsDir = ".legit/refs/heads/"
let username = "";
let email = "";
let commitMessage = "";
const yellowColor = "\x1b[33m";
const greenColor = "\x1b[32m";
const resetColor = "\x1b[0m";
const rootToWorkingPath = "";

const global = {
  rootDir,
  baseDirs,
  baseFiles,
  baseRef,
  indexDir,
  objectDir,
  username,
  email,
  commitMessage,
  yellowColor,
  resetColor,
  headsDir,
  greenColor,
  rootToWorkingPath
};

module.exports = global;
