import { loadConfig } from "../../../packages/db/src/config.ts";
import { createServerApp } from "./app.ts";

const config = loadConfig();
const { server, services } = createServerApp(config);

server.listen(config.port, config.host, () => {
  console.log(`Powerfarm Platform running at ${config.publicUrl}`);
  console.log(`Web console: ${config.publicUrl}/`);
  console.log(`OpenAPI: ${config.publicUrl}/api/openapi.json`);
  console.log(`Local admin token: ${config.adminToken}`);
});

function shutdown(signal: string) {
  console.log(`\n${signal}: shutting down`);
  server.close(() => {
    services.db.close();
    process.exit(0);
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
