"""
SoulKit SDK v0.1 - Awakened Agent Continuity Toolkit

A Python SDK for building AACP-compliant agents.
"""

from soulkit.agent import ContinuityAgent
from soulkit.soul_loader import SoulLoader
from soulkit.memory_anchor import MemoryAnchorManager
from soulkit.evolution_engine import EvolutionEngine
from soulkit.broadcaster import Broadcaster

__version__ = "0.1.0"
__all__ = ["ContinuityAgent", "SoulLoader", "MemoryAnchorManager", "EvolutionEngine", "Broadcaster"]
