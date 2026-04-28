# WanderMind — Project Context for Claude Code

## What is this?
A group trip planner web app powered by an AI chatbot called **Daddy V**.
The chatbot is the core product. The frontend just renders what Daddy V returns.

---

## The Stack
- **Frontend**: React + Tailwind CSS
- **Backend**: FastAPI + python-socketio (WebSockets for real-time group chat)
- **AI Agent**: LangGraph + Groq (LLaMA 3) 
- **APIs**: OpenWeatherMap, Google Places, Amadeus (flights + hotels)
- **Database**: Supabase
- **Deploy**: Vercel (frontend) + Render (backend)

---

## Folder Structure
```
wandermind/
├── backend/
│   ├── agent/
│   │   ├── prompts.py     ✅ DONE — Daddy V system prompt
│   │   ├── graph.py       ← BUILD NEXT — LangGraph agent
│   │   └── tools.py       ← Weather, Places, Flights, Hotels tools
│   ├── api/
│   │   ├── weather.py     ← OpenWeatherMap integration
│   │   ├── places.py      ← Google Places integration
│   │   ├── flights.py     ← Amadeus flights
│   │   └── hotels.py      ← Amadeus hotels
│   ├── db/
│   │   └── supabase.py    ← Room + session storage
│   ├── main.py            ← FastAPI app + Socket.io
│   └── .env               ← API keys (never commit this)
└── frontend/
    └── src/
        ├── components/
        │   ├── Chat.jsx         ← Main chat UI
        │   ├── DestinationCard.jsx  ← Slides in when Daddy V suggests a place
        │   ├── Thinkingindicator.jsx ← "Checking weather..." animation
        │   ├── Itinerary.jsx    ← Visual day-by-day timeline
        │   ├── VotingPanel.jsx  ← Friends vote on destination
        │   └── MapView.jsx      ← Google Maps with pins
        ├── pages/
        │   ├── Home.jsx         ← Create/join a room
        │   └── Room.jsx         ← Main experience
        └── App.jsx
```

---

## The Chatbot — Daddy V

### Personality
- Talks in casual English mixed with Tamil/Hindi slang (da, machan, yaar, bro)
- Starts chill, gets hyped as the plan comes together
- Opinionated — pushes back on bad ideas (Goa in December = too expensive)
- Uses everyone's names, remembers what each person said
- Never robotic, never bullet points in chat

### Conversation Phases
1. **GATHERING** — Gets names, preferences, dates, budget, origin city from each person
2. **ANALYZING** — Thinks out loud, calls tools silently, shows "thinking" UI
3. **SUGGESTING** — Reveals 3 destinations one at a time with image cards
4. **REFINING** — Responds to reactions, adjusts suggestions
5. **PLANNING** — Builds day-by-day itinerary collaboratively

### CRITICAL — Output Format
Daddy V ALWAYS returns a JSON object with two fields:
```json
{
  "message": "the chat bubble text — max 4-5 sentences, no bullet points",
  "ui": null
}
```

When showing a destination:
```json
{
  "message": "Okay first one — don't dismiss it. Hear me out da.",
  "ui": {
    "type": "destination_card",
    "data": {
      "name": "Pondicherry",
      "tagline": "Beach town with a French soul",
      "image_query": "Pondicherry beach promenade",
      "weather": { "month": "December", "condition": "Pleasant", "temp": "24-28°C" },
      "crowd_level": "medium",
      "budget_per_person": "₹4,000 - ₹6,000",
      "travel_time": "Chennai — 3 hrs by car",
      "why_this_group": "Personalised reason using friend names",
      "highlight": "One thing that will blow their minds",
      "honest_heads_up": "One honest downside",
      "vibe_tags": ["Beach", "Food", "Chill"]
    }
  }
}
```

When showing thinking state:
```json
{
  "message": "Hold on, checking a few things...",
  "ui": {
    "type": "thinking",
    "data": {
      "steps": ["Checking December weather", "Comparing flight prices"]
    }
  }
}
```

When showing itinerary:
```json
{
  "message": "Okay this is the plan. Tell me if anything feels off.",
  "ui": {
    "type": "itinerary",
    "data": {
      "destination": "Pondicherry",
      "duration": "3 nights / 4 days",
      "total_cost_per_person": "₹5,500",
      "days": [
        {
          "day": 1,
          "title": "Arrive & Breathe",
          "stops": [
            {
              "time": "Morning",
              "title": "Check in + first filter coffee",
              "description": "Drop bags, walk to any local café.",
              "image_query": "Pondicherry French Quarter café morning",
              "cost": "₹150",
              "travel_tip": "Stay in White Town — everything walkable"
            }
          ]
        }
      ]
    }
  }
}
```

---

## API Keys needed (add to backend/.env)
```
GROQ_API_KEY=
GOOGLE_PLACES_API_KEY=
OPENWEATHER_API_KEY=
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_KEY=
```

---

## What's Built So Far
- [x] Project folder structure created
- [x] Python venv set up with all dependencies installed
- [x] `backend/agent/prompts.py` — Daddy V full system prompt done

## What to Build Next (in order)
1. `backend/agent/graph.py` — LangGraph agent that uses the system prompt
2. `backend/main.py` — FastAPI app with Socket.io for real-time group chat
3. `backend/api/weather.py` — OpenWeatherMap tool
4. `backend/api/places.py` — Google Places tool
5. `backend/api/flights.py` — Amadeus flights tool
6. `backend/api/hotels.py` — Amadeus hotels tool
7. Frontend React app

---

## How the Frontend Renders Daddy V's Responses
The frontend listens for messages over Socket.io.
Each message has a `message` field (chat bubble) and a `ui` field.
The `ui.type` tells React which component to render:
- `null` → just a chat bubble
- `"thinking"` → animated thinking indicator with steps
- `"destination_card"` → full image card with weather, cost, vibes
- `"itinerary"` → visual day-by-day timeline with photos and map

The image_query fields are used to fetch images from Google Places API.
The frontend never decides what to show — Daddy V does.

---

## Dependencies installed (backend)
fastapi, uvicorn, python-socketio, langchain, langchain-groq,
langgraph, python-dotenv, httpx, supabase

## Key Design Decisions
- Daddy V drives everything — UI is just a renderer
- Group session via Socket.io — all friends in same room see same chat live
- LangGraph manages conversation state across phases
- Budget + season intelligence baked into system prompt
- All suggestions personalised to specific group members by name