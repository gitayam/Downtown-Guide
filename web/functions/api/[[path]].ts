/**
 * API Proxy Function
 *
 * Proxies all /api/* requests to the Cloudflare Worker backend.
 * This allows the frontend to use relative URLs and avoids CORS issues.
 */

const WORKER_URL = 'https://downtown-guide.wemea-5ahhf.workers.dev'

export const onRequest: PagesFunction = async (context) => {
  const { request, params } = context

  // Build the path from the catch-all parameter
  const pathSegments = params.path as string[]
  const path = pathSegments ? pathSegments.join('/') : ''

  // Build the full URL to the worker
  const url = new URL(request.url)
  const workerUrl = `${WORKER_URL}/api/${path}${url.search}`

  // Forward the request to the worker
  const response = await fetch(workerUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  })

  // Return the response with CORS headers
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })

  return newResponse
}
