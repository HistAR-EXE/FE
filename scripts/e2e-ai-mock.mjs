import http from 'node:http'

const port = Number(process.env.HISTAR_AI_MOCK_PORT ?? 8100)
const reply = 'Đây là phản hồi mô phỏng có căn cứ để kiểm thử E2E.'
const sources = [{
  title: 'Tư liệu kiểm thử HistAR',
  excerpt: 'Nguồn mô phỏng chỉ phục vụ kiểm thử tự động.',
  url: 'https://example.invalid/histar-e2e',
}]

const server = http.createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  if (request.method === 'GET' && request.url === '/ai/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'UP', mock: true }))
    return
  }
  if (request.method === 'POST' && request.url === '/ai/chat') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ reply, sources, cache: 'e2e-mock' }))
    return
  }
  if (request.method === 'POST' && request.url === '/ai/chat/stream') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream' })
    response.end(`data: ${JSON.stringify({ content: reply, sources })}\n\n`)
    return
  }
  response.writeHead(404, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify({ detail: 'E2E AI mock route not found' }))
})

server.listen(port, '127.0.0.1', () => {
  console.log(`HistAR E2E AI mock listening on http://127.0.0.1:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
