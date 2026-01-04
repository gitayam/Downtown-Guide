/**
 * API Proxy Function
 *
 * Proxies /api/* requests to the Cloudflare Worker backend.
 * This allows the frontend to use relative URLs and avoids CORS issues.
 *
 * Note: /api (no path) passes through to SPA for the API docs page.
 */

const WORKER_URL = 'https://downtown-guide.wemea-5ahhf.workers.dev'

async function handleRequest(context: EventContext<unknown, string, unknown>): Promise<Response> {
  const { request, params, next } = context

  // Build the path from the catch-all parameter
  const pathSegments = params.path as string[]
  const path = pathSegments ? pathSegments.join('/') : ''

  // If path is empty (/api), pass through to SPA for API docs page
  if (!path) {
    return next()
  }

  // Build the full URL to the worker
  const url = new URL(request.url)
  const workerUrl = `${WORKER_URL}/api/${path}${url.search}`

  // Clone request to properly forward body for POST/PUT/PATCH
  const init: RequestInit = {
    method: request.method,
    headers: request.headers,
  }

  // Forward body for methods that support it
  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = request.body
    init.duplex = 'half' as any // Required for streaming body
  }

  // Forward the request to the worker
  const response = await fetch(workerUrl, init)

  // Return the response with proper headers
  const responseHeaders = new Headers(response.headers)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

// Export handlers for all HTTP methods
export const onRequestGet: PagesFunction = handleRequest
export const onRequestPost: PagesFunction = handleRequest
export const onRequestPut: PagesFunction = handleRequest
export const onRequestPatch: PagesFunction = handleRequest
export const onRequestDelete: PagesFunction = handleRequest
export const onRequestOptions: PagesFunction = handleRequest
