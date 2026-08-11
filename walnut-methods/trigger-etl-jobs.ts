import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: Trigger 3 ETL Jobs Sequentially
 * description: Post 3 ETL jobs sequentially to ${url} with ${request_body1} and ${request_body2} and ${request_body3} using session $[averSessionId]
 * actionType: custom_trigger_3_etl_jobs
 * context: api
 * needsLocator: false
 * category: ETL Processing
 */
export async function trigger3EtlJobs(ctx: WalnutContext) {
  const url = ctx.args[0];
  const body1 = ctx.args[1];
  const body2 = ctx.args[2];
  const body3 = ctx.args[3];
  const sessionId = ctx.getVariable(ctx.args[4]); // reads runtime variable $[averSessionId]

  if (!sessionId) {
    throw new Error('AverSessionId not found in runtime variables. Run "Extract Aver Session Cookie" step first.');
  }

  // Set headers for authentication
  const headers: Record<string, string> = {
    'Cookie': `AverSessionId=${sessionId}`,
    'AverSessionId': sessionId,
    'Content-Type': 'application/json',
  };

  // Parse request bodies (they may come as JSON strings or objects)
  const parseBody = (body: any) => {
    if (typeof body === 'string') {
      return JSON.parse(body);
    }
    return body;
  };

  const bodies = [
    { label: 'ETL Job 1', data: parseBody(body1) },
    { label: 'ETL Job 2', data: parseBody(body2) },
    { label: 'ETL Job 3', data: parseBody(body3) },
  ];

  // Run jobs one by one — each must complete before the next starts
  for (let i = 0; i < bodies.length; i++) {
    const job = bodies[i];
    ctx.log(`[${i + 1}/3] Triggering ${job.label}...`);
    ctx.log(`Request body: ${JSON.stringify(job.data)}`);

    const response = await ctx.post(url, job.data, { headers });
    ctx.log(`[${i + 1}/3] ${job.label} completed - Status: ${response.status} ${response.statusText}`);

    if (response.status >= 500) {
      throw new Error(`${job.label} failed with server error: ${response.status} ${response.statusText}. Stopping execution.`);
    }

    ctx.log(`[${i + 1}/3] ${job.label} finished. ${i < 2 ? 'Proceeding to next job...' : 'All jobs done.'}`);
  }

  ctx.log('All 3 ETL jobs triggered and completed sequentially.');
}
