<h1 align="center"> leGit </h1>
Implemention of Git with Node.js

## Introduction
<p align="justify">
leGit is a project that replicates git in node. leGit does not aim to be isomorphic with git or even work with existing git repositories. leGit was made to be a project that teaches us a lot about git and software project development. While that is said and leGit isnt isomorphic with git, it has all the same features that git has.

## Features
The followings are implemented in leGit and work similarly as in git, with the options supported in square brackets

- [x] legit init
- [x] legit add [-A, file list]
- [x] legit commit [-m, edit message using editor]
- [x] legit log
- [x] legit branch [branch name to create, no arguments to list branchces]
- [x] legit checkout [-b, commit hash, branch name]
- [x] legit reset [commit hash]
- [x] legit status
- [x] legit merge

## Differences from git

While these commands work similarly there are a few differences to note:
- reset --mixed and --hard do not restore the index file to how it was during the target commit but clear them instead so there is a need to add again as required
- the implementation does not implement plumbing commands underneath
- force line endings, while reading a file, leGit autoconverts lineendings to \n. so while your working dir may contain CRLF, commits only contain LF and checking out any commit **will** replace line endings.
- in case of a merge conflict, we do not follow the same procedure as git, we use MERGE_HEAD alone to help identify incoming commit. during the commit, the index file does maintain 3 different versions of the files, the only thing that happens is conflict markers appearing in the conflicted files, need to make changes to show the conflicted files. The merge can be completed by merge --continue

## Future plans
<p align="justify">
Currently only the local commands of git are implemented. Once merge, rebase, status, stash are implemented the project will head towards remote implementations which will include fetch, remote, push, and PR mechanics will be implemented 

## Installation
<p align="justify">
To work with or use legit, 
** currently the pkg package only works with node version <=18.17.1, so for node v > 18.17.1 you need to find ways to convert the files into binary yourself. We will provide a fix for it soon.

1. Clone the repo and cd into it
    ```
    git clone https://github.com/onedisha/leGit.git
    cd leGit
    ```
2. Install dependencies
    ```
    npm i
    npm i --global pkg
    ```
3. Add current working directory to Path
    ```
    pwd (get path and use that)
    // add that to the syste env path
    ```
4. Change the path variable in src/index.js file to the path of src/legit.js
    ```
    npm run bin
    ```

Now feel free to use this version of legit anywhere in your system, note that it takes the live version of all the contents of legit.js each time, hence your changes if any will affect the places where you use legit.

---
<div align="center">
With ❤️ from Disha and Udith
</div>
