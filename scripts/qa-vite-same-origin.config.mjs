import base from '../vite.config.ts'

// QA preview of the existing product's same-origin /api reverse proxy.
// Preserve the browser's real Origin and public Host together. Authentication and
// backend CORS rules remain intact; this does not test direct cross-origin access.
export default async environment => {
 const config = await (typeof base === 'function' ? base(environment) : base)
 const proxy = {...config.server.proxy, '/api': {...config.server.proxy['/api'], changeOrigin: false}}
 return {...config, server: {...config.server, proxy}, preview: {...config.preview, proxy}}
}
