import { defineCommand } from "citty"
import consola from "consola"
import { createCDPSession } from "../cdp/session.js"
import { deleteFile } from "../github/delete.js"
import { resolveRepo } from "./shared.js"

export const deleteCommand = defineCommand({
  meta: {
    name: "delete",
    description: "Delete a file from a branch via the GitHub web UI",
  },
  args: {
    repo: { type: "string", required: true, description: "owner/repo" },
    branch: { type: "string", required: true, description: "Target branch" },
    path: { type: "string", required: true, description: "Path of the file to delete" },
    message: { type: "string", required: true, description: "Commit message" },
    "new-branch": { type: "string", description: "Commit to a new branch with this name" },
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
      const result = await deleteFile(
        session,
        tabId,
        { owner, repo, branch: args.branch },
        args.path,
        { message: args.message, newBranch: args["new-branch"] },
      )
      consola.success(`Deleted ${args.path} on ${owner}/${repo}@${result.branch}`)
    } finally {
      await session.close()
    }
  },
})
