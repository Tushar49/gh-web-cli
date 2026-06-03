import type { CDPSession } from "../cdp/session.js"

const CSRF_META_NAMES = ["csrf-token", "authenticity_token"] as const

/** Pull the page's authenticity_token (CSRF) by checking meta + hidden inputs. */
export async function readAuthenticityToken(session: CDPSession, tabId: string): Promise<string> {
  const token = await session.evaluate<string | null>(
    tabId,
    `() => {
      const metaNames = ${JSON.stringify(CSRF_META_NAMES)};
      for (const name of metaNames) {
        const meta = document.querySelector(\`meta[name="\${name}"]\`);
        const content = meta?.getAttribute("content");
        if (content) return content;
      }
      const hidden = document.querySelector('input[name="authenticity_token"]');
      return hidden ? hidden.value : null;
    }`,
  )
  if (!token) throw new Error("Could not locate authenticity_token on the current page")
  return token
}

/**
 * Wait for the page's React tree to mount a button matching the given visible label,
 * then trigger its onClick via the React fiber. We need this for GitHub's "Commit changes…"
 * and "Sync fork" buttons — a plain CDP click does NOT open their dialogs.
 */
export async function triggerReactOnClick(
  session: CDPSession,
  tabId: string,
  label: string,
  timeoutMs = 10_000,
): Promise<void> {
  const ok = await session.evaluate<boolean>(
    tabId,
    `async () => {
      const deadline = Date.now() + ${timeoutMs};
      const labelRe = new RegExp(${JSON.stringify("^" + escapeRegex(label) + "$")}, "i");
      while (Date.now() < deadline) {
        const btn = [...document.querySelectorAll("button")].find(
          (b) => b.offsetParent !== null && labelRe.test((b.textContent || "").trim()),
        );
        if (btn) {
          const key = Object.keys(btn).find((k) => k.startsWith("__reactProps"));
          if (!key) return false;
          const props = btn[key];
          if (typeof props?.onClick !== "function") return false;
          props.onClick({ preventDefault: () => {}, stopPropagation: () => {}, currentTarget: btn });
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      return false;
    }`,
  )
  if (!ok) {
    throw new Error(
      `Could not find or trigger a button labeled "${label}" within ${timeoutMs}ms`,
    )
  }
}

/**
 * Submit a form using requestSubmit, which is what React-controlled GitHub forms
 * expect (plain form.submit() bypasses validators and yields "You can't perform that action").
 */
export async function requestSubmitForm(
  session: CDPSession,
  tabId: string,
  formSelector: string,
  submitterSelector?: string,
): Promise<void> {
  await session.evaluate<void>(
    tabId,
    `() => {
      const form = document.querySelector(${JSON.stringify(formSelector)});
      if (!form) throw new Error("Form not found: " + ${JSON.stringify(formSelector)});
      const submitter = ${submitterSelector ? `form.querySelector(${JSON.stringify(submitterSelector)})` : "undefined"};
      form.requestSubmit(submitter ?? undefined);
    }`,
  )
}

/** Set a React-controlled input's value so React's onChange handler fires. */
export async function setReactInputValue(
  session: CDPSession,
  tabId: string,
  selector: string,
  value: string,
): Promise<void> {
  await session.evaluate<void>(
    tabId,
    `() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error("Input not found: " + ${JSON.stringify(selector)});
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }`,
  )
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
