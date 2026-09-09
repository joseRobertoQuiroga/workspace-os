export interface Env {
  DB: D1Database
  BUCKET: R2Bucket
  API_TOKEN?: string
  CORS_ALLOW_ORIGIN?: string
  APP_VERSION?: string
}