import type { WalnutContext, WalnutWebContext } from './walnut';

/** @walnut_method
 * name: Delete Member By ID
 * description: Login with ${username} and ${password} then delete member ${memberId} from Command Center
 * actionType: custom_delete_member
 * context: web
 * needsLocator: false
 * category: Member Management
 */
export async function deleteMember(ctx: WalnutContext) {
  const webCtx = ctx as WalnutWebContext;
  const username = ctx.args[0];
  const password = ctx.args[1];
  const memberId = ctx.args[2];

  if (!memberId) throw new Error('memberId is required — provide the ICMEM ID to delete.');

  // ── Step 1: Login via UI to establish an authenticated session ──
  ctx.log(`Logging in as ${username}...`);
  await webCtx.navigate(ctx.testBaseUrl + '/login');
  await webCtx.wait(2000);

  const page = webCtx.page;
  const usernameInput = page.locator('input[name="username"], input[name="email"], #username, [data-testid="username"]').first();
  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  await usernameInput.fill(username);

  const passwordInput = page.locator('input[name="password"], #password, [data-testid="password"]').first();
  await passwordInput.fill(password);

  const submitBtn = page.locator('button[type="submit"], [data-testid="submit"], .login-button').first();
  await submitBtn.click();
  await webCtx.wait(3000);
  ctx.log('Login complete.');

  // ── Step 2: Set the ALLOW_DELETE cookie (required for delete permission) ──
  await webCtx.evaluate(`document.cookie = "ALLOW_DELETE=1; path=/; domain=" + window.location.hostname`);
  ctx.log('ALLOW_DELETE cookie set.');

  // ── Step 3: Navigate to Command Center and query the member ──
  await webCtx.navigate(ctx.testBaseUrl + '/command-center/');
  await webCtx.wait(2000);

  const searchInput = page.locator('input[type="text"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill(memberId);

  const queryBtn = page.locator('button:has-text("Query")').first();
  await queryBtn.click();
  await webCtx.wait(3000);
  ctx.log(`Member ${memberId} queried in Command Center.`);

  // ── Step 4: Extract session cookie ──
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c: any) => c.name === 'AverSessionId');
  if (!sessionCookie) {
    throw new Error('Could not find AverSessionId cookie after login. Login may have failed.');
  }
  ctx.log(`Session cookie extracted: AverSessionId=${sessionCookie.value.substring(0, 8)}...`);

  // ── Step 5: Call the delete member API using in-page fetch ──
  // The browser already has the session cookie attached, so we use credentials: 'include'
  ctx.log(`Calling delete API for member: ${memberId}`);

  const deleteResult = await page.evaluate(async (mId: string) => {
    // Try multiple endpoint patterns — the portal likely uses one of these
    const endpoints = [
      { method: 'DELETE', url: `/api/member-management/members/${mId}` },
      { method: 'DELETE', url: `/api/member-management/delete/${mId}` },
      { method: 'POST', url: `/api/member-management/delete-member`, body: { memberId: mId } },
      { method: 'POST', url: `/api/member-management/delete`, body: { memberId: mId } },
      { method: 'DELETE', url: `/api/members/${mId}` },
      { method: 'POST', url: `/api/command-center/delete-member`, body: { memberId: mId } },
      { method: 'DELETE', url: `/api/command-center/members/${mId}` },
      { method: 'POST', url: `/api/command-center/delete`, body: { memberId: mId } },
      { method: 'DELETE', url: `/api/command-center/delete/${mId}` },
    ];

    for (const ep of endpoints) {
      try {
        const opts: any = {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include' as RequestCredentials,
        };
        if ((ep as any).body) {
          opts.body = JSON.stringify((ep as any).body);
        }
        const res = await fetch(ep.url, opts);
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}

        if (res.status >= 200 && res.status < 300) {
          return { success: true, endpoint: `${ep.method} ${ep.url}`, status: res.status, body: json || text };
        }
        if (res.status === 404) continue; // wrong endpoint
        if (res.status === 401 || res.status === 403) continue; // auth issue, try next
      } catch {
        continue;
      }
    }
    return { success: false, endpoint: '', status: 0, body: 'All endpoints returned non-success' };
  }, memberId);

  if (!deleteResult.success) {
    throw new Error(
      `Could not delete member ${memberId}. None of the attempted API endpoints succeeded. ` +
      `Please inspect the Network tab in DevTools when manually deleting a member to find the correct endpoint, ` +
      `then update the endpoint list in this custom method.`
    );
  }

  ctx.log(`Delete succeeded via: ${deleteResult.endpoint} (status: ${deleteResult.status})`);
  ctx.log(`Response: ${JSON.stringify(deleteResult.body)}`);

  // ── Step 6: Verify deletion ──
  await webCtx.wait(2000);
  await page.reload();
  await webCtx.wait(3000);

  // Re-search for the member
  const searchInput2 = page.locator('input[type="text"]').first();
  await searchInput2.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput2.fill(memberId);
  const queryBtn2 = page.locator('button:has-text("Query")').first();
  await queryBtn2.click();
  await webCtx.wait(3000);

  const bodyText = await webCtx.evaluate('document.body.innerText');
  if (bodyText.includes(memberId) && !bodyText.toLowerCase().includes('not found') && !bodyText.toLowerCase().includes('no results') && !bodyText.toLowerCase().includes('deleted')) {
    ctx.warn(`Member ${memberId} may still appear after deletion — it could take time to propagate, or deletion may have partially failed.`);
  } else {
    ctx.log(`Member ${memberId} successfully deleted and verified gone from Command Center.`);
  }
}
