import { execSync } from "node:child_process";

// Same switches OpenNext sets before it invokes `npm run build`.
process.env.NEXT_PRIVATE_STANDALONE = "true";
process.env.NEXT_PRIVATE_OUTPUT_TRACE_ROOT = process.cwd();

execSync("npx next build --webpack", {
  stdio: "inherit",
  env: process.env,
});

execSync("npx opennextjs-cloudflare build --skipNextBuild", {
  stdio: "inherit",
  env: process.env,
});
