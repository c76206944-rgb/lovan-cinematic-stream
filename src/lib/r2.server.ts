import { AwsClient } from "aws4fetch";

// Videos stored in Cloudflare R2 are saved in the catalogue as "r2/<object key>".
export const R2_PREFIX = "r2/";

export function isR2Path(path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith(R2_PREFIX);
}

export function r2Key(path: string) {
  return path.slice(R2_PREFIX.length);
}

function config() {
  const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"];
  const bucket = process.env["CLOUDFLARE_R2_BUCKET"];
  const accessKeyId = process.env["CLOUDFLARE_R2_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["CLOUDFLARE_R2_SECRET_ACCESS_KEY"];
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare video storage is not set up.");
  }
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  return { client, base: `https://${accountId}.r2.cloudflarestorage.com/${bucket}` };
}

export function r2Configured() {
  return Boolean(
    process.env["CLOUDFLARE_ACCOUNT_ID"] &&
      process.env["CLOUDFLARE_R2_BUCKET"] &&
      process.env["CLOUDFLARE_R2_ACCESS_KEY_ID"] &&
      process.env["CLOUDFLARE_R2_SECRET_ACCESS_KEY"],
  );
}

function objectUrl(key: string, query: Record<string, string> = {}) {
  const { base } = config();
  const url = new URL(`${base}/${key.split("/").map(encodeURIComponent).join("/")}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return url;
}

/** Private, time-limited link. Files stay private in the bucket. */
export async function presign(method: "GET" | "PUT" | "DELETE", key: string, seconds: number, query: Record<string, string> = {}) {
  const { client } = config();
  const url = objectUrl(key, query);
  url.searchParams.set("X-Amz-Expires", String(seconds));
  const signed = await client.sign(new Request(url, { method }), { aws: { signQuery: true } });
  return signed.url;
}

async function call(method: string, key: string, query: Record<string, string> = {}, body?: string) {
  const { client } = config();
  const res = await client.fetch(objectUrl(key, query).toString(), { method, body });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Cloudflare storage error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res;
}

export async function r2Head(key: string) {
  const res = await call("HEAD", key);
  if (res.status === 404) return null;
  return { size: Number(res.headers.get("content-length") ?? 0), mimetype: res.headers.get("content-type") ?? "" };
}

export async function r2Delete(key: string) {
  await call("DELETE", key);
}

export async function r2StartMultipart(key: string, contentType: string) {
  const { client } = config();
  const res = await client.fetch(objectUrl(key, { uploads: "" }).toString(), {
    method: "POST",
    headers: { "content-type": contentType },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Cloudflare storage error ${res.status}: ${text.slice(0, 300)}`);
  const id = /<UploadId>([^<]+)<\/UploadId>/.exec(text)?.[1];
  if (!id) throw new Error("Cloudflare did not start the upload.");
  return id;
}

export async function r2CompleteMultipart(key: string, uploadId: string, parts: { partNumber: number; etag: string }[]) {
  const xml =
    "<CompleteMultipartUpload>" +
    parts
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag.replace(/[<>&]/g, "")}</ETag></Part>`)
      .join("") +
    "</CompleteMultipartUpload>";
  const res = await call("POST", key, { uploadId }, xml);
  const text = await res.text();
  if (!res.ok || /<Error>/.test(text)) throw new Error(`Could not finish the upload: ${text.slice(0, 300)}`);
}

export async function r2AbortMultipart(key: string, uploadId: string) {
  await call("DELETE", key, { uploadId }).catch(() => undefined);
}
