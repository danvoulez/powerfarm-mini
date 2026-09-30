import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServerApp } from "../apps/server/src/app.ts";

const admin="test-admin-token";
async function fixture(){
  const dir=mkdtempSync(join(tmpdir(),"powerfarm-test-"));
  const config={host:"127.0.0.1",port:0,dbPath:join(dir,"powerfarm.db"),objectDir:join(dir,"objects"),adminToken:admin,publicUrl:"http://127.0.0.1",rootDir:process.cwd()};
  const app=createServerApp(config);
  await new Promise<void>((resolve)=>app.server.listen(0,"127.0.0.1",resolve));
  const address=app.server.address() as any; const base=`http://127.0.0.1:${address.port}`;
  async function api(path:string,options:any={}){const headers:any={...options.headers};if(options.auth!==false)headers.authorization=`Bearer ${admin}`;if(options.json!==undefined){headers["content-type"]="application/json";options.body=JSON.stringify(options.json)}const r=await fetch(base+path,{...options,headers});const type=r.headers.get("content-type")??"";const payload=type.includes("json")?await r.json():new Uint8Array(await r.arrayBuffer());return {r,payload}}
  async function close(){await new Promise<void>((resolve)=>app.server.close(()=>resolve()));app.services.db.close();rmSync(dir,{recursive:true,force:true})}
  return {app,base,api,close};
}

test("boots, protects institutional endpoints, and exposes OpenAPI",async()=>{
  const f=await fixture(); try{
    let x=await f.api("/api/v1/health",{auth:false});assert.equal(x.r.status,200);assert.equal((x.payload as any).data.status,"ok");
    x=await f.api("/api/v1/dashboard",{auth:false});assert.equal(x.r.status,403);
    x=await f.api("/api/openapi.json",{auth:false});assert.equal(x.r.status,200);assert.equal((x.payload as any).data.openapi,"3.1.0");
  }finally{await f.close()}
});

test("records identity, research epistemic layers, and institutional acts",async()=>{
  const f=await fixture(); try{
    let x=await f.api("/api/v1/entities",{method:"POST",json:{id:"powerfarm.app/agent/test",kind:"agent",name:"Test Agent"}});assert.equal(x.r.status,201);
    x=await f.api("/api/v1/studies",{method:"POST",json:{title:"Route study",decisionQuestion:"Which route produces verified changes at lower cost?",studyClass:"comparative",unitUnderTest:{kind:"execution-route"},resourceRegime:{maxUsd:5},primaryOutcomes:["verified_success_rate","cost_usd"]}});assert.equal(x.r.status,201);const study=(x.payload as any).data;
    x=await f.api(`/api/v1/studies/${study.id}/runs`,{method:"POST",json:{environment:{node:"22"},route:{model:"test-model"}}});const run=(x.payload as any).data;
    x=await f.api(`/api/v1/runs/${run.id}/observations`,{method:"POST",json:{kind:"verification",value:{passed:true}}});const obs=(x.payload as any).data;
    x=await f.api(`/api/v1/runs/${run.id}/measurements`,{method:"POST",json:{observationId:obs.id,metric:"verified_success",valueNumber:1,unit:"boolean",isPrimary:true,verifier:"deterministic-test"}});assert.equal(x.r.status,201);
    x=await f.api("/api/v1/claims",{method:"POST",json:{studyId:study.id,statement:"The tested route produced a verified success in this run.",scope:"This exact test run only",reviewTrigger:"A repeated run contradicts it"}});const claim=(x.payload as any).data;
    await f.api(`/api/v1/claims/${claim.id}/evidence`,{method:"POST",json:{evidenceKind:"observation",evidenceId:obs.id,stance:"supporting"}});
    x=await f.api(`/api/v1/claims/${claim.id}/confidence`,{method:"POST",json:{level:"LOW",rationale:"Single run; no replication.",dimensions:{replication:"weak",directness:"high"}}});assert.equal(x.r.status,201);
    x=await f.api(`/api/v1/claims/${claim.id}`);assert.equal((x.payload as any).data.evidence.length,1);assert.equal((x.payload as any).data.confidence[0].level,"LOW");
    x=await f.api("/api/v1/acts?limit=200");assert.ok((x.payload as any).data.some((a:any)=>a.kind==="claim.confidence.assessed"));
  }finally{await f.close()}
});

test("preserves immutable content and verifies bytes",async()=>{
  const f=await fixture(); try{
    const bytes=new TextEncoder().encode("powerfarm evidence\n");
    const r=await fetch(f.base+"/api/v1/content",{method:"POST",headers:{authorization:`Bearer ${admin}`,"content-type":"text/plain"},body:bytes});const payload:any=await r.json();assert.equal(r.status,201);assert.match(payload.data.digest,/^[a-f0-9]{64}$/);
    const read=await fetch(f.base+`/api/v1/content/${payload.data.digest}`,{headers:{authorization:`Bearer ${admin}`}});assert.equal(await read.text(),"powerfarm evidence\n");
    const verify=await f.api(`/api/v1/content/${payload.data.digest}/verify`,{method:"POST"});assert.equal((verify.payload as any).data.valid,true);
  }finally{await f.close()}
});

test("Continuity separates trigger, claim, materialization and verification",async()=>{
  const f=await fixture(); try{
    let x=await f.api("/api/v1/executable-contracts",{method:"POST",json:{name:"No-op verification",status:"armed",temporalPredicate:{type:"always"},observationalPredicate:{type:"manual"},policy:{mode:"first_match"},effect:{type:"noop",payload:{ok:true}},verification:{type:"receipt_exists"}}});const c=(x.payload as any).data;
    x=await f.api(`/api/v1/executable-contracts/${c.id}/trigger`,{method:"POST",json:{trigger:{source:"test"},idempotencyKey:"test-one"}});assert.equal((x.payload as any).data.state,"ready");
    x=await f.api("/api/v1/executions/run-next",{method:"POST"});assert.equal((x.payload as any).data.state,"done");assert.equal((x.payload as any).data.receipts[0].verified,true);
  }finally{await f.close()}
});

test("benchmark instruments and temporal/observational evidence are first-class",async()=>{
  const f=await fixture(); try{
    let x=await f.api("/api/v1/benchmarks",{method:"POST",json:{name:"Software production baseline",version:"v1",comparabilityBoundary:"Only identical task-set revisions are directly comparable.",contaminationStrategy:"Fresh task material."}});const b=(x.payload as any).data;assert.equal(b.version,"v1");
    x=await f.api(`/api/v1/benchmarks/${b.id}/tasks`,{method:"POST",json:{taskKey:"task-1",successCriteria:{tests:"pass"},grader:{type:"deterministic"},sequestered:true}});assert.equal((x.payload as any).data.sequestered,true);
    x=await f.api("/api/v1/evidence-signals",{method:"POST",json:{domain:"observational",kind:"heartbeat",subject:"powerfarm.app/system/platform",value:{healthy:true}}});assert.equal((x.payload as any).data.domain,"observational");
    x=await f.api("/api/v1/evidence-signals?domain=observational");assert.equal((x.payload as any).data.length,1);
  }finally{await f.close()}
});

test("ordered institutional acts can rebuild core recognized state",async()=>{
  const f=await fixture(); const {Database}=await import("../packages/db/src/database.ts"); const {replayAll}=await import("../packages/institution/src/replay.ts");
  const dir=mkdtempSync(join(tmpdir(),"powerfarm-replay-"));
  try{
    await f.api("/api/v1/entities",{method:"POST",json:{id:"powerfarm.app/service/replayed",kind:"service",name:"Replay target"}});
    const s=await f.api("/api/v1/studies",{method:"POST",json:{title:"Replay study",decisionQuestion:"Can acts reconstruct this study?",studyClass:"exploratory",unitUnderTest:{},resourceRegime:{},primaryOutcomes:[]}});const study=(s.payload as any).data;
    const acts=f.app.services.db.all<any>("SELECT * FROM recorded_acts ORDER BY seq").map(a=>({...a,payload:JSON.parse(a.payload_json)}));
    const db=new Database(join(dir,"replay.db"));db.transaction(()=>replayAll(db,acts));
    assert.equal(db.get<any>("SELECT name FROM entities WHERE id='powerfarm.app/service/replayed'")?.name,"Replay target");
    assert.equal(db.get<any>("SELECT title FROM studies WHERE id=?",study.id)?.title,"Replay study");
    assert.equal(Number(db.get<any>("SELECT COUNT(*) n FROM recorded_acts")?.n),acts.length);db.close();
  }finally{await f.close();rmSync(dir,{recursive:true,force:true})}
});
