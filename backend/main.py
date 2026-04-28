"""
WanderMind Backend — FastAPI + Socket.io

Socket events (client → server):
  join_room   { room_id, username }
  leave_room  { room_id, username }
  message     { room_id, username, text }

Socket events (server → client):
  room_joined     { room_id, members: [str] }
  user_joined     { username }
  user_left       { username }
  user_message    { username, text, timestamp }
  daddy_v_typing  {}                    ← Daddy V started thinking
  daddy_v_reply   { message, ui }       ← Daddy V's structured response
  error           { message }
"""
import os
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env from backend/ regardless of where uvicorn is launched from
load_dotenv(Path(__file__).parent / ".env")

from backend.agent.graph import get_daddy_v_response
from backend.db import supabase as db

# ── App setup ──────────────────────────────────────────────────────────────────

app = FastAPI(title="WanderMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# In-memory room registry (source of truth when Supabase not configured)
# { room_id: { members: [username], created_at: str } }
_rooms: dict[str, dict] = {}


# ── HTTP routes ────────────────────────────────────────────────────────────────

@app.get("/")
async def health():
    return {"status": "ok", "service": "wandermind-backend"}


@app.post("/rooms")
async def create_room(body: dict):
    host = body.get("host_name", "Anonymous")
    room_id = str(uuid.uuid4())[:8].upper()
    _rooms[room_id] = {"members": [], "created_at": datetime.now(timezone.utc).isoformat()}
    try:
        await db.create_room(room_id, host)
    except Exception:
        pass  # in-memory fallback already set above
    return {"room_id": room_id}


@app.get("/rooms/{room_id}")
async def get_room(room_id: str):
    room = _rooms.get(room_id)
    if not room:
        # Fall back to Supabase check
        exists = await db.room_exists(room_id)
        if not exists:
            return {"error": "Room not found"}, 404
        members = await db.get_members(room_id)
        return {"room_id": room_id, "members": members}
    return {"room_id": room_id, **room}


# ── Socket.io events ───────────────────────────────────────────────────────────

@sio.on("connect")
async def on_connect(sid, environ):
    pass


@sio.on("disconnect")
async def on_disconnect(sid):
    pass


@sio.on("join_room")
async def on_join_room(sid, data: dict):
    room_id = data.get("room_id", "").strip().upper()
    username = data.get("username", "").strip()

    if not room_id or not username:
        await sio.emit("error", {"message": "room_id and username are required"}, to=sid)
        return

    # Create room if it doesn't exist (allows joining a new room by code)
    if room_id not in _rooms:
        _rooms[room_id] = {"members": [], "created_at": datetime.now(timezone.utc).isoformat()}

    room = _rooms[room_id]
    if username not in room["members"]:
        room["members"].append(username)

    await sio.enter_room(sid, room_id)
    await db.add_member(room_id, username)

    # Confirm to joining user
    await sio.emit(
        "room_joined",
        {"room_id": room_id, "members": room["members"]},
        to=sid,
    )

    # Notify rest of room
    await sio.emit(
        "user_joined",
        {"username": username, "members": room["members"]},
        room=room_id,
        skip_sid=sid,
    )

    # Trigger Daddy V's welcome if this is the first person
    if len(room["members"]) == 1:
        await _daddy_v_respond(
            room_id=room_id,
            sender=username,
            text=f"Hey! I just created this room. I'm {username}.",
        )


@sio.on("leave_room")
async def on_leave_room(sid, data: dict):
    room_id = data.get("room_id", "").strip().upper()
    username = data.get("username", "").strip()

    await sio.leave_room(sid, room_id)

    room = _rooms.get(room_id)
    if room and username in room["members"]:
        room["members"].remove(username)

    await sio.emit(
        "user_left",
        {"username": username},
        room=room_id,
    )


@sio.on("message")
async def on_message(sid, data: dict):
    room_id = data.get("room_id", "").strip().upper()
    username = data.get("username", "").strip()
    text = data.get("text", "").strip()

    if not room_id or not username or not text:
        await sio.emit("error", {"message": "room_id, username, and text are required"}, to=sid)
        return

    timestamp = datetime.now(timezone.utc).isoformat()

    # Broadcast the user's message to everyone in the room
    await sio.emit(
        "user_message",
        {"username": username, "text": text, "timestamp": timestamp},
        room=room_id,
    )

    await db.save_message(room_id, username, text)

    # Let everyone know Daddy V is thinking
    await sio.emit("daddy_v_typing", {}, room=room_id)

    # Get Daddy V's response in a background task so we don't block the event loop
    asyncio.create_task(_daddy_v_respond(room_id, username, text))


async def _daddy_v_respond(room_id: str, sender: str, text: str):
    """Run the agent and broadcast the result to the room."""
    try:
        response = await get_daddy_v_response(
            room_id=room_id,
            sender_name=sender,
            message=text,
        )
        await sio.emit("daddy_v_reply", response, room=room_id)
        await db.save_message(room_id, "daddy_v", response.get("message", ""), response.get("ui"))
    except Exception as e:
        await sio.emit(
            "daddy_v_reply",
            {"message": "Aiyo something broke on my end da. Give me a second and try again.", "ui": None},
            room=room_id,
        )
