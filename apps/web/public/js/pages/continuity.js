import {api} from "../api.js";
import {h,sectionHead,table,pill,formField,formToObject,safeParseJson,toast,fmtTime} from "../dom.js";

function contractForm(refresh){
  const f=h("form",{class:"card form-card"},h("div",{class:"form-grid"},
    formField("Name","name",{full:true,placeholder:"e.g. verify preserved research artifact"}),
    formField("Status","status",{type:"select",options:["draft","armed"]}),
    formField("Temporal predicate (JSON)","temporalPredicate",{type:"textarea",value:'{"type":"always"}',full:true}),
    formField("Observational predicate (JSON)","observationalPredicate",{type:"textarea",value:'{"type":"manual"}',full:true}),
    formField("Policy π (JSON)","policy",{type:"textarea",value:'{"mode":"first_match"}',full:true}),
    formField("Effect E (JSON)","effect",{type:"textarea",value:'{"type":"noop","payload":{"message":"hello"}}',full:true}),
    formField("Verification V (JSON)","verification",{type:"textarea",value:'{"type":"receipt_exists"}',full:true}),
    h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Create executable contract"))));
  f.addEventListener("submit",async e=>{e.preventDefault();try{const d=formToObject(f);for(const k of ["temporalPredicate","observationalPredicate","policy","effect","verification"])d[k]=safeParseJson(d[k]);await api("/api/v1/executable-contracts",{method:"POST",json:d});toast("Executable contract created");await refresh()}catch(err){toast(err.message,true)}});return f;
}

function contractActions(contract,refresh){
  const act=(label,fn)=>h("button",{class:"ghost-button",type:"button",onclick:async()=>{try{await fn()}catch(err){toast(err.message,true)}}},label);
  const setStatus=status=>act(status==="armed"?"Arm":"Disarm",async()=>{await api(`/api/v1/executable-contracts/${contract.id}/status`,{method:"POST",json:{status}});toast(`Contract ${status==="armed"?"armed":"disarmed"}`);await refresh()});
  const readiness=act("Readiness",async()=>{const {readiness:r,policy}=await api(`/api/v1/executable-contracts/${contract.id}/readiness`);const waiting=[r.temporal,r.observational].filter(t=>!t.satisfied).map(t=>t.reason);toast(`${r.state}${waiting.length?` — ${waiting.join("; ")}`:""} · policy: ${policy.reason}`)});
  const trigger=act("Trigger",async()=>{const x=await api(`/api/v1/executable-contracts/${contract.id}/trigger`,{method:"POST",json:{trigger:{source:"web-console"}}});toast(`Triggered ${x.id}`);await refresh()});
  if(contract.status==="draft")return h("div",{class:"button-row"},readiness,setStatus("armed"));
  if(contract.status==="armed")return h("div",{class:"button-row"},readiness,trigger,setStatus("draft"));
  return "—";
}

export async function continuityPage(refresh){
  const [contracts,executions,routes,signals]=await Promise.all([api("/api/v1/executable-contracts"),api("/api/v1/executions"),api("/api/v1/execution-routes"),api("/api/v1/evidence-signals")]);
  const run=h("button",{class:"secondary-button",onclick:async()=>{try{const x=await api("/api/v1/executions/run-next",{method:"POST"});toast(x?`Processed ${x.id}`:"No ready execution");await refresh()}catch(err){toast(err.message,true)}}},"Run next execution");
  const signalForm=h("form",{class:"card form-card"},h("div",{class:"form-grid"},formField("Evidence domain","domain",{type:"select",options:["observational","temporal"]}),formField("Kind","kind",{placeholder:"heartbeat / deadline / webhook / retry_at"}),formField("Subject","subject",{full:true}),formField("Value JSON","value",{type:"textarea",value:"{}",full:true}),formField("Source digest","sourceDigest",{placeholder:"optional SHA-256",full:true}),h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Record evidence"))));
  signalForm.addEventListener("submit",async e=>{e.preventDefault();try{const d=formToObject(signalForm);d.value=safeParseJson(d.value);if(!d.sourceDigest)delete d.sourceDigest;await api("/api/v1/evidence-signals",{method:"POST",json:d});toast("Evidence recorded");await refresh()}catch(err){toast(err.message,true)}});
  return h("div",{class:"stack"},
    h("div",{class:"hero"},h("h2",{},"Execution is causal"),h("p",{},"Evidence updates predicates; readiness passes through policy; a trigger must obtain execution ownership; Continuity materializes an effect; verification determines what Powerfarm may assert afterward.")),
    sectionHead("Temporal & observational evidence","Heartime/Antenna semantics are evidence available to Powerfarm, not perfect time or world truth"),
    table([{label:"Domain",render:r=>pill(r.domain,r.domain==="observational"?"good":"warn")},{label:"Kind",key:"kind"},{label:"Subject",render:r=>h("code",{},r.subject)},{label:"Observed",render:r=>fmtTime(r.observed_at)},{label:"ID",render:r=>h("code",{},r.id)}],signals),signalForm,
    sectionHead("Executable contracts","Semantic core C = (T, O, π, E, V)"),
    table([{label:"Name",key:"name"},{label:"Generation",key:"generation"},{label:"Status",render:r=>pill(r.status,r.status==="armed"?"good":"")},{label:"Effect",render:r=>h("code",{},r.effect?.type||"—")},{label:"ID",render:r=>h("code",{},r.id)},{label:"Actions",render:r=>contractActions(r,refresh)}],contracts),
    contractForm(refresh),
    sectionHead("Executions","Transport acknowledgement and verified effect are not conflated",run),
    table([{label:"Execution",render:r=>h("code",{},r.id)},{label:"Contract",render:r=>h("code",{},r.contract_id)},{label:"State",render:r=>pill(r.state,r.state==="done"?"good":r.state==="failed"?"bad":r.state==="uncertain"?"warn":"")},{label:"Claimed by",key:"claimed_by"},{label:"Created",render:r=>fmtTime(r.created_at)}],executions),
    sectionHead("Execution routes","Operational intelligence configurations; routes are evidence-bearing implementation state"),
    table([{label:"Name",key:"name"},{label:"Status",render:r=>pill(r.status,"good")},{label:"ID",render:r=>h("code",{},r.id)}],routes)
  );
}
