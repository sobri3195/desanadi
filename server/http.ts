import type { IncomingHttpHeaders } from 'node:http';
// Structural subset of the Vercel Node.js request/response API.
export interface ApiRequest {
  method?: string;
  headers: IncomingHttpHeaders;
  body?: unknown;
}
export interface ApiResponse {
  setHeader(name: string, value: string | string[]): unknown;
  status(code: number): ApiResponse;
  json(body: unknown): unknown;
}
