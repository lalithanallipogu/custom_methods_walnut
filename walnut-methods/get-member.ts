import type { WalnutContext, WalnutApiContext } from './walnut';

/** @walnut_method
 * name: Get Member
 * description: POST get member to ${url} using session $[averSessionId] and member $[memberId] suffix ${suffix}
 * actionType: custom_get_member
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function getMember(ctx: WalnutContext) {
  // ctx.args[0] = API URL (from ${url})
  // ctx.args[1] = "averSessionId" (from $[averSessionId]) — runtime variable name
  // ctx.args[2] = "memberId" (from $[memberId]) — runtime variable name
  // ctx.args[3] = suffix (from ${suffix}) — e.g. "-ult_trig_dupe_SCK6tt"

  const url = ctx.args[0];
  const sessionId = ctx.getVariable(ctx.args[1]); // reads runtime variable $[averSessionId]
  const memberId = ctx.getVariable(ctx.args[2]); // reads runtime variable $[memberId]
  const suffix = ctx.args[3]; // from ${suffix} in test data

  if (!sessionId) {
    throw new Error('AverSessionId not found in runtime variables. Run "Extract Aver Session Cookie" step first.');
  }

  if (!memberId) {
    throw new Error('memberId not found in runtime variables. Ensure the file upload step ran first.');
  }

  // Build full member_id: e.g. "ICMEM-7723MFBV" + "-ult_trig_dupe_SCK6tt"
  const fullMemberId = memberId + (suffix || '');
  ctx.log('Getting member: ' + fullMemberId);

  // Build body directly from runtime variable
  const body = { member_id: fullMemberId };

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
