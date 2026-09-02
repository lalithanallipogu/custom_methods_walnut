import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: POST Validate Job API
 * description: Read batch from $[batch] and POST validate job to ${url} using session $[averSessionId]
 * actionType: custom_post_validate_job
 * context: shared
 * needsLocator: false
 * category: API Testing
 */
export async function postValidateJob(ctx: WalnutContext) {
  // ctx.args[0] = "batch" (from $[batch]) — runtime variable name to READ the batch
  // ctx.args[1] = API URL (from ${url})
  // ctx.args[2] = "averSessionId" (from $[averSessionId]) — runtime variable name for session cookie

  const batchVarName = ctx.args[0];
  const url = ctx.args[1];
  const sessionVarName = ctx.args[2];

  // Read batch from runtime variable
  const batch = ctx.getVariable(batchVarName);
  if (!batch) {
    throw new Error(
      'Batch not found in runtime variable "' + batchVarName + '". Ensure the transform job ran first.'
    );
  }
  ctx.log('Using existing batch: ' + batch);

  // Read session cookie from runtime variable
  const sessionId = ctx.getVariable(sessionVarName);
  if (!sessionId) {
    throw new Error(
      'Session not found in runtime variable "' + sessionVarName + '". Ensure the session extraction step ran first.'
    );
  }

  // Build request body
  const body = {
    batch: batch,
    mode: 'individual',
    job_type: 'validate',
  };

  ctx.log('POST ' + url + ' with body: ' + JSON.stringify(body));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionId,
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.text();
  let parsedBody: any;
  try {
    parsedBody = JSON.parse(responseBody);
  } catch {
    parsedBody = responseBody;
  }

  ctx.log('POST completed. Status: ' + response.status);
  ctx.log('Response body: ' + JSON.stringify(parsedBody));

  if (response.status !== 200) {
    throw new Error('POST failed with status ' + response.status + ': ' + JSON.stringify(parsedBody));
  }
}
