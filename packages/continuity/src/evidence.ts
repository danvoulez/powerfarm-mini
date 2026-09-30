import type { Database } from "../../db/src/database.ts";
import { newId } from "../../core/src/ids.ts";
import { nowIso } from "../../core/src/time.ts";
import { fromJson, toJson } from "../../core/src/json.ts";
import { enumValue, jsonObject, optionalString, requiredString } from "../../core/src/validate.ts";
import { recordAct } from "../../institution/src/acts.ts";

export class EvidenceSignalService {
  readonly db: Database;
  constructor(db:Database){this.db=db}
  record(input:Record<string,unknown>,actorId:string){const id=newId("sig"),domain=enumValue(input,"domain",["observational","temporal"] as const),kind=requiredString(input,"kind",200),subject=requiredString(input,"subject",500),value=input.value??null,observedAt=optionalString(input,"observedAt",100)??nowIso(),sourceDigest=optionalString(input,"sourceDigest",128),metadata=jsonObject(input,"metadata");this.db.transaction(()=>{this.db.run("INSERT INTO evidence_signals(id,domain,kind,subject,value_json,observed_at,source_digest,metadata_json) VALUES(?,?,?,?,?,?,?,?)",id,domain,kind,subject,toJson(value),observedAt,sourceDigest,toJson(metadata));recordAct(this.db,{actorId,kind:`${domain}_evidence.recorded`,objectType:"evidence_signal",objectId:id,payload:{id,domain,kind,subject,value,observedAt,sourceDigest,metadata},evidenceDigest:sourceDigest})});return this.get(id)}
  get(id:string){const r=this.db.get<any>("SELECT * FROM evidence_signals WHERE id=?",id);if(!r)return null;return {...r,value:fromJson(r.value_json),metadata:fromJson(r.metadata_json,{}),value_json:undefined,metadata_json:undefined}}
  list(domain?:string,subject?:string){const clauses=[],args:any[]=[];if(domain){clauses.push("domain=?");args.push(domain)}if(subject){clauses.push("subject=?");args.push(subject)}const where=clauses.length?`WHERE ${clauses.join(" AND ")}`:"";return this.db.all<any>(`SELECT * FROM evidence_signals ${where} ORDER BY observed_at DESC LIMIT 500`,...args).map(r=>({...r,value:fromJson(r.value_json),metadata:fromJson(r.metadata_json,{}),value_json:undefined,metadata_json:undefined}))}
}
