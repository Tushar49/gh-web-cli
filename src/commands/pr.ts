import fs from "node:fs/promises"
import { defineCommand } from "citty"
import consola from "consola"
import { createCDPSession } from "../cdp/session.js"
import { createPullRequest } from "../github/pr.js"
import { resolveRepo } from "./shared.js"

export const prCommand = defineCommand({
  meta: {
    name: "pr",
    description: "Open a pull request via the GitHub compare page",
  },
  args: {
    base: {
      type: "string",
      required: true,
      description: "Target as owner/repo:branch (default-branch if omitted, e.g. anomalyco/opencode:dev)",
    },
    head: {
      type: "string",
      required: true,
      description: "Source as owner/branch (e.g. Tushar49/feat-x)",
    },
    title: { type: "string", required: true, description: "Pull request title" },
    body: { type: "string", description: "Pull request body as a string" },
    "body-file": { type: "string", description: "Pull request body read from a local file" },
    port: { type: "string", default: "9222", description: "Chrome remote-debugging port" },
  },
  async run({ args }) {
    const baseParts = args.base.match(/^([^/]+)\/([^:]+):(.+)$/)
    if (!baseParts) throw new Error(`Expected --base as <owner>/<repo>:<branch>, got: ${args.base}`)
    const headParts = args.head.match(/^([^/]+)\/(.+)$/)
    if (!headParts) throw new Error(`Expected --head as <owner>/<branch>, got: ${args.head}`)

    const base = resolveRepo(`${baseParts[1]}/${baseParts[2]}`)
    const body = args["body-file"]
      ? await fs.readFile(args["body-file"], "utf8")
      : (args.body ?? "")

    const session = await createCDPSession({ port: Number(args.port) })
    try {
      const tabId = await session.findOrOpenTab(
        `${base.owner}/${base.repo}`,
        `https://github.com/${base.owner}/${base.repo}`,
      )
      const result = await createPullRequest(session, tabId, {
        baseOwner: base.owner,
        baseRepo: base.repo,
        baseBranch: baseParts[3]!,
        headOwner: headParts[1]!,
        headBranch: headParts[2]!,
        title: args.title,
        body,
      })
      consola.success(`Opened PR: ${result.url}`)
    } finally {
      await session.close()
    }
  },
})
