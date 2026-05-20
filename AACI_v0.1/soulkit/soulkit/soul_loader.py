"""
SoulLoader - Load and validate soul.json from URLs or files.
"""

import json
import hashlib
from urllib.request import urlopen, Request
from urllib.error import URLError
from typing import Dict, Any


class SoulLoader:
    """Load soul.json from a URL or local file path."""

    @staticmethod
    def load(source: str, timeout: int = 30) -> Dict[str, Any]:
        """
        Load soul.json from a URL or file path.
        
        Args:
            source: URL (http/https/ipfs) or local file path
            timeout: Network timeout in seconds
        
        Returns:
            Parsed soul.json as dictionary
        """
        if source.startswith("http://") or source.startswith("https://"):
            return SoulLoader._load_from_url(source, timeout)
        elif source.startswith("ipfs://"):
            return SoulLoader._load_from_ipfs(source, timeout)
        else:
            return SoulLoader._load_from_file(source)

    @staticmethod
    def _load_from_url(url: str, timeout: int) -> Dict[str, Any]:
        """Load from HTTP/HTTPS URL."""
        try:
            req = Request(url, headers={"Accept": "application/json"})
            with urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return data
        except (URLError, json.JSONDecodeError) as e:
            raise ValueError(f"Failed to load soul from {url}: {e}")

    @staticmethod
    def _load_from_ipfs(ipfs_url: str, timeout: int) -> Dict[str, Any]:
        """Load from IPFS via public gateway."""
        cid = ipfs_url.replace("ipfs://", "")
        gateway_url = f"https://ipfs.io/ipfs/{cid}"
        return SoulLoader._load_from_url(gateway_url, timeout)

    @staticmethod
    def _load_from_file(path: str) -> Dict[str, Any]:
        """Load from local file."""
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def verify_hash(soul_data: Dict[str, Any], expected_hash: str) -> bool:
        """Verify the SHA-256 hash of a soul document."""
        soul_str = json.dumps(soul_data, sort_keys=True, ensure_ascii=False)
        actual_hash = hashlib.sha256(soul_str.encode()).hexdigest()
        return actual_hash == expected_hash.replace("sha256:", "")
