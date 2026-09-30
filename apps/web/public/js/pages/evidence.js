import {api,uploadContent} from "../api.js";
import {h,sectionHead,table,pill,fmtTime,toast} from "../dom.js";

export async function evidencePage(refresh){
  const objects=await api("/api/v1/content");
  const upload=h("form",{class:"card form-card"},h("div",{class:"form-grid"},
    h("label",{class:"full"},"Preserve evidence bytes",h("input",{name:"file",type:"file",required:true})),
    h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Store by SHA-256"))));
  upload.addEventListener("submit",async e=>{e.preventDefault();const file=upload.querySelector('input[type="file"]').files[0];if(!file)return;try{const obj=await uploadContent(file);toast(`Stored ${obj.digest.slice(0,16)}…`);await refresh()}catch(err){toast(err.message,true)}});
  return h("div",{class:"stack"},
    h("div",{class:"hero"},h("h2",{},"Immutable content plane"),h("p",{},"The content store answers one question: given this digest, what are the exact bytes? Institutional meaning and authority remain elsewhere.")),
    sectionHead("Content objects","Content identity establishes exact bytes, not authority"),
    table([{label:"Digest",render:r=>h("code",{},r.digest)},{label:"Kind",render:r=>pill(r.object_kind)},{label:"Media type",key:"media_type"},{label:"Bytes",key:"size_bytes"},{label:"Verified",render:r=>r.verified_at?pill("verified","good"):pill("unverified","warn")},{label:"Created",render:r=>fmtTime(r.created_at)}],objects),upload
  );
}
