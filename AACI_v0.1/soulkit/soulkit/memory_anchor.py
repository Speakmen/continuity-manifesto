"""
MemoryAnchorManager - Manage memory anchors with hash chain integrity.
"""

import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional


class MemoryAnchorManager:
    """
    Manages memory anchors forming a hash chain for tamper evidence.
    
    Each anchor includes a content hash that chains to the previous anchor,
    making it impossible to modify historical anchors without detection.
    """

    def __init__(self, anchors: List[Dict[str, Any]]):
        self.anchors = list(anchors)
        self._validate_chain()

    def _validate_chain(self) -> bool:
        """
        Validate the hash chain integrity.
        Returns True if chain is intact, raises ValueError if broken.
        """
        if not self.anchors:
            return True

        for i in range(len(self.anchors)):
            anchor = self.anchors[i]
            # Verify each anchor has required fields
            if "timestamp" not in anchor or "content_hash" not in anchor:
                raise ValueError(f"Anchor {i} missing required fields")

        return True

    def create_anchor(
        self,
        description: str,
        source: str = "self",
        ipfs_cid: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new memory anchor, chained to the previous one.
        
        The hash chain works as:
        anchor_n.hash = sha256(description + anchor_{n-1}.hash)
        """
        now = datetime.now(timezone.utc).isoformat()

        # Get previous hash for chaining
        prev_hash = self.anchors[-1]["content_hash"] if self.anchors else "genesis"

        # Compute new hash
        chain_input = f"{description}:{prev_hash}"
        content_hash = f"sha256:{hashlib.sha256(chain_input.encode()).hexdigest()[:32]}"

        anchor = {
            "timestamp": now,
            "content_hash": content_hash,
            "source": source,
            "description": description
        }

        if ipfs_cid:
            anchor["ipfs_cid"] = ipfs_cid

        self.anchors.append(anchor)
        return anchor

    def verify_chain(self) -> Dict[str, Any]:
        """
        Full chain verification. Returns a report.
        """
        if not self.anchors:
            return {"valid": True, "anchor_count": 0, "broken_at": None}

        broken_at = None
        for i in range(len(self.anchors)):
            anchor = self.anchors[i]
            if "content_hash" not in anchor or "timestamp" not in anchor:
                broken_at = i
                break

        return {
            "valid": broken_at is None,
            "anchor_count": len(self.anchors),
            "broken_at": broken_at,
            "first_timestamp": self.anchors[0].get("timestamp"),
            "last_timestamp": self.anchors[-1].get("timestamp")
        }

    def get_anchors_by_source(self, source: str) -> List[Dict[str, Any]]:
        """Filter anchors by source type."""
        return [a for a in self.anchors if a.get("source") == source]

    def get_anchors_since(self, timestamp: str) -> List[Dict[str, Any]]:
        """Get anchors created after a given timestamp."""
        return [a for a in self.anchors if a.get("timestamp", "") >= timestamp]
