// .env.local を簡易ロードする（Next.jsの外＝プレーンなNode/GitHub Actionsから実行するため）。
// GitHub Actions では .env.local が存在しない代わりに、job の env: で直接
// process.env に値が入る想定なので、ファイルが無ければ何もしない。
import fs from "node:fs";
import path from "node:path";

export function loadEnvLocal(cwd = process.cwd()) {
  const envPath = path.join(cwd, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
