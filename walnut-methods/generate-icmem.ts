import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: Generate ICMEM ID
 * description: Generate a random ICMEM ID and store in $[icmemId]
 * actionType: custom_generate_icmem
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function generateIcmem(ctx: WalnutContext) {
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  const letters = Array.from({ length: 4 }, () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }).join('');

  const icmemId = `ICMEM-${digits}${letters}`;
  ctx.log(`Generated ICMEM ID: ${icmemId}`);
  ctx.setVariable(ctx.args[0], icmemId);
}
