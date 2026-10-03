# Automatic website updates

Locknight pushes to `main` request a website sync. The website advances its
`tools/locknight` submodule, copies the app, builds the full site, and creates or
updates a PR from the fixed branch `automation/locknight` to `main`.
Several pushes before merge update the same open PR. The sync always reads the
latest source `main`, so closely spaced pushes can be combined. It never merges
the PR automatically. Merging the PR runs the existing Pages deployment.

The website also polls at minutes 7, 22, 37, and 52 each hour. GitHub can delay
scheduled jobs; this is a fallback, not a guaranteed 15-minute delivery time.
When the website's main branch already pins the latest source commit, no build,
commit, or PR is created. While a PR is open, later runs can rebuild the same
pending source against the current website main. After merging, the next source
update creates a new PR using the same automation branch.

## Install in the website

The initial Locknight integration must be merged into the website's `main`
before this workflow can run there. If `add-locknight` is still open, add the
workflow to that branch and merge it as part of the existing PR.

From the website terminal, on `add-locknight` or a new setup branch:

```powershell
Set-Location 'C:\Users\natjo\Documents\Projects\Baegll.github.io'
node ../locknight/scripts/install-website-automation.mjs .
git diff --check
git add .github/workflows/sync-locknight.yml
git diff --cached --check
git diff --cached --stat
git commit -m "Automate Locknight website update PRs"
git push
```

Merge the setup PR. A schedule and manual Actions runs use the workflow on the
website's default branch.

In **Baegll.github.io → Settings → Actions → General → Workflow permissions**,
enable **Allow GitHub Actions to create and approve pull requests**. The workflow
requests Contents write and Pull requests write permissions. It uses the website's
own `GITHUB_TOKEN`; you do not need to put a PAT in the website repository.

## Enable immediate push notifications

Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new):

- Resource owner: Baegll.
- Repository access: only `Baegll.github.io`.
- Repository permission: **Actions — Read and write**.
- Use an expiration you can maintain. Metadata read is supplied automatically.

Save it in **locknight → Settings → Secrets and variables → Actions → New
repository secret**, named `WEBSITE_SYNC_TOKEN`. Enter the token only in GitHub's
secret field. This permission is required by the
[workflow dispatch endpoint](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event).

Commit and push the source changes from the Locknight terminal:

```powershell
Set-Location 'C:\Users\natjo\Documents\Projects\locknight'
git add .github/workflows/notify-website.yml automation/website/sync-locknight.yml scripts/install-website-automation.mjs AUTOMATION.md PUBLISH.md
git diff --cached --check
git diff --cached --stat
git commit -m "Notify website and automate Locknight update PRs"
git push origin main
```

Install and merge the website workflow before enabling the notification token.
Without the token, notifications show a notice and the scheduled sync handles
updates. An expired or invalid token makes the notification job fail visibly;
the website's scheduled sync still works.

## Review and operation

Use **Baegll.github.io → Actions → Sync Locknight → Run workflow** to request
a sync manually. Review the PR named **Update Locknight**. When source changes
arrive, its commit, diff, and source link are refreshed instead of creating
another open PR. The branch is reserved for automation; make source changes in
Locknight. Closing without merging does not permanently suppress future updates.

If the website build fails, the job fails before publishing changes to the PR.
Any existing PR retains its previous successful update. Fix the build and rerun.
The workflow serializes sync jobs to avoid simultaneous branch writes.

PRs created with the default `GITHUB_TOKEN` do not start separate push or PR
workflows. The sync workflow therefore performs the full build before updating
the PR. If you later require PR status checks through branch protection, configure
a GitHub App token for the PR action so those checks can start. See
[create-pull-request documentation](https://github.com/peter-evans/create-pull-request#token).

This session can prepare these files but cannot write the original website or
Git metadata. GitHub execution and deployment must be verified after installation.
