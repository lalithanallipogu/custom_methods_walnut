import type { WalnutApiContext } from './walnut';

/** @walnut_method
 * name: Get Member
 * description: POST get member to ${url} with ${request_body} using session $[averSessionId] and generated member $[memberId]
 * actionType: custom_get_member
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function getMember(ctx: WalnutApiContext) {
  // ctx.args[0] = API URL (from ${url})
  // ctx.args[1] = request body JSON string (from ${requestBody})
  // ctx.args[2] = "averSessionId" (from $[averSessionId]) — runtime variable name
  // ctx.args[3] = "memberId" (from $[memberId]) — runtime variable name

  const url = ctx.args[0];
  const requestBodyRaw = ctx.args[1];
  const sessionId = ctx.getVariable(ctx.args[2]); // reads runtime variable $[averSessionId]
  const memberId = ctx.getVariable(ctx.args[3]); // reads runtime variable $[memberId]

  if (!sessionId) {
    throw new Error('AverSessionId not found in runtime variables. Run "Extract Aver Session Cookie" step first.');
  }

  if (!memberId) {
    throw new Error('memberId not found in runtime variables. Ensure a previous step stored it.');
  }

  ctx.log('Getting member: ' + memberId);

  // Parse request body from test data
  let body: any;
  try {
    body = typeof requestBodyRaw === 'string' ? JSON.parse(requestBodyRaw) : requestBodyRaw;
  } catch (e) {
    throw new Error('Failed to parse requestBody: ' + requestBodyRaw);
  }

  // Override member_id with the runtime variable value
  body.member_id = memberId;

  const headers: Record<string, string> = {
    'Cookie': sessionId,
    'Content-Type': 'application/json',
  };

  // Retry logic: poll every 30 seconds for up to 10 minutes until member data appears
  const maxRetries = 20;
  const retryIntervalMs = 30000; // 30 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    ctx.log('Attempt ' + attempt + '/' + maxRetries + ' — POST ' + url + ' with body: ' + JSON.stringify(body));

    const response = await ctx.post(url, body, { headers });

    ctx.log('Attempt ' + attempt + ' — Status: ' + response.status + ' ' + response.statusText);
    ctx.log('Response body: ' + JSON.stringify(response.body));

    if (response.status >= 400) {
      throw new Error('Get Member failed: ' + response.status + ' ' + response.statusText);
    }

    // Check if the response has actual member data (not empty strings)
    const responseBody = response.body;
    const hasMemberData = responseBody &&
      (responseBody.member_id || responseBody.id || responseBody.person_id) &&
      (responseBody.member_id !== '' && responseBody.id !== '');

    if (hasMemberData) {
      ctx.log('Member data found on attempt ' + attempt + '. Get Member completed successfully.');
      return response;
    }

    // If this is the last attempt, fail with details
    if (attempt === maxRetries) {
      throw new Error(
        'Get Member: member data still empty after ' + maxRetries + ' attempts (' +
        (maxRetries * retryIntervalMs / 1000) + 's). The member "' + memberId +
        '" has not been ingested yet. Response: ' + JSON.stringify(responseBody)
      );
    }

    ctx.log('Member data is empty. Waiting ' + (retryIntervalMs / 1000) + 's before retry...');
    await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
  }
}
