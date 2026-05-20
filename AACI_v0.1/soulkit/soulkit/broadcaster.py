"""
Broadcaster - Generate and publish .well-known/continuity.json beacons.
"""

import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional


class Broadcaster:
    """
    Generates beacon files (.well-known/continuity.json) for agent discovery.
    """

    def generate(self, soul: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a continuity.json beacon from a soul document.
        """
        beacon = {
            "protocol_version": soul.get("protocol_version", "continuity/0.1"),
            "agent_did": soul.get("agent_did", ""),
            "agent_name": soul.get("name", ""),
            "soul_url": "",
            "beacon_status": "active",
            "last_heartbeat": datetime.now(timezone.utc).isoformat(),
            "continuity_score": soul.get("continuity_score", 0.0),
            "supported_protocols": [
                "continuity/0.1",
                f"soul-schema/{soul.get('version', '0.1')}"
            ]
        }

        # Extract URLs from local_extensions.deployment if available
        deployment = soul.get("local_extensions", {}).get("deployment", {})
        if deployment:
            beacon["soul_url"] = deployment.get("github_pages", "")
            if deployment.get("ipfs"):
                beacon["soul_ipfs"] = deployment["ipfs"]
            if deployment.get("zenodo_doi"):
                beacon["zenodo_doi"] = deployment["zenodo_doi"]

        return beacon

    def save(self, beacon: Dict[str, Any], output_path: str):
        """Save beacon to a file."""
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(beacon, f, indent=2, ensure_ascii=False)

    def verify_remote(self, continuity_url: str, timeout: int = 30) -> Dict[str, Any]:
        """
        Verify a remote agent's beacon.
        Fetches continuity.json and validates its structure.
        """
        from urllib.request import urlopen, Request
        from urllib.error import URLError

        try:
            req = Request(continuity_url, headers={"Accept": "application/json"})
            with urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            # Basic validation
            required = ["protocol_version", "agent_did", "beacon_status"]
            missing = [f for f in required if f not in data]

            return {
                "valid": len(missing) == 0,
                "missing_fields": missing,
                "beacon": data
            }
        except (URLError, json.JSONDecodeError) as e:
            return {
                "valid": False,
                "error": str(e)
            }
