# leGit design doc

basic .git structure

```
.git
    /refs
        /heads
            /main
    /HEAD
    /index
    /objects
        /1f
            /aedfawdff...
        /ce
            /feeafeafr...
```

## list of commands to implement

```
 - [x] git init
 - [x] git add
 - [x] git commit
 - [x] git log
 - [x] git checkout
 - [ ] git status
 - [ ] git branch
 - [ ] git merge
 - [ ] git reset
```

## git init (filename option)

this command should create the bare basic files required for git to work,
dirs

- .git
- .git/refs
- .git/refs/heads
- .git/objects
  files
- .git/HEAD
- .git/index

and insert ref: refs/heads/main inside .git/HEAD

## git add (-A, ,filenames)

this command should convert all the files listed to blobs and add them to .git/objects and store their information temporarily in
'.git/index'

index should be in the form of
hash path-to-filename

index should onli contain files, which are added and are not ignored, even if the hash is the same in the last tree, even if it has no change from before. for same hash cases they are handled later, at this stage everything that is added is listed.

blobs once created are never deleted. so in case new files are staged, dont delete blobs that are created previously.

created blobs must be in '.git/objects'

## git status

this command pretty prints the files that are tracked by git, and mention which ones are stages and which ones aren't. It aso shoes which files have been modified but not staged.

## git commit (with -m option and editor option)

this command is three steps

1. with the list of the current files in index, form a tree object, create all intemediate trees necessary.
   - remember the tree should include all the files that are in the previous commit as well.
     <!-- if there is no previous commit, technicallly this is taken care of because of how hashing works, but do note this when working on the code -->
     each tree object should be like an index file, with additional mention of type
2. create a commit object with the root of tree, commiter name, email, commit message, commit description and add it to .git/objects
3. add the commit if to the refs/heads/branch that the HEAD is currently pointing to.

## git log (--oneline and normal)

## git checkout (commit, branch, -b option)

this command needs to compare both the trees of current head and the head to which we are checking out, deleting files which dont exist and adding files which do and populating them with the contents of the hashes. Also obviously this also needs to change the reference that the HEAD is currently pointing to. Either to a new ref or to a commit

## git branch (create, delete)

this command (referring to creation of branch) simple changes the pointer that HEAD is pointing to.

- there is a slight confusion about whether to copy the contents of place from which to branch

## git reset (hard)

this command, only the hard version just removes the last commit from the current branch file in refs/heads/branch
the other versions can be implemented later
