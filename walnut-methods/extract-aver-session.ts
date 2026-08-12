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

  // Intercept the get_session_user network call to capture the AverSessionId cookie
  // This is the reliable way since the cookie is HttpOnly and may not be accessible via page.context().cookies()
  let sessionId = '';

  // Set up a request listener to capture the AverSessionId from outgoing requests
  const capturePromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for get_session_user request')), 30000);

    webCtx.page.on('request', (request: any) => {
      const url: string = request.url();
      if (url.includes('/api/user-management/get_session_user')) {
        const headers = request.headers();
        const cookieHeader: string = headers['cookie'] || '';
        const match = cookieHeader.match(/AverSessionId=([^;]+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[1].trim());
        }
      }
    });
  });

  // Reload the page to trigger the get_session_user API call
  await webCtx.reload();

  // Wait for the cookie to be captured from the network request
  sessionId = await capturePromise;

  if (!sessionId) {
    throw new Error('Could not capture AverSessionId from get_session_user request.');
  }

  ctx.log('Extracted AverSessionId from network: ' + sessionId);
  ctx.setVariable(ctx.args[0], sessionId);
}
