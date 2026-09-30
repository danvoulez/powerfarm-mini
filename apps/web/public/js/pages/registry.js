import {api} from "../api.js";
import {h,sectionHead,table,pill,formField,formToObject,safeParseJson,toast} from "../dom.js";

function entityForm(refresh){
  const f=h("form",{class:"card form-card"},h("div",{class:"form-grid"},
    formField("Stable ID","id",{placeholder:"powerfarm.app/... (optional)"}), formField("Kind","kind",{placeholder:"app / agent / machine / service"}),
    formField("Name","name",{full:true}), formField("Metadata (JSON)","metadata",{type:"textarea",value:"{}",full:true}),
    h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Recognize entity"))));
  f.addEventListener("submit",async e=>{e.preventDefault();try{const d=formToObject(f);if(!d.id)delete d.id;d.metadata=safeParseJson(d.metadata);await api("/api/v1/entities",{method:"POST",json:d});toast("Entity recognized");await refresh()}catch(err){toast(err.message,true)}});return f;
}
function artifactForm(refresh){
  const f=h("form",{class:"card form-card"},h("div",{class:"form-grid"},
    formField("Kind","kind",{placeholder:"software / dataset / document / schema"}),formField("Name","name"),formField("Owning entity ID","entityId",{placeholder:"optional"}),formField("Description","description",{type:"textarea",full:true}),h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Recognize artifact"))));
  f.addEventListener("submit",async e=>{e.preventDefault();try{const d=formToObject(f);for(const k of Object.keys(d))if(!d[k])delete d[k];await api("/api/v1/artifacts",{method:"POST",json:d});toast("Artifact recognized");await refresh()}catch(err){toast(err.message,true)}});return f;
}
export async function registryPage(refresh){
  const [entities,artifacts,contracts,grants,apps]=await Promise.all([api("/api/v1/entities"),api("/api/v1/artifacts"),api("/api/v1/contracts"),api("/api/v1/grants"),api("/api/v1/app-contracts")]);
  return h("div",{class:"stack"},
    sectionHead("Recognized entities","Institutional identity is explicit; physical presence does not confer authority"),
    table([{label:"Name",key:"name"},{label:"Kind",render:r=>pill(r.kind)},{label:"Status",render:r=>pill(r.status,"good")},{label:"ID",render:r=>h("code",{},r.id)}],entities),entityForm(refresh),
    sectionHead("Artifacts","Semantically versionable institutional objects"),
    table([{label:"Name",key:"name"},{label:"Kind",render:r=>pill(r.kind)},{label:"Owner",render:r=>h("code",{},r.entity_id||"—")},{label:"ID",render:r=>h("code",{},r.id)}],artifacts),artifactForm(refresh),
    sectionHead("Contracts","Recognized structural relationships"),table([{label:"Name",key:"name"},{label:"Kind",render:r=>pill(r.kind)},{label:"Status",render:r=>pill(r.status)},{label:"ID",render:r=>h("code",{},r.id)}],contracts),
    sectionHead("Grants","Explicit authority relationships"),table([{label:"Subject",render:r=>h("code",{},r.subject_entity_id)},{label:"Capability",render:r=>h("code",{},r.capability)},{label:"Effect",render:r=>pill(r.effect,r.effect==="allow"?"good":"bad")},{label:"Expires",key:"expires_at"}],grants),
    sectionHead("App Contracts","Root institutional contracts for applications"),table([{label:"App",render:r=>h("code",{},r.app_entity_id)},{label:"Version",key:"version"},{label:"Status",render:r=>pill(r.status)},{label:"ID",render:r=>h("code",{},r.id)}],apps)
  );
}
