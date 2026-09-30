import { loadConfig } from "../packages/db/src/config.ts";
import { Database } from "../packages/db/src/database.ts";
import { bootstrapInstitution } from "../packages/institution/src/bootstrap.ts";
const config=loadConfig(); const db=new Database(config.dbPath); bootstrapInstitution(db); console.log(`Database ready: ${config.dbPath}`); db.close();
