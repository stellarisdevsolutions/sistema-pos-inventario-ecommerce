import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const server = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      ENABLE_DEMO_LOGIN: "1",
      SESSION_SECRET: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
    },
  }
);

server.on("error", () => {
  console.error("No se pudo iniciar el servidor de demostración.");
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.kill(signal));
}
server.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" ? 130 : 143);
});
