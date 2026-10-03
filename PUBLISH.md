# Publish Locknight

Keep the source in `Baegll/locknight`. Deploy it at
`https://baegll.github.io/projects/locknight/` through `Baegll/Baegll.github.io`.
The website holds a Git submodule pinned to a Locknight commit. Its build copies
the app from that submodule. A Windows junction is not needed on GitHub.

The local repository is initialized on `main`, but has no commits or remote yet.
The filesystem sandbox rejects writes to `.git`, so staging, committing, and
remote configuration could not be completed here. Network access to GitHub is
also blocked. The original website is outside the writable workspace. Run the
following commands in your normal PowerShell terminal. Stop if a command fails.

## 1. Create the source repository and push

Create an **empty public** repository named `locknight` under `Baegll` at
[GitHub new repository](https://github.com/new). Leave README, license, and gitignore
unchecked because they are already in this project. Public visibility lets the
website workflow fetch the submodule with its existing credentials.

```powershell
Set-Location 'C:\Users\natjo\Documents\Projects\locknight'
git status
git config user.name 'Baegll'
git config user.email 'nat.johanek@gmail.com'
git add .
git diff --cached --check
git diff --cached --stat
git commit -m "Implement Locknight drafts, player profiles, and match records"
git remote add origin https://github.com/Baegll/locknight.git
git log -1 --oneline
git remote -v
git push -u origin main
```

These commands set the repository identity to the name and email returned by your
connected GitHub profile. They do not change global Git settings. The existing
global email has a spelling difference. Adjust the local email before committing
if you prefer another verified address. Git Credential Manager can handle sign-in
when pushing.
If you already have GitHub CLI, the alternative to creating the repository in the
browser is `gh repo create Baegll/locknight --public`; then run the push above.
See [GitHub CLI repository creation](https://cli.github.com/manual/gh_repo_create).

## 2. Connect the website

Start with a clean website working tree. `git status` must show no pending changes.

```powershell
Set-Location 'C:\Users\natjo\Documents\Projects\Baegll.github.io'
git status
git switch main
git pull --ff-only
git switch -c add-locknight
git submodule add -b main https://github.com/Baegll/locknight.git tools/locknight
node tools/locknight/scripts/integrate.mjs .
```

The integration script now resolves its source from its own location. It works
when called from the website root. It copies app files and adds the project card
once. It uses the website's existing layout, theme, assets, and Astro dependency.
The copied app files are generated from the pinned submodule; edit the source in
the Locknight repository and repeat integration for future changes.

In `.github/workflows/deploy.yml`, add submodule checkout to the existing checkout
step:

```yaml
      - uses: actions/checkout@v4
        with:
          submodules: recursive
```

Add this step immediately before the existing Astro build step:

```yaml
      - name: Integrate Locknight
        run: node tools/locknight/scripts/integrate.mjs .
```

Keep the website's existing Pages upload and deployment steps. Submodule support
is documented in [actions/checkout](https://github.com/actions/checkout#usage).

Then build and commit:

```powershell
npm.cmd ci
npm.cmd run build
git diff --check
git diff --stat
git add .gitmodules tools/locknight .github/workflows/deploy.yml src/client src/lib src/config src/vendor src/styles/locknight.css src/pages/projects public/projects/locknight
git diff --cached --stat
git commit -m "Add Locknight drafts and records to personal website"
git push -u origin add-locknight
```

Open a pull request from `add-locknight` to `main` in `Baegll/Baegll.github.io`.
Merge after review and the build passes. The existing main-branch Pages workflow
publishes the app. Check the app and preferences URLs after deployment.

The full website build has not passed inside this managed session: its existing
Quartz blog bundler hits a directory-access error. The standalone Locknight build
passes. Verify the full website build in your normal terminal before merging.

## 3. Update later

For push notifications and one reusable website update PR, follow
[AUTOMATION.md](AUTOMATION.md). The manual commands below remain available.

Commit and push Locknight source changes first. In the website repository:

```powershell
git switch main
git pull --ff-only
git switch -c update-locknight
git submodule update --init --remote tools/locknight
node tools/locknight/scripts/integrate.mjs .
npm.cmd run build
git add tools/locknight src/client src/lib src/config src/vendor src/styles/locknight.css src/pages/projects public/projects/locknight
git diff --cached --stat
git commit -m "Update Locknight"
git push -u origin update-locknight
```

The website commit pins the new submodule version. Create and review a pull request.
Fresh website clones need `git clone --recurse-submodules` or
`git submodule update --init --recursive`.

## Start the lobby

Open `/projects/locknight/`. Existing browser records stay intact; export a backup
and choose **Data & patches → Start fresh** if you want to clear an old demo session.
New browsers start with zero players and matches, 24 supplied patch records, and
configured rating parameters. Import player files or add players, mark at least
12 Ready, and draft. Share `/projects/locknight/preferences/` with the players.

Real lobby records belong in browser storage or your own backups. `records/`,
`private/`, environment files, dependencies, build output, and browser artifacts
are ignored by Git. The public starting JSON must remain empty unless you intend
to publish the records it contains.
