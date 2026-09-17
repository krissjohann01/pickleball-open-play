import { useEffect, useRef, useState } from 'react'
import RosterView from './components/RosterView'
import SessionSetup from './components/SessionSetup'
import SessionView from './components/SessionView'
import SessionSummary from './components/SessionSummary'
import type { Player, Session } from './types'

type LocalView = 'roster' | 'setup'

function wsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${location.host}/ws`
}

export default function App() {
  const [roster, setRoster] = useState<Player[] | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [localView, setLocalView] = useState<LocalView>('roster')
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let cancelled = false
    let socket: WebSocket

    function connect() {
      socket = new WebSocket(wsUrl())
      wsRef.current = socket

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'state') {
          setRoster(msg.roster)
          setSession(msg.session)
        } else if (msg.type === 'summarySaved') {
          setSaveStatus(`Saved ${msg.filename} to the sessions folder.`)
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

  if (session && !session.endedAt) {
    return (
      <SessionView
        session={session}
        roster={roster}
        onNextGame={nextGame}
        onAddExistingPlayer={addExistingPlayer}
        onAddNewPlayer={addNewPlayer}
        onTogglePause={togglePause}
        onAddFoodOrder={addOrder}
        onRemoveFoodOrder={removeOrder}
        onEndSession={endSession}
      />
    )
  }

  if (session && session.endedAt) {
    return (
      <SessionSummary
        session={session}
        onDone={closeSummary}
        onAddFoodOrder={addOrder}
        onRemoveFoodOrder={removeOrder}
        onSaveSummary={saveSummary}
        saveStatus={saveStatus}
      />
    )
  }

  if (localView === 'setup') {
    return <SessionSetup roster={roster} onBack={() => setLocalView('roster')} onStart={startSession} />
  }

  return <RosterView roster={roster} onChange={updateRoster} onStartSetup={() => setLocalView('setup')} />
}
