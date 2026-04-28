import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function ThinkingIndicator({ steps = [], isTyping = false }) {
  if (isTyping && !steps.length) {
    // Simple typing dots
    return (
      <div className="flex items-center gap-1.5 px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-700 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="daddy-v-bubble px-4 py-3 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="thinking-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!steps.length) return null

  return (
    <div className="flex items-start gap-1.5 px-4 py-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-700 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </motion.div>
      </div>
      <div className="daddy-v-bubble px-4 py-3 flex-1">
        <p className="text-purple-300 text-xs font-medium mb-2 uppercase tracking-wide">
          Daddy V is thinking...
        </p>
        <div className="flex flex-col gap-1.5">
          <AnimatePresence>
            {steps.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.4 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                />
                <span className="text-slate-300 text-sm">{step}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
