export type Interceptor = (request: Request, next: (request: Request) => Promise<Response>) => Promise<Response>;

export function createTransport(interceptors: Interceptor[] = []) {
  let chain = (request: Request) => fetch(request);
  for (let i = interceptors.length - 1; i >= 0; i--) {
    const interceptor = interceptors[i]!;
    const next = chain;
    chain = (request: Request) => interceptor(request, next);
  }
  return { fetch: chain };
}

export function bearerToken(getToken: () => string | Promise<string>): Interceptor {
  return async (request, next) => {
    const token = await getToken();
    const headers = new Headers(request.headers);
    headers.set("authorization", `Bearer ${token}`);
    return next(new Request(request, { headers }));
  };
}

export function requestId(factory: () => string = () => crypto.randomUUID()): Interceptor {
  return async (request, next) => {
    const headers = new Headers(request.headers);
    if (!headers.has("x-request-id")) headers.set("x-request-id", factory());
    return next(new Request(request, { headers }));
  };
}

export function retry(options: { attempts?: number; baseDelayMs?: number } = {}): Interceptor {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 100);
  return async (request, next) => {
    let last: Response | undefined;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      last = await next(request.clone());
      if (last.status < 500 && last.status !== 429) return last;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)));
    }
    return last!;
  };
}
