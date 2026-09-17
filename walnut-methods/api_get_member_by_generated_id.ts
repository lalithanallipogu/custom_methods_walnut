import type { WalnutApiContext } from './walnut';

/** @walnut_method
 * name: API Get Member By Generated ID
 * description: POST get member to ${url} with ${requestBody} using session $[averSessionId] and generated member $[memberId]
 * actionType: custom_api_get_member_by_generated_id
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function apiGetMemberByGeneratedId(ctx: WalnutApiContext) {
  // ctx.args[0] = API URL (from ${url})
  // ctx.args[1] = request body JSON string (from ${requestBody})
  // ctx.args[2] = "averSessionId" (from $[averSessionId]) — runtime variable name
  // ctx.args[3] = "memberId" (from $[memberId]) — runtime variable name

  const url = ctx.args[0];
  const requestBodyRaw = ctx.args[1];
  const sessionId = ctx.getVariable(ctx.args[2]);
  const memberId = ctx.getVariable(ctx.args[3]);

  if (!url) {
    throw new Error('URL is required. Ensure the API endpoint URL is set in test data.');
  }

  if (!sessionId) {
    throw new Error(
      'AverSessionId not found in runtime variables. Run "Extract Aver Session Cookie" step first.'
    );
  }

  if (!memberId) {
    throw new Error(
      'memberId not found in runtime variables. Ensure the "Mem_claim1_ActualFile Artifacts Upload Generate MemberID Replace Upload 2 Files" step ran first.'
    );
  }

  ctx.log('Getting member by generated ID: ' + memberId);

  // Parse request body from test data
  let body: any;
  try {
    body = typeof requestBodyRaw === 'string' ? JSON.parse(requestBodyRaw) : requestBodyRaw;
  } catch (e) {
    throw new Error('Failed to parse requestBody: ' + requestBodyRaw);
  }

  // Override member_id with the generated member ID from runtime variable
  body.member_id = memberId;

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

  ctx.log('Get Member completed successfully for: ' + memberId);

  return response;
}
