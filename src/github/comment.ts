import { requestSubmitForm, setReactInputValue } from "./auth.js"
import type { CDPSession } from "../cdp/session.js"
import type { PrRef } from "../core/types.js"

export async function postComment(
  session: CDPSession,
  tabId: string,
  pr: PrRef,
  body: string,
): Promise<void> {
  const url = `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`
  await session.navigate(tabId, url)
  await session.waitForLoad(tabId)
  await session.waitForSelector(tabId, "#new_comment_field")

  await setReactInputValue(session, tabId, "#new_comment_field", body)

  // The Comment button is disabled by React when value is empty; we force-enable
  // it because our setter bypassed React's keystroke pipeline.
  await session.evaluate<void>(
    tabId,
    `() => {
      const ta = document.getElementById("new_comment_field");
      const form = ta.closest("form");
      const btn = [...form.querySelectorAll("button")].find(
        (b) => /^comment$/i.test((b.textContent || "").trim()) && b.type === "submit",
      );
      if (btn) btn.removeAttribute("disabled");
      form.requestSubmit(btn ?? undefined);
    }`,
  )
  await new Promise((resolve) => setTimeout(resolve, 3_000))
}

export interface EditPullRequestInput {
  title?: string
  body?: string
}

export async function editPullRequest(
  session: CDPSession,
  tabId: string,
  pr: PrRef,
  input: EditPullRequestInput,
): Promise<void> {
  const url = `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`
  await session.navigate(tabId, url)
  await session.waitForLoad(tabId)

  // Open the kebab on the PR description (first comment) and click "Edit".
  await session.evaluate<void>(
    tabId,
    `async () => {
      const firstComment = document.querySelector(
        'div.timeline-comment, [class*="TimelineComment"]',
      );
      if (!firstComment) throw new Error("First comment container not found");
      const summaries = [...firstComment.querySelectorAll("summary")].filter(
        (s) => s.offsetParent !== null,
      );
      if (summaries.length === 0) throw new Error("Kebab summary not found on PR description");
      summaries[0].click();
      await new Promise((resolve) => setTimeout(resolve, 600));
      const editItem = [...document.querySelectorAll("button, a")].find(
        (el) => el.offsetParent !== null && /^edit$/i.test((el.textContent || "").trim()),
      );
      if (!editItem) throw new Error("Edit menu item not found");
      editItem.click();
    }`,
  )

  await session.waitForSelector(tabId, 'textarea[name="pull_request[body]"]', 15_000)

  if (typeof input.body === "string") {
    await setReactInputValue(session, tabId, 'textarea[name="pull_request[body]"]', input.body)
  }
  if (typeof input.title === "string") {
    await setReactInputValue(session, tabId, 'input[name="pull_request[title]"]', input.title)
  }

  await session.evaluate<void>(
    tabId,
    `() => {
      const ta = document.querySelector('textarea[name="pull_request[body]"]');
      const form = ta.closest("form");
      const btn = [...form.querySelectorAll("button")].find(
        (b) => /^update comment$|^save$/i.test((b.textContent || "").trim()) && b.type === "submit",
      );
      if (btn) btn.removeAttribute("disabled");
      form.requestSubmit(btn ?? undefined);
    }`,
  )
  await new Promise((resolve) => setTimeout(resolve, 3_000))
}
