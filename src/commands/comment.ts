import fs from "node:fs/promises"
import { defineCommand } from "citty"
import consola from "consola"
import { createCDPSession } from "../cdp/session.js"
import { postComment } from "../github/comment.js"
import { resolvePr } from "./shared.js"

export const commentCommand = defineCommand({
  meta: {
    name: "comment",
    description: "Post a comment on a pull request or issue via the GitHub web UI",
  },
  args: {
    pr: {
      type: "string",
      required: true,
      description: "PR/issue identifier as owner/repo#number",
    },
    body: { type: "string", description: "Comment body as a string" },
    "body-file": { type: "string", description: "Comment body read from a local file" },
    port: { type: "string", default: "9222", description: "Chrome remote-debugging port" },
  },
  async run({ args }) {
    if (!args.body && !args["body-file"]) {
      throw new Error("Provide --body or --body-file")
    }
    const pr = resolvePr(args.pr)
    const body = args["body-file"] ? await fs.readFile(args["body-file"], "utf8") : args.body!

    const session = await createCDPSession({ port: Number(args.port) })
    try {
      const tabId = await session.findOrOpenTab(
        `${pr.owner}/${pr.repo}/pull/${pr.number}`,
        `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`,
      )
      await postComment(session, tabId, pr, body)
      consola.success(`Posted comment on ${pr.owner}/${pr.repo}#${pr.number}`)
    } finally {
      await session.close()
    }
  },
})
