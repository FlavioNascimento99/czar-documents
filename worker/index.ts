import { Container } from "@cloudflare/containers";
import { WorkerEntrypoint } from "cloudflare:workers";

interface Env {
  CZAR_DOC_CONTAINER: DurableObjectNamespace;
  APP_HOST?: string;
  POSTGRES_URL?: string;
  JWT_SECRET?: string;
}

export class CzarDocContainer extends Container {
  defaultPort = 8080;
  requiredPorts = [8080];
  sleepAfter = "10m";
  enableInternet = true;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.envVars = {
      PORT: "8080",
      // Serves the React SPA inside the Go binary's cwd (/app).
      STATIC_DIR: "public",
      POSTGRES_URL: env.POSTGRES_URL ?? "",
      // Redis / Elasticsearch / S3 are optional at runtime (graceful degrade).
      REDIS_ADDR: "",
      ELASTICSEARCH_URL: "",
      S3_ENDPOINT: "",
      S3_REGION: "us-east-1",
      S3_BUCKET: "czar-documents",
      S3_ACCESS_KEY: "",
      S3_SECRET_KEY: "",
      S3_USE_SSL: "false",
      JWT_SECRET: env.JWT_SECRET ?? "",
      CLIENT_ORIGIN: env.APP_HOST ?? "",
      APP_HOST: env.APP_HOST ?? "",
    };
  }

  onStart(): void {
    console.log("[czar-documents] container started");
  }

  onStop(params: { exitCode: number; reason: string }): void {
    console.log(`[czar-documents] container stopped exitCode=${params.exitCode} reason=${params.reason}`);
  }

  onError(error: unknown): void {
    console.error("[czar-documents] container error:", error);
  }
}

export default class extends WorkerEntrypoint {
  async fetch(request: Request): Promise<Response> {
    if (!this.env.POSTGRES_URL || !this.env.JWT_SECRET || this.env.JWT_SECRET.length < 32) {
      return Response.json(
        {
          error: "missing_database_env",
          message:
            "POSTGRES_URL / JWT_SECRET (>=32 chars) não configurados no Worker. Rode: npx wrangler secret put POSTGRES_URL (e JWT_SECRET) e redeploy.",
        },
        { status: 500 },
      );
    }
    // NOTA: env do container é fixado no construtor do DO. Se trocar secrets,
    // renomeie a instância (doc-v1 -> doc-v2 -> ...) para forçar DO novo.
    const id = this.env.CZAR_DOC_CONTAINER.idFromName("doc-v1");
    const container = this.env.CZAR_DOC_CONTAINER.get(id);
    return container.fetch(request);
  }
}