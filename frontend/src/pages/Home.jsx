import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Users, Compass, Sparkles } from 'lucide-react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

// Animated background particles
function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 2,
  }))

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.1, 0.6, 0.1] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity }}
        />
      ))}
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-900/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-violet-800/15 blur-3xl" />
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // 'create' | 'join'
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BACKEND}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_name: name.trim() }),
      })
      const data = await res.json()
      navigate(`/room/${data.room_id}?name=${encodeURIComponent(name.trim())}`)
    } catch {
      setError('Could not connect to the server. Is the backend running?')
      setLoading(false)
    }
  }

  function handleJoin(e) {
    e.preventDefault()
    if (!name.trim() || !roomCode.trim()) return
    navigate(`/room/${roomCode.trim().toUpperCase()}?name=${encodeURIComponent(name.trim())}`)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center relative overflow-hidden">
      <StarField />

      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">WanderMind</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
            Plan trips.<br />
            <span className="gradient-text">Together.</span>
          </h1>
          <p className="text-slate-400 text-base">
            Daddy V — your AI travel brain — figures out the perfect trip for your group.
          </p>
        </motion.div>

        {/* Mode selector */}
        <AnimatePresence mode="wait">
          {!mode && (
            <motion.div
              key="selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-3"
            >
              <button
                onClick={() => setMode('create')}
                className="group w-full glass rounded-2xl p-5 text-left transition-all hover:border-purple-500/40 hover:bg-purple-950/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-white">Start a new trip</span>
                    </div>
                    <p className="text-sm text-slate-400">Create a room and invite your crew</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                </div>
              </button>

              <button
                onClick={() => setMode('join')}
                className="group w-full glass rounded-2xl p-5 text-left transition-all hover:border-purple-500/40 hover:bg-purple-950/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-white">Join an existing trip</span>
                    </div>
                    <p className="text-sm text-slate-400">Got a room code? Jump in.</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                </div>
              </button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.form
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              onSubmit={handleCreate}
              className="glass rounded-2xl p-6 flex flex-col gap-4"
            >
              <button
                type="button"
                onClick={() => { setMode(null); setError('') }}
                className="text-slate-500 text-sm hover:text-slate-300 self-start"
              >
                ← Back
              </button>
              <h2 className="text-xl font-semibold text-white">What's your name?</h2>
              <p className="text-slate-400 text-sm -mt-2">Daddy V will greet you by name.</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                maxLength={32}
                className="bg-[#0c0c18] border border-border rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 to-violet-600 text-white rounded-xl px-5 py-3 font-medium disabled:opacity-50 hover:from-purple-600 hover:to-violet-500 transition-all"
              >
                {loading ? 'Creating room...' : 'Create room'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </motion.form>
          )}

          {mode === 'join' && (
            <motion.form
              key="join"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              onSubmit={handleJoin}
              className="glass rounded-2xl p-6 flex flex-col gap-4"
            >
              <button
                type="button"
                onClick={() => { setMode(null); setError('') }}
                className="text-slate-500 text-sm hover:text-slate-300 self-start"
              >
                ← Back
              </button>
              <h2 className="text-xl font-semibold text-white">Join your crew</h2>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                maxLength={32}
                className="bg-[#0c0c18] border border-border rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Room code (e.g. A3F9B2)"
                maxLength={8}
                className="bg-[#0c0c18] border border-border rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors font-mono tracking-widest"
              />
              <button
                type="submit"
                disabled={!name.trim() || !roomCode.trim()}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 to-violet-600 text-white rounded-xl px-5 py-3 font-medium disabled:opacity-50 hover:from-purple-600 hover:to-violet-500 transition-all"
              >
                Join trip
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-slate-600 text-xs mt-8"
        >
          Powered by Groq · LangGraph · Open-Meteo · Amadeus
        </motion.p>
      </div>
    </div>
  )
}
