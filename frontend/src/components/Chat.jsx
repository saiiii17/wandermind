import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles } from 'lucide-react'
import ThinkingIndicator from './ThinkingIndicator'

function DaddyVMessage({ message }) {
  const { text, ui } = message

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex items-start gap-2 px-4"
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-700 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex flex-col gap-1 max-w-[85%]">
        <span className="text-xs text-purple-400 font-medium ml-1">Daddy V</span>
        <div className="daddy-v-bubble px-4 py-3">
          <p className="text-slate-200 text-sm leading-relaxed">{text}</p>
        </div>
        {/* Thinking steps inline in chat (when ui.type === 'thinking') */}
        {ui?.type === 'thinking' && ui.data?.steps?.length > 0 && (
          <div className="ml-1 mt-1 flex flex-col gap-1">
            {ui.data.steps.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.3 + 0.2 }}
                className="flex items-center gap-1.5"
              >
                <div className="w-1 h-1 rounded-full bg-purple-500 flex-shrink-0" />
                <span className="text-xs text-slate-500">{step}</span>
              </motion.div>
            ))}
          </div>
        )}
        {/* Nudge for destination card */}
        {ui?.type === 'destination_card' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-purple-400 ml-1 mt-0.5"
          >
            ↗ Check the card on the right
          </motion.p>
        )}
        {ui?.type === 'itinerary' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-purple-400 ml-1 mt-0.5"
          >
            ↗ Full itinerary is on the right
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}

function UserMessage({ message, isOwn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-end gap-2 px-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      {!isOwn && (
        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mb-0.5">
          <span className="text-xs font-bold text-slate-300">
            {message.sender?.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span className="text-xs text-slate-500 ml-1">{message.sender}</span>
        )}
        <div className="user-bubble px-4 py-2.5">
          <p className="text-slate-200 text-sm leading-relaxed">{message.text}</p>
        </div>
      </div>
    </motion.div>
  )
}

function SystemMessage({ text }) {
  return (
    <div className="flex justify-center px-4">
      <span className="text-xs text-slate-600 bg-surface px-3 py-1 rounded-full border border-border">
        {text}
      </span>
    </div>
  )
}

export default function Chat({ messages, isDaddyVTyping, username, onSend, activeUI }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isDaddyVTyping])

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-700 to-violet-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <p className="text-slate-400 text-sm">
                Daddy V is waiting for everyone to join.<br />
                Say something to get started.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            if (msg.type === 'system') return <SystemMessage key={msg.id} text={msg.text} />
            if (msg.type === 'daddy_v') return <DaddyVMessage key={msg.id} message={msg} />
            if (msg.type === 'user')
              return (
                <UserMessage
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender === username}
                />
              )
            return null
          })}
        </AnimatePresence>

        {isDaddyVTyping && (
          <ThinkingIndicator isTyping />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 glass rounded-2xl px-4 py-3 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Say something to Daddy V..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none max-h-32 leading-relaxed"
              style={{ minHeight: '20px' }}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-700 to-violet-600 flex items-center justify-center disabled:opacity-40 hover:from-purple-600 hover:to-violet-500 transition-all"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  )
}
