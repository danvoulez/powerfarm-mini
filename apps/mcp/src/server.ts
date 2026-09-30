import { createInterface } from "node:readline";

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

const tools=[
  {name:"powerfarm_search",description:"Search recognized Powerfarm entities, artifacts, studies, claims, and products.",inputSchema:{type:"object",properties:{query:{type:"string"}},required:["query"]}},
  {name:"powerfarm_dashboard",description:"Read current institutional counters and recent activity.",inputSchema:{type:"object",properties:{}}},
  {name:"powerfarm_list_studies",description:"List current research studies.",inputSchema:{type:"object",properties:{status:{type:"string"}}}},
  {name:"powerfarm_get_study",description:"Read a study with comparators, runs, findings, claims and recommendations.",inputSchema:{type:"object",properties:{id:{type:"string"}},required:["id"]}},
  {name:"powerfarm_create_study",description:"Create a decision-first Powerfarm study.",inputSchema:{type:"object",properties:{title:{type:"string"},decisionQuestion:{type:"string"},studyClass:{type:"string"},unitUnderTest:{type:"object"},resourceRegime:{type:"object"}},required:["title","decisionQuestion"]}},
  {name:"powerfarm_list_claims",description:"List scoped claims.",inputSchema:{type:"object",properties:{status:{type:"string"}}}},
  {name:"powerfarm_get_claim",description:"Read a claim with supporting/contradicting evidence and confidence history.",inputSchema:{type:"object",properties:{id:{type:"string"}},required:["id"]}},
  {name:"powerfarm_create_claim",description:"Record a scoped claim; this does not automatically assert high confidence.",inputSchema:{type:"object",properties:{statement:{type:"string"},scope:{type:"string"},studyId:{type:"string"},reviewTrigger:{type:"string"}},required:["statement","scope"]}},
  {name:"powerfarm_list_artifacts",description:"List institutionally recognized artifacts.",inputSchema:{type:"object",properties:{kind:{type:"string"}}}},
  {name:"powerfarm_list_executions",description:"List Continuity executions and causal state.",inputSchema:{type:"object",properties:{state:{type:"string"}}}},
  {name:"powerfarm_run_next_execution",description:"Claim and materialize one ready Continuity execution.",inputSchema:{type:"object",properties:{}}},
  {name:"powerfarm_list_acts",description:"List ordered institutional acts.",inputSchema:{type:"object",properties:{limit:{type:"number"}}}},
];

async function callTool(name:string,args:any){
  switch(name){
    case "powerfarm_search": return api(`/api/v1/search?q=${encodeURIComponent(args.query)}`);
    case "powerfarm_dashboard": return api("/api/v1/dashboard");
    case "powerfarm_list_studies": return api(`/api/v1/studies${args.status?`?status=${encodeURIComponent(args.status)}`:""}`);
    case "powerfarm_get_study": return api(`/api/v1/studies/${encodeURIComponent(args.id)}`);
    case "powerfarm_create_study": return api("/api/v1/studies",{method:"POST",json:{title:args.title,decisionQuestion:args.decisionQuestion,studyClass:args.studyClass??"exploratory",unitUnderTest:args.unitUnderTest??{},resourceRegime:args.resourceRegime??{},primaryOutcomes:args.primaryOutcomes??[]}});
    case "powerfarm_list_claims": return api(`/api/v1/claims${args.status?`?status=${encodeURIComponent(args.status)}`:""}`);
    case "powerfarm_get_claim": return api(`/api/v1/claims/${encodeURIComponent(args.id)}`);
    case "powerfarm_create_claim": return api("/api/v1/claims",{method:"POST",json:args});
    case "powerfarm_list_artifacts": return api(`/api/v1/artifacts${args.kind?`?kind=${encodeURIComponent(args.kind)}`:""}`);
    case "powerfarm_list_executions": return api(`/api/v1/executions${args.state?`?state=${encodeURIComponent(args.state)}`:""}`);
    case "powerfarm_run_next_execution": return api("/api/v1/executions/run-next",{method:"POST"});
    case "powerfarm_list_acts": return api(`/api/v1/acts?limit=${Number(args.limit)||100}`);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}
function send(message:any){process.stdout.write(JSON.stringify(message)+"\n")}
function ok(id:any,result:any){send({jsonrpc:"2.0",id,result})}
function fail(id:any,error:any){send({jsonrpc:"2.0",id,error:{code:-32000,message:error?.message??String(error)}})}

const rl=createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of rl){
  if(!line.trim())continue;
  let message:any;
  try{message=JSON.parse(line)}catch{continue}
  const {id,method,params}=message;
  try{
    if(method==="initialize") ok(id,{protocolVersion:params?.protocolVersion??"2025-06-18",capabilities:{tools:{}},serverInfo:{name:"powerfarm-platform",version:"0.1.0"}});
    else if(method==="notifications/initialized"){}
    else if(method==="ping")ok(id,{});
    else if(method==="tools/list")ok(id,{tools});
    else if(method==="tools/call"){
      const result=await callTool(params?.name,params?.arguments??{});
      ok(id,{content:[{type:"text",text:JSON.stringify(result,null,2)}],structuredContent:result,isError:false});
    } else if(id!==undefined) fail(id,new Error(`Method not supported: ${method}`));
  }catch(error){if(id!==undefined)fail(id,error)}
}
