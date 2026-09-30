import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const root=process.cwd();
const required=["package.json","README.md","apps/server/src/main.ts","apps/web/public/index.html","packages/db/src/schema.ts","canon"];
let failures=0;
for(const item of required){if(!existsSync(join(root,item))){console.error(`missing: ${item}`);failures++}}
const canon=readdirSync(join(root,"canon")).filter(x=>/^PF-0[1-5].*\.md$/.test(x));
if(canon.length!==5){console.error(`expected 5 canon files, found ${canon.length}`);failures++}
const routes=readFileSync(join(root,"apps/server/src/routes.ts"),"utf8");
const operationIds=[...routes.matchAll(/operationId:\s*"([^"]+)"/g)].map(m=>m[1]);
const duplicates=operationIds.filter((x,i)=>operationIds.indexOf(x)!==i);
if(duplicates.length){console.error(`duplicate operationIds: ${duplicates.join(", ")}`);failures++}
console.log(JSON.stringify({canonDocuments:canon.length,operationIds:operationIds.length,sourceFiles:readdirRecursive(root).length,failures},null,2));
if(failures)process.exit(1);
function readdirRecursive(dir:string):string[]{const out:string[]=[];for(const name of readdirSync(dir)){if([".git","node_modules","var"].includes(name))continue;const path=join(dir,name);if(statSync(path).isDirectory())out.push(...readdirRecursive(path));else out.push(path)}return out}
