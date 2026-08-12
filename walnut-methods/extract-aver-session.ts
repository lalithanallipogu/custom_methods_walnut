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
  // The browser will automatically attach the HttpOnly AverSessionId cookie
  // Then we read it from the request headers via Playwright's route interception
  let sessionId = '';

  // Set up route interception BEFORE making the request
  await webCtx.page.route('**/api/user-management/get_session_user', async (route: any) => {
    const headers = route.request().headers();
    const cookieHeader: string = headers['cookie'] || '';
    ctx.log('Intercepted cookie header: ' + cookieHeader);
    const match = cookieHeader.match(/AverSessionId=([^;]+)/);
    if (match) {
      sessionId = match[1].trim();
    }
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

  if (!sessionId) {
    throw new Error('Could not capture AverSessionId from get_session_user request.');
  }

  ctx.log('Extracted AverSessionId: ' + sessionId);
  ctx.setVariable(ctx.args[0], sessionId);
}
