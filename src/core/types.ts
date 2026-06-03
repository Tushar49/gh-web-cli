import type { CDPSession } from "../cdp/session.js"

export interface RepoSpec {
  owner: string
  repo: string
}

export interface BranchRef {
  owner: string
  repo: string
  branch: string
}

export interface PrRef {
  owner: string
  repo: string
  number: number
}

export interface FileUploadSpec {
  /** Absolute path on disk to the file to upload. */
  localPath: string
  /** Path within the repo where the file should land (forward slashes). */
  repoPath: string
}

export interface CommitOptions {
  message: string
  /** When set, the commit lands on this new branch instead of the targeted branch. */
  newBranch?: string
}

export interface ConflictResolution {
  /** "ours" keeps the PR side, "theirs" keeps the base side, "custom" expects a resolver callback. */
  strategy: "ours" | "theirs" | "custom"
  /** Custom resolver: receives the file path and its raw conflict-marked content; returns the final content. */
  resolver?: (filename: string, conflicted: string) => string | Promise<string>
}

export interface DriverContext {
  session: CDPSession
  tabId: string
}

export type CommandResult<T> = {
  ok: true
  value: T
} | {
  ok: false
  error: string
  hint?: string
}
