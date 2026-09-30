import {api} from "../api.js";
import {h,sectionHead,card,table,pill,fmtTime,formField,formToObject,safeParseJson,toast} from "../dom.js";

function studyForm(refresh){
  const form=h("form",{class:"card form-card"},
    h("div",{class:"form-grid"},
      formField("Study title","title",{placeholder:"e.g. Agent route comparison",full:true}),
      formField("Decision question","decisionQuestion",{type:"textarea",placeholder:"What decision could this result change?",full:true}),
      formField("Study class","studyClass",{type:"select",options:["exploratory","comparative","confirmatory","replication","ablation","stress_test","field","longitudinal","evidence_synthesis"]}),
      formField("Current confidence","currentConfidence",{placeholder:"LOW / MODERATE / ..."}),
      formField("Current belief","currentBelief",{type:"textarea",full:true}),
      formField("Unit under test (JSON)","unitUnderTest",{type:"textarea",value:'{"system":""}',full:true}),
      formField("Resource regime (JSON)","resourceRegime",{type:"textarea",value:'{"timeBudgetMinutes":60}',full:true}),
      formField("Primary outcomes (JSON array)","primaryOutcomes",{type:"textarea",value:'[]',full:true}),
      formField("Verification plan","verificationPlan",{type:"textarea",full:true}),
      h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Create study"))
    )
  );
  form.addEventListener("submit",async e=>{e.preventDefault();try{const d=formToObject(form);await api("/api/v1/studies",{method:"POST",json:{...d,unitUnderTest:safeParseJson(d.unitUnderTest),resourceRegime:safeParseJson(d.resourceRegime),primaryOutcomes:safeParseJson(d.primaryOutcomes,[])}});toast("Study created");await refresh()}catch(err){toast(err.message,true)}});
  return form;
}

function claimForm(refresh){
  const form=h("form",{class:"card form-card"},h("div",{class:"form-grid"},
    formField("Claim","statement",{type:"textarea",full:true,placeholder:"A proposition that can be supported, contradicted, scoped, and revised."}),
    formField("Scope","scope",{type:"textarea",full:true,placeholder:"Where and under which conditions does this claim apply?"}),
    formField("Study ID","studyId",{placeholder:"optional"}),
    formField("Observed through","observedThrough",{placeholder:"2026-09-30"}),
    formField("Review / retest trigger","reviewTrigger",{type:"textarea",full:true}),
    h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Record claim"))));
  form.addEventListener("submit",async e=>{e.preventDefault();try{const d=formToObject(form);for(const k of Object.keys(d))if(d[k]==="")delete d[k];await api("/api/v1/claims",{method:"POST",json:d});toast("Claim recorded");await refresh()}catch(err){toast(err.message,true)}});
  return form;
}

export async function researchPage(refresh){
  const [studies,claims,recommendations]=await Promise.all([api("/api/v1/studies"),api("/api/v1/claims"),api("/api/v1/recommendations")]);
  return h("div",{class:"stack"},
    sectionHead("Research studies","Decision-first studies with explicit units, resource regimes, runs, measurements, findings and verification"),
    table([
      {label:"Study",render:r=>h("div",{},h("strong",{},r.title),h("div",{class:"muted small"},r.decision_question))},
      {label:"Class",render:r=>pill(r.study_class)}, {label:"Status",render:r=>pill(r.status,r.status==="complete"?"good":"")},
      {label:"Created",render:r=>fmtTime(r.created_at)}, {label:"Open",render:r=>h("button",{class:"ghost-button",onclick:()=>{sessionStorage.setItem("powerfarm.selectedStudy",r.id);location.hash="#/study"}},"Workspace")}, {label:"ID",render:r=>h("code",{},r.id)}
    ],studies),
    studyForm(refresh),
    sectionHead("Claims","Claims stay separate from measurements and carry scope, evidence, confidence, freshness, and supersession"),
    table([
      {label:"Claim",render:r=>h("div",{},h("strong",{},r.statement),h("div",{class:"muted small"},r.scope))},
      {label:"State",render:r=>pill(r.status,r.status==="current"?"good":r.status==="rejected"?"bad":"")},
      {label:"Freshness",render:r=>pill(r.freshness_state)}, {label:"ID",render:r=>h("code",{},r.id)}
    ],claims),
    claimForm(refresh),
    sectionHead("Recommendations","Suggested actions remain distinct from confidence in the underlying claim"),
    table([{label:"Action",key:"action"},{label:"Status",render:r=>pill(r.status)},{label:"Retest trigger",key:"retest_trigger"},{label:"ID",render:r=>h("code",{},r.id)}],recommendations)
  );
}
