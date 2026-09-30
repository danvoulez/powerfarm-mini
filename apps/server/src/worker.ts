import { loadConfig } from "../../../packages/db/src/config.ts";
import { createServices } from "./services.ts";

const services = createServices(loadConfig());
const workerId = `powerfarm-worker-${process.pid}`;
console.log(`Continuity worker ${workerId} started`);

let busy = false;
const timer = setInterval(() => {
  if (busy) return;
  busy = true;
  try {
    let count = 0;
    while (count < 20 && services.continuity.runNext(workerId)) count++;
    if (count > 0) console.log(`processed ${count} execution(s)`);
  } catch (error) {
    console.error(error);
  } finally {
    busy = false;
  }
}, 1000);

timer.unref?.();
process.stdin.resume();
process.on("SIGINT", () => { clearInterval(timer); services.db.close(); process.exit(0); });
process.on("SIGTERM", () => { clearInterval(timer); services.db.close(); process.exit(0); });
