1. with the list of the current files in index, form a tree object, create all intemediate trees necessary.
    - remember the tree should include all the files that are in the previous commit as well. if there is no previous commit, technicallly this is taken care of because of how hashing works, but do note this when working on the code
2. create a commit object with the root of tree, commiter name, email, commit message, commit description and add it to .git/objects