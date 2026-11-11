import asyncio
import logging
from typing import Dict, Set, Optional, Any

logger = logging.getLogger(__name__)

class PipelineEventManager:
    """
    In-memory pub-sub broadcaster for real-time Server-Sent Events (SSE) tracking
    podcast generation pipeline stages: fetching, ranking, scripting, voicing, mixing, done/failed.
    """
    def __init__(self):
        self._subscribers: Dict[int, Set[asyncio.Queue]] = {}
        self._latest_events: Dict[int, dict] = {}

    def subscribe(self, episode_id: int) -> asyncio.Queue:
        """Subscribes an asyncio Queue to receive pipeline events for a specific episode."""
        queue: asyncio.Queue = asyncio.Queue()
        if episode_id not in self._subscribers:
            self._subscribers[episode_id] = set()
        self._subscribers[episode_id].add(queue)
        logger.debug(f"Subscriber added for episode {episode_id}. Active subscribers: {len(self._subscribers[episode_id])}")
        return queue

    def unsubscribe(self, episode_id: int, queue: asyncio.Queue) -> None:
        """Removes a subscriber queue and cleans up episode entry when empty."""
        if episode_id in self._subscribers:
            self._subscribers[episode_id].discard(queue)
            if not self._subscribers[episode_id]:
                del self._subscribers[episode_id]
        logger.debug(f"Subscriber removed for episode {episode_id}.")

    def get_latest_event(self, episode_id: int) -> Optional[dict]:
        """Returns the most recent event published for the given episode, if any."""
        return self._latest_events.get(episode_id)

    def publish(
        self,
        episode_id: int,
        stage: str,
        progress: int = 0,
        message: str = "",
        payload: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Publishes a pipeline stage event to all active subscribers for an episode.
        Thread-safe for background workers and sync routes.
        Valid stages: 'fetching', 'ranking', 'scripting', 'voicing', 'mixing', 'done', 'failed'.
        """
        event_data = {
            "episode_id": episode_id,
            "stage": stage,
            "progress": progress,
            "message": message,
            "payload": payload or {}
        }
        self._latest_events[episode_id] = event_data
        logger.info(f"[SSE Event] Episode {episode_id} -> stage='{stage}', progress={progress}%, message='{message}'")

        if episode_id in self._subscribers:
            for q in list(self._subscribers[episode_id]):
                try:
                    q.put_nowait(event_data)
                except Exception as e:
                    logger.debug(f"Error delivering SSE event to subscriber queue for episode {episode_id}: {e}")

    def clear_episode(self, episode_id: int) -> None:
        """Cleans up stored latest event and subscribers after terminal stage is consumed."""
        self._latest_events.pop(episode_id, None)
        self._subscribers.pop(episode_id, None)

pipeline_events = PipelineEventManager()
