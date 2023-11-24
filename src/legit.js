const {
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
  setUpGlobals,
} = require('./callers');

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
  merge: mergeCaller,
  status: statusCaller,
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