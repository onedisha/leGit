# Engineering docs
## steps to work on a feature
```
git pull origin main
git checkout -b feature-branch
-- do work here --
git commit
git push origin feature-branch
raise pull request from github UI and accept PR
git checkout main
git branch -D feature-branch
```

work on a feature branch and then submit pull request

## unit tests for functions
use a test suite and ensure all functions being written are tested so we prevent regressions.

## end to end tests for the entire project
use a program to make a repo and check the contents of the repo when the necessary commands are run, check if files are corectly generated and all functions work just like expected.

## 