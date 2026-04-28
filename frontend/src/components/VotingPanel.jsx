import { motion } from 'framer-motion'
import { Heart, ThumbsDown, HelpCircle } from 'lucide-react'

const ICONS = {
  love: Heart,
  pass: ThumbsDown,
  more: HelpCircle,
}

const COLORS = {
  love: 'text-purple-400',
  pass: 'text-slate-400',
  more: 'text-blue-400',
}

export default function VotingPanel({ destination, votes = {} }) {
  const total = Object.values(votes).reduce((sum, v) => sum + (v?.length || 0), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4"
    >
      <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wide">
        Group vote — {destination}
      </p>

      <div className="flex flex-col gap-2">
        {Object.entries(votes).map(([reaction, voters]) => {
          const count = voters?.length || 0
          const pct = total > 0 ? (count / total) * 100 : 0
          const Icon = ICONS[reaction] || Heart

          return (
            <div key={reaction} className="flex items-center gap-3">
              <Icon className={`w-4 h-4 flex-shrink-0 ${COLORS[reaction] || 'text-slate-400'}`} />
              <div className="flex-1 relative h-1.5 bg-border rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute inset-y-0 left-0 bg-purple-600 rounded-full"
                />
              </div>
              <div className="text-xs text-slate-400 w-16 text-right">
                {voters?.join(', ') || '—'}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
