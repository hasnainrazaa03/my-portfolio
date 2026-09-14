/**
 * deployFreshness.js — is production serving what main says it should?
 *
 * WHY: a push to main once produced no Vercel deployment at all. The commit
 * carried zero status entries, which GitHub reports as "pending", so it looked
 * exactly like a slow build; production kept serving the previous version and
 * nothing anywhere failed. This compares the commit production reports
 * (/api/health) with main's HEAD.
 *
 * A mismatch is not immediately a failure: a deploy takes a minute or two,
 * and the scheduled check can land mid-deploy. It fails only once HEAD has
 * been on main for longer than the grace period.
 *
 * Usage (CI):
 *   node scripts/deployFreshness.js <prodSha|null> <headSha> <headPushedAtISO> [graceMinutes]
 */

/**
 * @param {{ prodSha: string|null, headSha: string, headPushedAt: string|Date, now?: Date, graceMinutes?: number }} input
 * @returns {{ ok: boolean, message: string }}
 */
export function assessFreshness({ prodSha, headSha, headPushedAt, now = new Date(), graceMinutes = 30 }) {
  if (!headSha) return { ok: false, message: 'could not determine main HEAD' };

  if (!prodSha) {
    return {
      ok: false,
      message:
        'production reports no commit — /api/health returned commit: null. Check that Vercel exposes ' +
        'system environment variables (VERCEL_GIT_COMMIT_SHA) to the deployment.',
    };
  }

  const short = (s) => String(s).slice(0, 7);
  if (prodSha === headSha) return { ok: true, message: `production is on main HEAD (${short(headSha)})` };

  const pushed = new Date(headPushedAt);
  if (Number.isNaN(pushed.getTime())) {
    return { ok: false, message: `production is on ${short(prodSha)}, main is ${short(headSha)}, and the push time is unknown` };
  }

  const ageMinutes = Math.floor((now.getTime() - pushed.getTime()) / 60_000);
  if (ageMinutes < graceMinutes) {
    return {
      ok: true,
      message: `main ${short(headSha)} was pushed ${ageMinutes} min ago; production (${short(prodSha)}) may still be deploying`,
    };
  }

  return {
    ok: false,
    message:
      `production serves ${short(prodSha)} but main has been at ${short(headSha)} for ${ageMinutes} min. ` +
      'The deploy was skipped or failed — check the Vercel dashboard, then redeploy or push an empty commit.',
  };
}

if (process.argv[1] && process.argv[1].endsWith('deployFreshness.js')) {
  const [prodSha, headSha, headPushedAt, grace] = process.argv.slice(2);
  const result = assessFreshness({
    prodSha: prodSha && prodSha !== 'null' ? prodSha : null,
    headSha,
    headPushedAt,
    graceMinutes: grace ? Number(grace) : undefined,
  });
  console.log(`${result.ok ? 'OK' : 'FAIL'}: ${result.message}`);
  process.exit(result.ok ? 0 : 1);
}
