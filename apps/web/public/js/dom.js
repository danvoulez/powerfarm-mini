export function h(tag, attrs={}, ...children){
  const el=document.createElement(tag);
  for(const [key,value] of Object.entries(attrs || {})){
    if(key==="class") el.className=value;
    else if(key==="html") el.innerHTML=value;
    else if(key.startsWith("on") && typeof value==="function") el.addEventListener(key.slice(2).toLowerCase(),value);
    else if(value !== undefined && value !== null && value !== false) el.setAttribute(key, value === true ? "" : String(value));
  }
  for(const child of children.flat(Infinity)){
    if(child===null || child===undefined || child===false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function sectionHead(title, subtitle="", action=null){
  return h("div",{class:"section-head"},h("div",{},h("h2",{},title), subtitle ? h("p",{},subtitle):null),action);
}

export function card(...children){return h("div",{class:"card pad"},...children)}
export function pill(text,tone=""){return h("span",{class:`pill ${tone}`},text)}
export function fmtTime(value){if(!value)return "—"; const d=new Date(value); return Number.isNaN(d.valueOf())?String(value):d.toLocaleString()}
export function shortId(value){if(!value)return "—"; const s=String(value); return s.length>30?`${s.slice(0,14)}…${s.slice(-8)}`:s}
export function jsonText(value){return JSON.stringify(value ?? {},null,2)}
export function safeParseJson(text,fallback={}){if(!text?.trim())return fallback; try{return JSON.parse(text)}catch{throw new Error("Invalid JSON")}}

export function table(columns, rows){
  if(!rows?.length) return h("div",{class:"empty"},"No records yet.");
  const thead=h("thead",{},h("tr",{},columns.map(c=>h("th",{},c.label))));
  const tbody=h("tbody",{},rows.map(row=>h("tr",{},columns.map(c=>h("td",{},c.render?c.render(row):String(row[c.key] ?? "—"))))));
  return h("div",{class:"table-wrap"},h("table",{},thead,tbody));
}

export function formField(labelText,name,{type="text",placeholder="",value="",full=false,options=null,rows=4}={}){
  let input;
  if(type==="textarea") input=h("textarea",{name,placeholder,rows},value);
  else if(type==="select") input=h("select",{name},...(options||[]).map(o=>h("option",{value:o.value??o,selected:(o.value??o)===value},o.label??o)));
  else input=h("input",{name,type,placeholder,value});
  return h("label",{class:full?"full":""},labelText,input);
}

export function formToObject(form){
  const data=Object.fromEntries(new FormData(form).entries());
  for(const [key,value] of Object.entries(data)) if(typeof value==="string") data[key]=value.trim();
  return data;
}

let toastTimer;
export function toast(message,error=false){
  const el=document.getElementById("toast"); el.textContent=message; el.hidden=false; el.className=`toast ${error?"error":""}`;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.hidden=true,3500);
}

export function errorPanel(error){return h("div",{class:"error-panel"},error?.message || String(error))}
