import { useEffect, useRef, useState } from 'react'
import AdminBar from './components/AdminBar'
import RosterView from './components/RosterView'
import SessionSetup from './components/SessionSetup'
import SessionView from './components/SessionView'
import SessionSummary from './components/SessionSummary'
import type { Player, Session } from './types'

type LocalView = 'roster' | 'setup'

const ADMIN_PASSWORD_STORAGE_KEY = 'pickleball.adminPassword'

function wsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${location.host}/ws`
}

export default function App() {
  const [roster, setRoster] = useState<Player[] | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [localView, setLocalView] = useState<LocalView>('roster')
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const rememberedPasswordRef = useRef<string | null>(null)

  useEffect(() => {
    rememberedPasswordRef.current = localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY)
  }, [])

  useEffect(() => {
    let cancelled = false
    let socket: WebSocket

    function connect() {
      socket = new WebSocket(wsUrl())
      wsRef.current = socket

      socket.onopen = () => {
        if (rememberedPasswordRef.current) {
          send({ type: 'adminLogin', password: rememberedPasswordRef.current })
        }
      }

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'state') {
          setRoster(msg.roster)
          setSession(msg.session)
        } else if (msg.type === 'summarySaved') {
          setSaveStatus(`Saved ${msg.filename} to the sessions folder.`)
        } else if (msg.type === 'adminStatus') {
          setIsAdmin(msg.isAdmin)
          if (!msg.isAdmin && rememberedPasswordRef.current) {
            // A remembered password stopped working (changed server-side) — forget it.
            rememberedPasswordRef.current = null
            localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY)
          }
          setAdminError(
            msg.isAdmin ? null : msg.tooManyAttempts ? 'Too many attempts — try again in a minute.' : null,
          )
        }
      }

      socket.onclose = () => {
        if (!cancelled) setTimeout(connect, 1500)
      }
    }

    connect()
    return () => {
      cancelled = true
      socket?.close()
    }
  }, [])

  function send(message: Record<string, unknown>) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }

  function adminLogin(password: string) {
    setAdminError(null)
    rememberedPasswordRef.current = password
    localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, password)
    send({ type: 'adminLogin', password })
  }

  function adminLogout() {
    rememberedPasswordRef.current = null
    localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY)
    send({ type: 'adminLogout' })
    setIsAdmin(false)
  }

  function updateRoster(newRoster: Player[]) {
    send({ type: 'setRoster', roster: newRoster })
  }

  function startSession(
    selected: Player[],
    numCourts: number,
    durationMinutes: number,
    courtRentalTotal: number,
    entranceFeePerPerson: number,
  ) {
    send({ type: 'startSession', selected, numCourts, durationMinutes, courtRentalTotal, entranceFeePerPerson })
  }

  function nextGame(courtNumber: number) {
    send({ type: 'nextGame', courtNumber })
  }

  function addExistingPlayer(player: Player) {
    send({ type: 'addExistingPlayer', player })
  }

  function addNewPlayer(player: Player) {
    send({ type: 'addNewPlayer', player })
  }

  function togglePause(playerId: string, paused: boolean) {
    send({ type: 'togglePause', playerId, paused })
  }

  function renameCourt(courtNumber: number, label: string) {
    send({ type: 'renameCourt', courtNumber, label })
  }

  function addOrder(playerId: string, description: string, amount: number) {
    send({ type: 'addFoodOrder', playerId, description, amount })
  }

  function removeOrder(playerId: string, orderId: string) {
    send({ type: 'removeFoodOrder', playerId, orderId })
  }

  function endSession() {
    send({ type: 'endSession' })
  }

  function saveSummary() {
    send({ type: 'saveSummary' })
  }

  function closeSummary() {
    send({ type: 'closeSummary' })
    setSaveStatus(null)
    setLocalView('roster')
  }

  if (roster === null) {
    return <div className="p-10 text-center text-sm text-slate-500">Connecting…</div>
  }

  let content
  if (session && !session.endedAt) {
    content = (
      <SessionView
        session={session}
        roster={roster}
        isAdmin={isAdmin}
        onNextGame={nextGame}
        onAddExistingPlayer={addExistingPlayer}
        onAddNewPlayer={addNewPlayer}
        onTogglePause={togglePause}
        onRenameCourt={renameCourt}
        onAddFoodOrder={addOrder}
        onRemoveFoodOrder={removeOrder}
        onEndSession={endSession}
      />
    )
  } else if (session && session.endedAt) {
    content = (
      <SessionSummary
        session={session}
        isAdmin={isAdmin}
        onDone={closeSummary}
        onAddFoodOrder={addOrder}
        onRemoveFoodOrder={removeOrder}
        onSaveSummary={saveSummary}
        saveStatus={saveStatus}
      />
    )
  } else if (localView === 'setup') {
    content = (
      <SessionSetup
        roster={roster}
        isAdmin={isAdmin}
        onBack={() => setLocalView('roster')}
        onStart={startSession}
      />
    )
  } else {
    content = <RosterView roster={roster} onChange={updateRoster} onStartSetup={() => setLocalView('setup')} />
  }

  return (
    <>
      <AdminBar isAdmin={isAdmin} onLogin={adminLogin} onLogout={adminLogout} error={adminError} />
      {content}
    </>
  )
}
