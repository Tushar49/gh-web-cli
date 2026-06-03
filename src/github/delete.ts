import { triggerReactOnClick, setReactInputValue } from "./auth.js"
import type { CDPSession } from "../cdp/session.js"
import type { BranchRef, CommitOptions } from "../core/types.js"

/**
 * Delete a single file from a branch via GitHub's `/delete/<branch>/<path>` page.
 *
 * IMPORTANT: the delete page is a React-controlled SPA. The "Commit changes…" button
 * only opens its dialog when its onClick is triggered through the React fiber — a
 * plain CDP-level click does not surface the dialog at all. Once the dialog opens,
 * the final commit button is `button[type=button]` rather than a submit, so we
 * trigger it through React onClick too.
 */
export async function deleteFile(
  session: CDPSession,
  tabId: string,
  ref: BranchRef,
  repoPath: string,
  commit: CommitOptions,
): Promise<{ branch: string }> {
  const url = `https://github.com/${ref.owner}/${ref.repo}/delete/${encodeURIComponent(ref.branch)}/${repoPath}`
  await session.navigate(tabId, url)
  await session.waitForLoad(tabId)

  // Open the commit dialog. The label is exactly "Commit changes…" with the ellipsis.
  await triggerReactOnClick(session, tabId, "Commit changes\u2026")

  await session.waitForSelector(tabId, "#commit-message-input")
  await setReactInputValue(session, tabId, "#commit-message-input", commit.message)

  if (commit.newBranch) {
    // Delete dialog uses `pr-choice` radios (different from the upload page's `commit-choice`).
    await session.evaluate<void>(
      tabId,
      `() => {
        const radios = document.querySelectorAll('input[name="pr-choice"]');
        if (radios.length < 2) throw new Error("Could not find pr-choice radios");
        radios[1].checked = true;
        radios[1].dispatchEvent(new Event("change", { bubbles: true }));
      }`,
    )
    await session.waitForSelector(tabId, 'input[placeholder*="branch"]')
    await setReactInputValue(session, tabId, 'input[placeholder*="branch"]', commit.newBranch)
  }

  // Final "Commit changes" button (no ellipsis) — this is the one that actually submits.
  await triggerReactOnClick(session, tabId, "Commit changes")
  await session.waitForLoad(tabId, 30_000)

  return { branch: commit.newBranch ?? ref.branch }
}
