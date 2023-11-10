let rootDir = "./../playground/";
const baseDirs = [".legit/refs/heads", ".legit/objects"];
const baseFiles = [".legit/HEAD", ".legit/index"];
const baseRef = "ref: refs/heads/main";
const indexDir = ".legit/index";
const objectDir = ".legit/objects/";
const headsDir = ".legit/refs/heads/"
let username = "lemon";
let email = "lemon@hoggy.com";
let commitMessage = "commit 2";
const yellowColor = "\x1b[33m";
const greenColor = "\x1b[32m";
const resetColor = "\x1b[0m";

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
  greenColor
};

module.exports = global;