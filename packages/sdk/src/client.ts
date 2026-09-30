import { createTransport, bearerToken, requestId, retry } from "./transport.ts";

export interface ClientOptions { baseUrl?: string; token: string | (() => string | Promise<string>); }

export class PowerfarmHttpClient {
  readonly baseUrl: string;
  readonly transport: ReturnType<typeof createTransport>;
  constructor(options: ClientOptions) {
    this.baseUrl=(options.baseUrl ?? "http://127.0.0.1:4545").replace(/\/$/,"");
    const get=typeof options.token === "function" ? options.token : () => options.token;
    this.transport=createTransport([requestId(), bearerToken(get as () => string | Promise<string>), retry({attempts:3})]);
  }
  async request<T=unknown>(method:string,path:string,body?:unknown):Promise<T>{
    const headers=new Headers();let payload:BodyInit|undefined;
    if(body!==undefined){headers.set("content-type","application/json");payload=JSON.stringify(body)}
    const response=await this.transport.fetch(new Request(this.baseUrl+path,{method,headers,body:payload}));
    const result=await response.json() as any;
    if(!response.ok)throw new Error(result?.error?.message ?? `HTTP ${response.status}`);
    return (result?.data ?? result) as T;
  }
}
