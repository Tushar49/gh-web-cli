import { defineCommand } from "citty"
import consola from "consola"
import { createCDPSession } from "../cdp/session.js"
import { resolveConflicts } from "../github/conflict.js"
import { resolvePr } from "./shared.js"

export const conflictCommand = defineCommand({
  meta: {
    name: "conflict",
    description:
      "Resolve every conflicted file on a PR via the web conflict editor (strategy: ours | theirs)",
  },
  args: {
    pr: {
      type: "string",
      required: true,
      description: "PR identifier as owner/repo#number (e.g. anomalyco/opencode#29686)",
    },
    strategy: {
      type: "string",
      default: "ours",
      description: "Conflict-resolution strategy: ours (keep PR side) or theirs (keep base side)",
    },
    port: { type: "string", default: "9222", description: "Chrome remote-debugging port" },
  },
  async run({ args }) {
    const pr = resolvePr(args.pr)
    const strategy = args.strategy
    if (strategy !== "ours" && strategy !== "theirs") {
      throw new Error(`Unsupported --strategy "${strategy}". Use "ours" or "theirs".`)
    }
    const session = await createCDPSession({ port: Number(args.port) })
    try {
      const tabId = await session.findOrOpenTab(
        `${pr.owner}/${pr.repo}/pull/${pr.number}`,
        `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`,
      )
      const result = await resolveConflicts(session, tabId, pr, { strategy })
      consola.success(
        `Resolved ${result.resolvedFiles.length} conflicted file(s) on ${pr.owner}/${pr.repo}#${pr.number}`,
      )
      for (const file of result.resolvedFiles) consola.info(`  - ${file}`)
    } finally {
      await session.close()
    }
  },
})
