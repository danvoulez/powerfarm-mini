import { assertSafeAdminToken, DEV_ADMIN_TOKEN, loadConfig } from "../../../packages/db/src/config.ts";
import { createServerApp } from "./app.ts";

const config = loadConfig();
try {
  assertSafeAdminToken(config);
} catch (error: any) {
  console.error(error.message);
  process.exit(1);
}
const { server, services } = createServerApp(config);

server.listen(config.port, config.host, () => {
  console.log(`Powerfarm Platform running at ${config.publicUrl}`);
  console.log(`Web console: ${config.publicUrl}/`);
  console.log(`OpenAPI: ${config.publicUrl}/api/openapi.json`);
  // A configured token is a secret and must not end up in logs; the development default is public anyway.
  console.log(config.adminToken === DEV_ADMIN_TOKEN ? `Local admin token (development default): ${DEV_ADMIN_TOKEN}` : "Admin token: from POWERFARM_ADMIN_TOKEN");
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
