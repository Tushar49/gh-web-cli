import type { CDPSession } from "../cdp/session.js"
import type { ConflictResolution, PrRef } from "../core/types.js"

/**
 * Resolve every conflicted file in a pull request via GitHub's
 * `/pull/{n}/conflicts` web editor.
 *
 * The web editor uses CodeMirror 5, which (unlike the CodeMirror 6 used on the
 * regular edit page) exposes a real `cm.setValue()` we can drive directly. The
 * trick to make GitHub re-evaluate the "Mark as resolved" gate after a
 * programmatic setValue is to insert and immediately delete a single character —
 * that forces CM's change handler to fire and clears the stale UI guard.
 *
 * Each file lives in its own `form.js-resolve-file-form`; advancing to the next
 * file is done by submitting that form. The umbrella commit form lives at
 * `form[action$="/conflicts/resolve"]` and contains URL-encoded hidden inputs
 * for every conflicting file's resolved content.
 */
export async function resolveConflicts(
  session: CDPSession,
  tabId: string,
  pr: PrRef,
  resolution: ConflictResolution,
): Promise<{ resolvedFiles: string[] }> {
  const url = `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}/conflicts`
  await session.navigate(tabId, url)
  await session.waitForLoad(tabId)
  await session.waitForSelector(tabId, ".CodeMirror", 20_000)

  const resolved: string[] = []
  // Iterate file-by-file; GitHub only renders one CodeMirror at a time and
  // advances to the next conflicted file after we submit the per-file form.
  for (;;) {
    const fileName = await session.evaluate<string | null>(
      tabId,
      `() => {
        const form = document.querySelector("form.js-resolve-file-form");
        if (!form) return null;
        const input = form.querySelector('input[name="filename"]');
        if (!input) return null;
        const raw = input.value || "";
        const match = raw.match(/^files\\[(.+)\\]$/);
        return match ? decodeURIComponent(match[1]) : raw;
      }`,
    )
    if (!fileName) break

    const conflicted = await session.evaluate<string>(
      tabId,
      `() => document.querySelector(".CodeMirror").CodeMirror.getValue()`,
    )

    const resolvedContent = await applyResolution(fileName, conflicted, resolution)

    await session.evaluate<void>(
      tabId,
      `() => {
        const cm = document.querySelector(".CodeMirror").CodeMirror;
        cm.setValue(${JSON.stringify(resolvedContent)});
        cm.focus();
        const last = cm.lineCount() - 1;
        const endCh = cm.getLine(last).length;
        cm.replaceRange("x", { line: last, ch: endCh });
        cm.replaceRange("", { line: last, ch: endCh }, { line: last, ch: endCh + 1 });
        const form = document.querySelector("form.js-resolve-file-form");
        const ta = form.querySelector('textarea[name="name"]');
        ta.value = cm.getValue();
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        const commitForm = [...document.querySelectorAll("form")].find((f) =>
          f.action.endsWith("/conflicts/resolve"),
        );
        if (commitForm) {
          const filenameKey = "files[" + encodeURIComponent(${JSON.stringify(fileName)}).replace(/%2F/g, "%2F") + "]";
          const hidden =
            commitForm.querySelector('input[name="' + filenameKey + '"]') ||
            commitForm.querySelector('input[name="files[' + encodeURIComponent(${JSON.stringify(fileName)}) + ']"]');
          if (hidden) hidden.value = cm.getValue();
        }
        form.requestSubmit(form.querySelector("button.js-mark-resolved"));
      }`,
    )

    resolved.push(fileName)
    // Give GitHub a moment to swap in the next file's editor.
    await new Promise((resolve) => setTimeout(resolve, 1_500))
  }

  if (resolved.length === 0) return { resolvedFiles: [] }

  // Submit the umbrella merge.
  await session.evaluate<void>(
    tabId,
    `() => {
      const commitForm = [...document.querySelectorAll("form")].find((f) =>
        f.action.endsWith("/conflicts/resolve"),
      );
      if (!commitForm) throw new Error("conflict-resolve form not found");
      commitForm.submit();
    }`,
  )
  await session.waitForLoad(tabId, 30_000)
  return { resolvedFiles: resolved }
}

async function applyResolution(
  fileName: string,
  conflicted: string,
  resolution: ConflictResolution,
): Promise<string> {
  if (resolution.strategy === "custom") {
    if (!resolution.resolver) throw new Error("custom strategy requires resolver()")
    return await resolution.resolver(fileName, conflicted)
  }
  // The conflict marker format is:
  //   <<<<<<< OUR-BRANCH
  //   our content
  //   =======
  //   their content
  //   >>>>>>> BASE
  // "ours" keeps the PR side; "theirs" keeps the base side.
  const pattern = /<<<<<<<[^\n]*\n([\s\S]*?)=======[^\n]*\n([\s\S]*?)>>>>>>>[^\n]*\n?/g
  return conflicted.replace(pattern, (_match, ours, theirs) =>
    resolution.strategy === "ours" ? ours : theirs,
  )
}
