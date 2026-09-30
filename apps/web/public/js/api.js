const TOKEN_KEY = "powerfarm.token";
const DEFAULT_TOKEN = "powerfarm-local-admin";

export function getToken(){return localStorage.getItem(TOKEN_KEY) || DEFAULT_TOKEN}
export function setToken(token){localStorage.setItem(TOKEN_KEY, token.trim())}

export async function api(path, options={}){
  const headers = new Headers(options.headers || {});
  if(!headers.has("authorization")) headers.set("authorization", `Bearer ${getToken()}`);
  if(options.json !== undefined){headers.set("content-type","application/json"); options.body=JSON.stringify(options.json)}
  const response = await fetch(path,{...options,headers});
  const type=response.headers.get("content-type") || "";
  const payload=type.includes("json") ? await response.json() : await response.arrayBuffer();
  if(!response.ok){
    const message=payload?.error?.message || `${response.status} ${response.statusText}`;
    const error=new Error(message); error.status=response.status; error.payload=payload; throw error;
  }
  return payload?.data ?? payload;
}

export async function uploadContent(file){
  const response=await fetch("/api/v1/content",{method:"POST",headers:{authorization:`Bearer ${getToken()}`,"content-type":file.type || "application/octet-stream","x-powerfarm-object-kind":"evidence"},body:file});
  const payload=await response.json();
  if(!response.ok) throw new Error(payload?.error?.message || "Upload failed");
  return payload.data;
}
