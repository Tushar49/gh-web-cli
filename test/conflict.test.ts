import { describe, it, expect } from "vitest"

/**
 * Inline copy of the conflict-marker resolver from src/github/conflict.ts so
 * we can unit-test it without standing up a real CDP session. Keep this in
 * lockstep with the source - any change to the production regex needs the
 * same change here.
 */
function applyOurs(conflicted) {
  const pattern = /<<<<<<<[^\n]*\n([\s\S]*?)=======[^\n]*\n([\s\S]*?)>>>>>>>[^\n]*\n?/g
  return conflicted.replace(pattern, (_match, ours) => ours)
}

function applyTheirs(conflicted) {
  const pattern = /<<<<<<<[^\n]*\n([\s\S]*?)=======[^\n]*\n([\s\S]*?)>>>>>>>[^\n]*\n?/g
  return conflicted.replace(pattern, (_match, _ours, theirs) => theirs)
}

const SIMPLE = `function greet() {
<<<<<<< feature/x
  return "hello from PR"
=======
  return "hello from main"
>>>>>>> main
}
`

const MULTI_HUNK = `// header
<<<<<<< feature/x
const a = 1
=======
const a = 2
>>>>>>> main
// middle
<<<<<<< feature/x
const b = "ours"
=======
const b = "theirs"
>>>>>>> main
// footer
`

const NESTED_CONTENT = `const config = {
<<<<<<< feature/x
  retries: 5,
  timeout: 30_000,
=======
  retries: 3,
>>>>>>> main
}
`

describe("conflict marker resolver", () => {
  it("keeps the PR side when strategy is ours (simple)", () => {
    const out = applyOurs(SIMPLE)
    expect(out).toContain('return "hello from PR"')
    expect(out).not.toContain("hello from main")
    expect(out).not.toMatch(/<{7}|>{7}|={7}/)
  })

  it("keeps the base side when strategy is theirs (simple)", () => {
    const out = applyTheirs(SIMPLE)
    expect(out).toContain('return "hello from main"')
    expect(out).not.toContain("hello from PR")
    expect(out).not.toMatch(/<{7}|>{7}|={7}/)
  })

  it("handles multiple hunks in a single file", () => {
    const out = applyOurs(MULTI_HUNK)
    expect(out).toContain("const a = 1")
    expect(out).toContain('const b = "ours"')
    expect(out).not.toContain("const a = 2")
    expect(out).not.toContain('const b = "theirs"')
    expect(out).not.toMatch(/<{7}|>{7}|={7}/)
  })

  it("preserves multi-line hunk content", () => {
    const out = applyOurs(NESTED_CONTENT)
    expect(out).toContain("retries: 5")
    expect(out).toContain("timeout: 30_000")
    expect(out).not.toContain("retries: 3")
  })

  it("leaves non-conflicted content untouched", () => {
    const clean = "no markers here\nanother line\n"
    expect(applyOurs(clean)).toBe(clean)
    expect(applyTheirs(clean)).toBe(clean)
  })

  it("preserves trailing newline after the closing marker", () => {
    const withTrailing = "<<<<<<< x\na\n=======\nb\n>>>>>>> y\nafter\n"
    expect(applyOurs(withTrailing)).toBe("a\nafter\n")
  })
})
