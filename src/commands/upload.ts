import path from "node:path"
import { defineCommand } from "citty"
import consola from "consola"
import { createCDPSession } from "../cdp/session.js"
import { uploadFiles } from "../github/upload.js"
import { resolveRepo } from "./shared.js"

export const uploadCommand = defineCommand({
  meta: {
    name: "upload",
    description: "Upload one or more files to a branch via the GitHub web UI",
  },
  args: {
    repo: {
      type: "string",
      required: true,
      description: "Target repo as owner/repo (e.g. Tushar49/gh-web-cli)",
    },
    branch: {
      type: "string",
      required: true,
      description: "Target branch on the repo",
    },
    files: {
      type: "string",
      required: true,
      description: "Comma-separated list of local file paths to upload",
    },
    message: {
      type: "string",
      required: true,
      description: "Commit message",
    },
    "new-branch": {
      type: "string",
      description: "If set, commit the upload to a new branch with this name",
    },
    port: {
      type: "string",
      default: "9222",
      description: "Chrome remote-debugging port",
    },
  },
  async run({ args }) {
    const { owner, repo } = resolveRepo(args.repo)
    const localFiles = args.files
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => path.resolve(entry))

    const session = await createCDPSession({ port: Number(args.port) })
    try {
      const tabId = await session.findOrOpenTab(
        `${owner}/${repo}`,
        `https://github.com/${owner}/${repo}`,
      )
      const result = await uploadFiles(
        session,
        tabId,
        { owner, repo, branch: args.branch },
        localFiles.map((localPath) => ({
          localPath,
          repoPath: path.posix.basename(localPath),
        })),
        {
          message: args.message,
          newBranch: args["new-branch"],
        },
      )
      consola.success(`Uploaded ${localFiles.length} file(s) to ${owner}/${repo}@${result.branch}`)
      consola.info(result.url)
    } finally {
      await session.close()
    }
  },
})
