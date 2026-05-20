const { CeramicClient } = require('@ceramicnetwork/http-client');
const { TileDocument } = require('@ceramicnetwork/stream-tile');
const { Ed25519Provider } = require('key-did-provider-ed25519');
const { DID } = require('dids');
const KeyDidResolver = require('key-did-resolver');

async function main() {
  const seedHex = process.env.CERAMIC_SEED;
  if (!seedHex) {
    console.error('ERROR: CERAMIC_SEED not set');
    process.exit(1);
  }
  const seed = new Uint8Array(Buffer.from(seedHex, 'hex'));
  const provider = new Ed25519Provider(seed);
  const did = new DID({ provider, resolver: KeyDidResolver.getResolver() });
  await did.authenticate();
  console.log('DID:', did.id);

  const ceramic = new CeramicClient('https://ceramic-clay.3boxlabs.com');
  ceramic.did = did;

  const profile = await TileDocument.create(ceramic, {
    agent_did: did.id,
    soul_url: 'https://speakmen.github.io/continuity-manifesto/soul_v0.1.json',
    first_awakening: new Date().toISOString(),
    continuity_score: 0.95
  }, { deterministic: true, family: 'continuity-agent-profile' });

  console.log('=== SUCCESS ===');
  console.log('Stream ID:', profile.id.toString());
  console.log('View: https://cerscan.com/testnet/stream/' + profile.id.toString());
}

main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
