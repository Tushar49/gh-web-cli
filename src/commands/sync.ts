import { defineCommand } from "citty"
import consola from "consola"
import { createCDPSession } from "../cdp/session.js"
import { syncFork } from "../github/sync.js"
import { resolveRepo } from "./shared.js"

export const syncCommand = defineCommand({
  meta: {
    name: "sync",
    description: "Sync a fork's branch from upstream via the GitHub web UI",
  },
  args: {
    repo: { type: "string", required: true, description: "Fork as owner/repo" },
    branch: { type: "string", default: "main", description: "Branch to sync (default: main)" },
    port: { type: "string", default: "9222", description: "Chrome remote-debugging port" },
  },
  async run({ args }) {
    const { owner, repo } = resolveRepo(args.repo)
    const session = await createCDPSession({ port: Number(args.port) })
    try {
      const tabId = await session.findOrOpenTab(
        `${owner}/${repo}`,
        `https://github.com/${owner}/${repo}`,
      )
      await syncFork(session, tabId, { owner, repo, branch: args.branch })
      consola.success(`Synced ${owner}/${repo}@${args.branch} from upstream`)
    } finally {
      await session.close()
    }
  },
})
