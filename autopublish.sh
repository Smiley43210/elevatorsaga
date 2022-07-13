git checkout gh-pages;
git pull --rebase origin gh-pages;
git merge main;
git push origin gh-pages;
git checkout main;