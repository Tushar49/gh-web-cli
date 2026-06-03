import { describe, it, expect } from "vitest"
import { resolveRepo, resolvePr } from "../src/commands/shared.js"

describe("resolveRepo", () => {
  it("parses a valid owner/repo", () => {
    expect(resolveRepo("Tushar49/gh-web-cli")).toEqual({
      owner: "Tushar49",
      repo: "gh-web-cli",
    })
  })

  it("accepts hyphens, dots, and underscores in repo names", () => {
    expect(resolveRepo("octocat/Hello-World.foo_bar")).toEqual({
      owner: "octocat",
      repo: "Hello-World.foo_bar",
    })
  })

  it("rejects a missing slash", () => {
    expect(() => resolveRepo("just-a-name")).toThrow(/owner.*repo/i)
  })

  it("rejects a leading slash", () => {
    expect(() => resolveRepo("/repo")).toThrow(/owner.*repo/i)
  })

  it("rejects three or more segments", () => {
    expect(() => resolveRepo("a/b/c")).toThrow(/owner.*repo/i)
  })

  it("rejects an empty string", () => {
    expect(() => resolveRepo("")).toThrow(/owner.*repo/i)
  })
})

describe("resolvePr", () => {
  it("parses owner/repo#number", () => {
    expect(resolvePr("anomalyco/opencode#29562")).toEqual({
      owner: "anomalyco",
      repo: "opencode",
      number: 29562,
    })
  })

  it("parses owner/repo/number as a tolerant alias", () => {
    expect(resolvePr("anomalyco/opencode/29562")).toEqual({
      owner: "anomalyco",
      repo: "opencode",
      number: 29562,
    })
  })

  it("rejects missing number", () => {
    expect(() => resolvePr("anomalyco/opencode")).toThrow(/number/i)
  })

  it("rejects a non-numeric number", () => {
    expect(() => resolvePr("anomalyco/opencode#abc")).toThrow(/number/i)
  })

  it("rejects extra segments", () => {
    expect(() => resolvePr("a/b/c/123")).toThrow(/number/i)
  })
})
