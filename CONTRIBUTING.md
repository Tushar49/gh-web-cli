# Contributing to gh-web-cli

Thanks for opening this - most CDP-on-GitHub problems are wedge-shaped, and the only way out is more people who hit them.

## Quick start

```bash
git clone https://github.com/Tushar49/gh-web-cli
cd gh-web-cli
npm install
npm run typecheck
npm test
npm run build
node dist/cli.js --help
```

Node 20+. Chromium-based browser launched with `--remote-debugging-port=9222`.

## How the codebase is laid out

- `src/cdp/session.ts` - thin wrapper over `chrome-remote-interface`. If you add a new CDP primitive, it goes here.
- `src/github/` - one file per GitHub flow (`upload`, `delete`, `sync`, `conflict`, `pr`, `comment`, plus `auth.ts` for the React-fiber + form-submit helpers). **All GitHub-specific selectors live here so they're easy to fix when GitHub renames something.**
- `src/commands/` - citty subcommand wiring. One file per CLI verb, plus `shared.ts` for argument parsing.
- `src/core/types.ts` - public shapes (`BranchRef`, `PrRef`, `ConflictResolution`).
- `test/` - vitest. Keep tests pure (no real CDP); the conflict-marker regex is inlined into `test/conflict.test.ts` for that reason.

## Adding a new GitHub flow

1. Add a driver to `src/github/<name>.ts` that takes a `CDPSession` and returns plain data.
2. Add a subcommand in `src/commands/<name>.ts` that parses CLI args and calls the driver.
3. Register the subcommand in `src/cli.ts` under `subCommands`.
4. Add the verb to the README's "Commands" block.
5. Add at least one unit test if there's pure logic (parser, helper). Don't try to mock GitHub end-to-end - those live in your manual QA.

## Filing a bug

When GitHub renames a selector or changes a flow, that's the most common failure. Help us by including:

- The exact command you ran, and the output (with `--debug` if applicable).
- The GitHub page URL where the flow ran.
- Browser console output if there was a JS error.
- A note about whether you saw the problem in Chrome, Edge, or Brave.

## Conventions

- TypeScript strict mode is on. No `any`, no `as unknown as T` casts.
- ESM imports use `.js` suffix (NodeNext resolution).
- One blank line between top-level blocks. No trailing semicolons.
- Conventional commits in the title (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- PRs should keep `npm test`, `npm run typecheck`, and `npm run build` green. CI runs all three on Linux, macOS, and Windows for Node 20 and 22.

## License

By contributing you agree your contributions are licensed under the project's MIT license.
