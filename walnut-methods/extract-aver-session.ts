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
  // Get cookies from the browser for the current page
  const cookies: any[] = await webCtx.page.context().cookies();
  const averCookie = cookies.find((c: { name: string; value: string }) => c.name === 'AverSessionId');

  if (!averCookie) {
    throw new Error('AverSessionId cookie not found in browser. Ensure you are logged into portal-qa.aver.io');
  }

  ctx.log('Extracted AverSessionId: ' + averCookie.value);
  ctx.setVariable(ctx.args[0], averCookie.value);
}
