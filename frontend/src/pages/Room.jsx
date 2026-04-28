import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Users, Compass } from 'lucide-react'

import Chat from '../components/Chat'
import DestinationCard from '../components/DestinationCard'
import ThinkingIndicator from '../components/ThinkingIndicator'
import Itinerary from '../components/Itinerary'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function Room() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const username = searchParams.get('name') || 'Traveller'

  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [activeUI, setActiveUI] = useState(null) // { type, data }
  const [isDaddyVTyping, setIsDaddyVTyping] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  // Socket setup
  useEffect(() => {
    const socket = io(BACKEND, {
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_room', { room_id: roomId, username })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('room_joined', ({ members: m }) => {
      setMembers(m)
    })

    socket.on('user_joined', ({ username: u, members: m }) => {
      setMembers(m)
      setMessages((prev) => [
        ...prev,
        { type: 'system', text: `${u} joined the trip`, id: Date.now() },
      ])
    })

    socket.on('user_left', ({ username: u }) => {
      setMembers((prev) => prev.filter((x) => x !== u))
      setMessages((prev) => [
        ...prev,
        { type: 'system', text: `${u} left`, id: Date.now() },
      ])
    })

    socket.on('user_message', ({ username: u, text, timestamp }) => {
      setMessages((prev) => [
        ...prev,
        { type: 'user', sender: u, text, timestamp, id: Date.now() + Math.random() },
      ])
    })

    socket.on('daddy_v_typing', () => {
      setIsDaddyVTyping(true)
    })

    socket.on('daddy_v_reply', ({ message, ui }) => {
      setIsDaddyVTyping(false)
      const msgId = Date.now() + Math.random()
      setMessages((prev) => [
        ...prev,
        { type: 'daddy_v', text: message, ui, id: msgId },
      ])
      // Update the side panel if there's a UI payload
      if (ui) {
        setActiveUI(ui)
      }
    })

    socket.on('error', ({ message: errMsg }) => {
      console.error('Socket error:', errMsg)
    })

    return () => socket.disconnect()
  }, [roomId, username])

  const sendMessage = useCallback((text) => {
    if (!socketRef.current || !text.trim()) return
    socketRef.current.emit('message', { room_id: roomId, username, text })
  }, [roomId, username])

  function copyCode() {
    navigator.clipboard.writeText(roomId)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const hasPanel = activeUI && activeUI.type !== 'thinking'

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 glass border-b border-border px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold gradient-text text-lg hidden sm:block">WanderMind</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Members */}
          <div className="flex items-center gap-1.5 text-slate-400 text-sm">
            <Users className="w-4 h-4" />
            <span>{members.length}</span>
          </div>

          {/* Room code */}
          <button
            onClick={copyCode}
            className="flex items-center gap-2 glass rounded-lg px-3 py-1.5 text-sm font-mono hover:border-purple-500/40 transition-colors"
          >
            <span className="text-purple-300 tracking-widest">{roomId}</span>
            {codeCopied
              ? <Check className="w-3.5 h-3.5 text-green-400" />
              : <Copy className="w-3.5 h-3.5 text-slate-500" />
            }
          </button>

          {/* Connection status */}
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat — always visible */}
        <div className={`flex flex-col ${hasPanel ? 'w-full lg:w-[45%]' : 'w-full'} transition-all duration-500`}>
          <Chat
            messages={messages}
            isDaddyVTyping={isDaddyVTyping}
            username={username}
            onSend={sendMessage}
            activeUI={activeUI}
          />
        </div>

        {/* Right panel — destination card / itinerary */}
        <AnimatePresence>
          {hasPanel && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="hidden lg:flex flex-col w-[55%] border-l border-border overflow-y-auto"
            >
              <div className="p-4">
                {activeUI.type === 'destination_card' && (
                  <DestinationCard data={activeUI.data} onVote={(reaction) => {
                    sendMessage(reaction)
                  }} />
                )}
                {activeUI.type === 'itinerary' && (
                  <Itinerary data={activeUI.data} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile bottom sheet for destination card / itinerary */}
      <AnimatePresence>
        {hasPanel && (
          <motion.div
            key="mobile-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="lg:hidden fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto bg-panel border-t border-border rounded-t-2xl"
          >
            <div className="sticky top-0 bg-panel px-4 pt-3 pb-2 flex items-center justify-between border-b border-border">
              <div className="w-10 h-1 bg-border rounded-full mx-auto" />
            </div>
            <div className="p-4">
              {activeUI.type === 'destination_card' && (
                <DestinationCard data={activeUI.data} onVote={(reaction) => {
                  sendMessage(reaction)
                }} />
              )}
              {activeUI.type === 'itinerary' && (
                <Itinerary data={activeUI.data} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
