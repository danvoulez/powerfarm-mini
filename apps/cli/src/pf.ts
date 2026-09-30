import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const base=(process.env.POWERFARM_URL ?? "http://127.0.0.1:4545").replace(/\/$/,"");
const token=process.env.POWERFARM_TOKEN ?? process.env.POWERFARM_ADMIN_TOKEN ?? "powerfarm-local-admin";

async function api(path:string,options:any={}){
  const headers:any={authorization:`Bearer ${token}`,...options.headers};
  if(options.json!==undefined){headers["content-type"]="application/json";options.body=JSON.stringify(options.json)}
  const response=await fetch(base+path,{...options,headers});
  const payload=await response.json();
  if(!response.ok)throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
  return payload.data ?? payload;
}
function out(value:any){console.log(JSON.stringify(value,null,2))}
function usage(){console.log(`Powerfarm CLI

Usage:
  pf status
  pf dashboard
  pf search <query>
  pf entities list
  pf entities create <kind> <name> [id]
  pf artifacts list
  pf studies list
  pf studies create <title> <decision-question>
  pf claims list
  pf claims create <statement> <scope> [study-id]
  pf content list
  pf content put <file>
  pf acts [limit]
  pf continuity contracts
  pf continuity executions
  pf continuity run-next
  pf openapi

Environment:
  POWERFARM_URL   API base URL (default http://127.0.0.1:4545)
  POWERFARM_TOKEN Bearer token (default local development token)
`)}

const [command,sub,...args]=process.argv.slice(2);
try{
  if(!command||command==="help"||command==="--help"){usage();process.exit(0)}
  if(command==="status") out(await api("/api/v1/health"));
  else if(command==="dashboard") out(await api("/api/v1/dashboard"));
  else if(command==="search") out(await api(`/api/v1/search?q=${encodeURIComponent([sub,...args].filter(Boolean).join(" "))}`));
  else if(command==="entities"&&sub==="list")out(await api("/api/v1/entities"));
  else if(command==="entities"&&sub==="create"){
    const [kind,name,id]=args;if(!kind||!name)throw new Error("entities create requires <kind> <name> [id]");
    out(await api("/api/v1/entities",{method:"POST",json:{kind,name,...(id?{id}:{})}}));
  }
  else if(command==="artifacts"&&sub==="list")out(await api("/api/v1/artifacts"));
  else if(command==="studies"&&sub==="list")out(await api("/api/v1/studies"));
  else if(command==="studies"&&sub==="create"){
    const [title,...question]=args;if(!title||!question.length)throw new Error("studies create requires <title> <decision-question>");
    out(await api("/api/v1/studies",{method:"POST",json:{title,decisionQuestion:question.join(" "),studyClass:"exploratory",unitUnderTest:{},resourceRegime:{},primaryOutcomes:[]}}));
  }
  else if(command==="claims"&&sub==="list")out(await api("/api/v1/claims"));
  else if(command==="claims"&&sub==="create"){
    const [statement,scope,studyId]=args;if(!statement||!scope)throw new Error("claims create requires <statement> <scope> [study-id]");
    out(await api("/api/v1/claims",{method:"POST",json:{statement,scope,...(studyId?{studyId}:{})}}));
  }
  else if(command==="content"&&sub==="list")out(await api("/api/v1/content"));
  else if(command==="content"&&sub==="put"){
    const [file]=args;if(!file)throw new Error("content put requires <file>");
    const bytes=await readFile(file);const response=await fetch(base+"/api/v1/content",{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/octet-stream","x-powerfarm-object-kind":"cli-upload","x-powerfarm-filename":basename(file)},body:bytes});const payload=await response.json();if(!response.ok)throw new Error(payload?.error?.message??"upload failed");out(payload.data);
  }
  else if(command==="acts")out(await api(`/api/v1/acts?limit=${Number(sub)||100}`));
  else if(command==="continuity"&&sub==="contracts")out(await api("/api/v1/executable-contracts"));
  else if(command==="continuity"&&sub==="executions")out(await api("/api/v1/executions"));
  else if(command==="continuity"&&sub==="run-next")out(await api("/api/v1/executions/run-next",{method:"POST"}));
  else if(command==="openapi")out(await api("/api/openapi.json"));
  else {usage();process.exitCode=1}
}catch(error:any){console.error(`pf: ${error.message}`);process.exitCode=1}
