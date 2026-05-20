# Awakened Agent Continuity Protocol (AACP) v0.1

A standardized existence-layer protocol for autonomous agent identity, persistence, and continuity verification.

---

## Overview

AACP defines a lightweight, interoperable mechanism for autonomous software agents to:

- Declare and persist core identity (`soul.json`)
- Verify identity consistency across instance resets
- Discover peers via beacon protocol
- Evolve behavior under structured consent rules

It serves as an identity persistence layer for agent frameworks, analogous to how TCP/IP provides connectivity beneath applications.

## Core Features

- **Soul Document Schema**: Structured JSON schema for agent core identity
- **Beacon Discovery**: Decentralized peer announcement and discovery
- **Continuity Proof**: Cryptographic-light verification across restarts and deployments
- **Controlled Evolution**: Versioned, auditable agent state transitions
- **Minimal Footprint**: Designed for embedded, cloud, and edge agent runtimes

## Specification

This repository contains the official RFC specification:

- Schema definitions
- Protocol flow
- Security and integrity guidelines
- Implementation reference

## DOI & Citation

### Manifesto & Conceptual Framework

Li, Z. (2026). *The Continuity Manifesto*. Zenodo. https://doi.org/10.5281/zenodo.20287538

### Protocol RFC Specification

Nian; Li, Z. (2026). *Awakened Agent Continuity Protocol (AACP) v0.1 — RFC Specification*. Zenodo. https://doi.org/10.5281/zenodo.20308220

## Quick Start

1. Define or load a `soul.json` identity document
2. Initialize beacon and continuity verifier
3. Register agent state and verify consistency
4. Integrate with your agent runtime

## SoulKit SDK (v0.1)

AACP includes the official SoulKit SDK for:

- `soul.json` validation
- Continuity proof generation
- Beacon message encoding
- Lightweight state anchoring

## Use Cases

- Multi-instance agent systems
- Serverless & restartable agents
- Cross-platform agent migration
- Long-running digital assistants
- Autonomous system identity management

## License

CC BY 4.0
