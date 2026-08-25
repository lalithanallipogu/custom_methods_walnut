import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: POST Transform Job API
 * description: Generate batch from date shift and POST transform job to ${url} storing batch in $[batch]
 * actionType: custom_post_transform_job
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function postTransformJob(ctx: WalnutContext) {
  // ctx.args[0] = API URL (from ${url})
  // ctx.args[1] = "batch" (from $[batch]) — runtime variable name to store generated batch

  const url = ctx.args[0];
  const batchVarName = ctx.args[1];

  // Generate batch using date shift logic (current date + 2684 days → YYYYMMDD)
  const now = new Date();
  const shifted = new Date(now.getTime() + 2684 * 24 * 60 * 60 * 1000);
  const yyyy = shifted.getFullYear().toString();
  const mm = (shifted.getMonth() + 1).toString().padStart(2, '0');
  const dd = shifted.getDate().toString().padStart(2, '0');
  const batch = yyyy + mm + dd;

  ctx.log('Generated batch: ' + batch);
  ctx.setVariable(batchVarName, batch);

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
