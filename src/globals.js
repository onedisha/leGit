let rootDir = "./../playground/";
const baseDirs = [".legit/refs/heads", ".legit/objects"];
const baseFiles = [".legit/HEAD", ".legit/index"];
const baseRef = "ref: refs/heads/main";
const indexDir = ".legit/index";
const objectDir = ".legit/objects/";
let username = "lemon";
let email = "lemon@hoggy.com";
let commitMessage = "commit 2";
const yellowColor = "\x1b[33m";
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
};

module.exports = global;
