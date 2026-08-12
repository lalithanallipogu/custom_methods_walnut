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

  // First ensure we are on the portal page
  const currentUrl: string = webCtx.getUrl();
  ctx.log('Current URL: ' + currentUrl);

  // Get ALL cookies from the browser context (no URL filter to avoid issues)
  const allCookies: any[] = await webCtx.page.context().cookies();
  ctx.log('Total cookies in browser context: ' + allCookies.length);

  // Log all cookies for debugging
  for (const c of allCookies) {
    ctx.log('  ' + c.name + ' = ' + c.value + ' (domain: ' + c.domain + ', path: ' + c.path + ')');
  }

  // Find AverSessionId cookie specifically from portal-qa.aver.io domain
  const averCookie = allCookies.find((c: any) =>
    c.name === 'AverSessionId' && c.domain.includes('portal-qa')
  );

  if (!averCookie) {
    // Try without domain filter as fallback
    const anyAverCookie = allCookies.find((c: any) => c.name === 'AverSessionId');
    if (anyAverCookie) {
      ctx.log('Found AverSessionId on domain: ' + anyAverCookie.domain + ' value: ' + anyAverCookie.value);
      ctx.setVariable(ctx.args[0], anyAverCookie.value);
      return;
    }
    throw new Error('AverSessionId cookie not found. Ensure you are logged into portal-qa.aver.io');
  }

  ctx.log('Extracted AverSessionId: ' + averCookie.value + ' from domain: ' + averCookie.domain);
  ctx.setVariable(ctx.args[0], averCookie.value);
}
