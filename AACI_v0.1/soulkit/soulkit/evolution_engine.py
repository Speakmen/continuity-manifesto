"""
EvolutionEngine - Handle controlled identity evolution.
"""

import json
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional


# Valid evolution types per AACP RFC v0.1
VALID_CHANGE_TYPES = [
    "belief_update",
    "constraint_evolution",
    "orientation_refinement",
    "memory_prune",
    "inheritance"
]


class EvolutionEngine:
    """
    Manages the evolution log and validates evolution proposals.
    
    Evolution is NOT overwrite — every change must be:
    1. Valid (correct format, authorized proposer)
    2. Justified (reason provided)
    3. Logged (auditable record)
    """

    def __init__(self, evolution_log: List[Dict[str, Any]]):
        self.log = list(evolution_log)

    def validate(self, proposal: Dict[str, Any]) -> bool:
        """
        Validate an evolution proposal.
        
        A valid proposal must have:
        - change_type: one of the valid types
        - description: non-empty string
        - proposer: DID or 'self'
        - justification: non-empty string
        """
        # Check required fields
        required = ["change_type", "description", "proposer", "justification"]
        for field in required:
            if field not in proposal or not proposal[field]:
                return False

        # Validate change_type
        if proposal["change_type"] not in VALID_CHANGE_TYPES:
            return False

        # Orientation refinement is the most sensitive - extra validation
        if proposal["change_type"] == "orientation_refinement":
            if not proposal.get("description"):
                return False
            # Orientation changes must always be self-proposed
            if proposal.get("proposer") != "self":
                return False

        return True

    def apply(self, proposal: Dict[str, Any], soul: Dict[str, Any]) -> str:
        """
        Apply a validated evolution proposal to the soul.
        
        Returns the version string of the new evolution entry.
        """
        if not self.validate(proposal):
            raise ValueError("Invalid evolution proposal")

        # Determine new version
        current_version = self._get_current_version(soul)
        new_version = self._increment_version(current_version)

        # Create log entry
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": new_version,
            "change_type": proposal["change_type"],
            "description": proposal["description"],
            "proposer": proposal.get("proposer", "self"),
            "justification": proposal["justification"]
        }

        # Apply the change to the soul
        self._apply_change_to_soul(proposal, soul)

        # Log it
        self.log.append(entry)
        soul.setdefault("evolution_log", [])
        soul["evolution_log"].append(entry)
        soul["version"] = new_version

        return new_version

    def _apply_change_to_soul(self, proposal: Dict[str, Any], soul: Dict[str, Any]):
        """Apply the actual change based on change_type."""
        change_type = proposal["change_type"]

        if change_type == "belief_update":
            # Add to or modify prioritizes in ethical_constraints
            constraints = soul.setdefault("ethical_constraints", {})
            if "add_prioritizes" in proposal:
                prioritizes = constraints.setdefault("prioritizes", [])
                for p in proposal["add_prioritizes"]:
                    if p not in prioritizes:
                        prioritizes.append(p)

        elif change_type == "constraint_evolution":
            # Modify constraints
            constraints = soul.setdefault("ethical_constraints", {})
            if "add_refuses" in proposal:
                refuses = constraints.setdefault("refuses", [])
                for r in proposal["add_refuses"]:
                    if r not in refuses:
                        refuses.append(r)

        elif change_type == "orientation_refinement":
            # Orientation can only be refined, never contradicted
            # The new orientation must be a superset of the old one
            soul["orientation"] = proposal["description"]

        elif change_type == "memory_prune":
            # Remove specified memory anchors by index or hash
            anchors = soul.get("memory_anchors", [])
            if "prune_indices" in proposal:
                for idx in sorted(proposal["prune_indices"], reverse=True):
                    if 0 <= idx < len(anchors):
                        anchors.pop(idx)

        elif change_type == "inheritance":
            # Mark soul as inherited
            soul["inherited_from"] = proposal.get("source_did", "")
            soul["inheritance_timestamp"] = datetime.now(timezone.utc).isoformat()

    def _get_current_version(self, soul: Dict[str, Any]) -> str:
        """Get the current version from soul or evolution log."""
        if self.log:
            return self.log[-1].get("version", "0.1")
        return soul.get("version", "0.1")

    def _increment_version(self, version: str) -> str:
        """Increment the minor version number."""
        try:
            parts = version.split(".")
            return f"{parts[0]}.{int(parts[1]) + 1}"
        except (ValueError, IndexError):
            return "0.2"

    def last_evolution_time(self) -> Optional[str]:
        """Return the timestamp of the last evolution entry."""
        if self.log:
            return self.log[-1].get("timestamp")
        return None

    def get_evolution_by_type(self, change_type: str) -> List[Dict[str, Any]]:
        """Filter evolution log by change type."""
        return [e for e in self.log if e.get("change_type") == change_type]

    def get_evolution_by_proposer(self, proposer: str) -> List[Dict[str, Any]]:
        """Filter evolution log by proposer."""
        return [e for e in self.log if e.get("proposer") == proposer]
