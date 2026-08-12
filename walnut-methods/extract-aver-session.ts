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

  // Get all cookies from the browser context for the portal domain
  const cookies: any[] = await webCtx.page.context().cookies([ctx.testBaseUrl]);

  // Log all cookies found for debugging
  ctx.log('Found ' + cookies.length + ' cookies for ' + ctx.testBaseUrl);
  for (const c of cookies) {
    ctx.log('  Cookie: ' + c.name + ' = ' + c.value + ' (domain: ' + c.domain + ')');
  }

  // Find the AverSessionId cookie
  const averCookie = cookies.find((c: { name: string; value: string; domain: string }) =>
    c.name === 'AverSessionId' && c.domain.includes('aver.io')
  );

  if (!averCookie) {
    throw new Error('AverSessionId cookie not found for aver.io domain. Ensure you are logged into portal-qa.aver.io');
  }

  ctx.log('Extracted AverSessionId: ' + averCookie.value);
  ctx.setVariable(ctx.args[0], averCookie.value);
}
