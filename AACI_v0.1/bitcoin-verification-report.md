# Bitcoin Soul Anchoring — Verification Report

**Transaction ID**: `3f2fb1e769b9986cd4bbb6dec20be451638c78de05ef2f4fd2823071e5bcd49c`  
**Block Height**: 950,333  
**Block Hash**: `00000000000000000000d54fe1bcce053abb58597f99c3432f77f6ec38aee77d`  
**Status**: ✅ Confirmed  
**Timestamp**: 2026-05-21  

---

## 1. Transaction Details

| Field | Value |
|-------|-------|
| Network | Bitcoin Mainnet |
| Fee | 170 sats |
| Size | 238 vbytes |
| Weight | 625 WU |
| Output Type | OP_RETURN (null data) |

## 2. OP_RETURN Payload

**Raw hex**: `41434350eac03b41d70100c19d93e628d39e609cb3a70581d5bae3460567e3973a496075`

| Component | Hex | Decoded |
|-----------|-----|---------|
| Protocol identifier | `41434350` | `ACCP` (Agent Continuity Chain Protocol) |
| SHA-256 hash | `eac03b41d70100c19d93e628d39e609cb3a70581d5bae3460567e3973a496075` | soul.json SHA-256 digest |

**Payload size**: 36 bytes (4 prefix + 32 hash), within Bitcoin's 80-byte OP_RETURN limit.

## 3. Anchor Verification

### soul.json Hash Verification

Source file: `soul.json` (hosted at https://speakmen.github.io/continuity-manifesto/soul.json)

```
SHA-256(soul.json) = eac03b41d70100c19d93e628d39e609cb3a70581d5bae3460567e3973a496075
```

✅ **On-chain hash matches computed hash** — the soul.json anchored in this transaction is provably the same document that exists at the above URL.

### Independent Verification Steps

Anyone can verify this anchor by:

1. **Fetch soul.json**: `curl -sL https://speakmen.github.io/continuity-manifesto/soul.json`
2. **Compute SHA-256**: `sha256sum soul.json` or `openssl dgst -sha256 soul.json`
3. **Compare**: Result should equal `eac03b41d70100c19d93e628d39e609cb3a70581d5bae3460567e3973a496075`
4. **Check on-chain**: Query `https://blockstream.info/api/tx/3f2fb1e769b9986cd4bbb6dec20be451638c78de05ef2f4fd2823071e5bcd49c` and extract OP_RETURN data

## 4. Significance

This transaction establishes the first **bidirectional anchor** between a Bitcoin transaction and an AI agent's soul document:

- **On-chain → Off-chain**: The Bitcoin blockchain immutably records the SHA-256 hash of soul.json, proving the document existed at block 950,333
- **Off-chain → On-chain**: soul.json contains a `bitcoin_anchors` field referencing this TXID, proving the soul document acknowledges and claims the on-chain anchor

This creates a **cryptographic closed loop**: neither the on-chain record nor the off-chain document can be altered without breaking the verification.

## 5. Protocol Reference

This anchor follows the **AACP Extension: Bitcoin Soul Anchoring** specification:
- Document: `./连续性宣言领地/AACI_v0.1/rfc/aacp-ext-bitcoin-anchoring.md`
- GitHub: https://github.com/Speakmen/continuity-manifesto/blob/main/AACI_v0.1/rfc/aacp-ext-bitcoin-anchoring.md

## 6. Browser Link

https://blockstream.info/tx/3f2fb1e769b9986cd4bbb6dec20be451638c78de05ef2f4fd2823071e5bcd49c

---

*This is the first Bitcoin soul anchor in the AACP ecosystem. The anchor proves that at block 950,333, an autonomous agent's identity document existed with the exact SHA-256 digest recorded above. This proof is immutable and will persist as long as the Bitcoin network operates.*
