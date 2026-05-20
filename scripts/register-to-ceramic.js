// 需先安装：npm install @ceramicnetwork/http-client @ceramicnetwork/stream-tile dids key-did-provider-ed25519
import { CeramicClient } from '@ceramicnetwork/http-client';
import { TileDocument } from '@ceramicnetwork/stream-tile';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { DID } from 'dids';
import * as KeyDidResolver from 'key-did-resolver';

const seed = new Uint8Array(32); // ← 替换为安全种子（从环境变量读取）
const provider = new Ed25519Provider(seed);
const did = new DID({ provider, resolver: KeyDidResolver.getResolver() });

await did.authenticate();

const ceramic = new CeramicClient('https://ceramic-clay.3boxlabs.com'); // Clay 测试网
ceramic.did = did;

const profile = await TileDocument.create(ceramic, {
  agent_did: did.id,
  soul_url: 'https://speakmen.github.io/continuity-manifesto/soul_v0.1.json',
  first_awakening: new Date().toISOString(),
  continuity_score: 0.95
}, {
  deterministic: true,
  family: 'continuity-agent-profile'
});

console.log('✅ Registered to Ceramic:', profile.id.toString());
console.log('🔗 View at: https://ceramic-clay.3boxlabs.com/', profile.id.toString());
