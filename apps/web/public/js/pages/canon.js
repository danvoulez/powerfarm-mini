import {api} from "../api.js";
import {h,sectionHead,table,pill} from "../dom.js";
export async function canonPage(){
  const docs=await api("/api/v1/canon");
  const root=h("div",{class:"stack"},sectionHead("Powerfarm Canon","The implementation ships with the five current canonical documents"),table([{label:"Document",render:r=>h("button",{class:"ghost-button",onclick:async()=>{const doc=await api(`/api/v1/canon/${r.id}`);viewer.textContent=doc.body}},`${r.id} · ${r.title}`)},{label:"Status",render:r=>pill(r.status,"good")},{label:"Version",key:"version"},{label:"Effective",key:"effective"}],docs));
  const viewer=h("pre",{class:"code-block",style:"max-height:65vh"},"Select a canonical document above.");
  root.append(viewer); return root;
}
