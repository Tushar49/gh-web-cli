import CDP from "chrome-remote-interface"
import consola from "consola"

export interface CDPSessionOptions {
  host?: string
  port?: number
}

export interface CDPSession {
  openTab(url: string): Promise<string>
  findOrOpenTab(urlSubstring: string, fallbackUrl: string): Promise<string>
  navigate(tabId: string, url: string): Promise<void>
  waitForLoad(tabId: string, timeoutMs?: number): Promise<void>
  waitForSelector(tabId: string, selector: string, timeoutMs?: number): Promise<void>
  evaluate<T>(tabId: string, fn: string): Promise<T>
  setFileInput(tabId: string, selector: string, paths: string[]): Promise<void>
  listTabs(): Promise<{ id: string; url: string; title: string }[]>
  close(): Promise<void>
}

interface InternalTab {
  client: CDP.Client
  url: string
  title: string
}

export async function createCDPSession(options: CDPSessionOptions = {}): Promise<CDPSession> {
  const host = options.host ?? "127.0.0.1"
  const port = options.port ?? 9222

  await CDP.Version({ host, port }).catch((cause) => {
    throw new Error(
      "Could not reach Chrome DevTools Protocol at http://" + host + ":" + port + "/json/version. " +
        "Launch your browser with --remote-debugging-port=" + port + " and sign into github.com. " +
        "Underlying error: " + (cause instanceof Error ? cause.message : String(cause)),
    )
  })

  const tabs = new Map<string, InternalTab>()

  const attach = async (target: CDP.Target): Promise<InternalTab> => {
    const existing = tabs.get(target.id)
    if (existing) return existing
    const client = await CDP({ target, host, port })
    await client.Page.enable()
    await client.Runtime.enable()
    await client.DOM.enable()
    const entry: InternalTab = { client, url: target.url, title: target.title }
    tabs.set(target.id, entry)
    return entry
  }

  const session: CDPSession = {
    async openTab(url) {
      const target = await CDP.New({ host, port, url })
      await attach(target)
      return target.id
    },

    async findOrOpenTab(urlSubstring, fallbackUrl) {
      const targets = await CDP.List({ host, port })
      const match = targets.find(
        (target) => target.type === "page" && target.url.includes(urlSubstring),
      )
      if (match) {
        await attach(match)
        return match.id
      }
      return this.openTab(fallbackUrl)
    },

    async navigate(tabId, url) {
      const tab = tabs.get(tabId)
      if (!tab) throw new Error("Unknown tab id: " + tabId)
      await tab.client.Page.navigate({ url })
    },

    async waitForLoad(tabId, timeoutMs = 30000) {
      const tab = tabs.get(tabId)
      if (!tab) throw new Error("Unknown tab id: " + tabId)
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        const { result } = await tab.client.Runtime.evaluate({
          expression: "document.readyState",
          returnByValue: true,
        })
        if (result.value === "complete") return
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      throw new Error("Tab did not finish loading within " + timeoutMs + "ms")
    },

    async waitForSelector(tabId, selector, timeoutMs = 15000) {
      const tab = tabs.get(tabId)
      if (!tab) throw new Error("Unknown tab id: " + tabId)
      const deadline = Date.now() + timeoutMs
      const expression = "(() => { const el = document.querySelector(" + JSON.stringify(selector) + "); return el !== null && el.offsetParent !== null; })()"
      while (Date.now() < deadline) {
        const { result } = await tab.client.Runtime.evaluate({ expression, returnByValue: true })
        if (result.value === true) return
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      throw new Error("Selector " + selector + " did not become visible within " + timeoutMs + "ms")
    },

    async evaluate<T>(tabId: string, fn: string): Promise<T> {
      const tab = tabs.get(tabId)
      if (!tab) throw new Error("Unknown tab id: " + tabId)
      const { result, exceptionDetails } = await tab.client.Runtime.evaluate({
        expression: "(async () => { return await (" + fn + ")(); })()",
        awaitPromise: true,
        returnByValue: true,
      })
      if (exceptionDetails) {
        throw new Error(
          "Eval failed: " + exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""),
        )
      }
      return result.value as T
    },

    async setFileInput(tabId, selector, paths) {
      const tab = tabs.get(tabId)
      if (!tab) throw new Error("Unknown tab id: " + tabId)
      const { root } = await tab.client.DOM.getDocument()
      const node = await tab.client.DOM.querySelector({ nodeId: root.nodeId, selector })
      if (!node.nodeId) throw new Error("No element found for selector " + selector)
      await tab.client.DOM.setFileInputFiles({ nodeId: node.nodeId, files: paths })
    },

    async listTabs() {
      const targets = await CDP.List({ host, port })
      return targets
        .filter((target) => target.type === "page")
        .map((target) => ({ id: target.id, url: target.url, title: target.title }))
    },

    async close() {
      await Promise.all(
        [...tabs.values()].map((tab) =>
          tab.client.close().catch((cause) => {
            consola.debug("Failed to close CDP tab", cause)
          }),
        ),
      )
      tabs.clear()
    },
  }

  return session
}