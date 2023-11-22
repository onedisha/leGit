const fs = require("fs");
const globals = require("../globals");

function createEmptyFile(path) {
  try {
    fs.closeSync(fs.openSync(globals.rootDir + path, "w"));
  } catch (err) {
    console.log(err);
  }
}

function deleteFile(path) {
  fs.rmSync(globals.rootDir + path, {
    force: true,
  });
}

function deleteDir(path) {
  fs.rmSync(globals.rootDir + path, {
    force: true,
    recursive: true,
  });
}

function createDir(path) {
  fs.mkdirSync(globals.rootDir + path, {
    recursive: true,
  });
}

function listPathsInRoot(path, currDir = "") {
  let childPaths = fs
    .readdirSync(globals.rootDir + path)
    .map((file) => {
      if (currDir) return currDir + "/" + file.replace(/\\/g, "/");
      return file.replace(/\\/g, "/");
    })
    .filter((e) => e);
  let newfiles = [];
  for (let childPath of childPaths) {
    if (isDir(childPath)) {
      newfiles = [...newfiles, ...listPathsInRoot(childPath, childPath)];
    }
  }
  return [...childPaths, ...newfiles];
}

// TODO this is convoluted and ugly like this because of lacking implementation of list paths in Dir
function listPathsInDir(path) {
  if (path == "" || path == "./") return listPathsInRoot("");
  return listPathsInRoot("")
    .filter((line) => {
      return line && line.slice(0, path.length) == path;
    })
    .map((line) => {
      return line.slice(path.length + 1);
    })
    .filter((e) => e);
}

function writeToFile(path, data, encoding = "utf-8") {
  fs.writeFileSync(globals.rootDir + path, data, {
    encoding: encoding,
  });
}

function readFile(path, encoding = "utf-8") {
  return fs
    .readFileSync(globals.rootDir + path, {
      encoding: encoding,
    })
    .toString()
    .replace(/\r\n/g, "\n");
}

function pathExists(path) {
  return fs.existsSync(globals.rootDir + path);
}

function isFile(path) {
  return fs.statSync(globals.rootDir + path).isFile();
}

function isDir(path) {
  return fs.statSync(globals.rootDir + path).isDirectory();
}

function lsCaller(...args) {
  if (args.length == 0) args = [""];
  console.log(listPathsInDir(globals.rootToWorkingPath + args[0]));
}

module.exports = {
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
}