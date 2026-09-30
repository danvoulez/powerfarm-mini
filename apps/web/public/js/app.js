import {api,getToken,setToken} from "./api.js";
import {h,errorPanel,toast} from "./dom.js";
import {dashboardPage} from "./pages/dashboard.js";
import {researchPage} from "./pages/research.js";
import {registryPage} from "./pages/registry.js";
import {evidencePage} from "./pages/evidence.js";
import {continuityPage} from "./pages/continuity.js";
import {productsPage} from "./pages/products.js";
import {institutionPage} from "./pages/institution.js";
import {canonPage} from "./pages/canon.js";
import {searchPage} from "./pages/search.js";
import {systemPage} from "./pages/system.js";
import {benchmarksPage} from "./pages/benchmarks.js";
import {studyPage} from "./pages/study.js";
import {claimPage} from "./pages/claim.js";

const routes={
  dashboard:{label:"Dashboard",title:"Dashboard",eyebrow:"POWERFARM",render:dashboardPage},
  research:{label:"Research",title:"Research & Evidence",eyebrow:"RESEARCH",render:researchPage},
  benchmarks:{label:"Benchmarks",title:"Benchmarks & Test Benches",eyebrow:"MEASUREMENT",render:benchmarksPage},
  registry:{label:"Registry",title:"Identity & Registry",eyebrow:"IDENTITY",render:registryPage},
  evidence:{label:"Evidence",title:"Content & Evidence",eyebrow:"EVIDENCE",render:evidencePage},
  continuity:{label:"Continuity",title:"Continuity",eyebrow:"EXECUTION",render:continuityPage},
  products:{label:"Products",title:"Products",eyebrow:"VALUE",render:productsPage},
  institution:{label:"Institution",title:"Institutional State",eyebrow:"OPERATIONS",render:institutionPage},
  canon:{label:"Canon",title:"Powerfarm Canon",eyebrow:"AUTHORITY",render:canonPage},
  search:{label:"Search",title:"Search",eyebrow:"PROJECTION",render:searchPage},
  system:{label:"System",title:"System & Contracts",eyebrow:"IMPLEMENTATION",render:systemPage},
  study:{label:"Study",title:"Study Workspace",eyebrow:"RESEARCH",render:studyPage,nav:false},
  claim:{label:"Claim",title:"Claim Workspace",eyebrow:"EPISTEMIC STATE",render:claimPage,nav:false},
};

const nav=document.getElementById("nav");
const app=document.getElementById("app");
const title=document.getElementById("page-title");
const eyebrow=document.getElementById("eyebrow");
const connection=document.getElementById("connection");

for(const [key,route] of Object.entries(routes)) if(route.nav!==false) nav.append(h("a",{href:`#/${key}`,"data-route":key},route.label));

function current(){const key=location.hash.replace(/^#\//,"") || "dashboard";return routes[key]?key:"dashboard"}

async function render(){
  const key=current(),route=routes[key];
  title.textContent=route.title;eyebrow.textContent=route.eyebrow;
  for(const a of nav.querySelectorAll("a"))a.classList.toggle("active",a.dataset.route===key);
  app.replaceChildren(h("div",{class:"empty"},"Loading…"));
  try{const view=await route.render(render);app.replaceChildren(view);connection.className="connection ok";connection.innerHTML="<span></span> Connected"}
  catch(error){console.error(error);app.replaceChildren(errorPanel(error));connection.className="connection bad";connection.innerHTML="<span></span> Connection problem"}
}

window.addEventListener("hashchange",render);
document.getElementById("refresh-button").addEventListener("click",render);

const dialog=document.getElementById("token-dialog"),input=document.getElementById("token-input");
document.getElementById("token-button").addEventListener("click",()=>{input.value=getToken();dialog.showModal()});
document.getElementById("save-token").addEventListener("click",()=>{setToken(input.value);toast("Access token saved");setTimeout(render,0)});

try{await api("/api/v1/health");connection.className="connection ok";connection.innerHTML="<span></span> Connected"}catch{connection.className="connection bad";connection.innerHTML="<span></span> Offline"}
if(!location.hash) location.hash="#/dashboard"; else render();
