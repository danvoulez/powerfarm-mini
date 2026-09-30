import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadConfig } from "../packages/db/src/config.ts";
import { Database } from "../packages/db/src/database.ts";
import { sha256 } from "../packages/core/src/hash.ts";
import { fromJson } from "../packages/core/src/json.ts";

const config=loadConfig();const db=new Database(config.dbPath);const stamp=new Date().toISOString().replace(/[:.]/g,"-");const out=resolve(process.argv[2]??join(config.rootDir,"var",`institution-export-${stamp}`));mkdirSync(out,{recursive:true});
const acts=db.all<any>("SELECT * FROM recorded_acts ORDER BY seq").map(a=>({...a,payload:fromJson(a.payload_json,{}),payload_json:undefined}));writeFileSync(join(out,"acts.jsonl"),acts.map(a=>JSON.stringify(a)).join("\n")+"\n");
const objects=db.all<any>("SELECT * FROM content_objects ORDER BY digest");writeFileSync(join(out,"content-manifest.json"),JSON.stringify(objects,null,2)+"\n");
const canonDir=join(out,"canon");mkdirSync(canonDir,{recursive:true});const canon:any[]=[];for(const name of readdirSync(join(config.rootDir,"canon")).filter(n=>n.endsWith(".md"))){const bytes=readFileSync(join(config.rootDir,"canon",name));writeFileSync(join(canonDir,name),bytes);canon.push({name,sha256:sha256(bytes),sizeBytes:bytes.length})}
if(readdirSync(config.objectDir,{recursive:true}).length)cpSync(config.objectDir,join(out,"objects"),{recursive:true});
const manifest={format:"powerfarm-institution-export/v1",createdAt:new Date().toISOString(),schemaVersion:db.get<any>("SELECT value FROM meta WHERE key='schema_version'")?.value,actCount:acts.length,objectCount:objects.length,canon};writeFileSync(join(out,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");db.close();console.log(out);
