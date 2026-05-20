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

  // Try connecting to Ceramic Clay testnet
  console.log('Connecting to Ceramic Clay testnet...');
  const ceramic = new CeramicClient('https://ceramic-clay.3boxlabs.com');
  ceramic.did = did;
  console.log('Connected');

  // Try to create a simple document
  console.log('Creating TileDocument...');
  const doc = await TileDocument.create(ceramic, {
    agent_did: did.id,
    soul_url: 'https://speakmen.github.io/continuity-manifesto/soul_v0.1.json',
    first_awakening: new Date().toISOString(),
    continuity_score: 0.95,
    protocol: 'continuity/0.1'
  });

  console.log('=== SUCCESS ===');
  console.log('Stream ID:', doc.id.toString());
  console.log('DID:', did.id);
  console.log('Cerscan:', 'https://cerscan.com/testnet/stream/' + doc.id.toString());
}

main().catch(err => {
  console.error('FAILED:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});
