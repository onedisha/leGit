const globals = require("./../globals");

const {
  listPathsInDir,
  writeToFile,
  readFile,
  pathExists,
  isFile,
} = require('../util/fs_util');

const {
  isInit,
  createObjectFromFileContent,
  hash
} = require('../util/util');

function addCaller(...args) {
  if (["-A", "--all"].includes(args[0])) {
    addAll();
    return;
  }

  // if(['.','./'].includes(args[0])){
  //   let files = listPathsInDir(globals.rootToWorkingPath).filter((file) => {
  //     return isFile(globals.rootToWorkingPath+file) && !isIgnoredFromAdd(globals.rootToWorkingPath+file);
  //   }).map(file=> {
  //     return globals.rootToWorkingPath+file;
  //   });
  //   console.log(files);
  //   add(files);
  //   return;
  // }

  // TODO need to add ../ resolution support
  let files = args.map((file) => {
    return globals.rootToWorkingPath + file;
  });
  for (let file of files) {
    if (!(pathExists(file) && isFile(file))) {
      console.log(`fatal: pathspec '${file}' did not match any files`);
      return;
    }
  }
  add(files);
}

function add(files) {
  if (!isInit()) {
    console.log(".legit files missing");
    return;
  }

  let indexContent = "";

  for (let file of files) {
    let fileContent = readFile(file);
    let fileHash = hash(fileContent);

    indexContent += `${fileHash} ${file}\n`;

    createObjectFromFileContent(fileContent);
  }

  writeToFile(globals.indexDir, indexContent);
}

function addAll() {
  if (!isInit()) {
    console.log(".legit files missing");
    return;
  }
  let files = listPathsInDir("").filter((file) => {
      return isFile(file) && !isIgnoredFromAdd(file);
  });
  add(files);
}

function isIgnoredFromAdd(file) {
  return file.slice(0, 7) == ".legit/";
}

module.exports = {
  addCaller,
  add,
  addAll, 
  isIgnoredFromAdd
};