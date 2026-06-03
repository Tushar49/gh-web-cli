#!/usr/bin/env node
import { defineCommand, runMain } from "citty"
import consola from "consola"
import { uploadCommand } from "./commands/upload.js"
import { deleteCommand } from "./commands/delete.js"
import { syncCommand } from "./commands/sync.js"
import { conflictCommand } from "./commands/conflict.js"
import { prCommand } from "./commands/pr.js"
import { commentCommand } from "./commands/comment.js"
import { editPrCommand } from "./commands/edit-pr.js"
import { browserCommand } from "./commands/browser.js"

const main = defineCommand({
  meta: {
    name: "gh-web-cli",
    version: "0.1.0",
    description:
      "Drive GitHub from your terminal without `git push` — uses your already-running Chrome session via CDP. Built for managed laptops, EMU accounts, and locked-down corporate environments.",
  },
  subCommands: {
    upload: uploadCommand,
    delete: deleteCommand,
    sync: syncCommand,
    conflict: conflictCommand,
    pr: prCommand,
    comment: commentCommand,
    "edit-pr": editPrCommand,
    browser: browserCommand,
  },
})

runMain(main).catch((error) => {
  consola.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
