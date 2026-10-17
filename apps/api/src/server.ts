import { serve } from '@hono/node-server'
import { app } from './app.js'
const port = Number(process.env.PORT ?? 5080)
serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => console.log(`API http://127.0.0.1:${port}`))
