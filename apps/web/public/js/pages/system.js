import {api,getToken,setToken} from "../api.js";
import {h,sectionHead,card,pill,jsonText,toast} from "../dom.js";
export async function systemPage(){
  const [manifest,openapi]=await Promise.all([api("/api/v1/system/manifest"),api("/api/openapi.json")]);
  const ops=Object.values(openapi.paths||{}).reduce((n,p)=>n+Object.keys(p).length,0);
  return h("div",{class:"stack"},
    sectionHead("Implementation manifest","Current stack is implementation, not institutional identity"),
    h("div",{class:"grid cols-3"},card(h("strong",{},manifest.version),h("div",{class:"muted small"},"Platform version")),card(h("strong",{},manifest.capabilities.length),h("div",{class:"muted small"},"Explicit capabilities")),card(h("strong",{},ops),h("div",{class:"muted small"},"OpenAPI operations"))),
    card(h("h3",{},"Durable invariants"),h("ul",{},...manifest.invariants.map(x=>h("li",{},x)))),
    sectionHead("OpenAPI 3.1","The API contract is generated from the same route registry that serves requests"),h("pre",{class:"code-block",style:"max-height:55vh"},jsonText(openapi))
  );
}
