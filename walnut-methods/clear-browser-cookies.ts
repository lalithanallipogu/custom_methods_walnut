import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: Clear Browser Cookies
 * description: Clear all browser cookies to force fresh session
 * actionType: custom_clear_browser_cookies
 * context: web
 * needsLocator: false
 * category: Browser
 */
export async function clearBrowserCookies(ctx: WalnutContext) {
  // Use the Playwright page's browser context to clear all cookies
  const context = ctx.page.context();
  await context.clearCookies();
  ctx.log('All browser cookies cleared successfully.');
}
