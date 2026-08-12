import type { WalnutContext, WalnutWebContext } from './walnut';

/** @walnut_method
 * name: Extract Aver Session Cookie
 * description: Extract AverSessionId cookie from browser and store in $[averSessionId]
 * actionType: custom_extract_aver_session
 * context: web
 * needsLocator: false
 * category: Authentication
 */
export async function extractAverSession(ctx: WalnutContext) {
  const webCtx = ctx as WalnutWebContext;

  // Use JavaScript fetch inside the page to call get_session_user
  // The browser will automatically attach the HttpOnly cookie
  // Then we read it from the request headers via Playwright's route interception

  // Set up route interception BEFORE making the request
  // Capture the entire cookie header dynamically — no hardcoded cookie name
  let fullCookieHeader = '';

  await webCtx.page.route('**/api/user-management/get_session_user', async (route: any) => {
    const headers = route.request().headers();
    fullCookieHeader = headers['cookie'] || '';
    ctx.log('Intercepted cookie header: ' + fullCookieHeader);
    // Continue the request normally
    await route.continue();
  });

  // Trigger the get_session_user call using fetch from within the page
  await webCtx.evaluate(`
    fetch('/api/user-management/get_session_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
  `);

  // Wait briefly for the route handler to execute
  await webCtx.wait(2000);

  // Clean up the route interception
  await webCtx.page.unroute('**/api/user-management/get_session_user');

  if (!fullCookieHeader) {
    throw new Error('Could not capture cookie header from get_session_user request.');
  }

  // Store the full cookie header as-is (e.g. "AverSessionId=03dc4920-b1b2-41f8-93b5-c5921966d0db")
  // This way if the cookie name ever changes, it still works
  ctx.log('Extracted cookie: ' + fullCookieHeader);
  ctx.setVariable(ctx.args[0], fullCookieHeader);
}
