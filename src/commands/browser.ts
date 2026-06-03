import { defineCommand } from "citty"
import consola from "consola"
import CDP from "chrome-remote-interface"

export const browserCommand = defineCommand({
  meta: {
    name: "browser",
    description: "Inspect the CDP connection (which tabs are open, who's signed in)",
  },
  args: {
    port: { type: "string", default: "9222", description: "Chrome remote-debugging port" },
    host: { type: "string", default: "localhost" },
  },
  async run({ args }) {
    const host = args.host
    const port = Number(args.port)
    const version = await CDP.Version({ host, port }).catch((cause: unknown) => {
      const message = cause instanceof Error ? cause.message : String(cause)
      throw new Error(
        `Could not reach Chrome DevTools Protocol at http://${host}:${port}/json/version. ` +
          `Launch your browser with --remote-debugging-port=${port}. (${message})`,
      )
    })

    const targets = await CDP.List({ host, port })
    const pageTargets = targets.filter((target) => target.type === "page")
    consola.success(`Connected to ${version.Browser} (${version["Webkit-Version"]})`)
    consola.info(`Open tabs (${pageTargets.length}):`)
    for (const target of pageTargets) {
      consola.log(`  • ${target.title}\n    ${target.url}`)
    }
  },
})
