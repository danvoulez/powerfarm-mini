import {api} from "../api.js";
import {h,sectionHead,card,fmtTime,pill,shortId} from "../dom.js";

export async function dashboardPage(){
  const d=await api("/api/v1/dashboard");
  const stats=[["Studies",d.studies],["Claims",d.claims],["Artifacts",d.artifacts],["Evidence objects",d.contentObjects],["Active executions",d.activeExecutions],["Recorded acts",d.recordedActs],["Products",d.products],["Open incidents",d.openIncidents]];
  return h("div",{class:"stack"},
    h("div",{class:"hero"},h("h2",{},"Institutional state, without the fog"),h("p",{},"Research, authority, immutable evidence, execution, and historical acts share one operating surface. The platform records what Powerfarm knows, why it knows it, and what it did next.")),
    h("div",{class:"grid cols-4"},stats.map(([label,value])=>h("div",{class:"card stat"},h("strong",{},value),h("span",{},label)))),
    h("div",{class:"grid cols-2"},
      card(sectionHead("Recent studies"),...(d.recentStudies?.length?d.recentStudies.map(s=>h("div",{class:"activity-item"},pill(s.study_class),h("div",{},h("strong",{},s.title),h("div",{class:"muted small"},s.decision_question)),h("time",{},fmtTime(s.created_at)))):[h("div",{class:"empty"},"No studies yet.")])),
      card(sectionHead("Recent claims"),...(d.recentClaims?.length?d.recentClaims.map(c=>h("div",{class:"activity-item"},pill(c.status,c.status==="current"?"good":""),h("div",{},h("strong",{},c.statement),h("div",{class:"muted small"},c.scope)),h("time",{},fmtTime(c.created_at)))):[h("div",{class:"empty"},"No claims yet.")]))
    ),
    card(sectionHead("Institutional activity","Append-oriented recorded acts"),h("div",{class:"activity"},...(d.recentActs||[]).map(a=>h("div",{class:"activity-item"},h("code",{},a.kind),h("div",{},h("strong",{},shortId(a.object_id)),h("div",{class:"muted small"},a.actor_id)),h("time",{},fmtTime(a.created_at))))))
  );
}
