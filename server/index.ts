import { createServer, type IncomingMessage } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocket, WebSocketServer } from 'ws'

import type { Player, Session } from '../src/types.ts'
import {
  addFoodOrder,
  addPlayerToSession,
  createSession,
  endSession,
  fillCourt,
  removeFoodOrder,
  setPlayerPaused,
} from '../src/matchmaking.ts'
import { buildSummaryMarkdown, summaryFilename } from '../src/fileExport.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST_DIR = join(ROOT, 'dist')
const SESSIONS_DIR = join(ROOT, 'sessions')
const DATA_DIR = join(ROOT, '.data')
const STATE_FILE = join(DATA_DIR, 'state.json')
const PORT = Number(process.env.PORT) || 4321

interface AppState {
  roster: Player[]
  session: Session | null
}

function loadState(): AppState {
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
    return { roster: parsed.roster ?? [], session: parsed.session ?? null }
  } catch {
    return { roster: [], session: null }
  }
}

const state: AppState = loadState()

function saveState(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// --- Throttling ---
// The app runs behind Caddy (see deploy/), which sets X-Forwarded-For to the
// real client IP — the raw socket address would otherwise just be Caddy's own
// loopback address for every connection.
function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for']
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
  return first?.trim() || req.socket.remoteAddress || 'unknown'
}

/** Fixed-window counter: allows up to `limit` calls per `windowMs`, then rejects until the window rolls over. */
function createRateLimiter(limit: number, windowMs: number) {
  let count = 0
  let windowStart = Date.now()
  return function allow(): boolean {
    const now = Date.now()
    if (now - windowStart >= windowMs) {
      windowStart = now
      count = 0
    }
    count++
    return count <= limit
  }
}

// A whole club session (50+ people) can realistically share one public IP —
// shared venue Wi-Fi, or a mobile carrier's CGNAT. This only needs to catch
// genuine abuse (thousands of sockets), not a big legitimate group.
const MAX_WS_CONNECTIONS_PER_IP = 150
const WS_MESSAGE_LIMIT = 20 // per-connection action rate: 20 messages / 5s (way above normal clicking speed)
const WS_MESSAGE_WINDOW_MS = 5000
// Same shared-IP reasoning as the WS cap above: a burst of 50 people loading
// the page at once (each pulling ~5 small static files) can be a thousand+
// requests in seconds from one IP — this only needs to catch a real flood.
const HTTP_REQUEST_LIMIT = 1000
const HTTP_REQUEST_WINDOW_MS = 60000

const wsConnectionsByIp = new Map<string, number>()
const httpLimitersByIp = new Map<string, () => boolean>()
// Bound memory over a long uptime — each limiter is tiny, but without this the
// map would grow by one entry per unique IP ever seen (e.g. bot scans) forever.
setInterval(() => httpLimitersByIp.clear(), 60 * 60 * 1000).unref()

const wss = new WebSocketServer({ noServer: true })
const clients = new Set<WebSocket>()

function broadcast(message: unknown): void {
  const json = JSON.stringify(message)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(json)
  }
}

function broadcastState(): void {
  broadcast({ type: 'state', roster: state.roster, session: state.session })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleMessage(msg: any): void {
  switch (msg.type) {
    case 'setRoster':
      state.roster = msg.roster
      break
    case 'startSession':
      state.session = createSession(
        msg.selected,
        msg.numCourts,
        msg.durationMinutes,
        msg.courtRentalTotal,
        msg.entranceFeePerPerson,
      )
      break
    case 'nextGame':
      if (state.session) state.session = fillCourt(state.session, msg.courtNumber)
      break
    case 'addExistingPlayer':
      if (state.session) state.session = addPlayerToSession(state.session, msg.player)
      break
    case 'addNewPlayer':
      if (state.session) state.session = addPlayerToSession(state.session, msg.player)
      if (!state.roster.some((p) => p.id === msg.player.id)) {
        state.roster = [...state.roster, msg.player]
      }
      break
    case 'togglePause':
      if (state.session) state.session = setPlayerPaused(state.session, msg.playerId, msg.paused)
      break
    case 'addFoodOrder':
      if (state.session) state.session = addFoodOrder(state.session, msg.playerId, msg.description, msg.amount)
      break
    case 'removeFoodOrder':
      if (state.session) state.session = removeFoodOrder(state.session, msg.playerId, msg.orderId)
      break
    case 'endSession':
      if (state.session) state.session = endSession(state.session)
      break
    case 'closeSummary':
      state.session = null
      break
    case 'saveSummary': {
      if (state.session) {
        if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true })
        const filename = summaryFilename(state.session)
        writeFileSync(join(SESSIONS_DIR, filename), buildSummaryMarkdown(state.session))
        broadcast({ type: 'summarySaved', filename })
      }
      return
    }
    default:
      return
  }

  saveState()
  broadcastState()
}

wss.on('connection', (ws, req: IncomingMessage) => {
  const ip = getClientIp(req)
  const currentConnections = wsConnectionsByIp.get(ip) ?? 0
  if (currentConnections >= MAX_WS_CONNECTIONS_PER_IP) {
    ws.close(1008, 'Too many connections from this address')
    return
  }
  wsConnectionsByIp.set(ip, currentConnections + 1)

  const allowMessage = createRateLimiter(WS_MESSAGE_LIMIT, WS_MESSAGE_WINDOW_MS)

  clients.add(ws)
  ws.send(JSON.stringify({ type: 'state', roster: state.roster, session: state.session }))

  ws.on('message', (data) => {
    if (!allowMessage()) return // silently drop — well-behaved clients never hit this
    try {
      handleMessage(JSON.parse(data.toString()))
    } catch (err) {
      console.error('Bad WS message:', err)
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
    const remaining = (wsConnectionsByIp.get(ip) ?? 1) - 1
    if (remaining <= 0) wsConnectionsByIp.delete(ip)
    else wsConnectionsByIp.set(ip, remaining)
  })
})

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

const server = createServer((req, res) => {
  const ip = getClientIp(req)
  let allowRequest = httpLimitersByIp.get(ip)
  if (!allowRequest) {
    allowRequest = createRateLimiter(HTTP_REQUEST_LIMIT, HTTP_REQUEST_WINDOW_MS)
    httpLimitersByIp.set(ip, allowRequest)
  }
  if (!allowRequest()) {
    res.writeHead(429, { 'Content-Type': 'text/plain', 'Retry-After': '30' })
    res.end('Too many requests')
    return
  }

  const urlPath = (req.url ?? '/').split('?')[0]
  let filePath = normalize(join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath))

  if (!filePath.startsWith(DIST_DIR) || !existsSync(filePath)) {
    filePath = join(DIST_DIR, 'index.html')
  }

  try {
    const data = readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
  } else {
    socket.destroy()
  }
})

server.listen(PORT, () => {
  console.log(`Pickleball Open Play listening on http://localhost:${PORT}`)
})
