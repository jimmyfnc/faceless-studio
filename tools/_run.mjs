/**
 * Run the Remotion CLI cross-platform.
 *
 * Node 18+ refuses to spawn `.cmd` files (npx.cmd) without `shell: true`
 * (a Windows security change), so on Windows we go through the shell and quote
 * args ourselves (the shell does no quoting for us). On POSIX we spawn npx
 * directly with an args array.
 */
import { spawnSync } from "node:child_process";

/** Quote an arg for cmd.exe if it contains whitespace or quotes. */
function q(arg) {
  return /[\s"]/.test(arg) ? `"${String(arg).replace(/"/g, '\\"')}"` : arg;
}

/**
 * Invoke `npx remotion <args...>`, inheriting stdio. Throws if the process
 * can't be spawned. Returns the spawnSync result (check `.status` for exit code).
 */
export function runRemotion(args, opts = {}) {
  const isWin = process.platform === "win32";
  const res = isWin
    ? spawnSync(["npx", "remotion", ...args].map(q).join(" "), {
        stdio: "inherit",
        shell: true,
        ...opts,
      })
    : spawnSync("npx", ["remotion", ...args], { stdio: "inherit", ...opts });
  if (res.error) throw res.error;
  return res;
}
