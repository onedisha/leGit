let workingDir = './../playground/';
const baseDirs = [
    '.legit/refs/heads',
    '.legit/objects'
];
const baseFiles = [
    '.legit/HEAD',
    '.legit/index'
];
const baseRef = 'ref: refs/heads/main';
const INDEX = '.legit/index';
const objectDir = '.legit/objects/';
let username = 'lemon';
let email = 'lemon@hoggy.com';
let commitMessage = 'commit 2';
const yellowColor = "\x1b[33m";
const resetColor = "\x1b[0m";

const global = {
    workingDir,
    baseDirs,
    baseFiles,
    baseRef,
    INDEX,
    objectDir,
    username,
    email,
    commitMessage,
    yellowColor,
    resetColor
}



module.exports = global;