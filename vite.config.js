import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Dev-only endpoint backing src/FocalTool.jsx — remove alongside it.
 *
 * Rewrites the `focal:` line of each flavor in src/data/flavors.js. `apply:
 * 'serve'` keeps it out of the production build entirely. This project has no
 * git history, so it keeps a .bak of the previous contents on every write.
 */
function focalBake() {
  return {
    name: 'focal-bake',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__focal-bake', (req, res, next) => {
        if (req.method !== 'POST') return next()

        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          const send = (code, obj) => {
            res.statusCode = code
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify(obj))
          }

          try {
            const { focal } = JSON.parse(body || '{}')
            if (!focal || typeof focal !== 'object') {
              return send(400, { error: 'missing focal map' })
            }

            // This string is written into source — accept nothing but "N% N%".
            const bad = Object.entries(focal).filter(
              ([id, v]) =>
                !/^[a-z0-9-]+$/.test(id) ||
                typeof v !== 'string' ||
                !/^\d{1,3}% \d{1,3}%$/.test(v)
            )
            if (bad.length) {
              return send(400, {
                error: `rejected malformed entries: ${bad.map(([id]) => id).join(', ')}`,
              })
            }

            const file = path.resolve(__dirname, 'src/data/flavors.js')
            const src = fs.readFileSync(file, 'utf8')
            fs.writeFileSync(`${file}.bak`, src, 'utf8')

            let current = null
            let updated = 0
            const out = src.split(/(?<=\n)/).map((line) => {
              const id = /^\s*id:\s*'([^']+)'/.exec(line)
              if (id) current = id[1]
              const f = /^(\s*)focal:\s*'[^']*',/.exec(line)
              if (f && current && focal[current]) {
                const next = `${f[1]}focal: '${focal[current]}',\n`
                if (next !== line) updated++
                return next
              }
              return line
            })

            fs.writeFileSync(file, out.join(''), 'utf8')
            send(200, {
              message: `${updated} updated in flavors.js (previous contents kept as flavors.js.bak)`,
            })
          } catch (err) {
            send(500, { error: String(err) })
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), focalBake()],
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    rollupOptions: {
      // Two entry points. The public landing page is index.html; the staff
      // dashboard is admin/index.html, which Vite serves at /admin/ in dev and
      // builds to dist/admin/index.html. Keeping them separate means the
      // marketing bundle never ships a byte of admin code, and /admin/ resolves
      // to a real file on any static host -- no SPA rewrite rule required.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin/index.html', import.meta.url)),
      },
    },
  },
})
