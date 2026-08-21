import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: Wait 10 Minutes
 * description: Wait for 10 minutes before proceeding to next step
 * actionType: custom_wait_10_minutes
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function wait10Minutes(ctx: WalnutContext) {
  const waitMs = 10 * 60 * 1000; // 10 minutes

  ctx.log('Waiting 10 minutes before next step...');

  const startTime = Date.now();

  // Log progress every minute
  for (let minute = 1; minute <= 10; minute++) {
    await new Promise(resolve => setTimeout(resolve, 60 * 1000));
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    ctx.log('[' + elapsed + 's] ' + minute + '/10 minutes elapsed...');
  }

  ctx.log('Wait complete. Proceeding to next step.');
}
