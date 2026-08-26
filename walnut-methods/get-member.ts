import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: Get Member
 * description: Post to ${url} with member $[memberId] suffix ${suffix} using session $[averSessionId]
 * actionType: custom_get_member
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function getMember(ctx: WalnutContext) {
  const url = ctx.args[0];
  const memberId = ctx.getVariable(ctx.args[1]); // reads runtime variable $[memberId]
  const suffix = ctx.args[2]; // from ${suffix} in test data e.g. "-ult_trig_dupe_SCK6tt"
  const sessionId = ctx.getVariable(ctx.args[3]); // reads runtime variable $[averSessionId]

  if (!memberId) {
    throw new Error('memberId not found in runtime variables. Ensure the file upload step ran first.');
  }

  if (!sessionId) {
    throw new Error('AverSessionId not found in runtime variables. Run "Extract Aver Session Cookie" step first.');
  }

  // Build full member_id: e.g. "ICMEM-7723MFBV" + "-ult_trig_dupe_SCK6tt"
  const fullMemberId = memberId + (suffix || '');
  ctx.log('Getting member: ' + fullMemberId);

  const headers: Record<string, string> = {
    'Cookie': sessionId,
    'Content-Type': 'application/json',
  };

  const body = { member_id: fullMemberId };

  const response = await ctx.post(url, body, { headers });

  ctx.log('Get Member response - Status: ' + response.status + ' ' + response.statusText);
  ctx.log('Response body: ' + JSON.stringify(response.body));

  if (response.status >= 400) {
    throw new Error('Get Member failed: ' + response.status + ' ' + response.statusText);
  }

  ctx.log('Get Member completed successfully.');
}
