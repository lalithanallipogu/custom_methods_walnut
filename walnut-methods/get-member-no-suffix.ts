import type { WalnutContext, WalnutApiContext } from './walnut';

/** @walnut_method
 * name: Get Member No Suffix
 * description: POST get member to ${url} using session $[averSessionId] and member $[memberId]
 * actionType: custom_get_member_no_suffix
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function getMemberNoSuffix(ctx: WalnutContext) {
  // ctx.args[0] = API URL (from ${url})
  // ctx.args[1] = "averSessionId" (from $[averSessionId]) — runtime variable name
  // ctx.args[2] = "memberId" (from $[memberId]) — runtime variable name

  const url = ctx.args[0];
  const sessionId = ctx.getVariable(ctx.args[1]); // reads runtime variable $[averSessionId]
  const memberId = ctx.getVariable(ctx.args[2]); // reads runtime variable $[memberId]

  if (!sessionId) {
    throw new Error('AverSessionId not found in runtime variables. Run "Extract Aver Session Cookie" step first.');
  }

  if (!memberId) {
    throw new Error('memberId not found in runtime variables. Ensure the file upload step ran first.');
  }

  ctx.log('Getting member: ' + memberId);

  // Build body directly from runtime variable — no test data needed
  const body = { member_id: memberId };

  const headers: Record<string, string> = {
    'Cookie': sessionId,
    'Content-Type': 'application/json',
  };

  ctx.log('POST ' + url + ' with body: ' + JSON.stringify(body));

  const apiCtx = ctx as WalnutApiContext;
  const response = await apiCtx.post(url, body, { headers });

  ctx.log('Get Member response - Status: ' + response.status + ' ' + response.statusText);
  ctx.log('Response body: ' + JSON.stringify(response.body));

  if (response.status >= 400) {
    throw new Error('Get Member failed: ' + response.status + ' ' + response.statusText);
  }

  ctx.log('Get Member completed successfully.');

  return response;
}
