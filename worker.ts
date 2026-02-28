export default {
  async fetch(request: Request, env: any, ctx: any) {
    // Polyfill process.env for the API routes
    if (!globalThis.process) {
      globalThis.process = { env: { ...env } } as any;
    } else {
      Object.assign(globalThis.process.env, env);
    }

    const url = new URL(request.url);

    // Route API requests
    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/check-result") {
          const { default: handler } = await import("./api/check-result");
          return await handler(request);
        }
        if (url.pathname === "/api/submit-exam") {
          const { default: handler } = await import("./api/submit-exam");
          return await handler(request);
        }
        if (url.pathname === "/api/get-exam-questions") {
          const { default: handler } = await import("./api/get-exam-questions");
          return await handler(request);
        }
        if (url.pathname === "/api/get-leaderboard") {
          const { default: handler } = await import("./api/get-leaderboard");
          return await handler(request);
        }
        if (url.pathname === "/api/get-mistakes") {
          const { default: handler } = await import("./api/get-mistakes");
          return await handler(request);
        }
        if (url.pathname === "/api/process-queue") {
          const { default: handler } = await import("./api/process-queue");
          return await handler(request);
        }
        if (url.pathname === "/api/cron/process-queue") {
          const { default: handler } = await import("./api/cron/process-queue");
          return await handler(request);
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
    return env.ASSETS.fetch(request);
  },
};
