import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: POST Transform Job API
 * description: Read batch from $[batch] and POST transform job to ${url}
 * actionType: custom_post_transform_job
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function postTransformJob(ctx: WalnutContext) {
  // ctx.args[0] = "batch" (from $[batch]) — runtime variable name to READ the batch from file upload step
  // ctx.args[1] = API URL (from ${url})

  const batchVarName = ctx.args[0];
  const url = ctx.args[1];

  // Read batch from runtime variable (captured by the file upload method)
  const batch = ctx.getVariable(batchVarName);
  if (!batch) {
    throw new Error(
      'Batch not found in runtime variable "' + batchVarName + '". Ensure the file upload step ran first.'
    );
  }
  ctx.log('Using batch from file upload: ' + batch);

  // Build request body
  const body = {
    batch: batch,
    mode: 'individual',
    job_type: 'transform',
  };

  ctx.log('POST ' + url + ' with body: ' + JSON.stringify(body));

  const response = await ctx.post(url, body);
  ctx.assertStatus(response, 200);

  ctx.log('POST successful. Status: ' + response.status);
  ctx.log('Response body: ' + JSON.stringify(response.body));
}
