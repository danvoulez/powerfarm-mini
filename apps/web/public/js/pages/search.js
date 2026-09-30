import {api} from "../api.js";
import {h,sectionHead,pill} from "../dom.js";
export async function searchPage(){
  const results=h("div",{class:"stack"});
  const input=h("input",{placeholder:"Search entities, artifacts, studies, claims, products…",autofocus:true});
  const run=async()=>{const rows=await api(`/api/v1/search?q=${encodeURIComponent(input.value)}`);results.replaceChildren(...(rows.length?rows.map(r=>h("div",{class:"card pad"},h("div",{class:"button-row"},pill(r.type),h("code",{},r.id)),h("h3",{},r.title),h("div",{class:"muted small"},r.subtitle||""))):[h("div",{class:"empty"},input.value?"No matches.":"Type a query.")]))};
  input.addEventListener("input",()=>{clearTimeout(input._t);input._t=setTimeout(run,180)});
  return h("div",{class:"stack"},sectionHead("Federated search","Search is a projection, never the authority"),h("div",{class:"toolbar"},input),results);
}
