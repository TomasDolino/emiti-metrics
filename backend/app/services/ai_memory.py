"""
AI Memory Service - Persistent memory for AI conversations

This service provides:
1. Conversation history storage per client
2. User preferences learning
3. Knowledge base for relevant context retrieval
4. Feedback collection for future fine-tuning
"""

import sqlite3
import json
from datetime import datetime
from typing import Optional
from pathlib import Path

DATABASE_PATH = Path(__file__).parent.parent / "ai_memory.db"


def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_ai_memory_db():
    """Initialize AI memory database tables."""
    conn = get_db()
    cursor = conn.cursor()

    # Conversation history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT,
            user_id TEXT DEFAULT 'default',
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # User preferences learned from interactions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            preference_key TEXT NOT NULL,
            preference_value TEXT NOT NULL,
            confidence REAL DEFAULT 0.5,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, preference_key)
        )
    """)

    # Knowledge base for RAG
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS knowledge_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT,
            source TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Feedback for future fine-tuning
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            message_id TEXT,
            rating INTEGER,
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )
    """)

    # Fine-tuning training data (prepared for export)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            completion TEXT NOT NULL,
            category TEXT,
            quality_score REAL DEFAULT 1.0,
            is_exported BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


# ==================== CONVERSATION MEMORY ====================

def save_message(
    role: str,
    content: str,
    client_id: Optional[str] = None,
    user_id: str = "default",
    metadata: Optional[dict] = None
) -> int:
    """Save a message to conversation history."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO conversations (client_id, user_id, role, content, metadata)
        VALUES (?, ?, ?, ?, ?)
    """, (
        client_id,
        user_id,
        role,
        content,
        json.dumps(metadata) if metadata else None
    ))

    message_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return message_id


def get_conversation_history(
    user_id: str = "default",
    client_id: Optional[str] = None,
    limit: int = 20
) -> list[dict]:
    """Get recent conversation history for context."""
    conn = get_db()
    cursor = conn.cursor()

    if client_id:
        cursor.execute("""
            SELECT role, content, created_at, metadata
            FROM conversations
            WHERE user_id = ? AND client_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        """, (user_id, client_id, limit))
    else:
        cursor.execute("""
            SELECT role, content, created_at, metadata
            FROM conversations
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        """, (user_id, limit))

    rows = cursor.fetchall()
    conn.close()

    # Return in chronological order
    return [
        {
            "role": row["role"],
            "content": row["content"],
            "timestamp": row["created_at"],
            "metadata": json.loads(row["metadata"]) if row["metadata"] else None
        }
        for row in reversed(rows)
    ]


def search_conversations(
    query: str,
    user_id: str = "default",
    limit: int = 5
) -> list[dict]:
    """Search past conversations for relevant context."""
    conn = get_db()
    cursor = conn.cursor()

    # Simple keyword search (can be enhanced with embeddings later)
    cursor.execute("""
        SELECT role, content, created_at, client_id
        FROM conversations
        WHERE user_id = ? AND content LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
    """, (user_id, f"%{query}%", limit))

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


# ==================== USER PREFERENCES ====================

def update_preference(
    user_id: str,
    key: str,
    value: str,
    confidence: float = 0.5
):
    """Update or insert a user preference."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO preferences (user_id, preference_key, preference_value, confidence, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, preference_key) DO UPDATE SET
            preference_value = excluded.preference_value,
            confidence = MAX(preferences.confidence, excluded.confidence),
            updated_at = CURRENT_TIMESTAMP
    """, (user_id, key, value, confidence))

    conn.commit()
    conn.close()


def get_preferences(user_id: str) -> dict:
    """Get all preferences for a user."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT preference_key, preference_value, confidence
        FROM preferences
        WHERE user_id = ?
        ORDER BY confidence DESC
    """, (user_id,))

    rows = cursor.fetchall()
    conn.close()

    return {
        row["preference_key"]: {
            "value": row["preference_value"],
            "confidence": row["confidence"]
        }
        for row in rows
    }


# ==================== KNOWLEDGE BASE ====================

def add_knowledge(
    category: str,
    title: str,
    content: str,
    tags: Optional[list[str]] = None,
    source: Optional[str] = None
) -> int:
    """Add an entry to the knowledge base."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO knowledge_base (category, title, content, tags, source)
        VALUES (?, ?, ?, ?, ?)
    """, (
        category,
        title,
        content,
        json.dumps(tags) if tags else None,
        source
    ))

    entry_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return entry_id


def search_knowledge(
    query: str,
    category: Optional[str] = None,
    limit: int = 5
) -> list[dict]:
    """Search the knowledge base for relevant entries."""
    conn = get_db()
    cursor = conn.cursor()

    if category:
        cursor.execute("""
            SELECT id, category, title, content, tags
            FROM knowledge_base
            WHERE category = ? AND (title LIKE ? OR content LIKE ?)
            ORDER BY created_at DESC
            LIMIT ?
        """, (category, f"%{query}%", f"%{query}%", limit))
    else:
        cursor.execute("""
            SELECT id, category, title, content, tags
            FROM knowledge_base
            WHERE title LIKE ? OR content LIKE ?
            ORDER BY created_at DESC
            LIMIT ?
        """, (f"%{query}%", f"%{query}%", limit))

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            **dict(row),
            "tags": json.loads(row["tags"]) if row["tags"] else []
        }
        for row in rows
    ]


# ==================== FEEDBACK & TRAINING ====================

def save_feedback(
    conversation_id: int,
    rating: int,
    message_id: Optional[str] = None,
    comment: Optional[str] = None
):
    """Save user feedback on AI response."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO feedback (conversation_id, message_id, rating, comment)
        VALUES (?, ?, ?, ?)
    """, (conversation_id, message_id, rating, comment))

    conn.commit()
    conn.close()


def add_training_example(
    prompt: str,
    completion: str,
    category: Optional[str] = None,
    quality_score: float = 1.0
):
    """Add a training example for future fine-tuning."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO training_data (prompt, completion, category, quality_score)
        VALUES (?, ?, ?, ?)
    """, (prompt, completion, category, quality_score))

    conn.commit()
    conn.close()


def export_training_data(min_quality: float = 0.7) -> list[dict]:
    """Export training data for fine-tuning (OpenAI/Mistral format)."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, prompt, completion, category
        FROM training_data
        WHERE quality_score >= ? AND is_exported = FALSE
        ORDER BY created_at
    """, (min_quality,))

    rows = cursor.fetchall()

    # Mark as exported
    ids = [row["id"] for row in rows]
    if ids:
        cursor.execute(f"""
            UPDATE training_data
            SET is_exported = TRUE
            WHERE id IN ({','.join('?' * len(ids))})
        """, ids)
        conn.commit()

    conn.close()

    # Format for fine-tuning (OpenAI format)
    return [
        {
            "messages": [
                {"role": "user", "content": row["prompt"]},
                {"role": "assistant", "content": row["completion"]}
            ]
        }
        for row in rows
    ]


def get_training_stats() -> dict:
    """Get statistics about training data."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN is_exported THEN 1 ELSE 0 END) as exported,
            AVG(quality_score) as avg_quality,
            COUNT(DISTINCT category) as categories
        FROM training_data
    """)

    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else {}


# ==================== CONTEXT BUILDER ====================

def build_ai_context(
    user_id: str = "default",
    client_id: Optional[str] = None,
    current_query: Optional[str] = None
) -> dict:
    """Build complete context for AI including memory, preferences, and knowledge."""

    context = {
        "conversation_history": [],
        "user_preferences": {},
        "relevant_knowledge": [],
        "system_instructions": []
    }

    # Get recent conversation history
    context["conversation_history"] = get_conversation_history(
        user_id=user_id,
        client_id=client_id,
        limit=10
    )

    # Get user preferences
    context["user_preferences"] = get_preferences(user_id)

    # Search for relevant knowledge if query provided
    if current_query:
        context["relevant_knowledge"] = search_knowledge(current_query, limit=3)

        # Also search past conversations for similar topics
        past_relevant = search_conversations(current_query, user_id, limit=3)
        if past_relevant:
            context["related_conversations"] = past_relevant

    # Build system instructions based on preferences
    prefs = context["user_preferences"]
    instructions = []

    if "response_style" in prefs:
        instructions.append(f"Responde en estilo: {prefs['response_style']['value']}")

    if "expertise_level" in prefs:
        instructions.append(f"Nivel de detalle: {prefs['expertise_level']['value']}")

    if "language" in prefs:
        instructions.append(f"Idioma preferido: {prefs['language']['value']}")

    context["system_instructions"] = instructions

    return context


# Initialize database on module import
init_ai_memory_db()
