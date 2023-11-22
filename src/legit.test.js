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
  setUpGlobals,
  isDetached
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

// setup
setRootDir(process.cwd() + "/tests/playground/");
globals.commitFileCommand = 'echo "this is triggered during tests"';
deleteDir("");
let logs = [];
let clearLogs = () => (logs = []);
let savedLog = console.log;
console.log = (...msg) => {
  logs.push(msg);
};
Date.prototype.getTime = () => {
  return 1699514055972;
};

// checking if basic stuff works

describe("utils", () => {
  test("Create Dir recursively", () => {
    createDir(".legit/bash/king");
    expect(pathExists(".legit/bash/king")).toBe(true);
  });

  test("Delete Dir Recursively", () => {
    // adding file to check if that causes issues
    createEmptyFile(".legit/bash/testing.txt");
    deleteDir(".legit");
    expect(pathExists(".legit/bash/king")).toBe(false);
  });

  test("list files in path recursively", () => {
    createDir(".legit/bash/lemon");
    createDir(".legit/zsh/hoggy");
    createDir("king/queen");
    expect(listPathsInDir("./").length).toBe(7);
    let expectedPaths = [
      ".legit",
      "king",
      ".legit/bash",
      ".legit/zsh",
      "king/queen",
      ".legit/bash/lemon",
      ".legit/zsh/hoggy",
    ];
    expect(listPathsInDir("./").sort()).toMatchObject(expectedPaths.sort());
    deleteDir(".legit");
    deleteDir("king");
  });

  test("need to fix compress and decompress on refactoring", () => {
    createObjectFromFileContent("lemon and hoggy");
    expect(getObjectFromHash(hash("lemon and hoggy"))).toBe("lemon and hoggy");
  });
});

describe("core functions", () => {
  test("init creates all files and dirs with content", () => {
    deleteDir("");
    init();
    let paths = [...globals.baseDirs, ...globals.baseFiles];
    for (path of paths) {
      expect(pathExists(path)).toBe(true);
    }
    expect(readFile(".legit/HEAD")).toBe(globals.baseRef);
  });

  // ! first commit will have
  // ! /a
  // !     /b.js -> console.log("first commit");
  // !     /c.txt -> this is a text file of first commit
  // ! /d
  // !     /e.py -> python for ML
  // ! /f.md / -> first commit

  test("add adds all files listed to index", () => {
    // create necessary files and directories
    createDir("a");
    createEmptyFile("a/b.js");
    writeToFile("a/b.js", 'console.log("first commit");');
    createEmptyFile("a/c.txt");
    writeToFile("a/c.txt", "this is a text file of first commit");
    createDir("d");
    createEmptyFile("d/e.py");
    writeToFile("d/e.py", "python for ML");
    createEmptyFile("f.md");
    writeToFile("f.md", "first commit");
    createDir("newbi");
    createEmptyFile("newbi/bi");
    writeToFile("newbi/bi", "Hello this proves checkout works 100%");
    // add onli some files
    add(["a/b.js", "d/e.py"]);
    let fileContentExpected = [
      "b99f235d70f2731866e6b7a579096f6e1c464418 a/b.js",
      "e0ac32a4fbac194965fd752f8d8ee7b4b490e937 d/e.py",
    ];
    expect(
      readFile(globals.indexDir)
        .split("\n")
        .filter((e) => e)
        .sort()
    ).toMatchObject(fileContentExpected.sort());
    addAll();
    fileContentExpected = [
      "d1d3e1e0ac19290a75d74f10e3481938b7154fa1 f.md",
      "ceb4d88f37509ab646c530a957cb595a69d3a5f0 a/c.txt",
      "e0ac32a4fbac194965fd752f8d8ee7b4b490e937 d/e.py",
      "b99f235d70f2731866e6b7a579096f6e1c464418 a/b.js",
      "4067a19a938805bec87f52eab9407a0431411b33 newbi/bi",
    ];
    expect(
      readFile(globals.indexDir)
        .split("\n")
        .filter((e) => e)
        .sort()
    ).toMatchObject(fileContentExpected.sort());
  });

  test("contents of blobs are valid", () => {
    expect(getObjectFromHash("d1d3e1e0ac19290a75d74f10e3481938b7154fa1")).toBe(
      "first commit"
    );
  });

  test("tree is valid", () => {
    let fileToHash = {};
    let indexFiles = readFile(globals.indexDir)
      .split("\n")
      .filter((line) => line.length != 0)
      .map((line) => {
        let [hash, path] = line.split(" ");
        fileToHash[path] = hash;
        return path;
      })
      .sort();
    let tree = indexToTree(indexFiles, fileToHash);
    let root = {
      name: "root",
      type: "tree",
      children: tree,
    };
    addTreeToObjects(root);
    // TODO update this after updating compress and decompress
    expect(root.hash).toBe("4afb75897deb6fa4c116438f4807fcfe4ddf0a31");
  });

  test("commit: commit obj is of correct format", () => {
    // TODO write commit str parser and stringifier
    let commitLines = [
      "tree 4afb75897deb6fa4c116438f4807fcfe4ddf0a31",
      "author lemon <lemon@hoggy.com> 1699514055972",
      "committer lemon <lemon@hoggy.com> 1699514055972",
      "",
      "commit 1",
      "",
    ];
    globals.username = "lemon";
    globals.email = "lemon@hoggy.com";
    globals.commitMessage = "commit 1";
    expect(getCurrentBranch()).toBe("main");
    commit();
    expect(getCurrentBranch()).toBe("main");
    expect(getLastCommit()).toBe("b049e50aeb70329e33419c68ea3caa4d2c887701");
  });

  test("log prints out all the necessary output", () => {
    clearLogs();
    log();
    let expectedLog = [
      `${globals.yellowColor}commit b049e50aeb70329e33419c68ea3caa4d2c887701${globals.resetColor}`,
      "Author:",
      "lemon",
      "Date:",
      "Thu, Nov 09, 2023, 12:44:15 PM GMT+5:30",
      "\ncommit 1\n",
    ];
    expect(logs.flat()).toMatchObject(expectedLog);
    clearLogs();
  });

  // ! second commit will be
  // ! second commit will have
  // ! /a
  // !     /b.js -> console.log("second commit");
  // !     /p.kt -> "this is a new file for second commit"
  // ! /d
  // !     /e.py -> python for ML
  // ! /g.md / -> first commit

  test("checkout works as intended and only affects files in the commit", () => {
    let checkoutHash = getLastCommit();
    expect(checkoutHash).toBe('b049e50aeb70329e33419c68ea3caa4d2c887701');
    // add changes and add a commit
    writeToFile("a/b.js", 'console.log("second commit");');
    createEmptyFile("a/p.kt");
    writeToFile("a/p.kt", '"this is a new file for second commit"');
    deleteFile("a/c.txt");
    deleteFile("f.md");
    createEmptyFile("g.md");
    writeToFile("g.md", "first commit");
    deleteDir("newbi");
    globals.commitMessage = "second commit";
    globals.email = "hoggy@lemon.com";
    globals.username = "hoggy";
    addAll();
    commit();
    expect(getLastCommit()).toBe("20c0d16d7ce0aab898ec527afe4dde39836ddce0");

    let expectedLog = [
      `${globals.yellowColor}commit 20c0d16d7ce0aab898ec527afe4dde39836ddce0${globals.resetColor}`,
      "Author:",
      "hoggy",
      "Date:",
      "Thu, Nov 09, 2023, 12:44:15 PM GMT+5:30",
      "\nsecond commit\n",
      `${globals.yellowColor}commit b049e50aeb70329e33419c68ea3caa4d2c887701${globals.resetColor}`,
      "Author:",
      "lemon",
      "Date:",
      "Thu, Nov 09, 2023, 12:44:15 PM GMT+5:30",
      "\ncommit 1\n",
    ];
    clearLogs();
    log();
    expect(logs.flat()).toMatchObject(expectedLog);
    // expected files exists coz commit hash is correct

    checkoutCommit(checkoutHash);
    // check if previous files exist
    expect(pathExists("a/b.js")).toBe(true);
    expect(readFile("a/b.js")).toBe('console.log("first commit");');
    expect(pathExists("a/c.txt")).toBe(true);
    expect(readFile("a/c.txt")).toBe("this is a text file of first commit");
    expect(pathExists("f.md")).toBe(true);
    expect(readFile("f.md")).toBe("first commit");
    expect(pathExists("newbi/bi")).toBe(true);
    expect(readFile("newbi/bi")).toBe("Hello this proves checkout works 100%");

    expect(pathExists("a/p.kt")).toBe(false);
    expect(pathExists("g.md")).toBe(false);
    // deleteDir("")
  });
  
  test('branch ',()=>{
    checkoutCommit('20c0d16d7ce0aab898ec527afe4dde39836ddce0'); // commit 2
    let branchName = 'lemon/hoggy';
    createBranch(branchName);
    expect(pathExists('.legit/refs/heads/'+branchName) && isFile('.legit/refs/heads/'+branchName)).toBe(true);
    clearLogs();
    listBranches();
    let expectedLog = [
        `  ${globals.greenColor}(HEAD in detached state) at 20c0d16d7ce0aab898ec527afe4dde39836ddce0${globals.resetColor}`,
        "  main",
        "  lemon/hoggy",
      ]
    expect(logs.flat()).toMatchObject(expectedLog);
    checkoutCommit('b049e50aeb70329e33419c68ea3caa4d2c887701');
    expect(pathExists("a/b.js")).toBe(true);
    expect(readFile("a/b.js")).toBe('console.log("first commit");');
    expect(pathExists("a/c.txt")).toBe(true);
    expect(readFile("a/c.txt")).toBe("this is a text file of first commit");
    expect(pathExists("f.md")).toBe(true);
    expect(readFile("f.md")).toBe("first commit");
    expect(pathExists("newbi/bi")).toBe(true);
    expect(readFile("newbi/bi")).toBe("Hello this proves checkout works 100%");

    expect(pathExists("a/p.kt")).toBe(false);
    expect(pathExists("g.md")).toBe(false);

  })
  
  test("checkout branch by name",()=>{
    expect(getCurrentBranch()).toBe(false);
    checkoutBranch('lemon/hoggy');
    expect(readFile('.legit/HEAD')).toBe('ref: refs/heads/lemon/hoggy');
    expect(getCommitFromBranch('lemon/hoggy')).toBe('20c0d16d7ce0aab898ec527afe4dde39836ddce0');
    expect(pathExists("a/b.js")).toBe(true);
    expect(pathExists("a/c.txt")).toBe(false);
    expect(pathExists("f.md")).toBe(false);
    expect(pathExists("newbi/bi")).toBe(false);

    expect(pathExists("a/p.kt")).toBe(true);
    expect(pathExists("g.md")).toBe(true);
  })

  test("merge-ff",()=>{
    deleteDir("");
    init();

    createDir("a");
    createEmptyFile("a/b.js");
    writeToFile("a/b.js", 'console.log("first commit");');
    createEmptyFile("a/c.txt");
    writeToFile("a/c.txt", "this is a text file of first commit");
    // commit
    addAll();
    commit();
    expect(getLastCommit()).toBe('249c1fdda48b84662820d255fcca432f1963966c');
    createBranch('feat');
    createBranch('merge');
    writeToFile("a/b.js", 'console.log("second commit");');
    writeToFile("a/c.txt", "this is a text file of second commit");
    addAll();
    commit();
    expect(getLastCommit()).toBe('c2e1fbf165ccb816961a23ae51ba008be2e110e8');
    // 7b4b2407cdf826a32c5b52cb14bae13bfde37842
    expect(parseCommit('c2e1fbf165ccb816961a23ae51ba008be2e110e8').parent).toBe('249c1fdda48b84662820d255fcca432f1963966c');
    expect(getCommonAncestor('c2e1fbf165ccb816961a23ae51ba008be2e110e8','249c1fdda48b84662820d255fcca432f1963966c')).toBe('249c1fdda48b84662820d255fcca432f1963966c');
    // create two branches
    checkoutBranch('feat');
    writeToFile("a/b.js", 'console.log("third feat commit");');
    writeToFile("a/c.txt", "this is a text file of third feat commit");
    addAll();
    commit();
    expect(getLastCommit()).toBe('caf84658308c3b299a0a21dd55355f9d0659057e');
    // a3de53759cfee2505b35d691d301aa79dcc0ae42
    expect(parseCommit('caf84658308c3b299a0a21dd55355f9d0659057e').parent).toBe('249c1fdda48b84662820d255fcca432f1963966c');
    expect(getCommonAncestor('caf84658308c3b299a0a21dd55355f9d0659057e','c2e1fbf165ccb816961a23ae51ba008be2e110e8')).toBe('249c1fdda48b84662820d255fcca432f1963966c');
    
    // fast forward merge of feat into merge
    // ! before merge
    // 4c17 -- 7b4b --(main)
    //  | \
    //  |  a3de -- (feat)
    //  (merge)
    checkoutBranch('merge');
    expect(getLastCommit()).toBe('249c1fdda48b84662820d255fcca432f1963966c');
    merge('feat');
    expect(getLastCommit()).toBe('caf84658308c3b299a0a21dd55355f9d0659057e');
    // ! after merge
    // 4c17 -- 7b4b --(main)
    //    \
    //     a3de -- (feat,merge)

    // true merge of feat into main
    // 
    
  })

  
  test('merge-true',()=>{
    deleteDir("");
    clearLogs();
    init();
    // first/fifth
    //  /a.md -> this is a
    //  /b.md -> this is b
    // second/sixth
    //  /c.md -> this is c
    //  /d.md -> this is d
    // third
    //  e.md -> this is e
    let dirs = ['first/fifth','second/sixth','third'];
    let files = [
      ['first/fifth/a.md',"this is a"],
      ['first/fifth/b.md',"this is b"],
      ['second/sixth/c.md',"this is c"],
      ['second/sixth/d.md',"this is d"],
      ['third/e.md',"this is e"]
    ]
    for(let dir of dirs){
      createDir(dir);
    }
    for(let [name,content] of files){
      createEmptyFile(name);
      writeToFile(name,content);
    }
    addAll();
    globals.commitMessage = "merge Base";
    commit();
    createBranch('feat');
    log();
    // first/fifth
    //  /a.md -> this is a in main // modified in main
    //  /b.md -> this is b // deleted in both
    // second/sixth
    //  /c.md -> this is c // no change in both
    //  /d.md -> this is d // delete this in main
    //  /e.md -> this is e new in main // created in main
    // third // delete Dir in main ignore in 
    //  e.md -> this is e
    // fourth // created in main
    //  /ff.md -> this is ff
    dirs = ['fourth'];
    files = [
      ['first/fifth/a.md',"this is a in main"],
      ['second/sixth/e.md',"this is d"],
      ['fourth/ff.md',"this is ff"]
    ]
    let delFiles = [
      'first/fifth/b.md',
      'second/sixth/d.md',
    ]
    let delDirs = ['third'];
    for(let dir of dirs){
      createDir(dir);
    }
    for(let [name,content] of files){
      if(!pathExists(name))
        createEmptyFile(name);
      writeToFile(name,content);
    }
    for(let files of delFiles){
      deleteFile(files);
    }
    for(let dir of delDirs){
      deleteDir(dir);
    }
    addAll();
    globals.commitMessage = "main second modification commit";
    commit();
    log();
    checkoutBranch('feat');
    // first/fifth
    //  /a.md -> this is a in main // modified in main
    //  /b.md -> this is b // deleted in both
    // second/sixth
    //  /c.md -> this is c // no change in both
    //  /d.md -> this is d // delete this in main
    //  /e.md -> this is e new in main // created in main
    // third // delete in both
    //  e.md -> this is e
    // fourthe // created in feat
    //  /ff.md -> this is ff
    dirs = ['fourthe'];
    files = [
      ['fourthe/ff.md',"this is ff"]
    ]
    delFiles = [
      'first/fifth/b.md'
    ]
    delDirs = [
      'third'
    ]
    for(let dir of dirs){
      createDir(dir);
    }
    for(let [name,content] of files){
      if(!pathExists(name))
        createEmptyFile(name);
      writeToFile(name,content);
    }
    for(let files of delFiles){
      deleteFile(files);
    }
    for(let dir of delDirs){
      deleteDir(dir);
    }
    addAll();
    globals.commitMessage = "this is feat commit";
    commit();
    log();
    checkoutBranch('main');
    merge('feat');
    // log();
    expect(getLastCommit()).toBe("9feec136b98f7d4f3c5096d1367d726a92848b71");
    // savedLog(logs.flat().join('\n'));
    // first/fifth
    //  /a.md -> this is a in main // modified in main
    //  /b.md -> this is b // deleted in both
    // second/sixth
    //  /c.md -> this is c // no change in both
    //  /d.md -> this is d // delete this in main
    //  /e.md -> this is d // created in main
    // third // delete in both
    //  e.md -> this is e
    // fourthe // created in feat
    //  /ff.md -> this is ff
    deleteDir("");
  })
  // test('edge cases for the above when empty strings are added in the end of a file')
  // test('when the order of files change in commit messages)

});
// TODO unit tests

describe('unit tests',()=>{
  
})
