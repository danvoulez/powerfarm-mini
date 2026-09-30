import {api} from "../api.js";
import {h,sectionHead,table,pill,formField,formToObject,toast} from "../dom.js";

function candidateForm(refresh){
  const f=h("form",{class:"card form-card"},h("div",{class:"form-grid"},
    formField("Name","name"),formField("Product class","productClass",{type:"select",options:["internal","public","general_paid","individual_paid"]}),
    formField("Recurring problem / decision","problem",{type:"textarea",full:true}),formField("Recurring decision","recurringDecision",{type:"textarea",full:true}),
    formField("Differentiated Powerfarm value","differentiatedValue",{type:"textarea",full:true}),formField("External alternatives","externalAlternatives",{type:"textarea",full:true}),
    formField("Demand evidence","demandEvidence",{type:"textarea",full:true}),formField("Maintenance case","maintenanceCase",{type:"textarea",full:true}),
    h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Record candidate"))));
  f.addEventListener("submit",async e=>{e.preventDefault();try{await api("/api/v1/product-candidates",{method:"POST",json:formToObject(f)});toast("Product candidate recorded");await refresh()}catch(err){toast(err.message,true)}});return f;
}
function publicationForm(refresh){
  const f=h("form",{class:"card form-card"},h("div",{class:"form-grid"},formField("Title","title",{full:true}),formField("Product ID","productId",{placeholder:"optional"}),formField("Claim ID","claimId",{placeholder:"optional"}),formField("Visibility","visibility",{type:"select",options:["internal","private","paid","public"]}),formField("Content digest","contentDigest",{placeholder:"optional SHA-256",full:true}),formField("Supersedes publication ID","supersedesId",{placeholder:"optional correction chain",full:true}),h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Record publication"))));
  f.addEventListener("submit",async e=>{e.preventDefault();try{const d=formToObject(f);for(const k of Object.keys(d))if(!d[k])delete d[k];await api("/api/v1/publications",{method:"POST",json:d});toast("Publication recorded");await refresh()}catch(err){toast(err.message,true)}});return f;
}
export async function productsPage(refresh){
  const [candidates,products,publications]=await Promise.all([api("/api/v1/product-candidates"),api("/api/v1/products"),api("/api/v1/publications")]);
  return h("div",{class:"stack"},
    h("div",{class:"hero"},h("h2",{},"Productization follows evidence"),h("p",{},"A useful internal system is not automatically a product. Candidates remain candidates until recurring customer value, differentiated evidence, maintainability, and demand justify promotion.")),
    sectionHead("Product candidates","No forced productization"),
    table([{label:"Name",key:"name"},{label:"Class",render:r=>pill(r.product_class)},{label:"Problem",key:"problem"},{label:"Status",render:r=>pill(r.status,r.status==="promoted"?"good":"")},{label:"Action",render:r=>r.status==="promoted"?"—":h("button",{class:"ghost-button",onclick:async()=>{const value=prompt("Value proposition");if(!value)return;try{await api(`/api/v1/product-candidates/${r.id}/promote`,{method:"POST",json:{valueProposition:value,visibility:r.product_class==="public"?"public":"internal"}});toast("Candidate promoted");await refresh()}catch(err){toast(err.message,true)}}},"Promote")}],candidates),candidateForm(refresh),
    sectionHead("Maintained products","Current products and visibility"),table([{label:"Name",key:"name"},{label:"Class",render:r=>pill(r.product_class)},{label:"Visibility",render:r=>pill(r.visibility)},{label:"Value proposition",key:"value_proposition"},{label:"Status",render:r=>pill(r.status,"good")}],products),
    sectionHead("Publications & corrections","Empirical products keep their claim/evidence lineage"),table([{label:"Title",key:"title"},{label:"Visibility",render:r=>pill(r.visibility)},{label:"Claim",render:r=>h("code",{},r.claim_id||"—")},{label:"Content",render:r=>h("code",{},r.content_digest||"—")},{label:"Supersedes",render:r=>h("code",{},r.supersedes_id||"—")}],publications),publicationForm(refresh)
  );
}
