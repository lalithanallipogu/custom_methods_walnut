import type { WalnutApiContext } from './walnut';

/** @walnut_method
 * name: Trigger Get Member With Suffix
 * description: POST get member to ${url} with ${requestBody} using session $[averSessionId] and suffix ${suffix}
 * actionType: custom_trigger_get_member_with_suffix
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function triggerGetMemberWithSuffix(ctx: WalnutApiContext) {
  // ctx.args[0] = API URL (from ${url})
  // ctx.args[1] = request body JSON string (from ${requestBody})
  //               member_id in body can be a runtime variable reference like $[memberId], $[memberId_TC_229], etc.
  // ctx.args[2] = "averSessionId" (from $[averSessionId]) — runtime variable name
  // ctx.args[3] = suffix (from ${suffix}) — e.g. "-ult_trig_dupe_SCK6tt", or empty for no suffix

  const url = ctx.args[0];
  const requestBodyRaw = ctx.args[1];
  const sessionId = ctx.getVariable(ctx.args[2]);
  const suffix = ctx.args[3] || '';

  if (!url) {
    throw new Error('URL is required. Ensure the API endpoint URL is set in test data.');
  }

  if (!sessionId) {
    throw new Error(
      'AverSessionId not found in runtime variables. Run "Extract Aver Session Cookie" step first.'
    );
  }

  // Parse request body from test data
  let body: any;
  try {
    body = typeof requestBodyRaw === 'string' ? JSON.parse(requestBodyRaw) : requestBodyRaw;
  } catch (e) {
    throw new Error('Failed to parse requestBody: ' + requestBodyRaw);
  }

  // Resolve member_id: if it looks like a runtime variable reference $[varName], resolve it
  let memberId = body.member_id || '';
  const varMatch = memberId.match(/^\$\[(.+)\]$/);
  if (varMatch) {
    const resolvedId = ctx.getVariable(varMatch[1]);
    if (!resolvedId) {
      throw new Error(
        'Runtime variable "' + varMatch[1] + '" not found. Ensure the upload step that generates the member ID ran first.'
      );
    }
    memberId = resolvedId;
  }

  if (!memberId) {
    throw new Error('member_id is empty. Provide a member_id or a runtime variable reference like $[memberId] in the request body.');
  }

  // Append suffix if provided
  const fullMemberId = memberId + suffix;
  body.member_id = fullMemberId;
  ctx.log('Getting member: ' + fullMemberId);

  const headers: Record<string, string> = {
    'Cookie': sessionId,
    'Content-Type': 'application/json',
  };

  ctx.log('POST ' + url + ' with body: ' + JSON.stringify(body));

  const response = await ctx.post(url, body, { headers });

  ctx.log('Get Member response - Status: ' + response.status + ' ' + response.statusText);
  ctx.log('Response body: ' + JSON.stringify(response.body));

  if (response.status >= 400) {
    throw new Error('Get Member failed: ' + response.status + ' ' + response.statusText);
  }

  ctx.log('Get Member completed successfully for: ' + fullMemberId);

  return response;
}
