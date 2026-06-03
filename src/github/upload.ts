import path from "node:path"
import { setReactInputValue, requestSubmitForm } from "./auth.js"
import type { CDPSession } from "../cdp/session.js"
import type { BranchRef, CommitOptions, FileUploadSpec } from "../core/types.js"

const UPLOAD_FILE_INPUT = "#upload-manifest-files-input"

export interface UploadResult {
  branch: string
  url: string
}

/**
 * Upload one or more files to a branch via GitHub's /upload/<branch>/<path> web page.
 * When commit.newBranch is set, a new branch is created from the upload target instead.
 */
export async function uploadFiles(
  session: CDPSession,
  tabId: string,
  ref: BranchRef,
  files: FileUploadSpec[],
  commit: CommitOptions,
): Promise<UploadResult> {
  if (files.length === 0) throw new Error("No files supplied to upload")

  const firstRepoDir = path.posix.dirname(files[0]!.repoPath)
  const uploadUrl = buildUploadUrl(ref, firstRepoDir)
  await session.navigate(tabId, uploadUrl)
  await session.waitForLoad(tabId)
  await session.waitForSelector(tabId, UPLOAD_FILE_INPUT)

  await session.setFileInput(
    tabId,
    UPLOAD_FILE_INPUT,
    files.map((file) => file.localPath),
  )

  await session.waitForSelector(tabId, "#commit-summary-input")
  await setReactInputValue(session, tabId, "#commit-summary-input", commit.message)

  const branchName = commit.newBranch
  if (branchName) {
    await session.evaluate<void>(
      tabId,
      `() => {
        const radios = document.querySelectorAll('input[name="commit-choice"]');
        if (radios.length < 2) throw new Error("Could not find commit-choice radios");
        radios[1].checked = true;
        radios[1].dispatchEvent(new Event("change", { bubbles: true }));
      }`,
    )
    await session.waitForSelector(tabId, 'input[placeholder="New branch name"]')
    await setReactInputValue(session, tabId, 'input[placeholder="New branch name"]', branchName)
  }

  await requestSubmitForm(session, tabId, "form")
  await session.waitForLoad(tabId, 45000)

  return {
    branch: branchName ?? ref.branch,
    url: `https://github.com/${ref.owner}/${ref.repo}/tree/${branchName ?? ref.branch}/${firstRepoDir}`,
  }
}

function buildUploadUrl(ref: BranchRef, repoDir: string): string {
  const normalizedDir = repoDir === "." || repoDir === "" ? "" : `/${trimSlashes(repoDir)}`
  return `https://github.com/${ref.owner}/${ref.repo}/upload/${encodeURIComponent(ref.branch)}${normalizedDir}`
}

function trimSlashes(input: string): string {
  return input.replace(/^\/+|\/+$/g, "")
}
