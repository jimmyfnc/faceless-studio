/**
 * Curation — promote a winning candidate to the canonical image name and clean
 * up the rest, in one step.
 *
 * `generate --candidates N` writes `s03a-1.png … s03a-N.png`. Picking used to
 * be manual (`cp` the winner, `rm` the others, hand-edit credits.json). This
 * plans that as data: given the files on disk and picks like `{ s03a: 1 }`,
 * it returns the copy/delete actions and the credits rewrite.
 *
 * Pure (no fs) — the CLI (`tools/pick.mjs`) applies the plan.
 */

const EXT_RE = /\.(png|jpe?g|webp)$/i;

/**
 * @param {string[]} files            files present in the asset dir
 * @param {Record<string, number>} picks   e.g. { s03a: 1, s05b: 3 }
 * @returns {{ actions: Array<{op:"promote"|"delete", from?:string, to?:string, file?:string}>, errors: string[] }}
 */
export function planPicks(files, picks) {
  const errors = [];
  const actions = [];
  for (const [name, n] of Object.entries(picks)) {
    if (!Number.isInteger(n) || n < 1) {
      errors.push(`${name}: candidate number must be a positive integer (got "${n}")`);
      continue;
    }
    const winner = files.find((f) => f.toLowerCase().startsWith(`${name.toLowerCase()}-${n}.`) && EXT_RE.test(f));
    if (!winner) {
      errors.push(`${name}: candidate ${name}-${n}.* not found`);
      continue;
    }
    const ext = winner.slice(winner.lastIndexOf("."));
    actions.push({ op: "promote", from: winner, to: `${name}${ext}` });
    for (const f of files) {
      if (new RegExp(`^${name}-\\d+\\.`, "i").test(f) && EXT_RE.test(f)) {
        actions.push({ op: "delete", file: f });
      }
    }
  }
  return { actions, errors };
}

/**
 * Rewrite a credits asset list after picks: the winner's entry is carried over
 * under the canonical filename (keeping its source/provider), all candidate
 * entries are dropped, and any stale entry for the canonical name is replaced.
 */
export function creditsAfterPicks(assets, actions) {
  const promoted = actions.filter((a) => a.op === "promote");
  const deleted = new Set(actions.filter((a) => a.op === "delete").map((a) => a.file));
  let out = (assets || []).filter((a) => !deleted.has(a.file));
  for (const { from, to } of promoted) {
    const winner = (assets || []).find((a) => a.file === from);
    out = out.filter((a) => a.file !== to);
    if (winner) {
      out.push({ ...winner, file: to, src: winner.src ? winner.src.replace(from, to) : winner.src });
    }
  }
  return out;
}

/** Parse CLI picks: ["s03a=1", "s05b=3"] → { s03a: 1, s05b: 3 } (errors listed). */
export function parsePickArgs(args) {
  const picks = {};
  const errors = [];
  for (const a of args) {
    const m = a.match(/^([a-z0-9][a-z0-9-]*)=(\d+)$/i);
    if (!m) {
      errors.push(`"${a}" — expected name=N (e.g. s03a=1)`);
      continue;
    }
    picks[m[1]] = Number(m[2]);
  }
  if (!Object.keys(picks).length && !errors.length) errors.push("no picks given");
  return { picks, errors };
}
