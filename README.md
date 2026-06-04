# gh-web-cli

> Drive GitHub from your terminal **without `git push`** - for managed laptops, locked-down corporate environments, and EMU accounts where personal-account auth just doesn't work.

[![CI](https://github.com/Tushar49/gh-web-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/Tushar49/gh-web-cli/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/Tushar49/gh-web-cli.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](#requirements)

If you've ever been blocked by **"GraphQL: Unauthorized: As an Enterprise Managed User, you cannot access this content"** or had `git push` hang forever on a credential popup that never surfaces, this CLI is for you.

`gh-web-cli` connects to **your already-running Chrome** over the Chrome DevTools Protocol, reuses your existing browser session cookies, and drives GitHub's web UI to do the things `gh` and `git` can't on a managed machine:

- Push files to a branch (upload OR overwrite, single file or many)
- Delete files on a branch
- Sync a fork from upstream
- Resolve PR merge conflicts (even the ones GitHub calls "too complex for the web editor")
- Create pull requests
- Post comments and edit PR titles or bodies

No personal access token. No SSH key. No `git push`. Just the browser you're already signed into.

## Quick start

```bash
# 1) Launch (or restart) your browser with remote debugging enabled
chrome --remote-debugging-port=9222

# 2) Sign into github.com in that browser as the account you want to use

# 3) Drive GitHub from your terminal
node dist/cli.js upload \
  --repo Tushar49/my-fork \
  --branch feature/x \
  --files ./src/foo.ts,./src/bar.ts \
  --message "feat: add foo + bar"
```

That's it. The CLI talks to Chrome on `localhost:9222`, navigates to GitHub's upload page, uploads the files, and commits - all under whatever account is logged in.

## Why this exists

GitHub's official tools assume you can authenticate from your terminal:

| Scenario | `git push` | `gh` CLI | `gh-web-cli` |
|---|:-:|:-:|:-:|
| Personal laptop, personal account | OK | OK | OK |
| Corporate laptop, work SSO | flaky | EMU-limited | OK |
| Managed Windows + Credential Manager popups | hangs | flaky | OK |
| Microsoft EMU account on public repos | no | unauthorized | OK |
| Anywhere a personal PAT isn't allowed by policy | no | no | OK |

If any row above sounds familiar, you know the pain.

## Commands

```text
gh-web-cli upload    Upload one or more files to a branch
gh-web-cli delete    Delete a file from a branch
gh-web-cli sync      Sync a fork's branch from its upstream
gh-web-cli conflict  Resolve PR merge conflicts (ours / theirs)
gh-web-cli pr        Create a pull request
gh-web-cli comment   Post a comment on a PR or issue
gh-web-cli edit-pr   Edit a pull request's title or body
gh-web-cli browser   Inspect the CDP connection
```

Run any command with `--help` for full options.

## Requirements

- Node.js 20 or newer
- A Chromium-based browser (Chrome, Edge, Brave) launched with `--remote-debugging-port=9222`
- An active github.com session in that browser

## Install

Until the first npm release lands, run from a local clone:

```bash
git clone https://github.com/Tushar49/gh-web-cli
cd gh-web-cli
npm install
npm run build
node dist/cli.js --help
```

Once published, `npm install -g gh-web-cli` (or `npx gh-web-cli`) will be the one-liner.

## Status

Early. Ships with the techniques originally reverse-engineered to land [a handful of PRs](https://github.com/Tushar49?tab=repositories) from a managed Microsoft EMU laptop where every other tool failed. PRs welcome - especially for non-Chromium browsers, non-Windows quirks, and additional GitHub flows.

## Roadmap

- `rebase` (one-shot sync + upload changed files + conflict-resolve)
- `release` (create a GitHub Release with notes + assets)
- Cookie-based fallback so it works in headless CI too
- Firefox support

## License

MIT
