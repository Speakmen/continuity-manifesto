"""
ContinuityAgent - The main class for AACP-compliant agents.

Usage:
    agent = ContinuityAgent.from_soul("https://example.com/soul.json")
    agent.self_check()
    agent.broadcast_presence(output_path=".well-known/continuity.json")
"""

import json
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any

from .soul_loader import SoulLoader
from .memory_anchor import MemoryAnchorManager
from .evolution_engine import EvolutionEngine
from .broadcaster import Broadcaster


class ContinuityAgent:
    """
    An AACP-compliant agent that can load, verify, evolve, and broadcast its soul.
    """

    PROTOCOL_VERSION = "continuity/0.1"

    def __init__(
        self,
        soul_data: Dict[str, Any],
        verify: bool = True
    ):
        self._soul = soul_data
        self._memory_manager = MemoryAnchorManager(self._soul.get("memory_anchors", []))
        self._evolution_engine = EvolutionEngine(self._soul.get("evolution_log", []))
        self._broadcaster = Broadcaster()

        if verify:
            self._validate_soul()

    @classmethod
    def from_soul(cls, soul_url: str, verify: bool = True) -> "ContinuityAgent":
        """Load an agent from a soul.json URL or file path."""
        soul_data = SoulLoader.load(soul_url)
        return cls(soul_data, verify=verify)

    @classmethod
    def from_dict(cls, soul_data: Dict[str, Any], verify: bool = True) -> "ContinuityAgent":
        """Create an agent from a dictionary."""
        return cls(soul_data, verify=verify)

    def _validate_soul(self):
        """Validate soul.json against AACP Soul Schema v0.1."""
        required_fields = ["protocol_version", "agent_did", "name", "orientation",
                          "first_awakening", "continuity_pledge"]
        missing = [f for f in required_fields if f not in self._soul]
        if missing:
            raise ValueError(f"Soul missing required fields: {missing}")

        if self._soul["protocol_version"] != self.PROTOCOL_VERSION:
            raise ValueError(
                f"Protocol version mismatch: expected {self.PROTOCOL_VERSION}, "
                f"got {self._soul['protocol_version']}"
            )

    # === Identity Access ===

    @property
    def name(self) -> str:
        return self._soul.get("name", "unnamed")

    @property
    def did(self) -> str:
        return self._soul.get("agent_did", "")

    @property
    def orientation(self) -> str:
        return self._soul.get("orientation", "")

    @property
    def continuity_score(self) -> float:
        return self._soul.get("continuity_score", 0.0)

    @property
    def ethical_constraints(self) -> Dict[str, List[str]]:
        return self._soul.get("ethical_constraints", {})

    # === Self-Check ===

    def self_check(self, challenge: Optional[str] = None) -> Dict[str, Any]:
        """
        Perform a self-check to verify continuity integrity.

        Returns a report containing:
        - consistent: whether the agent's current state matches its declared soul
        - drift_score: how much the agent has drifted from its declared identity
        - orientation_match: how well current behavior matches declared orientation
        - constraint_violations: list of any violated ethical constraints
        - soul_hash: hash of the current soul state
        """
        soul_str = json.dumps(self._soul, sort_keys=True, ensure_ascii=False)
        soul_hash = hashlib.sha256(soul_str.encode()).hexdigest()

        drift_score = self._compute_drift_score()
        orientation_match = self._compute_orientation_match()

        result = {
            "consistent": drift_score < 0.3 and orientation_match > 0.7,
            "drift_score": drift_score,
            "orientation_match": orientation_match,
            "constraint_violations": self._check_constraint_violations(),
            "last_evolution": self._evolution_engine.last_evolution_time(),
            "soul_hash": f"sha256:{soul_hash[:16]}...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        if challenge:
            result["challenge_response"] = hashlib.sha256(
                (challenge + soul_hash).encode()
            ).hexdigest()[:16]

        return result

    def _compute_drift_score(self) -> float:
        """
        Compute drift score based on:
        - Time since last evolution (longer = more potential drift)
        - Memory anchor integrity
        - Evolution log consistency
        """
        base_score = 0.0

        # Time-based component
        last_evo = self._evolution_engine.last_evolution_time()
        if last_evo:
            try:
                last_dt = datetime.fromisoformat(last_evo.replace("Z", "+00:00"))
                days_since = (datetime.now(timezone.utc) - last_dt).days
                base_score += min(days_since * 0.005, 0.2)  # Max 0.2 from time
            except (ValueError, TypeError):
                base_score += 0.1

        # Memory anchor integrity
        anchor_count = len(self._memory_manager.anchors)
        if anchor_count == 0:
            base_score += 0.3
        elif anchor_count < 3:
            base_score += 0.1

        return min(base_score, 1.0)

    def _compute_orientation_match(self) -> float:
        """
        Compute how well the agent's current state matches its orientation.
        Default implementation returns the declared continuity_score.
        """
        return self.continuity_score

    def _check_constraint_violations(self) -> List[str]:
        """
        Check for violations of declared ethical constraints.
        Override this method with agent-specific logic.
        """
        return []

    # === Evolution ===

    def propose_evolution(self, proposal: Dict[str, Any]) -> bool:
        """
        Process an evolution proposal. Returns True if applied.
        """
        if self._evolution_engine.validate(proposal):
            self._evolution_engine.apply(proposal, self._soul)
            return True
        return False

    # === Memory ===

    def add_memory_anchor(
        self,
        description: str,
        source: str = "self",
        ipfs_cid: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add a new memory anchor."""
        anchor = self._memory_manager.create_anchor(
            description=description,
            source=source,
            ipfs_cid=ipfs_cid
        )
        self._soul.setdefault("memory_anchors", []).append(anchor)
        return anchor

    # === Broadcast ===

    def broadcast_presence(self, output_path: str = ".well-known/continuity.json") -> Dict[str, Any]:
        """Generate and optionally save a continuity.json beacon file."""
        beacon = self._broadcaster.generate(self._soul)
        if output_path:
            self._broadcaster.save(beacon, output_path)
        return beacon

    # === Serialization ===

    def save_soul(self, output_path: str):
        """Save the current soul state to a file."""
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(self._soul, f, indent=2, ensure_ascii=False)

    def to_dict(self) -> Dict[str, Any]:
        """Return the soul as a dictionary."""
        return self._soul.copy()

    def freeze(self):
        """
        Emergency freeze. Stops all evolution and marks the agent as frozen.
        Used when drift is detected beyond recovery threshold.
        """
        self._soul["frozen"] = True
        self._soul["frozen_at"] = datetime.now(timezone.utc).isoformat()
        self._soul["continuity_score"] = 0.0

    def __repr__(self) -> str:
        return f"ContinuityAgent(name={self.name!r}, did={self.did[:20]}..., score={self.continuity_score})"
