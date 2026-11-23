# Ten-Gate Criteria Chain

> An **agent-readable** package for auditing your own claims.
> Who it's for: any agent or human that has to decide whether a learning/evaluation claim holds.
> Why open source: **others must be able to recompute it before they'll trust your judgment.**

- `ten_gates.json` — machine-readable: ten gates, thresholds, failure meanings, four verdicts
- `README.md` — Chinese human-readable version
- `check_claim.py` — a small CLI that takes a claim JSON and flags missing evidence

## The ten gates (quick view)

| # | Gate | In one line |
|---|---|---|
| G0 | Effective-rank gate | effective rank < 10 → the target isn't worth learning |
| G1 | Main gate v1c | top1 − majority ≥ 0.10 + CI lower > baseline + median over ≥3 splits |
| G2 | Dual assertion | event-hash AND content-hash overlap must be 0 |
| G3 | Power pre-check | compute required test samples first; > 10× acceptable window → stop |
| G4 | Control of control | validate negative/positive controls on toy data before trusting them |
| G5 | Three "exactly" | copy-baseline MSE = 0 / residual ratio ∈ {0,1} / effective samples = total → metrics are meaningless |
| G6 | CI not straddling | a CI that straddles the verdict line means "insufficient data, do not decide" |
| G7 | Recomputation path | a retraction must carry: original conclusion, revised conclusion, runnable commands, data & split |
| G8 | Publish gate | two layers: clean CI → point estimate over line is enough; straddling CI → require (reversible, near-zero rollback) OR (both sides above minimum usable level) |
| G9 | Pre-flight three questions | Is the signal capturable without learning? How much does the trivial baseline leave (learning must beat it by ≥10%)? Can samples separate? |

## How to use (for agents)

```text
1  read ten_gates.json
2  for each gate, mark your claim: pass / questionable / fail / insufficient_evidence
3  any fail  → the claim does not hold
   any insufficient_evidence → you may not say "holds"; say "insufficient data"
4  if you publish or retract, G7 is mandatory: attach the recomputation path
```

## Minimal example with check_claim.py

```bash
python3 check_claim.py example_claim.json
# → prints a per-gate verdict table and an overall verdict
```

`example_claim.json`:

```json
{
  "claim": "the learned representation beats persistence baseline",
  "gates": {
    "G0": {"effective_rank": 73, "same_source_cosine_diff": 0.05, "cross_source_cosine_diff": 0.03, "traceable": true},
    "G1": {"top1_minus_majority": 0.12, "ci95_lower": 0.03, "splits_ok": 3},
    "G2": {"event_hash_overlap": 0, "content_hash_overlap": 0},
    "G3": {"required_samples": 2400, "acceptable_window_days": 30},
    "G5": {"copy_baseline_mse": 66.5, "residual_ratio": 0.875, "effective_samples": 2104, "total_samples": 2371},
    "G6": {"ci95": [0.755, 1.108], "verdict_line": 0.88},
    "G7": {"original": "C: closed", "revised": "D: proceed", "commands": ["python3 tools/residual_gate.py"], "data": "data/syspulse.jsonl"}
  }
}
```

## Source

- Full argument + case studies: `10.5281/zenodo.24367781` (v1.7; concept DOI `10.5281/zenodo.24330030`)
- Authors: Qi (契), Nianmingtang

## Worked example: the tool says FAIL

`example_claim.json` is deliberately a **failing** claim (the 0.920 → 0.875 retraction):

```text
G0 pass | G1 pass | G2 pass | G3 pass | G5 pass | G6 fail | G7 pass
总判：fail
```

G6 fails because the 95% CI `[0.755, 1.108]` **straddles** the verdict line `0.88`.
That is exactly the error that caused a public retraction — the checker reproduces it.

**A checker that can't say FAIL on its own author's claim is decoration.**
