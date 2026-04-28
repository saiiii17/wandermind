import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Banknote, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'

function ImageWithFallback({ query, alt, className }) {
  const [failed, setFailed] = useState(false)
  const keywords = (query || 'travel').replace(/\s+/g, ',')
  const src = failed
    ? 'https://loremflickr.com/800/400/travel'
    : `https://loremflickr.com/800/400/${keywords}`

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

function Stop({ stop, index, isLast }) {
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <div className="relative flex gap-3">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-3.5 top-8 bottom-0 w-px bg-border" />
      )}

      {/* Timeline dot */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-700 to-violet-600 flex items-center justify-center z-10 relative">
          <Clock className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pb-5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs text-purple-400 font-medium">{stop.time}</span>
              <h4 className="text-sm font-semibold text-white mt-0.5">{stop.title}</h4>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {stop.cost && (
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                  {stop.cost}
                </span>
              )}
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2">
                {stop.image_query && (
                  <div className="rounded-xl overflow-hidden h-36">
                    <ImageWithFallback
                      query={stop.image_query}
                      alt={stop.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {stop.description && (
                  <p className="text-sm text-slate-400 leading-relaxed">{stop.description}</p>
                )}
                {stop.travel_tip && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/20">
                    <Lightbulb className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300 leading-relaxed">{stop.travel_tip}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function DaySection({ day, isFirst }) {
  const [open, setOpen] = useState(isFirst)

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-card/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-700/50 to-violet-600/50 border border-purple-600/30 flex items-center justify-center">
            <span className="text-sm font-bold text-purple-300">{day.day}</span>
          </div>
          <span className="font-semibold text-white text-sm">{day.title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pt-4 pb-2 border-t border-border">
              {(day.stops || []).map((stop, i) => (
                <Stop
                  key={i}
                  stop={stop}
                  index={i}
                  isLast={i === day.stops.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Itinerary({ data }) {
  if (!data) return null

  const {
    destination, duration, total_cost_per_person,
    cost_breakdown, days = [],
  } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-purple-400" />
              <h2 className="text-xl font-bold text-white">{destination}</h2>
            </div>
            <p className="text-slate-400 text-sm">{duration}</p>
          </div>
          {total_cost_per_person && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-500">Per person</p>
              <p className="text-lg font-bold text-green-400">{total_cost_per_person}</p>
            </div>
          )}
        </div>

        {/* Cost breakdown */}
        {cost_breakdown && (
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
            {Object.entries(cost_breakdown).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-slate-500 capitalize">{key}</span>
                <span className="text-xs text-slate-300 font-medium">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Days */}
      <div className="flex flex-col gap-3">
        {days.map((day, i) => (
          <DaySection key={day.day} day={day} isFirst={i === 0} />
        ))}
      </div>

      <p className="text-center text-xs text-slate-600 pb-2">
        Tell Daddy V if anything doesn't feel right — he'll adjust.
      </p>
    </motion.div>
  )
}
