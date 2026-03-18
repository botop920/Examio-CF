export default {
  async fetch(request: Request, env: any, ctx: any) {
    // Polyfill process.env for the API routes
    if (!globalThis.process) {
      globalThis.process = { env: { ...env } } as any;
    } else {
      Object.assign(globalThis.process.env, env);
    }

    console.log("WORKER ENV KEYS:", Object.keys(env));
    console.log("WORKER HAS SUPABASE URL:", !!env.VITE_SUPABASE_URL);
    console.log("PROCESS ENV HAS SUPABASE URL:", !!process.env.VITE_SUPABASE_URL);

    const url = new URL(request.url);

    // Route API requests
    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/debug-env") {
          return new Response(JSON.stringify({
            env_keys: Object.keys(env),
            has_supabase_url: !!env.VITE_SUPABASE_URL,
            process_env_keys: Object.keys(process.env),
            has_process_supabase: !!process.env.VITE_SUPABASE_URL,
            static_supabase: process.env.VITE_SUPABASE_URL ? "yes" : "no",
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (url.pathname === "/api/check-result") {
          const { default: handler } = await import("./api/check-result");
          return await handler(request, env);
        }
        if (url.pathname === "/api/submit-exam") {
          const { default: handler } = await import("./api/submit-exam");
          return await handler(request, env);
        }
        if (url.pathname === "/api/get-exam-questions") {
          const { default: handler } = await import("./api/get-exam-questions");
          return await handler(request, env);
        }
        if (url.pathname === "/api/get-leaderboard") {
          const { default: handler } = await import("./api/get-leaderboard");
          return await handler(request, env);
        }
        if (url.pathname === "/api/get-mistakes") {
          const { default: handler } = await import("./api/get-mistakes");
          return await handler(request, env);
        }
        if (url.pathname === "/api/process-queue") {
          const { default: handler } = await import("./api/process-queue");
          return await handler(request, env);
        }
        if (url.pathname === "/api/cron/process-queue") {
          const { default: handler } = await import("./api/cron/process-queue");
          return await handler(request, env);
        }
        return new Response("API Route Not Found", { status: 404 });
      } catch (e: any) {
        console.error("API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Serve static assets for all other requests
    const response = await env.ASSETS.fetch(request);

    // Inject ENV variables into HTML so frontend can use them without rebuild
    if (response.headers.get('content-type')?.includes('text/html')) {
      let html = await response.text();
      const envData = {
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '',
        VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || '',
        UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL || '',
        UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN || ''
      };
      const safeEnvJson = JSON.stringify(envData).replace(/</g, '\\u003c');
      const envScript = `<script>window.ENV = ${safeEnvJson};</script></head>`;
      html = html.replace('</head>', envScript);
      
      const newHeaders = new Headers(response.headers);
      newHeaders.delete('content-length');
      
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return response;
  },
};
