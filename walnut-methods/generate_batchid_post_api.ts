import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: Generate Batch ID and POST Job API
 * description: Generate batch from date shift, POST to ${url} with mode ${mode} and job_type ${jobType} and extra_args ${extraArgs} storing batch in $[batch]
 * actionType: custom_generate_batchid_post_job
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function generateBatchIdPostJob(ctx: WalnutContext) {
  // ctx.args[0] = API URL (from ${url})
  // ctx.args[1] = mode value (from ${mode}) e.g. "individual"
  // ctx.args[2] = job_type value (from ${jobType}) e.g. "transform", "validate", "cdc-bbm"
  // ctx.args[3] = extra_args JSON string (from ${extraArgs}) e.g. '{"RECORD_RETENTION_YEARS": "20"}' or empty
  // ctx.args[4] = "batch" (from $[batch]) — runtime variable name to store generated batch

  const url = ctx.args[0];
  const mode = ctx.args[1];
  const jobType = ctx.args[2];
  const extraArgsStr = ctx.args[3];
  const batchVarName = ctx.args[4];

  // Step 1: Generate batch using date shift logic (current date + 2684 days → YYYYMMDD)
  const now = new Date();
  const shifted = new Date(now.getTime() + 2684 * 24 * 60 * 60 * 1000);
  const yyyy = shifted.getFullYear().toString();
  const mm = (shifted.getMonth() + 1).toString().padStart(2, '0');
  const dd = shifted.getDate().toString().padStart(2, '0');
  const batch = yyyy + mm + dd;

  ctx.log('Generated batch: ' + batch);

  // Step 2: Store batch as runtime variable for use in subsequent steps
  ctx.setVariable(batchVarName, batch);

  // Step 3: Build request body
  const body: Record<string, any> = {
    batch: batch,
    mode: mode,
    job_type: jobType,
  };

  // Add extra_args if provided (for jobs like cdc-bbm)
  if (extraArgsStr && extraArgsStr.trim() !== '') {
    try {
      body.extra_args = JSON.parse(extraArgsStr);
    } catch (e) {
      throw new Error('Invalid extra_args JSON: ' + extraArgsStr);
    }
  }

  ctx.log('POST ' + url + ' with body: ' + JSON.stringify(body));

  // Step 4: Make POST API call
  const response = await ctx.post(url, body);

  ctx.assertStatus(response, 200);

  ctx.log('POST successful. Status: ' + response.status);
  ctx.log('Response body: ' + JSON.stringify(response.body));
}
