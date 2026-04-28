"""
LangGraph ReAct agent — the brain behind Daddy V.

Architecture:
  call_model → (if tool calls) → call_tools → call_model → ... → END

The MemorySaver checkpointer persists the full conversation per room_id (thread_id).
Each room is a completely independent conversation thread.
"""
import json
import re
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, AnyMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from typing_extensions import TypedDict

load_dotenv(Path(__file__).parent.parent / ".env")

from backend.agent.prompts import DADDY_V_PROMPT
from backend.agent.tools import get_tools


class TripState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]


tools = get_tools()

model = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.8,
    max_tokens=2048,
)
model_with_tools = model.bind_tools(tools)

memory = MemorySaver()


def call_model(state: TripState) -> dict:
    messages = [SystemMessage(content=DADDY_V_PROMPT)] + state["messages"]
    response = model_with_tools.invoke(messages)
    return {"messages": [response]}


def should_continue(state: TripState) -> str:
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return "end"


tool_node = ToolNode(tools)

workflow = StateGraph(TripState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)
workflow.set_entry_point("agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {"tools": "tools", "end": END},
)
workflow.add_edge("tools", "agent")

graph = workflow.compile(checkpointer=memory)


def _extract_json(content: str) -> dict:
    """
    Parse Daddy V's JSON response robustly.
    LLMs sometimes wrap JSON in markdown fences or add extra text — handle all cases.
    """
    content = content.strip()

    # Strip markdown code fences
    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)

    # Direct parse
    try:
        result = json.loads(content)
        if "message" in result:
            return result
    except json.JSONDecodeError:
        pass

    # Find the first complete JSON object in the text
    depth = 0
    start = None
    for i, ch in enumerate(content):
        if ch == "{":
            if start is None:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    result = json.loads(content[start: i + 1])
                    if "message" in result:
                        return result
                except json.JSONDecodeError:
                    start = None

    # Final fallback — return the raw text as a plain message
    return {"message": content[:800], "ui": None}


async def get_daddy_v_response(
    room_id: str,
    sender_name: str,
    message: str,
) -> dict:
    """
    Main entry point. Called by the Socket.io handler in main.py.
    Returns { message: str, ui: dict | None }.
    """
    config = {"configurable": {"thread_id": room_id}}

    response = await graph.ainvoke(
        {"messages": [{"role": "user", "content": f"[{sender_name}]: {message}"}]},
        config=config,
    )

    last_msg = response["messages"][-1]
    return _extract_json(last_msg.content)
