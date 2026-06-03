import fs from "node:fs/promises"
import { defineCommand } from "citty"
import consola from "consola"
import { createCDPSession } from "../cdp/session.js"
import { editPullRequest } from "../github/comment.js"
import { resolvePr } from "./shared.js"

export const editPrCommand = defineCommand({
  meta: {
    name: "edit-pr",
    description: "Edit the title and/or body of a pull request via the GitHub web UI",
  },
  args: {
    pr: { type: "string", required: true, description: "PR identifier as owner/repo#number" },
    title: { type: "string", description: "New PR title" },
    body: { type: "string", description: "New PR body" },
    "body-file": { type: "string", description: "New PR body read from a local file" },
    port: { type: "string", default: "9222", description: "Chrome remote-debugging port" },
  },
  async run({ args }) {
    if (!args.title && !args.body && !args["body-file"]) {
      throw new Error("Provide at least one of --title, --body, --body-file")
    }
    const pr = resolvePr(args.pr)
    const body = args["body-file"] ? await fs.readFile(args["body-file"], "utf8") : args.body

    const session = await createCDPSession({ port: Number(args.port) })
    try {
      const tabId = await session.findOrOpenTab(
        `${pr.owner}/${pr.repo}/pull/${pr.number}`,
        `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`,
      )
      await editPullRequest(session, tabId, pr, { title: args.title, body })
      consola.success(`Edited PR ${pr.owner}/${pr.repo}#${pr.number}`)
    } finally {
      await session.close()
    }
  },
})
