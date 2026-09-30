import {api} from "../api.js";
import {h,sectionHead,table,pill,formField,formToObject,toast,safeParseJson} from "../dom.js";

function benchmarkForm(refresh){
  const f=h("form",{class:"card form-card"},h("div",{class:"form-grid"},
    formField("Benchmark name","name"),formField("Version","version",{placeholder:"v1"}),
    formField("Methodology content digest","methodologyDigest",{placeholder:"optional SHA-256",full:true}),
    formField("Comparability boundary","comparabilityBoundary",{type:"textarea",full:true,placeholder:"When results are directly, conditionally, approximately, or not comparable"}),
    formField("Contamination strategy","contaminationStrategy",{type:"textarea",full:true,placeholder:"Fresh, temporal, parameterized, or sequestered material"}),
    formField("Notes","notes",{type:"textarea",full:true}),
    h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Create benchmark"))));
  f.addEventListener("submit",async e=>{e.preventDefault();try{const d=formToObject(f);for(const k of Object.keys(d))if(!d[k])delete d[k];await api("/api/v1/benchmarks",{method:"POST",json:d});toast("Benchmark created");await refresh()}catch(err){toast(err.message,true)}});return f;
}
function taskForm(refresh,benchmarks){
  const options=benchmarks.map(b=>({value:b.id,label:`${b.name} ${b.version}`}));
  if(!options.length)return h("div",{class:"empty"},"Create a benchmark before adding tasks.");
  const f=h("form",{class:"card form-card"},h("div",{class:"form-grid"},formField("Benchmark","benchmarkId",{type:"select",options}),formField("Task key","taskKey"),formField("Instructions digest","instructionsDigest",{placeholder:"optional SHA-256",full:true}),formField("Success criteria JSON","successCriteria",{type:"textarea",value:"{}",full:true}),formField("Grader JSON","grader",{type:"textarea",value:'{"type":"deterministic"}',full:true}),formField("Sequestered","sequestered",{type:"select",options:[{value:"false",label:"No"},{value:"true",label:"Yes"}]}),h("div",{class:"form-actions"},h("button",{class:"primary-button",type:"submit"},"Add benchmark task"))));
  f.addEventListener("submit",async e=>{e.preventDefault();try{const d=formToObject(f),id=d.benchmarkId;delete d.benchmarkId;d.successCriteria=safeParseJson(d.successCriteria);d.grader=safeParseJson(d.grader);d.sequestered=d.sequestered==="true";if(!d.instructionsDigest)delete d.instructionsDigest;await api(`/api/v1/benchmarks/${id}/tasks`,{method:"POST",json:d});toast("Benchmark task added");await refresh()}catch(err){toast(err.message,true)}});return f;
}

export async function benchmarksPage(refresh){
  const [benchmarks,testBenches]=await Promise.all([api("/api/v1/benchmarks"),api("/api/v1/test-benches")]);
  return h("div",{class:"stack"},
    h("div",{class:"hero"},h("h2",{},"Benchmarks are replaceable instruments"),h("p",{},"Powerfarm versions benchmark methodology, comparability boundaries, task validity, contamination strategy, resource regimes and verification. The instrument serves the decision, never the other way around.")),
    sectionHead("Benchmark instruments","Versioned measurement instruments with explicit comparability boundaries"),
    table([{label:"Name",key:"name"},{label:"Version",key:"version"},{label:"Status",render:r=>pill(r.status,"good")},{label:"Methodology",render:r=>r.methodology_digest?h("code",{},r.methodology_digest):"—"},{label:"ID",render:r=>h("code",{},r.id)}],benchmarks),
    benchmarkForm(refresh),taskForm(refresh,benchmarks),
    sectionHead("Test benches","Full evaluation configurations attached to decision questions"),
    table([{label:"Name",key:"name"},{label:"Study",render:r=>h("code",{},r.study_id)},{label:"Benchmark",render:r=>h("code",{},r.benchmark_id||"—")},{label:"ID",render:r=>h("code",{},r.id)}],testBenches)
  );
}
