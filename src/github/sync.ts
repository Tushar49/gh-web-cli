import { triggerReactOnClick } from "./auth.js"
import type { CDPSession } from "../cdp/session.js"
import type { BranchRef } from "../core/types.js"

/**
 * Sync a fork's branch from its upstream by clicking "Sync fork" then "Update branch"
 * via React onClick. The two-step dance is necessary because GitHub's repo page
 * shows a popover for the sync action and the popover items are React-portal'd.
 */
export async function syncFork(session: CDPSession, tabId: string, ref: BranchRef): Promise<void> {
  const url = `https://github.com/${ref.owner}/${ref.repo}/tree/${encodeURIComponent(ref.branch)}`
  await session.navigate(tabId, url)
  await session.waitForLoad(tabId)

  // Open the "Sync fork" popover.
  await triggerReactOnClick(session, tabId, "Sync fork")

  // The "Update branch" button only renders after the popover opens. Trigger it.
  await triggerReactOnClick(session, tabId, "Update branch", 8000)

  // The sync request fires as a background XHR. Wait for the page to settle.
  await new Promise((resolve) => setTimeout(resolve, 4000))
}
