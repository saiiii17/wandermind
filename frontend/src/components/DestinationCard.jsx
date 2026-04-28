import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Thermometer, Users, Wallet, Clock, MapPin,
  Heart, ThumbsDown, MessageCircle, Star, AlertTriangle
} from 'lucide-react'

function CrowdBadge({ level }) {
  const map = {
    low: { label: 'Low crowd', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
    medium: { label: 'Moderate crowd', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    high: { label: 'Busy', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
    'very high': { label: 'Very busy', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  }
  const info = map[level?.toLowerCase()] || map.medium
  return (
    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${info.color}`}>
      {info.label}
    </span>
  )
}

function ImageWithFallback({ query, alt, className }) {
  const [failed, setFailed] = useState(false)
  const keywords = (query || 'travel destination').replace(/\s+/g, ',')
  const src = failed
    ? `https://loremflickr.com/1200/700/travel,landscape`
    : `https://loremflickr.com/1200/700/${keywords}`

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

export default function DestinationCard({ data, onVote }) {
  const [voted, setVoted] = useState(null)

  if (!data) return null

  const {
    name, tagline, image_query, weather, crowd_level,
    budget_per_person, travel_time, why_this_group,
    highlight, honest_heads_up, vibe_tags = [],
  } = data

  function vote(reaction) {
    setVoted(reaction)
    onVote?.(reaction)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden border border-border bg-card"
    >
      {/* Hero Image */}
      <div className="relative h-56 overflow-hidden">
        <ImageWithFallback
          query={image_query}
          alt={name}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

        {/* Destination name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="text-2xl font-bold text-white">{name}</h2>
          <p className="text-slate-300 text-sm mt-0.5">{tagline}</p>
        </div>

        {/* Vibe tags */}
        <div className="absolute top-3 right-3 flex flex-wrap gap-1 justify-end">
          {vibe_tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full border border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-4">
        {weather && (
          <div className="flex items-start gap-2 glass rounded-xl p-3">
            <Thermometer className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-slate-500">{weather.month}</p>
              <p className="text-sm text-slate-200 font-medium">{weather.condition}</p>
              <p className="text-xs text-slate-400">{weather.temp}</p>
            </div>
          </div>
        )}
        {budget_per_person && (
          <div className="flex items-start gap-2 glass rounded-xl p-3">
            <Wallet className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-slate-500">Per person</p>
              <p className="text-sm text-slate-200 font-medium">{budget_per_person}</p>
            </div>
          </div>
        )}
        {travel_time && (
          <div className="flex items-start gap-2 glass rounded-xl p-3">
            <Clock className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-slate-500">Travel time</p>
              <p className="text-sm text-slate-200 font-medium leading-snug">{travel_time}</p>
            </div>
          </div>
        )}
        {crowd_level && (
          <div className="flex items-center gap-2 glass rounded-xl p-3">
            <Users className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <CrowdBadge level={crowd_level} />
          </div>
        )}
      </div>

      {/* Why this group */}
      {why_this_group && (
        <div className="mx-4 mt-3 p-4 rounded-xl bg-purple-950/30 border border-purple-800/30">
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" />
            Why this works for you
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{why_this_group}</p>
        </div>
      )}

      {/* Highlight */}
      {highlight && (
        <div className="mx-4 mt-2 p-3 rounded-xl bg-surface border border-border">
          <p className="text-xs text-slate-500 mb-1">One thing that will hit different</p>
          <p className="text-sm text-white leading-relaxed">{highlight}</p>
        </div>
      )}

      {/* Honest heads up */}
      {honest_heads_up && (
        <div className="mx-4 mt-2 p-3 rounded-xl bg-orange-950/20 border border-orange-800/20">
          <p className="text-xs text-orange-400 font-medium mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            Honest heads up
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{honest_heads_up}</p>
        </div>
      )}

      {/* Vote buttons */}
      <div className="p-4 pt-3">
        {voted ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-2 text-sm text-slate-400"
          >
            Sent your reaction to the group ✓
          </motion.div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => vote("Love it! Let's do this one 🔥")}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-700/30 hover:bg-purple-700/50 border border-purple-600/30 text-purple-300 rounded-xl py-2.5 text-sm font-medium transition-all"
            >
              <Heart className="w-4 h-4" />
              Love it
            </button>
            <button
              onClick={() => vote("I'm not feeling this one, what else do you have?")}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-400 rounded-xl py-2.5 text-sm font-medium transition-all"
            >
              <ThumbsDown className="w-4 h-4" />
              Pass
            </button>
            <button
              onClick={() => vote("Tell me more about this one, what would we actually do there?")}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-400 rounded-xl py-2.5 text-sm font-medium transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              More
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
