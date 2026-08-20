import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: Upload Files To Input
 * description: Upload ${filePaths} to the linked object (one path, or several comma-separated paths)
 * actionType: custom_upload_files
 * context: web
 * needsLocator: true
 * category: Interaction
 */
export async function uploadFilesToInput(ctx: WalnutContext) {
  if (ctx.platform !== 'web') return;

  // ctx.args[0] = ${filePaths} — "/path/a.pdf" or "/path/a.pdf, /path/b.png" (comma-separated for multiple files)
  const locator = (ctx as any).locator;
  if (!locator) throw new Error('No object linked to this step — attach an object in the test case editor');

  const rawPaths = String(ctx.args[0] ?? '').trim();
  if (!rawPaths) throw new Error('filePaths is empty — set the filePaths column in this test case\'s test data.');

  // ── Resolve every path up front, so we fail before touching the browser ──
  const paths: string[] = [];
  for (const part of rawPaths.split(',')) {
    let p = part.trim();
    if (!p) continue;
    paths.push(p);
  }
  if (paths.length === 0) throw new Error(`No usable file path in "${rawPaths}".`);
  ctx.log(`Uploading ${paths.length} file(s): ${paths.join(', ')}`);

  const page = ctx.page;
  const target = locator.first();

  try {
    await target.waitFor({ state: 'attached', timeout: 15000 });
  } catch {
    // A wrong selector is the most common authoring slip — name it, rather than
    // surfacing Playwright's bare "Timeout 15000ms exceeded".
    const total = await page.locator('input[type="file"]').count();
    throw new Error(
      `The linked object was not found after 15s. `
      + `This page has ${total} file input(s) — check the linked object, or that the uploader is on screen by now.`,
    );
  }

  // ── Find the real <input type=file>: the element itself, or one associated
  //    with it (label[for], descendant). setInputFiles ONLY works on inputs. ──
  const handle = await target.elementHandle();
  if (!handle) throw new Error('Could not get element handle from the linked object.');

  const inputHandle = await handle.evaluateHandle(
    // Built as a string via new Function so the bundler cannot inject helpers
    // that would ReferenceError inside the browser.
    new Function('el', `
      var isFile = function (n) { return !!n && n.tagName === 'INPUT' && n.type === 'file'; };
      if (isFile(el)) return el;
      if (el.tagName === 'LABEL' && el.htmlFor) {
        var t = document.getElementById(el.htmlFor);
        if (isFile(t)) return t;
      }
      var inside = el.querySelector && el.querySelector('input[type="file"]');
      return inside || null;
    `) as any,
  );
  const input = inputHandle.asElement();

  if (input) {
    // Reject a mismatch clearly instead of letting Playwright throw a cryptic error.
    const isMultiple = await input.evaluate((el: any) => !!el.multiple);
    if (paths.length > 1 && !isMultiple) {
      throw new Error(`${paths.length} files given, but the linked object is a single-file input (no "multiple" attribute).`);
    }
    // The OS dialog never opens: this sets the input's FileList directly.
    await input.setInputFiles(paths);
    const attached = await input.evaluate((el: any) => Array.from(el.files).map((f: any) => f.name));
    await input.dispose();
    await handle.dispose();
    if (attached.length === 0) throw new Error('setInputFiles ran but the input holds no files — the page may have cleared it.');
    ctx.log(`Attached to the input: ${attached.join(', ')}`);
    return;
  }

  // ── No input in the DOM (a button that opens the OS dialog from JS). Arm the
  //    file chooser FIRST, then click: Playwright intercepts the dialog so the
  //    real OS picker never appears. ──
  await handle.dispose();
  ctx.warn('The linked object is not a file input and has none associated — clicking it and intercepting the file chooser instead.');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    target.click(),
  ]);
  if (paths.length > 1 && !chooser.isMultiple()) {
    throw new Error(`${paths.length} files given, but the page's file chooser accepts only one.`);
  }
  await chooser.setFiles(paths);
  ctx.log(`Set ${paths.length} file(s) via the intercepted file chooser.`);
}

 