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

## git init
this command should create the bare basic files required for git to work,
- .git
- .git/refs
- .git/refs/heads
- .git/HEAD
- .git/objects

and insert ref: refs/heads/main inside .git/HEAD

## git add
this command should convert all the files listed to blobs and add them to .git/objects and store their information temporarily in 
'.git/index'

index should be in the form of 
hash path-to-filename

index should onli contain files, which are added and are not ignored, even if the hash is the same in the last tree, even if it has no change from before. for same hash cases they are handled later, at this stage everything that is added is listed.

blobs once created are never deleted. so in case new files are staged, dont delete blobs that are created previously.

created blobs must be in '.git/objects'

## git commit
