export interface ParsedRepo {
  owner: string
  repo: string
}

export function resolveRepo(value: string): ParsedRepo {
  const parts = value.split("/")
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Expected --repo as <owner>/<repo>, got: ${value}`)
  }
  return { owner: parts[0]!, repo: parts[1]! }
}

export interface ParsedPr extends ParsedRepo {
  number: number
}

export function resolvePr(value: string): ParsedPr {
  // Accepts owner/repo#123 OR owner/repo/123
  const hashMatch = value.match(/^([^/]+)\/([^/#]+)[#/](\d+)$/)
  if (!hashMatch) {
    throw new Error(`Expected --pr as <owner>/<repo>#<number>, got: ${value}`)
  }
  return { owner: hashMatch[1]!, repo: hashMatch[2]!, number: Number(hashMatch[3]) }
}
