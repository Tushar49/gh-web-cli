import { requestSubmitForm, setReactInputValue } from "./auth.js"
import type { CDPSession } from "../cdp/session.js"

export interface CreatePullRequestInput {
  baseOwner: string
  baseRepo: string
  baseBranch: string
  headOwner: string
  headBranch: string
  title: string
  body: string
}

export interface CreatePullRequestResult {
  url: string
}

/**
 * Open a PR via the cross-repo compare page. The compare URL pre-fills both
 * the base and head; we just set title + body and submit.
 */
export async function createPullRequest(
  session: CDPSession,
  tabId: string,
  input: CreatePullRequestInput,
): Promise<CreatePullRequestResult> {
  const head = `${input.headOwner}:${input.baseRepo}:${input.headBranch}`
  const compareUrl =
    `https://github.com/${input.baseOwner}/${input.baseRepo}` +
    `/compare/${encodeURIComponent(input.baseBranch)}...${encodeURIComponent(head)}?expand=1`
  await session.navigate(tabId, compareUrl)
  await session.waitForLoad(tabId)
  await session.waitForSelector(tabId, 'input[name="pull_request[title]"]')

  await setReactInputValue(session, tabId, 'input[name="pull_request[title]"]', input.title)
  await setReactInputValue(session, tabId, 'textarea[name="pull_request[body]"]', input.body)

  await requestSubmitForm(session, tabId, 'form[action$="/pulls"], form.js-pull-request-form, form')
  await session.waitForLoad(tabId, 30_000)

  const url = await session.evaluate<string>(tabId, `() => window.location.href`)
  return { url }
}
