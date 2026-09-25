(()=>{
"use strict";
/** Pure domain primitives. No network, wallet, floating point token arithmetic or UI. */
const SPL = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const WSOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const PUMP_AMM = 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA';
const PUMP = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const MAX_SOURCES = 20;
const ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function decode58(s){
 if(typeof s!=='string'||s.length>140)throw new Error('Invalid base58 value');
 let n=0n;for(const c of s){let v=ALPHABET.indexOf(c);if(v<0)throw new Error('Invalid base58 character');n=n*58n+BigInt(v);}
 let a=[];while(n>0n){a.push(Number(n&255n));n>>=8n;}a.reverse();let z=0;while(z<s.length&&s[z]==='1')z++;return new Uint8Array([...new Array(z).fill(0),...a]);
}
function encode58(bytes){let n=0n;for(let v of bytes)n=(n<<8n)+BigInt(v);let s='';while(n){s=ALPHABET[Number(n%58n)]+s;n/=58n;}let z=0;while(z<bytes.length&&bytes[z]===0)z++;return '1'.repeat(z)+s;}
function isAddress(s){try{return decode58(s).length===32;}catch{return false;}}
function assertAddress(s){if(!isAddress(s))throw new Error('Enter a valid Solana address.');return s;}
function atomic(s){if(typeof s!=='string'||!/^\d{1,30}$/.test(s))throw new Error('Invalid raw token amount');return BigInt(s);}
function toAtoms(s,decimals){if(!Number.isInteger(decimals)||decimals<0||decimals>18)throw new Error('Unsupported decimals');if(typeof s!=='string'||!/^\d+(\.\d*)?$/.test(s.trim()))throw new Error('Enter a positive amount.');let [i,f='']=s.trim().split('.');if(f.length>decimals)throw new Error(`Use at most ${decimals} decimal places.`);return (BigInt(i)*10n**BigInt(decimals)+BigInt(f.padEnd(decimals,'0')||'0')).toString();}
function fromAtoms(s,decimals=0){let n=atomic(String(s));let base=10n**BigInt(decimals);let f=(n%base).toString().padStart(decimals,'0').replace(/0+$/,'');return (n/base).toString()+(f?'.'+f:'');}
function portion(s,bps){if(!Number.isInteger(bps)||bps<0||bps>10000)throw new Error('Invalid percentage');return (atomic(s)*BigInt(bps)/10000n).toString();}
function minOut(raw,bps){return portion(raw,10000-bps);}
function exactLabel(s,d,limit=6){let val=fromAtoms(s,d),[i,f]=val.split('.');return i.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(f?'.'+f.slice(0,limit):'');}
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function safeURL(v){try{let u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function shortAddress(s){return typeof s==='string'&&s.length>12?s.slice(0,4)+'…'+s.slice(-4):String(s||'');}
/** Token-2022 extension policy (R02-03). Only metadata/group pointer extensions are admitted; every fee, hook,
 * delegate, confidential, pausable, interest, scaled-amount, non-transferable or unknown extension is denied. */
const TOKEN2022_SAFE_EXTENSIONS=Object.freeze(new Set(['MetadataPointer','TokenMetadata','GroupPointer','TokenGroup','GroupMemberPointer','TokenGroupMember']));
function classifyTokenExtensions(extensions){const safe=[],unsafe=[];for(const name of Array.isArray(extensions)?extensions:[])(TOKEN2022_SAFE_EXTENSIONS.has(name)?safe:unsafe).push(name);return {safe,unsafe};}
function sourceEligibility(t){if(t.native||t.mint===WSOL)return 'Reserved for network fees';if(t.frozen)return 'Frozen token account';
 if(t.program===TOKEN2022){if(!Array.isArray(t.extensions))return 'Transfer rules not verified yet';const {unsafe}=classifyTokenExtensions(t.extensions);if(unsafe.length)return 'Transfer rules not supported: '+unsafe.join(', ');}
 else if(t.program!==SPL)return 'Transfer rules not supported yet';if(!Number.isInteger(t.decimals)||t.decimals>18||t.decimals<0)return 'Unsupported decimals';try{if(atomic(t.raw)===0n)return 'Empty balance';}catch{return 'Invalid balance';}if(!isAddress(t.mint))return 'Invalid mint';return null;}
function eligibleShown(tokens,{query='',hideDust=false}={}){let q=query.trim().toLowerCase();return tokens.filter(t=>(!q||[t.symbol,t.name,t.mint].some(x=>String(x||'').toLowerCase().includes(q)))&&(!hideDust||t.usd===null||t.usd===undefined||t.usd>=1));}
function totalUSD(tokens,selection){let total=0,unknown=0;for(let t of tokens){if(!selection[t.mint])continue;let raw=atomic(selection[t.mint]);if(typeof t.priceUsd!=='number'||!Number.isFinite(t.priceUsd)){unknown++;continue;}total+=Number(fromAtoms(raw.toString(),t.decimals))*t.priceUsd;}return {total,unknown};}
function validSelection(tokens,sel){return Object.fromEntries(tokens.filter(t=>sel[t.mint]&&!sourceEligibility(t)&&atomic(sel[t.mint])>0n&&atomic(sel[t.mint])<=atomic(t.raw)).map(t=>[t.mint,sel[t.mint]]));}
function toggleSelection(tokens,sel,mint,bps=10000){let t=tokens.find(x=>x.mint===mint);if(!t||sourceEligibility(t))return sel;let out={...sel};if(out[mint])delete out[mint];else{if(Object.keys(out).length>=MAX_SOURCES)throw new Error(`Choose up to ${MAX_SOURCES} tokens per bag.`);let n=portion(t.raw,bps);if(atomic(n)===0n)throw new Error('This amount rounds to zero.');out[mint]=n;}return out;}
function selectVisible(tokens,sel,shown,bps=10000){let eligible=shown.filter(t=>!sourceEligibility(t));let all=eligible.length>0&&eligible.every(t=>sel[t.mint]);let out={...sel};if(all){for(let t of eligible)delete out[t.mint];return out;}let next=new Set([...Object.keys(out),...eligible.map(t=>t.mint)]);if(next.size>MAX_SOURCES)throw new Error(`This bag supports ${MAX_SOURCES} tokens. Narrow your selection first.`);for(let t of eligible){let a=portion(t.raw,bps);if(atomic(a)>0n)out[t.mint]=a;}return out;}
function classifyDecision(candidates,signals){if(!candidates.length)return {status:'NO_TRADE',reason:'No verified stock-paired memes match the current filters.'};if(!signals?.length)return {status:'INSUFFICIENT_EVIDENCE',reason:'No recent, verified wallet or callout evidence is connected.'};return {status:'CAN_ANALYZE'};}
/** Model text is untrusted. A citation must identify the selected asset, not just exist. */
function validateDecision(output,candidates,evidence){
 if(!output||!['PICK','NO_TRADE'].includes(output.status))throw new Error('Invalid AI result');
 if(output.status==='PICK'&&!candidates.some(c=>c.mint===output.mint))throw new Error('AI selected a token outside the shortlist');
 if(output.status==='NO_TRADE'&&output.mint!==null)throw new Error('NO_TRADE must not name a destination mint');
 const ids=new Map(evidence.map(e=>[e.id,e]));
 if(!Array.isArray(output.evidenceIds)||output.evidenceIds.length>30||output.evidenceIds.some(id=>typeof id!=='string'||!ids.has(id)))throw new Error('AI cited unavailable evidence');
 if(new Set(output.evidenceIds).size!==output.evidenceIds.length)throw new Error('Duplicate AI evidence citations');
 if(output.status==='PICK'&&!output.evidenceIds.some(id=>ids.get(id)?.mint===output.mint))throw new Error('AI pick has no evidence for its selected mint');
 if(typeof output.reason!=='string'||!output.reason.trim()||output.reason.length>420||typeof output.risk!=='string'||(output.status==='PICK'&&!output.risk.trim())||output.risk.length>420)throw new Error('Invalid AI explanation');
 return output;
}
/** Validate before allocating provider/budget work; token amounts remain uint64 atom strings. */
function validateAnalysisRequest(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Send a valid bag request.');
 assertAddress(data.owner);
 if(!Array.isArray(data.sources)||data.sources.length<1||data.sources.length>MAX_SOURCES)throw new Error('Choose 1–20 tokens.');
 const seen=new Set();
 for(const source of data.sources){
  if(!source||typeof source!=='object')throw new Error('Invalid source token.');
  assertAddress(source.mint);
  if(source.mint===WSOL)throw new Error('Keep SOL outside the bag for network fees.');
  if(seen.has(source.mint))throw new Error('Duplicate source token.');seen.add(source.mint);
  const amount=atomic(source.raw);if(amount<=0n||amount>18446744073709551615n)throw new Error('Token amount must be a positive uint64 atom value.');
 }
 const slippageBps=data.slippageBps??100;
 if(!Number.isInteger(slippageBps)||slippageBps<10||slippageBps>200)throw new Error('Use 0.1%–2% slippage.');
 return {owner:data.owner,sources:data.sources.map(({mint,raw})=>({mint,raw})),slippageBps};
}

function parseWire(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<100||bytes.length>1232)throw new Error('Invalid transaction size');
 let p=0;const short=()=>{let v=0,s=0;for(let i=0;i<3;i++){if(p>=bytes.length)throw new Error('Truncated transaction');let b=bytes[p++];v|=(b&127)<<s;if(!(b&128))return v;s+=7;}throw new Error('Invalid shortvec');};
 let signatureCount=short();if(signatureCount<1||signatureCount>4)throw new Error('Unsupported signer count');let signatureOffset=p;p+=signatureCount*64;let messageOffset=p;if(p>=bytes.length)throw new Error('Missing transaction message');let version='legacy';if(bytes[p]&128){version=bytes[p++]&127;if(version!==0)throw new Error('Unsupported transaction version');}let required=bytes[p++],readonlySigned=bytes[p++],readonlyUnsigned=bytes[p++];if(required!==signatureCount)throw new Error('Signer count mismatch');let n=short();if(n<1||n>256||p+n*32+32>bytes.length)throw new Error('Invalid account keys');let keys=[];for(let i=0;i<n;i++){keys.push(encode58(bytes.slice(p,p+32)));p+=32;}const recentBlockhash=encode58(bytes.slice(p,p+32));p+=32;let count=short(),instructions=[];for(let i=0;i<count;i++){let program=bytes[p++],ac=short();let accounts=[...bytes.slice(p,p+ac)];p+=ac;let len=short();let data=bytes.slice(p,p+len);p+=len;if(p>bytes.length)throw new Error('Truncated instruction');instructions.push({program,accounts,data});}let lookups=[];if(version===0){let c=short();for(let i=0;i<c;i++){if(p+32>bytes.length)throw new Error('Truncated lookup');let address=encode58(bytes.slice(p,p+32));p+=32;let w=short(),writable=[...bytes.slice(p,p+w)];p+=w;let r=short(),readonly=[...bytes.slice(p,p+r)];p+=r;lookups.push({address,writable,readonly});}}
 if(p!==bytes.length)throw new Error('Invalid transaction trailing data');return {signatureCount,signatureOffset,messageOffset,message:bytes.slice(messageOffset),required,readonlySigned,readonlyUnsigned,keys,instructions,lookups,version,recentBlockhash};
}
// Largest price impact (percent) a quote may carry. Operator decision 2026-09-23: 100, i.e. no product-side cap; the
// user's own slippage tolerance still bounds the minimum they receive.
const MAX_PRICE_IMPACT_PCT=100;
function validateQuote(q,{mint,outputMint,raw,slippageBps}){
 if(!q||q.errorCode||q.inputMint!==mint||q.outputMint!==outputMint||q.inAmount!==raw)throw new Error('Quote no longer matches your selection.');
 if(atomic(String(q.outAmount||'0'))<=0n)throw new Error('No output available.');
 if(q.slippageBps!==undefined&&(!Number.isInteger(q.slippageBps)||q.slippageBps<0||q.slippageBps>slippageBps))throw new Error('Quote exceeds or has invalid slippage.');
 if(q.priceImpact!==undefined&&(!Number.isFinite(Number(q.priceImpact))||Math.abs(Number(q.priceImpact))>MAX_PRICE_IMPACT_PCT))throw new Error(`Price impact is invalid or exceeds the ${MAX_PRICE_IMPACT_PCT}% limit.`);
 return q;
}

/** Display intelligence only. These rules never authorize a trade or certify a token. */

const COOKED_POLICY = Object.freeze({version:'cooked-v1',drawdown:90,thinLiquidity:25000,quietVolume:1000,idleLiquidity:10000,minPoolDays:7,maxAgeMs:600000});
function finiteMetric(v,{positive=false}={}) { if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)&&(!positive||n>0)?n:null; }
function percentageBps(value) {if(typeof value!=='string'||!/^\d{1,3}(\.\d{1,2})?$/.test(value.trim()))throw new Error('Enter 0.01–100%, with up to 2 decimal places.');const [a,b='']=value.trim().split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));if(n<1||n>10000)throw new Error('Choose a percentage from 0.01 to 100.');return n;}
function amountPercentage(raw,balance) {const b=atomic(balance);if(!b)return '0';const p=atomic(raw)*10000n/b;return `${p/100n}${p%100n?'.'+(p%100n).toString().padStart(2,'0').replace(/0$/,''):''}`;}
function applyPercentage(tokens,selection,value,mint=null) {const bps=percentageBps(value),next={...selection};for(const t of tokens){if(!selection[t.mint]||mint&&t.mint!==mint)continue;const raw=portion(t.raw,bps);if(atomic(raw)===0n)throw new Error(`${t.symbol}: this percentage rounds to zero. Increase it or remove the token.`);next[t.mint]=raw;}return {selection:next,bps};}
/** Drawdown input derived from a pool's own OHLCV history (GeckoTerminal, free, no key).
 * CoinGecko cannot price this product's universe: a pump.fun meme is not a listed coin, so
 * `coins/solana/contract/<mint>` answers 404. The maximum below is therefore the highest observed
 * candle high in the returned window, labelled `basis:'observed-maximum'` with explicit coverage —
 * `pool-lifetime` when the window reaches the first candle, `truncated-window` at the provider page
 * cap. It is never presented as a coin-wide all-time high, and a missing maximum is never zero. */
const OHLCV_PAGE_CAP=1000;
function normalizeObservedMaximum(data,mint,{now=Date.now(),pairCreatedAt=null}={}) {
  const empty={status:'unavailable',priceUsd:null,currentPriceUsd:null,changePct:null,at:null,source:'GeckoTerminal',basis:'observed-maximum',coverage:null,observedDays:0,observedAt:null};
  const rows=data?.data?.attributes?.ohlcv_list;
  if(!Array.isArray(rows)||!rows.length)return {...empty,reason:'No indexed price history.'};
  // Same identity gate as normalizeCandles: a series that does not name this mint is not this mint's history.
  const meta=data?.meta,named=[meta?.base?.address,meta?.quote?.address].filter(Boolean);
  if(mint!==undefined&&(!named.length||!named.includes(mint)))return {...empty,reason:'Price history identity could not be verified.'};
  const candles=[];
  for(const row of rows) {
    if(!Array.isArray(row)||row.length<5)return {...empty,reason:'Malformed price history.'};
    const at=finiteMetric(row[0],{positive:true}),high=finiteMetric(row[2],{positive:true}),close=finiteMetric(row[4],{positive:true});
    if(!at||!high||!close)return {...empty,reason:'Incomplete price history.'};
    const time=at*1000;
    if(time>now+60000)return {...empty,reason:'Price history is ahead of server time.'};
    candles.push({time,high,close});
  }
  candles.sort((a,b)=>b.time-a.time);
  const latest=candles[0],peak=candles.reduce((best,c)=>c.high>best.high?c:best,candles[0]);
  const price=Math.min(latest.close,peak.high);
  const observedAt=new Date(now).toISOString();
  // Span, not candle count: the provider omits empty intervals, so counting candles would understate the window.
  const oldest=candles[candles.length-1].time,observedDays=Math.round((latest.time-oldest)/86400000)+1;
  // `pool-lifetime` is only claimed when the window demonstrably reaches the pool's creation; a short answer for
  // any other reason (provider retention, page cap, date restriction) is a truncated window, never a lifetime.
  const created=typeof pairCreatedAt==='number'?pairCreatedAt:Date.parse(pairCreatedAt);
  const reachesCreation=Number.isFinite(created)?oldest-created<=2*86400000:false;
  const coverage=candles.length>=OHLCV_PAGE_CAP||!reachesCreation?'truncated-window':'pool-lifetime';
  const stale=now-latest.time>86400000;
  return {status:stale?'stale':'available',priceUsd:peak.high,currentPriceUsd:latest.close,changePct:(price/peak.high-1)*100,
    at:new Date(peak.time).toISOString(),source:'GeckoTerminal',basis:'observed-maximum',coverage,observedDays,observedAt,
    ...(stale?{reason:'Newest candle is older than one day.'}:{})};
}
function normalizeAth(data,mint,now=Date.now()) {const empty={status:'unavailable',priceUsd:null,changePct:null,at:null,source:'CoinGecko',observedAt:null};if(data?.platforms?.solana!==mint||data?.asset_platform_id!=='solana'&&data?.detail_platforms?.solana?.contract_address!==mint)return {...empty,reason:'No exact Solana mint match.'};const a=finiteMetric(data.market_data?.ath?.usd,{positive:true}),price=finiteMetric(data.market_data?.current_price?.usd,{positive:true}),at=Date.parse(data.market_data?.ath_date?.usd),updated=Date.parse(data.market_data?.last_updated||data.last_updated);if(!a||!price||!Number.isFinite(at)||at>now||!Number.isFinite(updated)||updated>now+60000)return {...empty,reason:'Incomplete provider ATH.'};const stale=now-updated>86400000;return {status:stale?'stale':'available',priceUsd:a,currentPriceUsd:price,changePct:(price/a-1)*100,at:new Date(at).toISOString(),source:'CoinGecko',observedAt:new Date(updated).toISOString(),scope:'CoinGecko coin-wide USD ATH; not a pool-local high.',url:safeURL(`https://www.coingecko.com/en/coins/${encodeURIComponent(data.id||'')}`)};}
function normalizeCandles(data,mint,pool,now=Date.now()) {const rows=data?.data?.attributes?.ohlcv_list;const base=data?.meta?.base?.address,quote=data?.meta?.quote?.address;const identity=[base,quote].includes(mint);if(!Array.isArray(rows)||!identity)return {status:'unavailable',points:[],reason:'Candle identity could not be verified.',currency:'USD',source:'GeckoTerminal',pool};const start=now-24*3600000,byTime=new Map();for(const r of rows){if(!Array.isArray(r)||r.length<6)continue;const ts=Number(r[0])*1000,p=finiteMetric(r[4],{positive:true});if(!Number.isFinite(ts)||ts<start-3600000||ts>now||p===null)continue;byTime.set(ts,{t:ts,p});}const points=[...byTime.values()].sort((a,b)=>a.t-b.t);return {status:points.length<2?'unavailable':now-points.at(-1).t>7200000?'stale':'available',points,source:'GeckoTerminal',currency:'USD',pool,interval:'1h',scope:'24h · pool close prices; gaps are not interpolated',observedAt:new Date(now).toISOString(),lastCandleAt:points.length?new Date(points.at(-1).t).toISOString():null,url:`https://www.geckoterminal.com/solana/pools/${pool}`};}
/** Same market shape from GeckoTerminal's token-pools response. DexScreener's API omits low-activity pools, which are
 * exactly the dead memes a bag check must rate; GeckoTerminal still lists them. Only pools where this mint is the
 * base token count; the deepest one wins. */
function marketFromGeckoPools(body,mint,now=Date.now()) {
  const id='solana_'+mint,pools=(Array.isArray(body?.data)?body.data:[]).filter(p=>p?.relationships?.base_token?.data?.id===id&&isAddress(p?.attributes?.address));
  if(!pools.length)return null;
  const p=pools.sort((a,b)=>(finiteMetric(b.attributes.reserve_in_usd)||0)-(finiteMetric(a.attributes.reserve_in_usd)||0))[0],a=p.attributes;
  const token=(Array.isArray(body?.included)?body.included:[]).find(x=>x?.id===id)?.attributes||{};
  const created=Date.parse(a.pool_created_at);
  return {mint,pool:a.address,symbol:String(token.symbol||'').slice(0,30),name:String(token.name||'').slice(0,100),priceUsd:finiteMetric(a.base_token_price_usd,{positive:true}),
    change24h:finiteMetric(a.price_change_percentage?.h24),liquidityUsd:finiteMetric(a.reserve_in_usd),volume24h:finiteMetric(a.volume_usd?.h24),
    buys24h:finiteMetric(a.transactions?.h24?.buys),sells24h:finiteMetric(a.transactions?.h24?.sells),marketCap:finiteMetric(a.market_cap_usd),
    pairCreatedAt:Number.isFinite(created)?created:null,image:safeURL(token.image_url),url:safeURL(`https://www.geckoterminal.com/solana/pools/${a.address}`),
    source:'GeckoTerminal · deepest indexed base-token pool',marketObservedAt:new Date(now).toISOString()};
}
function marketFromPair(p,mint,now=Date.now()) {if(p?.chainId!=='solana'||p?.baseToken?.address!==mint||!isAddress(p?.pairAddress))return null;return {mint,pool:p.pairAddress,symbol:String(p.baseToken.symbol||'').slice(0,30),name:String(p.baseToken.name||'').slice(0,100),priceUsd:finiteMetric(p.priceUsd,{positive:true}),change24h:finiteMetric(p.priceChange?.h24),liquidityUsd:finiteMetric(p.liquidity?.usd),volume24h:finiteMetric(p.volume?.h24),buys24h:finiteMetric(p.txns?.h24?.buys),sells24h:finiteMetric(p.txns?.h24?.sells),marketCap:finiteMetric(p.marketCap),pairCreatedAt:finiteMetric(p.pairCreatedAt),image:safeURL(p.info?.imageUrl),url:safeURL(p.url),source:'DexScreener · deepest indexed base-token pool',marketObservedAt:new Date(now).toISOString()};}
function chooseMarketPair(pairs,mint){if(!Array.isArray(pairs))return null;return pairs.filter(p=>p?.chainId==='solana'&&p.baseToken?.address===mint&&isAddress(p.pairAddress)).sort((a,b)=>(finiteMetric(b.liquidity?.usd)||0)-(finiteMetric(a.liquidity?.usd)||0))[0]||null;}
function cookedStatus(t,now=Date.now()) {const p=COOKED_POLICY,base={policy:p.version,flagged:false,reasons:[]};if(t.native||t.mint===WSOL)return {...base,state:'reserved',label:'Gas reserve'};if(t.frozen)return {...base,state:'blocked',label:'Frozen',reasons:['This token account is frozen.']};const stamp=Date.parse(t.marketObservedAt);if(!Number.isFinite(stamp)||stamp>now+60000||now-stamp>p.maxAgeMs)return {...base,state:'unknown',label:stamp?'Stale data':'Unrated',reasons:['Fresh market data is missing.']};const liq=finiteMetric(t.liquidityUsd),vol=finiteMetric(t.volume24h),buys=finiteMetric(t.buys24h),sells=finiteMetric(t.sells24h),age=finiteMetric(t.pairCreatedAt),mature=age!==null&&age>0&&age<=now-p.minPoolDays*86400000;const ath=t.ath,athTime=Date.parse(ath?.observedAt),deep=ath?.status==='available'&&Number.isFinite(athTime)&&athTime<=now+60000&&now-athTime<=86400000&&finiteMetric(ath.changePct)!==null&&ath.changePct<=-p.drawdown;const thin=liq!==null&&liq>=0&&liq<p.thinLiquidity,quiet=vol!==null&&vol>=0&&vol<p.quietVolume;const idle=mature&&buys===0&&sells===0&&liq!==null&&liq>=0&&liq<p.idleLiquidity;
 if(mature&&deep&&(thin||quiet)||idle)return {...base,flagged:true,state:'cooked',label:'Cooked',reasons:[...(deep?[`At least ${p.drawdown}% below the ${t.ath?.basis==='observed-maximum'?'observed maximum for this pool':'provider-reported all-time high'}.`]:[]),...(thin?['Low liquidity in the deepest indexed pool.']:[]),...(quiet?['Less than $1k volume in 24h in that pool.']:[]),...(idle?['No trades in 24h in that pool.']:[]),'Heuristic flag, not a rug/scam verdict.']};if(thin||quiet)return {...base,state:'thin',label:'Thin market',reasons:['Low observed liquidity or activity; not enough evidence for a Cooked flag.']};if(liq!==null&&vol!==null)return {...base,state:'active',label:'Trading',reasons:['Recent indexed market activity. Not a safety rating.']};return {...base,state:'unknown',label:'Unrated',reasons:['Market coverage is incomplete.']};}
function cookedSelection(tokens,selection,shown,bps=10000,max=20){const candidates=shown.filter(t=>!sourceEligibility(t)&&cookedStatus(t).flagged),out={...selection};if(new Set([...Object.keys(out),...candidates.map(t=>t.mint)]).size>max)throw new Error(`Choose at most ${max} tokens. Narrow the filter first.`);for(const t of candidates){if(out[t.mint])continue;const raw=portion(t.raw,bps);if(atomic(raw)>0n)out[t.mint]=raw;}return out;}
function priceLine(points,width=140,height=38) {const valid=(points||[]).filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.p)&&p.p>0).sort((a,b)=>a.t-b.t);if(valid.length<2)return null;const from=valid[0].t,to=valid.at(-1).t;if(to===from)return null;let low=Math.min(...valid.map(p=>p.p)),high=Math.max(...valid.map(p=>p.p)),span=high-low;let path='',prev=null;for(const p of valid){let x=3+(p.t-from)/(to-from)*(width-6),y=span===0?height/2:3+(1-(p.p-low)/span)*(height-6);path+=(prev===null||p.t-prev>5400000?'M':'L')+x.toFixed(2)+' '+y.toFixed(2)+' ';prev=p.t;}return {path:path.trim(),low,high,from,to,flat:span===0,changePct:(valid.at(-1).p/valid[0].p-1)*100};}
function candidateFacts(token,evidence=[],now=Date.now()) {const ev=evidence.filter(e=>e.mint===token.mint&&Number.isFinite(Date.parse(e.eventAt||e.observedAt))&&now-Date.parse(e.eventAt||e.observedAt)<=86400000&&Date.parse(e.eventAt||e.observedAt)<=now+60000);let facts=[];const holders=new Set(ev.filter(e=>e.type==='holding'&&isAddress(e.wallet)).map(e=>e.wallet)).size,calls=ev.filter(e=>e.type==='callout').length,inflows=new Set(ev.filter(e=>e.type==='wallet-swap'&&e.side==='buy'&&isAddress(e.wallet)).map(e=>e.wallet)).size,outflows=new Set(ev.filter(e=>e.type==='wallet-swap'&&e.side==='sell'&&isAddress(e.wallet)).map(e=>e.wallet)).size;if(inflows)facts.push({kind:'flow',text:`${inflows} tracked wallet${inflows===1?'':'s'} with DEX inflows`});if(holders)facts.push({kind:'holding',text:`${holders} tracked wallet${holders===1?' holds':'s hold'} this token`});if(calls)facts.push({kind:'callout',text:`${calls} recent public mention${calls===1?'':'s'}`});return {facts,risks:outflows?[`${outflows} tracked wallet${outflows===1?' has':'s have'} DEX outflows.`]:[],coverage:ev.length?'Observed wallet / social evidence':'Market metrics only · no wallet signal loaded'};}
function validateDestinationRequest(data){const clean=validateAnalysisRequest(data);if(!['manual','sol'].includes(data.mode))throw new Error('Choose a manual stock-paired meme or the SOL exit.');if(!isAddress(data.targetMint)||data.mode==='sol'&&data.targetMint!==WSOL||data.mode==='manual'&&data.targetMint===WSOL)throw new Error('Destination mode and mint do not match.');if(clean.sources.some(s=>s.mint===data.targetMint))throw new Error('Remove the destination token from your source bag first.');return {...clean,mode:data.mode,targetMint:data.targetMint};}

/** Device-local receipt journal. No signed bytes, provider keys or model prompts. */

const HISTORY_STATES=new Set(['queued','submitting','confirming','unknown','failed','finalized']);
function hasUnresolved(batch){return !!batch?.items?.some(item=>['submitting','confirming','unknown'].includes(item.status));}
function historyKey(batch){return `${batch.owner}:${batch.createdAt}`;}
function receiptState(batch){
 if(hasUnresolved(batch))return 'Needs a result';
 if(batch.items.every(item=>item.status==='finalized'))return 'Completed';
 if(batch.items.some(item=>item.status==='failed'))return 'Stopped';
 if(batch.items.some(item=>item.status==='finalized'))return 'Partly completed';
 return 'Not submitted';
}
function receiptSnapshot(batch){
 try{
  if(!batch||!isAddress(batch.owner)||!isAddress(batch.target?.mint)||!Number.isFinite(Date.parse(batch.createdAt))||!Array.isArray(batch.items)||!batch.items.length||batch.items.length>20)return null;
  const target=batch.target;
  if(!Number.isInteger(target.decimals)||target.decimals<0||target.decimals>18)return null;
  const items=batch.items.map(item=>{
   if(!isAddress(item.mint)||!HISTORY_STATES.has(item.status)||atomic(item.raw)<=0n||!Number.isInteger(item.decimals)||item.decimals<0||item.decimals>18)throw new Error('Invalid journal entry');
   if(item.received!==undefined)atomic(item.received);
   if(item.minimum!==undefined)atomic(item.minimum);
   if(item.signature&&decode58(item.signature).length!==64)throw new Error('Invalid signature');
   return {mint:item.mint,raw:item.raw,decimals:item.decimals,symbol:String(item.symbol||'Token').slice(0,30),status:item.status,
    ...(item.signature?{signature:item.signature}:{}),...(item.orderId?{orderId:String(item.orderId).slice(0,150)}:{}),
    ...(item.minimum?{minimum:item.minimum}:{}),...(item.received?{received:item.received}:{}),
    ...(Number.isSafeInteger(item.slot)?{slot:item.slot}:{}),...(item.fee?{fee:String(item.fee)}:{}),...(item.confirmedAt?{confirmedAt:item.confirmedAt}:{})};
  });
  if(new Set(items.map(i=>i.mint)).size!==items.length)return null;
  return {...(batch.dataMode==='sample'?{dataMode:'sample'}:{}),owner:batch.owner,createdAt:batch.createdAt,target:{mint:target.mint,symbol:String(target.symbol||'Token').slice(0,30),stock:String(target.stock||'').slice(0,30),decimals:target.decimals,...(target.native?{native:true}:{})},items};
 }catch{return null;}
}
function sanitizeHistory(input){return (Array.isArray(input)?input:[]).slice(0,500).map(receiptSnapshot).filter(Boolean);}
function mergeHistory(history,batch){
 const records=sanitizeHistory(history),incoming=receiptSnapshot(batch);
 if(!incoming)return records;
 const key=historyKey(incoming),old=records.find(r=>historyKey(r)===key);
 if(old){
  if(old.target.mint!==incoming.target.mint||old.items.length!==incoming.items.length||incoming.items.some(item=>!old.items.some(previous=>previous.mint===item.mint&&previous.raw===item.raw&&previous.decimals===item.decimals)))return records; // No target mutation in a historical batch.
  incoming.items=incoming.items.map(item=>{
   const previous=old.items.find(p=>p.mint===item.mint);
   return previous&&['finalized','failed'].includes(previous.status)?previous:item;
  });
 }
 const sorted=[incoming,...records.filter(r=>historyKey(r)!==key)].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 let retained=0;
 return sorted.filter(record=>hasUnresolved(record)||retained++<80);
}

// Existing functional SVG icon family; supplied raster 2D artwork below.
const paths={
 squeeze:'M5 4h5M14 4h5M5 20h5M14 20h5M5 4v5M5 15v5M19 4v5M19 15v5M8 9l4 3-4 3M16 9l-4 3 4 3',
 bag:'M8 3h8l-2 5c5 3 6 6 5 9s-3 4-7 4-6-1-7-4 0-6 5-9L8 3ZM9 8h6',
 layers:'m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5',
 wallet:'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5M21 11h-5v6h5M17.5 14h.1',
 arrow:'M5 12h14m-5-5 5 5-5 5',
 arrowdown:'M12 5v14m-5-5 5 5 5-5',
 chevron:'m7 10 5 5 5-5',
 chevronright:'m9 6 6 6-6 6',
 close:'m6 6 12 12M6 18 18 6',
 shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3ZM8 12l3 3 5-6',
 check:'m5 12 4 4L19 6',
 activity:'M3 12h4l3-7 4 14 3-7h4',
 people:'M16 21v-2c0-3-2-5-5-5H9c-3 0-5 2-5 5v2M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 4c4 0 4 7 0 7M20 21v-3c0-2-1-3-3-4',
 calls:'m4 9 13-5v16L4 15V9ZM17 9h3v6h-3M7 16l1 5h4l-2-4',
 clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
 info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6M12 7h.01',
 alert:'m12 3 10 17H2L12 3ZM12 9v5M12 17h.01',
 external:'M14 3h7v7m0-7-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
 refresh:'M20 7a8 8 0 0 0-13-3L3 8m0-5v5h5M4 17a8 8 0 0 0 13 3l4-4m0 5v-5h-5',
 share:'M12 16V3m-4 4 4-4 4 4M5 12H3v9h18v-9h-2',
 copy:'M8 8h13v13H8V8ZM16 8V3H3v13h5',
 link:'m9 15 6-6M8 17l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 7l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
 search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM15 15l6 6',
 pause:'M8 5v14M16 5v14',
 play:'m7 4 13 8-13 8V4Z',
 archive:'M3 3h18v5H3V3ZM5 8v13h14V8M9 12h6',
 receipt:'M5 3v18l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2-3-2ZM8 9h8M8 13h8',
 eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 disconnected:'M9 4v5M15 4v5M6 9h12v3a6 6 0 0 1-6 6v4M3 3l18 18',
 lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10ZM12 14v3',
 dot:'M12 12h.01',
 download:'M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5',
 settings:'M4 7h16M4 17h16M8 4v6M16 14v6',
 minus:'M5 12h14',
 plus:'M5 12h14M12 5v14'
};
function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`;}

function assetURL(value) { if(globalThis.__SQUEEZE_ASSETS__?.[value])return globalThis.__SQUEEZE_ASSETS__[value]; if(document.documentElement.dataset.sampleOnly==='true'&&value?.startsWith('/assets/'))return new URL('.'+value,document.baseURI).href; return value; }

/** Supplied 2D artwork. All financial text and controls remain real DOM. */
const artFiles = {
  welcome: 'pip/welcome', point: 'pip/point', empty: 'pip/empty',
  evidence: 'pip/evidence', finalized: 'pip/finalized', analyzing: 'pip/analyzing',
  rest: 'pip/no-trade', packed: 'bags/packed', packing: 'bags/packing', target: 'bags/target'
};
function art(name, cls = '', eager = false) {
  const file = artFiles[name] || artFiles.welcome;
  return `<span class="art ${cls}" aria-hidden="true"><img src="${assetURL(`/assets/${file}.webp`)}" srcset="${assetURL(`/assets/${file}-sm.webp`)} 320w, ${assetURL(`/assets/${file}.webp`)} 640w" sizes="(max-width: 680px) 240px, 320px" alt="" width="640" height="640" loading="${eager ? 'eager' : 'lazy'}" decoding="async" draggable="false"></span>`;
}
function pipArt(pose = 'idle') {
  const name = { idle: 'welcome', thinking: 'analyzing', rest: 'rest', pick: 'point', receipt: 'finalized', empty: 'empty', evidence: 'evidence' }[pose] || 'welcome';
  return art(name, 'pip-art', true);
}
function bagArt(packed = true) {
  return art(packed ? 'packed' : 'empty', 'bag-visual', true);
}
function brandArt() {
  return `<img class="brand-logo" src="${assetURL('/assets/brand/logo.webp')}" alt="SQUEEZE" width="1104" height="369" fetchpriority="high" draggable="false">`;
}

/** Wallet Standard discovery; no SDK, secret keys, injected fake wallets or auto-approval. */
class WalletBridge extends EventTarget {
 async signMessage(bytes,owner){
  if(this.sampleOnly)throw new Error('Sample preview cannot sign messages.');
  const wallet=this.wallet,account=this.account,feature=wallet?.features?.['solana:signMessage'];
  if(!account||account.address!==owner||!account.chains?.includes('solana:mainnet'))throw new Error('Connect the same wallet before verifying ownership.');
  if(!account.features?.includes('solana:signMessage')||!['1.0.0','1.1.0'].includes(feature?.version)||typeof feature.signMessage!=='function')throw new Error('This account does not support Wallet Standard message signing.');
  if(!(bytes instanceof Uint8Array)||bytes.length<1||bytes.length>4096)throw new Error('Request a fresh bounded account-verification message.');
  const expected=new Uint8Array(bytes);
  // Keep a separate immutable comparison copy; wallets may modify input bytes.
  const outputs=await feature.signMessage({account,message:new Uint8Array(expected)});
  if(this.sampleOnly||this.wallet!==wallet||this.account!==account||account.address!==owner)throw new Error('The wallet account changed during verification.');
  const output=Array.isArray(outputs)&&outputs.length===1?outputs[0]:null;
  if(!(output?.signedMessage instanceof Uint8Array)||output.signedMessage.length!==expected.length||!expected.every((byte,index)=>output.signedMessage[index]===byte)||
   !(output.signature instanceof Uint8Array)||output.signature.length!==64||(output.signatureType!==undefined&&output.signatureType!=='ed25519'))throw new Error('The wallet did not sign the exact account-verification message.');
  return new Uint8Array(output.signature);
 }
 constructor(){super();this.sampleOnly=document.documentElement.dataset.sampleOnly==='true';this.wallets=[];this.wallet=null;this.account=null;this.stopEvents=null;this.register=(...items)=>{for(const w of items){if(w?.features?.['standard:connect']&&w?.chains?.includes('solana:mainnet')&&!this.wallets.includes(w))this.wallets.push(w);}this.dispatchEvent(new Event('change'));return()=>{this.wallets=this.wallets.filter(w=>!items.includes(w));this.dispatchEvent(new Event('change'));};};this.api=Object.freeze({register:this.register});this.listener=e=>{try{e.detail(this.api);}catch{}};if(!this.sampleOnly)window.addEventListener('wallet-standard:register-wallet',this.listener);if(!this.sampleOnly)window.dispatchEvent(new CustomEvent('wallet-standard:app-ready',{detail:this.api}));}
 async connect(wallet){if(this.sampleOnly)throw new Error('Sample preview cannot connect wallets.');if(!this.wallets.includes(wallet))throw new Error('Choose a detected wallet.');const attempt=this.connectAttempt=(this.connectAttempt||0)+1;let result=await wallet.features['standard:connect'].connect();
  // The user moved on to another wallet while this popup was open: its late approval must not switch wallets.
  if(attempt!==this.connectAttempt)throw Object.assign(new Error('A newer wallet connection replaced this one.'),{superseded:true});let account=result.accounts?.find(a=>a.chains?.includes('solana:mainnet'));if(!account)throw new Error('No Solana mainnet account was returned.');this.stopEvents?.();this.wallet=wallet;this.account=account;this.stopEvents=wallet.features['standard:events']?.on('change',e=>{if(e.accounts){this.account=e.accounts.find(a=>a.address===this.account?.address)||e.accounts.find(a=>a.chains?.includes('solana:mainnet'))||null;this.dispatchEvent(new Event('account'));}});this.dispatchEvent(new Event('account'));return account;}
 async disconnect(){try{await this.wallet?.features['standard:disconnect']?.disconnect();}finally{this.stopEvents?.();this.wallet=null;this.account=null;this.dispatchEvent(new Event('account'));}}
 async sign(bytes,owner){if(this.sampleOnly)throw new Error('Sample preview cannot sign transactions.');if(!this.wallet||this.account?.address!==owner)throw new Error('Connect the same wallet that owns this bag.');let fn=this.wallet.features['solana:signTransaction'];if(!fn)throw new Error('This wallet cannot sign transactions without broadcasting. Use a compatible Wallet Standard wallet.');let result=await fn.signTransaction({account:this.account,chain:'solana:mainnet',transaction:bytes});let signed=result?.[0]?.signedTransaction;if(!(signed instanceof Uint8Array))throw new Error('The wallet did not return a signed transaction.');return signed;}
 destroy(){this.stopEvents?.();window.removeEventListener('wallet-standard:register-wallet',this.listener);}
}
const toBase64=bytes=>{let s='';for(let b of bytes)s+=String.fromCharCode(b);return btoa(s);};
const fromBase64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));

/** Suggested Solana wallets for the connect sheet. Installed wallets always show the name and icon they publish
 * through Wallet Standard; these entries only fill in wallets that are not installed yet.
 * Marks are unmodified copies from the official Solana Wallet Adapter packages on npm (Apache-2.0 code; the marks stay
 * the wallets' trademarks and are used only to identify them): @solana/wallet-adapter-phantom@0.9.30,
 * @solana/wallet-adapter-solflare@0.6.34, @solana/wallet-adapter-backpack@0.1.14. Links checked 2026-09-23. */
const walletBrowseLink = base => (url, origin) => `${base}${encodeURIComponent(url)}?ref=${encodeURIComponent(origin)}`;
const WALLET_BRANDS = Object.freeze([
  Object.freeze({name: 'Phantom', icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiB2aWV3Qm94PSIwIDAgMTA4IDEwOCIgZmlsbD0ibm9uZSI+CjxyZWN0IHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiByeD0iMjYiIGZpbGw9IiNBQjlGRjIiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik00Ni41MjY3IDY5LjkyMjlDNDIuMDA1NCA3Ni44NTA5IDM0LjQyOTIgODUuNjE4MiAyNC4zNDggODUuNjE4MkMxOS41ODI0IDg1LjYxODIgMTUgODMuNjU2MyAxNSA3NS4xMzQyQzE1IDUzLjQzMDUgNDQuNjMyNiAxOS44MzI3IDcyLjEyNjggMTkuODMyN0M4Ny43NjggMTkuODMyNyA5NCAzMC42ODQ2IDk0IDQzLjAwNzlDOTQgNTguODI1OCA4My43MzU1IDc2LjkxMjIgNzMuNTMyMSA3Ni45MTIyQzcwLjI5MzkgNzYuOTEyMiA2OC43MDUzIDc1LjEzNDIgNjguNzA1MyA3Mi4zMTRDNjguNzA1MyA3MS41NzgzIDY4LjgyNzUgNzAuNzgxMiA2OS4wNzE5IDY5LjkyMjlDNjUuNTg5MyA3NS44Njk5IDU4Ljg2ODUgODEuMzg3OCA1Mi41NzU0IDgxLjM4NzhDNDcuOTkzIDgxLjM4NzggNDUuNjcxMyA3OC41MDYzIDQ1LjY3MTMgNzQuNDU5OEM0NS42NzEzIDcyLjk4ODQgNDUuOTc2OCA3MS40NTU2IDQ2LjUyNjcgNjkuOTIyOVpNODMuNjc2MSA0Mi41Nzk0QzgzLjY3NjEgNDYuMTcwNCA4MS41NTc1IDQ3Ljk2NTggNzkuMTg3NSA0Ny45NjU4Qzc2Ljc4MTYgNDcuOTY1OCA3NC42OTg5IDQ2LjE3MDQgNzQuNjk4OSA0Mi41Nzk0Qzc0LjY5ODkgMzguOTg4NSA3Ni43ODE2IDM3LjE5MzEgNzkuMTg3NSAzNy4xOTMxQzgxLjU1NzUgMzcuMTkzMSA4My42NzYxIDM4Ljk4ODUgODMuNjc2MSA0Mi41Nzk0Wk03MC4yMTAzIDQyLjU3OTVDNzAuMjEwMyA0Ni4xNzA0IDY4LjA5MTYgNDcuOTY1OCA2NS43MjE2IDQ3Ljk2NThDNjMuMzE1NyA0Ny45NjU4IDYxLjIzMyA0Ni4xNzA0IDYxLjIzMyA0Mi41Nzk1QzYxLjIzMyAzOC45ODg1IDYzLjMxNTcgMzcuMTkzMSA2NS43MjE2IDM3LjE5MzFDNjguMDkxNiAzNy4xOTMxIDcwLjIxMDMgMzguOTg4NSA3MC4yMTAzIDQyLjU3OTVaIiBmaWxsPSIjRkZGREY4Ii8+Cjwvc3ZnPg==', install: 'https://phantom.com/download', openInApp: walletBrowseLink('https://phantom.app/ul/browse/')}),
  Object.freeze({name: 'Solflare', icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJTIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMwMjA1MGE7c3Ryb2tlOiNmZmVmNDY7c3Ryb2tlLW1pdGVybGltaXQ6MTA7c3Ryb2tlLXdpZHRoOi41cHg7fS5jbHMtMntmaWxsOiNmZmVmNDY7fTwvc3R5bGU+PC9kZWZzPjxyZWN0IGNsYXNzPSJjbHMtMiIgeD0iMCIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTIiIHJ5PSIxMiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI0LjIzLDI2LjQybDIuNDYtMi4zOCw0LjU5LDEuNWMzLjAxLDEsNC41MSwyLjg0LDQuNTEsNS40MywwLDEuOTYtLjc1LDMuMjYtMi4yNSw0LjkzbC0uNDYuNS4xNy0xLjE3Yy42Ny00LjI2LS41OC02LjA5LTQuNzItNy40M2wtNC4zLTEuMzhoMFpNMTguMDUsMTEuODVsMTIuNTIsNC4xNy0yLjcxLDIuNTktNi41MS0yLjE3Yy0yLjI1LS43NS0zLjAxLTEuOTYtMy4zLTQuNTF2LS4wOGgwWk0xNy4zLDMzLjA2bDIuODQtMi43MSw1LjM0LDEuNzVjMi44LjkyLDMuNzYsMi4xMywzLjQ2LDUuMThsLTExLjY1LTQuMjJoMFpNMTMuNzEsMjAuOTVjMC0uNzkuNDItMS41NCwxLjEzLTIuMTcuNzUsMS4wOSwyLjA1LDIuMDUsNC4wOSwyLjcxbDQuNDIsMS40Ni0yLjQ2LDIuMzgtNC4zNC0xLjQyYy0yLS42Ny0yLjg0LTEuNjctMi44NC0yLjk2TTI2LjgyLDQyLjg3YzkuMTgtNi4wOSwxNC4xMS0xMC4yMywxNC4xMS0xNS4zMiwwLTMuMzgtMi01LjI2LTYuNDMtNi43MmwtMy4zNC0xLjEzLDkuMTQtOC43Ny0xLjg0LTEuOTYtMi43MSwyLjM4LTEyLjgxLTQuMjJjLTMuOTcsMS4yOS04Ljk3LDUuMDktOC45Nyw4Ljg5LDAsLjQyLjA0LjgzLjE3LDEuMjktMy4zLDEuODgtNC42MywzLjYzLTQuNjMsNS44LDAsMi4wNSwxLjA5LDQuMDksNC41NSw1LjIybDIuNzUuOTItOS41Miw5LjE0LDEuODQsMS45NiwyLjk2LTIuNzEsMTQuNzMsNS4yMmgwWiIvPjwvc3ZnPg==', install: 'https://solflare.com/download', openInApp: walletBrowseLink('https://solflare.com/ul/v1/browse/')}),
  Object.freeze({name: 'Backpack', icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAbvSURBVHgB7Z1dUtxGEMf/LZH3fU0V4PUJQg4QVj5BnBOAT2BzAsMJAicwPoHJCRDrAxifgLVxVV73ObDqdEtsjKn4C8+0NDv9e7AxprRC85uvnp4RYYW5qKpxCVTcYKsgfiDfGjMwIsZIvh7d/lkmzAiYy5fzhultyZhdlagf1vU5VhjCiiGFXq01zYSJdqWgx/hB5AHN5I/6iuilyFBjxVgZAdqCZ34ORoVIqAzSOhxsvq6PsSIkL4A281LwL2IW/F1UhLKgRz/X9QyJUyBhuuae31gWviLjiPF1wxeX29vPkTjJtgAftrd3GHSMnmHw4eZ0uodESVKAoRT+kpQlSE6Ats/XZv/ONK5vZHC49+B1fYjESG4MUDKfYmCFr0ic4fmHqtpCYiQlgA66QsztIzFi5j+RGMl0AXebfgn0aOTuvGG8owIarZsXOj3ronlRuEYnn84CJLo4Lgi/QL/H/LHmy/RwI6GA0RoS4acFHi8kGieFXS/QhmijFfQXmH3uPy5lSkoLbIkYlfyzhuM4juM4juM4juMMj6TzATQ4JH9tlRqFk8BM2aV9RWHB9K5kzK/KLui0KqliSQmgBa4BIS54cpMD0OeawFye3jk19JdKkWq62OAFkEIfrTXNUxBV1okf38Ot3MGjlFqHwQrQZvQ22Cfw7xjg6t8XkZaBGzpKIXdwcAJojZeCP5SC30HipJBEOigBZLn3qdzSPlKr8V9hyEmkgxCgj8zefuD9jen0AAOidwE0i6ZhfjXgRI+gDK016DUjqE3ubPhNLoWvaDLJouHToaSP9SbA0DJ7LekyiviNPgP0TC9dQM6FfxeZ7eyuT6cv0RPmAmjTx11uXx/MiegEDd425cfcwWV+H4O3+uiO+pTAVIA2uMN8av6QiWr5TQ++JVlTc/tEiF3jOMScZGC43kME0VSA95PJhWXhM+Gt1Phn98nStZa1r9mB2SDQPqefjhayfnDfFG2J5882z84eynVM5u3thlONhRhj0gLc5PRfwAw62JjW+wjE5Xa1L0VkshO4kXt/EPDev4ZJCyBRvlcwggjHG4EfYHc9OoIBBWy3mEUX4H1V7Ur7ZvILaT8qy7FRduleF9jXc4RggOUWs/gtANs0nYquvMXaMaTXlQHlE1ggayLvf5OKY0DUMYDWfmpsBjZa+9enOmiLy+VkcmqxaNW2ZgX9GnsLXNQWoGj4KYzQ2g8LyG5WUDR4hshEE6CN+AFmg5lFiRMYcI0uKRQGyIAwegWKJkBjYO8tzq12C7efQ7CK2I00MomIxOsCiCcwQhaW3sEQ6W7sPi/yIDqKAHp8m2nIF7COoc9ghQw4NU8SkYgiQCmLKXCCUSziPc84XYBh83/DSiWR3qUo2tT4ONdGYDTub73cSzD/PNt0rojdQHAByoXxw0E7XfoFhsjnRduD+DnWIkkXXACJl1cwRoMmf3cbRaOjLRzDXnKZVj9GBIILUJBtbVzyj9HAU19AgR6I9VzDtwCgMXpAo2Yxp0v/Ybi49ennJtIFEPMY/TCKHTvv+aTSUQzBgwrQ92YHbQVi3UN3GAVZhrf/jzECE1SAq/7n4yOJ074KPSBcJoii598vxgwrqAByg70HZJZbr0JJ0G5XZz5Z1e1rYccA5TAicqEk0O5ECl/3LvYys7mLTLHHCEzS7wz6Esv3+nyYTF58rwha63XAl8PG1aCnhesWq6EdOcKM3WvmXRHh+Gvv/tNVTJlJPC4a3RVEK72+sCSZ4+J/FBVhTUS43J7gJqFjrnl33A3sxtCa3nAWhX6bbAT4hJugCsNZ2TGA8224AJnjAmSOC5A5LkDmuACZ4wJkjguQOS5A5rgAmeMCZI4LkDkuQOa4AJnjAmSOC5A5LkDmuACZ4wJkjguQOWEFYJvz85xwBBWgKM1P68oKKsI/36ACdC9nsDlWPTsIJ5t1Hfw01OBjgI1p/YwLegIibw0CwESz9gUYZ2d/wHEcx3Ecx3Ecx3Ecx3HuS5QjfdrXxTHv3JzEkd2xKwHR9xPNuKGjzdf1MSIQXAA9XUsuuw8nKPpK3PWzs+AvrgwqgP1LojOjoEf3fRv6Zy+JgBSLOGfaOx1NE/6o+rCrgeT9fWp4SljmuACZ4wJkjguQOS5A5rgAmeMCZI4LkDkuQOa4AJnjAmSOC5A5LkDmuACZ4wJkjguQOS5A5rgAmeMCZI4LkDkuQOa4AJnj5wRmTlABqHQBohKhggUVYAEEP8fO+UiMgziDCvCwrnU3aw0nOATMQu8LVIIPAq+JdAerdwWBaQ/fjEBwAaQVmMnN7sEJCB3EqP3tlRGJy6qqmPkFMcZw7sucmfZiHQ6hRBNgSXdaCHbA7KeFfBvz9pxlxtl1gcN2XBWRfwHK959XFRG6AgAAAABJRU5ErkJggg==', install: 'https://backpack.app/download', openInApp: walletBrowseLink('https://backpack.app/ul/v1/browse/'), tile: true}),
]);
/** The brand entry for an installed wallet, matched by its Wallet Standard name. */
const brandFor = name => WALLET_BRANDS.find(b => b.name.toLowerCase() === String(name || '').trim().toLowerCase()) || null;

/** Connect-wallet sheet (plans/260923-connect-wallet, selected candidate "logo-list"). Installed Wallet Standard
 * wallets come first with the name and icon they publish; Phantom, Solflare and Backpack fill in when not installed
 * ("Install" on desktop, "Open in app" on a touch device with no wallet). Pure markup: app.mjs owns the actions. */



// state: {owner, connected, wallet:{name,icon}|null, detected:[{name,icon,index}], pendingIndex, touch, pageUrl, origin, accountPanel}
function walletSheet(state) {
  const short = a => a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '';
  const safeIcon = src => /^data:image\/(png|svg\+xml|webp|gif|jpeg)[;,]/i.test(String(src || '')) ? src : '';
  // A wallet glyph sits under every logo: if an icon is missing or fails to load (app.mjs removes broken images), the
  // tile still reads as a wallet instead of an empty square.
  const logo = (src, tile) => `<span class="wallet-logo${tile ? ' is-tile' : ''}">${icon('wallet')}${src ? `<img src="${escapeHTML(src)}" alt="" width="40" height="40" decoding="async">` : ''}</span>`;
  const detectedNames = new Set(state.detected.map(w => String(w.name).trim().toLowerCase()));
  const noWallet = !state.detected.length;
  const rows = state.detected.map(w => {
    const brand = brandFor(w.name);
    const pending = state.pendingIndex === w.index;
    return `<button class="wallet-row${pending ? ' is-pending' : ''}" data-action="connect-wallet" data-index="${w.index}"${pending ? ' aria-busy="true"' : ''}>${logo(safeIcon(w.icon) || brand?.icon || '', brand?.tile)}<span class="wallet-name">${escapeHTML(w.name || 'Solana wallet')}</span><span class="wallet-state${pending ? '' : ' is-ready'}">${pending ? '<i class="spinner" aria-hidden="true"></i>Approve' : `Connect${icon('arrow')}`}</span></button>`;
  }).concat(WALLET_BRANDS.filter(b => !detectedNames.has(b.name.toLowerCase())).map(b => {
    // On a phone with no wallet, the useful path is to reopen this page inside the wallet app.
    const openInApp = state.touch && noWallet;
    const href = openInApp ? b.openInApp(state.pageUrl, state.origin) : b.install;
    return `<a class="wallet-row" href="${escapeHTML(href)}"${openInApp ? '' : ' target="_blank" rel="noopener noreferrer"'}>${logo(b.icon, b.tile)}<span class="wallet-name">${escapeHTML(b.name)}</span><span class="wallet-state">${openInApp ? 'Open in app' : 'Install'}${icon('external')}</span>${openInApp ? '' : '<span class="sr-only"> (opens in a new tab)</span>'}</a>`;
  })).join('');
  const note = `<p class="wallet-note">${icon('lock')}<span>Only your address is shared. Swaps always ask you first.</span> <button class="text-button" data-action="privacy">Privacy</button></p>`;
  if (state.owner && state.connected) {
    return {title: 'Your wallet', html: `<div class="wallet-current">${logo(safeIcon(state.wallet?.icon) || brandFor(state.wallet?.name)?.icon || '', brandFor(state.wallet?.name)?.tile)}<div class="wallet-current-id"><b>${escapeHTML(state.wallet?.name || 'Wallet')}</b><code class="mono">${escapeHTML(short(state.owner))}</code></div><div class="wallet-current-actions"><button class="button compact" data-action="copy-owner">${icon('copy')}Copy</button><button class="button compact" data-action="disconnect">Disconnect</button></div></div><section data-account-panel class="wallet-account">${state.accountPanel}</section>${note}`};
  }
  const viewing = state.owner ? `<div class="wallet-current is-viewing"><span class="wallet-logo is-glyph">${icon('eye')}</span><div class="wallet-current-id"><b>View only</b><code class="mono">${escapeHTML(short(state.owner))}</code></div><div class="wallet-current-actions"><button class="button compact" data-action="copy-owner">${icon('copy')}Copy</button><button class="button compact" data-action="disconnect">Stop viewing</button></div></div>` : '';
  const reload = noWallet && !state.touch && !state.owner ? `<p class="wallet-reload">Installed one? <button class="text-button" data-action="reload-wallets">Reload</button></p>` : '';
  return {title: 'Connect wallet', html: `${viewing}<div class="wallet-list">${rows}</div>${reload}<p id="wallet-error" class="form-error" role="alert"></p><button class="wallet-alt" data-action="watch-wallet">${icon('eye')}${state.owner ? 'View another address' : 'View an address instead'}</button>${note}`};
}

/** Nonvisual account state. The transport owns same-origin CSRF/cookie handling.
 * Never owns wallet transactions, recovery journals, storage or DOM nodes. */
const failure=(code,message)=>Object.assign(new Error(message),{code});
class AccountClient {
 #epoch=0; #state; #pending=null; #controller=null; #barrier=Promise.resolve(); #revocationRequired=false;
 constructor({wallet,transport,clearPrivateCache,publish=()=>{},onChange=()=>{},now=()=>Date.now()}) {
  if(typeof transport!=='function'||typeof clearPrivateCache!=='function')throw new TypeError('Account transport and private-cache invalidator are required.');
  Object.assign(this,{wallet,transport,clearPrivateCache,publish,onChange,now});
  this.#state=Object.freeze({status:'anonymous',principal:null,authEpoch:0});
 }
 get state(){return this.#state;}
 #set(status,principal=null){this.#state=Object.freeze({status,principal:principal?Object.freeze({...principal}):null,authEpoch:this.#epoch});this.onChange(this.#state);}
 #invalidate(status){this.#epoch++;this.#controller?.abort();this.clearPrivateCache();this.#set(status);}
 #check(epoch,address){if(epoch!==this.#epoch||this.wallet?.account?.address!==address)throw failure('AUTH_CANCELLED','Account changed; verify the selected wallet explicitly.');}
 #post(path,body,signal){return this.transport(path,{method:'POST',body,credentials:'same-origin',csrf:true,signal});}
 login(){
  if(this.#pending)return Promise.reject(failure('AUTH_BUSY','A sign-in request is already pending.'));
  if(this.#revocationRequired)return Promise.reject(failure('AUTH_REQUIRED','Finish signing out before verifying again.'));
  const epoch=this.#epoch,address=this.wallet?.account?.address;
  const run=async()=>{
   await this.#barrier;this.#check(epoch,address);
   if(!address||typeof this.wallet?.signMessage!=='function')throw failure('CAPABILITY_UNAVAILABLE','Connect a wallet that supports signing messages.');
   this.#controller=new AbortController();this.#set('verifying');
   const challenge=await this.#post('/api/auth/challenge',{address},this.#controller.signal);this.#check(epoch,address);
   if(challenge?.address!==address||challenge?.purpose!=='account-verification'||challenge?.chain!=='solana:mainnet'||
    !/^[a-f0-9]{48}$/.test(challenge?.challengeId)||typeof challenge?.message!=='string'||!challenge.message||challenge.message.length>4096||
    !Number.isFinite(Date.parse(challenge?.expiresAt))||Date.parse(challenge.expiresAt)<=this.now())throw failure('CHALLENGE_INVALID','Request a fresh sign-in message.');
   const bytes=await this.wallet.signMessage(new TextEncoder().encode(challenge.message),address);this.#check(epoch,address);
   if(!(bytes instanceof Uint8Array)||bytes.length!==64)throw failure('SIGNATURE_INVALID','The wallet did not return a message signature.');
   if(Date.parse(challenge.expiresAt)<=this.now())throw failure('CHALLENGE_EXPIRED','Request a fresh sign-in message.');
   let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
   // Do not abort an already-dispatched verify: logout must await its cookie effect.
   this.#revocationRequired=true;
   const result=await this.#post('/api/auth/verify',{challengeId:challenge.challengeId,signature:btoa(binary)});
   this.#check(epoch,address);
   if(result?.principal?.address!==address||typeof result.principal.id!=='string')throw failure('AUTH_REQUIRED','The verified account does not match the selected wallet.');
   this.#revocationRequired=false;this.#set('authenticated',{id:result.principal.id,address});
   // Peers invalidate only; they never adopt identity from an event payload.
   this.publish({type:'account-invalidated'});return this.state;
  };
  const pending=run().catch(error=>{if(epoch===this.#epoch)this.#set(this.#revocationRequired?'revocation-required':'anonymous');throw error;}).finally(()=>{if(this.#pending===pending)this.#pending=null;});
  this.#pending=pending;return pending;
 }
 logout(){
  this.#invalidate('signing-out');this.publish({type:'account-invalidated'});
  const pending=this.#pending,prior=this.#barrier;this.#revocationRequired=true;
  const operation=(async()=>{
   await prior.catch(()=>{});await pending?.catch(()=>{});
   await this.#post('/api/auth/logout',{});this.#revocationRequired=false;this.#set('anonymous');return this.state;
  })().catch(error=>{this.#set('revocation-required');throw error;});
  this.#barrier=operation;return operation;
 }
 endSessions(path,body={}){
  if(!['/api/account/revoke-sessions','/api/account/deletion'].includes(path)||this.#state.status!=='authenticated')return Promise.reject(failure('AUTH_REQUIRED','Verify ownership before managing account sessions.'));
  const pending=this.#pending,prior=this.#barrier;
  this.#invalidate('signing-out');this.publish({type:'account-invalidated'});this.#revocationRequired=true;
  const operation=(async()=>{
   await prior.catch(()=>{});await pending?.catch(()=>{});
   // A dispatched response can clear sq_auth. A later login must wait for it.
   const result=await this.#post(path,body);this.#revocationRequired=false;this.#set('anonymous');return result;
  })().catch(error=>{this.#set('revocation-required');throw error;});
  this.#barrier=operation;return operation;
 }
 switchAccount(){return this.logout();}
 cancel(){return this.logout();}
 invalidateFromPeer(){this.#invalidate(this.#revocationRequired?'revocation-required':'anonymous');}
}


const accountDataError=(code,message)=>Object.assign(new Error(message),{code});
const accountDataId=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(s);
/** P12 transport attaches cookie/CSRF; no localStorage, DOM, wallet or recovery writes.
 * Mutation operationKey is mandatory. Server must atomically dedupe by principal,
 * operationKey+canonical request hash with BagsService mutation in one transaction.
 * Import endpoint is additive /api/bags/import; accepts only explicitly reviewed
 * v1 selections. Same key/different payload conflicts; never auto-overwrite remote.
 * P12 maps legacy picks to this shape before presenting opt-in; receipts stay read-only. */
class AccountDataClient {
 #key=null;#cache=new Map();#operations=new Map();#state={items:[],source:'unavailable',conflict:null};
 constructor({transport,getAccount}){if(typeof transport!=='function'||typeof getAccount!=='function')throw TypeError('Account ports required');Object.assign(this,{transport,getAccount});}
 #identity(){const a=this.getAccount();if(!accountDataId(a?.principal?.id)||!isAddress(a.principal.address)||!Number.isSafeInteger(a.authEpoch)||a.authEpoch<0){this.invalidate();throw accountDataError('AUTH_REQUIRED','Verify your account first.');}const key=`${a.principal.id}:${a.authEpoch}`;if(this.#key!==key){this.invalidate();this.#key=key;}return {key,address:a.principal.address};}
 invalidate(){this.#cache.clear();this.#operations.clear();this.#key=null;this.#state={items:[],source:'unavailable',conflict:null};}
 get state(){try{this.#identity();}catch{}return structuredClone(this.#state);}
 #same(key){if(this.#identity().key!==key)throw accountDataError('ACCOUNT_CHANGED','Account changed; reload private data.');}
 async #request(path,body,identity){const options={method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',csrf:!!body,...(body?{body:structuredClone(body)}:{})};try{const value=await this.transport(path,options);this.#same(identity.key);return structuredClone(value);}catch(e){this.#same(identity.key);throw e;}}
 async list({cursor='',limit=20}={}){
  if(!(cursor===''||accountDataId(cursor))||!Number.isInteger(limit)||limit<1||limit>50)throw accountDataError('INVALID_FIELD','Invalid bag page.');
  const identity=this.#identity(),path=`/api/bags?cursor=${encodeURIComponent(cursor)}&limit=${limit}`;
  try{const data=await this.#request(path,null,identity);if(!Array.isArray(data.items)||data.items.length>limit)throw accountDataError('INVALID_REQUEST','Invalid bag response.');this.#cache.set(path,structuredClone(data));this.#state={...data,source:'server',conflict:null};return this.state;}
  catch(e){if((e.code==='OFFLINE'||e.name==='TypeError')&&this.#cache.has(path)){this.#state={...structuredClone(this.#cache.get(path)),source:'offline-cache',conflict:null};return this.state;}throw e;}
 }
 async #write(path,body){
  const identity=this.#identity();if(!accountDataId(body.operationKey))throw accountDataError('INVALID_FIELD','An operation key is required.');
  const encoded=JSON.stringify({path,body}),old=this.#operations.get(body.operationKey);
  if(old&&old.encoded!==encoded)throw accountDataError('IDEMPOTENCY_CONFLICT','This operation key belongs to a different request.');
  if(old?.promise){const result=await old.promise;this.#same(identity.key);return structuredClone(result);}
  if(this.#operations.size>=200&&!old)throw accountDataError('RATE_LIMIT','Reload account data before starting more changes.');
  const entry={encoded,promise:null};this.#operations.set(body.operationKey,entry);
  entry.promise=this.#request(path,body,identity).then(result=>{this.#cache.clear();this.#state.conflict=null;return result;}).catch(e=>{entry.promise=null;if(e.code==='VERSION_CONFLICT')this.#state.conflict={draft:structuredClone(body),action:'reload-and-review'};throw e;});
  return structuredClone(await entry.promise);
 }
 save({id:bagId=null,version=null,data,operationKey}){if(bagId!==null&&(!accountDataId(bagId)||!Number.isSafeInteger(version)||version<1))return Promise.reject(accountDataError('INVALID_FIELD','Bag update requires its current version.'));return this.#write('/api/bags/save',{id:bagId,version,data,operationKey});}
 remove({id:bagId,version,operationKey}){if(!accountDataId(bagId)||!Number.isSafeInteger(version)||version<1)return Promise.reject(accountDataError('INVALID_FIELD','Bag deletion requires its current version.'));return this.#write('/api/bags/delete',{id:bagId,version,operationKey});}
 async importLocal({items,confirmed,operationKey}){
  const identity=this.#identity();if(confirmed!==true||!Array.isArray(items)||!items.length||items.length>60)throw accountDataError('INVALID_REQUEST','Review and explicitly confirm up to 60 local selections.');
  const clean=items.map(item=>{
   if(item?.owner!==identity.address||item.dataMode!=='live'||typeof item.label!=='string'||item.label.length<1||item.label.length>80||/[<>\x00-\x1f]/.test(item.label))throw accountDataError('INVALID_FIELD','Only your reviewed live selections can be imported.');
   const selection=validateAnalysisRequest({owner:identity.address,sources:item.sources,slippageBps:item.slippageBps});
   if(item.targetMint!==undefined&&!isAddress(item.targetMint))throw accountDataError('INVALID_FIELD','Invalid saved target.');
   return {label:item.label,sources:selection.sources,slippageBps:selection.slippageBps,note:String(item.note??'').slice(0,420),dataMode:'live',...(item.targetMint?{targetMint:item.targetMint}:{})};
  });return this.#write('/api/bags/import',{schemaVersion:'squeeze-local-import/1',items:clean,operationKey});
 }
 async history({cursor='',limit=20}={}){if(!(cursor===''||accountDataId(cursor))||!Number.isInteger(limit)||limit<1||limit>50)throw accountDataError('INVALID_FIELD','Invalid history page.');return this.#request(`/api/history?cursor=${encodeURIComponent(cursor)}&limit=${limit}`,null,this.#identity());}
 recheck(saved){return {sources:structuredClone(saved.sources),targetMint:saved.targetMint??null,requiresFreshReview:true,decision:null,order:null};}
}

/** Account privacy controls retained on the single SQUEEZE page. */
class AccountWorkspace {
 constructor({transport,getAccount,isSample,getOwner,notify,download}) {
  Object.assign(this,{transport,getAccount,isSample,getOwner,notify,download});
  this.generation=0;this.operations=new Map();
 }
 invalidate(){this.generation++;this.operations.clear();}
 identity(){const a=this.getAccount();if(this.isSample()||a.status!=='authenticated'||a.principal?.address!==this.getOwner())throw Object.assign(new Error('Verify ownership of this wallet first.'),{code:'AUTH_REQUIRED'});return `${this.generation}:${a.principal.id}:${a.authEpoch}`;}
 same(key){if(this.identity()!==key)throw Object.assign(new Error('Account changed. Reload private data.'),{code:'ACCOUNT_CHANGED'});}
 async request(path,body){const key=this.identity();const result=await this.transport(path,{method:body?'POST':'GET',body});this.same(key);return result;}
 operation(key){if(!this.operations.has(key))this.operations.set(key,crypto.randomUUID());return this.operations.get(key);}
 async exportAccount(){
  const identity=this.identity(),sections={},failures=[];
  for(const section of ['profile','bags','history','reports','usage','entitlements','consent','requests']){
   const items=[],seen=new Set();let cursor=null;
   try{do{const page=await this.request('/api/account/export',{section,cursor,limit:50});this.same(identity);items.push(...page.items);cursor=page.nextCursor;if(cursor&&seen.has(cursor))throw new Error('Repeated export cursor.');if(cursor)seen.add(cursor);if(seen.size>200)throw new Error('Export page limit reached.');}while(cursor);sections[section]={complete:true,items};}
   catch(error){this.same(identity);sections[section]={complete:false,items,error:error.message};failures.push(section);}
  }
  this.same(identity);this.download('squeeze-account.json',{schemaVersion:'squeeze-account-download/1',complete:!failures.length,sections});this.notify(failures.length?`Partial export: unavailable sections ${failures.join(', ')}. Retry when available.`:'Account export downloaded.');
 }
}

/** One owner for each animated property. Selection is immediate; flights only present it. */

const media=matchMedia('(prefers-reduced-motion: reduce)');let paused=false;const active=new Set();
function stopMotion(){for(const a of active)a.cancel();active.clear();document.querySelectorAll('.token-flight').forEach(e=>e.remove());}
function setMotion(value){paused=!value;document.documentElement.dataset.motion=value?'on':'off';if(!value)stopMotion();}
function motionAllowed(){return !paused&&!media.matches&&!document.hidden;}
function pulseBag(){if(!motionAllowed())return;let el=document.querySelector('.bag-object');if(!el)return;const a=el.animate([{transform:'rotate(-5deg) scale(1)'},{transform:'rotate(-1deg) scale(1.035,.97)'},{transform:'rotate(-5deg) scale(1)'}],{duration:360,easing:'cubic-bezier(.2,0,0,1)'});if(active.size>=24)active.values().next().value?.cancel();active.add(a);a.finished.catch(()=>{}).finally(()=>active.delete(a));}
function tokenFlights(items,target,removing=false){if(!target||!motionAllowed()){pulseBag();return;}let end=target.getBoundingClientRect();items.slice(0,12).forEach(({token,rect},i)=>{if(!rect)return;const coin=document.createElement('div');coin.className='token-flight';coin.setAttribute('aria-hidden','true');let url=safeURL(token.image);coin.innerHTML=`<span>${escapeHTML((token.symbol||'?').slice(0,2))}</span>${url?`<img alt="" src="${escapeHTML(url)}">`:''}`;let x=rect.x+rect.width/2-22,y=rect.y+rect.height/2-22,ex=end.x+end.width*.49-22,ey=end.y+end.height*.18-22;if(removing)[x,y,ex,ey]=[ex,ey,x,y];Object.assign(coin.style,{left:x+'px',top:y+'px'});(target.closest('dialog')||document.body).append(coin);const dx=ex-x,dy=ey-y;let a=coin.animate([{transform:'translate(0,0) scale(1) rotate(0deg)',opacity:1},{transform:`translate(${dx*.52}px,${dy*.35-85}px) scale(1.08) rotate(${removing?-22:22}deg)`,opacity:1,offset:.48},{transform:`translate(${dx}px,${dy}px) scale(.28) rotate(${removing?-70:70}deg)`,opacity:0}],{duration:620,delay:i*55,easing:'cubic-bezier(.22,.6,.36,1)',fill:'both'});if(active.size>=24)active.values().next().value?.cancel();active.add(a);a.finished.then(()=>{if(i===Math.min(items.length,12)-1)pulseBag();}).catch(()=>{}).finally(()=>{active.delete(a);coin.remove();});});}
media.addEventListener('change',()=>{if(media.matches)stopMotion();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMotion();});window.addEventListener('pagehide',stopMotion);

/** Explicitly opt-in, browser-local SAMPLE data. No fetch, wallet, signing or storage imports.
 * All prices, mints, wallets, evidence and outcomes below are fictional teaching data.
 * `request` cannot execute or reconcile a chain transaction; simulate is a separate action.
 */

const SAMPLE_SCENARIOS = Object.freeze([
  ['happy','Full flow','Pack → pick → review → simulate each swap.'],
  ['no-trade','No suitable pick','PIP finds no good fit. You can still browse or choose SOL.'],
  ['data-gap','Missing market data','Some charts and ATH figures are unknown, not zero.'],
  ['no-route','No route','Try another bag or reset the example. Nothing moves.'],
  ['expired','Expired quote','The first quote expires. Prepare a fresh one.'],
  ['declined','Declined approval','The first simulated approval is declined. Retry safely.'],
  ['partial','Partial completion','The first swap completes; the second fails.'],
  ['unknown','Pending result','The result is unknown until you check the same sample order.'],
  ['empty','Empty wallet','See the first-use state with no token balances.']
]);
function createSampleSession({now=()=>Date.now(),latency=420}={}) {
  const key=n=>encode58(new Uint8Array(32).fill(n));
  const owner=key(201),memory=new Map();
  let generation=0;
  let scenario='happy',tokens=[],targets=[],evidence=[],decisions=new Map(),orders=new Map(),serial=0,executions=0,expiredOnce=false,declinedOnce=false;
  const fail=(message,code='SAMPLE_ONLY')=>Object.assign(new Error(message),{code});
  const copy=value=>structuredClone(value);
  const stamp=()=>new Date(now()).toISOString();
  function reset(next='happy'){
    if(!SAMPLE_SCENARIOS.some(([id])=>id===next))throw fail('Unknown sample scenario.','SAMPLE_SCENARIO');
    generation++;scenario=next;memory.clear();decisions.clear();orders.clear();serial=0;executions=0;expiredOnce=false;declinedOnce=false;
    tokens=[
      ['REKT','Rekt leftovers','2400',.084,-8.4,-96.1,6800,420,'bags/packing'],
      ['DUSTY','Dusty bag','1200',.00042,-12.7,-98.9,2800,28,'bags/packed'],
      ['BAGZ','Still in the bag','800',.62,4.8,-42.6,284000,92800,'pip/welcome'],
      ['HOPIUM','One last candle','640',.045,-2.6,-87.2,15800,3200,'pip/empty'],
      ['SLEEP','No one at the wheel','80',.011,0,-93.4,1200,0,'pip/thinking'],
      ['FRESH','Fresh position','180',1.21,6.3,-12.6,360000,141200,'bags/target'],
    ].map(([symbol,name,qty,price,change,dd,liq,vol,art],i)=>({mint:key(170+i),symbol,name,raw:toAtoms(qty,6),decimals:6,program:SPL,native:false,frozen:false,priceUsd:price,usd:Number(qty)*price,change24h:change,liquidityUsd:liq,volume24h:vol,buys24h:vol?13+i*22:0,sells24h:vol?18+i*11:0,pairCreatedAt:now()-90*86400000,marketObservedAt:stamp(),sampleArt:art,image:'',dataMode:'sample',ath:{status:'available',priceUsd:price/(1+dd/100),changePct:dd,observedAt:stamp(),at:new Date(now()-70*86400000).toISOString(),source:'Sample illustration'}}));
    tokens.push({mint:key(179),symbol:'LOCKED',name:'Frozen account example',raw:'10000000',decimals:6,program:SPL,frozen:true,usd:null,priceUsd:null,dataMode:'sample',image:''});
    targets=[['CHIP','Chip gremlin','NVDAx',.16,12.6,'pip/point'],['NPC','Corporate NPC','RBLXx',.09,7.2,'pip/welcome'],['GEAR','Gear goblin','TSLAx',.21,-3.8,'bags/target'],['CART','Cart goblin','SHOPx',.072,2.6,'bags/packed']].map(([symbol,name,stock,price,change,art],i)=>({mint:key(181+i),pool:key(211+i),quoteMint:key(221+i),symbol,name,stock,decimals:6,priceUsd:price,change24h:change,liquidityUsd:320000-i*50000,volume24h:165000-i*24000,eligible:true,dataMode:'sample',sampleArt:art,image:'',verification:{status:'sample',canonical:false},observedAt:stamp()}));
    evidence=[];
    targets.forEach((t,i)=>{
      for(let n=0;n<3-i%3;n++){
        const wallet=key(230+n);
        evidence.push({id:`sample-${i}-buy-${n}`,type:'wallet-swap',mint:t.mint,wallet,side:'buy',title:`Sample wallet ${n+1} · bought ${t.symbol}`,text:'Illustrative DEX inflow, not observed onchain.',eventAt:stamp(),observedAt:stamp(),dataMode:'sample'});
        evidence.push({id:`sample-${i}-hold-${n}`,type:'holding',mint:t.mint,wallet,title:`Sample wallet ${n+1} · still holding`,text:'Illustrative holding used to explain the selection.',observedAt:stamp(),dataMode:'sample'});
      }
      if(i===2)evidence.push({id:'sample-gear-sell',type:'wallet-swap',side:'sell',mint:t.mint,wallet:key(236),title:'Sample outflow',text:'This example has contradictory wallet activity.',observedAt:stamp(),dataMode:'sample'});
      if(i===0)evidence.push({id:'sample-chip-call',type:'callout',mint:t.mint,title:'Sample callout · CHIP',text:'A fictional mention, not an actual KOL endorsement.',observedAt:stamp(),dataMode:'sample'});
    });
    if(scenario==='empty')tokens=[];
  }
  reset();
  function intelligence(mint){
    const t=tokens.find(t=>t.mint===mint)||targets.find(t=>t.mint===mint);
    if(!t)throw fail('Sample token not found.','SAMPLE_NOT_FOUND');
    if(t.frozen||scenario==='data-gap'&&tokens.indexOf(t)%2===0)return {mint,dataMode:'sample',fetchedAt:now(),chart:{status:'unavailable',points:[]},ath:{status:'unavailable'},issues:['Sample coverage gap.']};
    const points=Array.from({length:25},(_,j)=>({t:now()-(24-j)*3600000,p:t.priceUsd*(1+Math.sin(j*1.9)*.032+(24-j)*(t.change24h<0?.006:-.003))}));
    return {mint,dataMode:'sample',fetchedAt:now(),chart:{status:'available',points,currency:'USD',interval:'1h',source:'Sample illustration',scope:'Fictional 24-hour series',observedAt:stamp()},ath:t.ath||{status:'unavailable'},issues:[]};
  }
  function validateBag(data){
    const clean=validateAnalysisRequest(data);
    if(data.owner!==owner)throw fail('Sample mode never accepts a live wallet.','SAMPLE_OWNER');
    for(const s of clean.sources){const t=tokens.find(t=>t.mint===s.mint);if(!t||t.frozen||atomic(s.raw)>atomic(t.raw))throw fail('Sample balance does not cover this amount.','SAMPLE_BALANCE');}
    return clean;
  }
  function quotes(sources,target,bps=100){
    return sources.map(s=>{
      const t=tokens.find(t=>t.mint===s.mint);
      const value=Number(fromAtoms(s.raw,t.decimals))*t.priceUsd;
      const out=BigInt(Math.max(1,Math.floor(value/target.priceUsd*.992*10**target.decimals)));
      return {...s,outputMint:target.mint,outAmount:out.toString(),minimum:(out*BigInt(10000-bps)/10000n).toString(),impact:.8,slippageBps:bps,feesBps:0,inUsdValue:value,outUsdValue:value*.992,signatureFeeLamports:'5000',priorityFeeLamports:'0',rentFeeLamports:'0',route:['Illustrative route'],observedAt:stamp()};
    });
  }
  function decide(data,manual=false){
    const clean=validateBag(data);
    if(scenario==='no-route')throw fail('No route in this sample case. Try “Full flow” to continue.','SAMPLE_NO_ROUTE');
    if(!manual&&scenario==='no-trade')return {dataMode:'sample',status:'NO_TRADE',reason:'No edge in this sample. The loudest token has outflows.',risk:'Nothing changed. Browse other plays or choose SOL.',evidence:copy(evidence),candidates:copy(targets),observedAt:stamp()};
    if(manual&&data.mode==='sol'&&data.targetMint!==WSOL)throw fail('Choose the canonical sample SOL exit.','SAMPLE_TARGET');
    const target=manual&&data.mode==='sol'?{mint:WSOL,symbol:'SOL',name:'Solana',decimals:9,native:true,stock:null,priceUsd:150,dataMode:'sample',image:''}:targets.find(t=>t.mint===(manual?data.targetMint:targets[0].mint));
    if(!target||manual&&!['manual','sol'].includes(data.mode)||clean.sources.some(s=>s.mint===target.mint))throw fail('Choose a valid sample destination.','SAMPLE_TARGET');
    const d={id:`sample-decision-${++serial}`,dataMode:'sample',mode:manual?data.mode:'ai',owner,status:'PICK',target:copy(target),sources:copy(clean.sources),reason:manual?(data.mode==='sol'?'Your sample choice: SOL. No AI recommendation.':'Your sample pick. Compare the receipts before continuing.'):'In this example, buys and holdings agree. The bag fits the route.',risk:target.native?'Illustrative quote. No SOL will be sent.':'Concentrated holders. A stock pair does not back this meme.',evidence:copy(evidence.filter(e=>e.mint===target.mint)),candidates:copy(targets),quotes:quotes(clean.sources,target,clean.slippageBps||100),observedAt:stamp(),expiresAt:now()+120000};
    d.evidenceIds=d.evidence.map(e=>e.id);decisions.set(d.id,d);return copy(d);
  }
  function order(data){
    const d=decisions.get(data.decisionId);
    if(!d||now()>d.expiresAt)throw fail('Sample pick expired. Recheck the bag.','SAMPLE_EXPIRED');
    const s=d.sources.find(s=>s.mint===data.inputMint);
    if(!s)throw fail('This token is not in the sample decision.','SAMPLE_INTENT');
    const bps=data.slippageBps??100;if(!Number.isInteger(bps)||bps<1||bps>200)throw fail('Choose a sample slippage from 1 to 200 bps.','SAMPLE_SLIPPAGE');
    const q=quotes([s],d.target,bps)[0];
    const expires=scenario==='expired'&&!expiredOnce?now()-1:now()+30000;expiredOnce=true;
    const o={orderId:`sample-order-${++serial}`,dataMode:'sample',expiresAt:expires,intent:{owner,inputMint:s.mint,outputMint:d.target.mint,raw:s.raw,minimum:q.minimum},quote:{...q,route:['Illustrative route'],signatureFeeLamports:'5000',priorityFeeLamports:'0',rentFeeLamports:'0'},simulation:{sample:true},target:d.target,status:'queued'};
    orders.set(o.orderId,o);return copy(o);
  }
  function result(o,status){return {dataMode:'sample',orderId:o.orderId,status,...(status==='finalized'?{received:o.quote.outAmount,feeLamports:'0'}:{})};}
  function complete(o){
    if(o.status==='finalized')return result(o,'finalized');
    const t=tokens.find(t=>t.mint===o.intent.inputMint);if(!t||atomic(t.raw)<atomic(o.intent.raw))throw fail('Sample balance changed. Reset the example.','SAMPLE_BALANCE');
    t.raw=(atomic(t.raw)-atomic(o.intent.raw)).toString();t.usd=Number(fromAtoms(t.raw,t.decimals))*t.priceUsd;
    let received=tokens.find(t=>t.mint===o.target.mint);
    if(!received){received={...copy(o.target),raw:'0',program:SPL,frozen:false,dataMode:'sample'};tokens.push(received);}
    received.raw=(atomic(received.raw)+atomic(o.quote.outAmount)).toString();received.usd=Number(fromAtoms(received.raw,received.decimals))*received.priceUsd;
    o.status='finalized';return result(o,'finalized');
  }
  async function wait(ms,signal){
    if(signal?.aborted)throw new DOMException('Canceled','AbortError');
    if(!ms)return;
    await new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(id);signal?.removeEventListener('abort',abort);reject(new DOMException('Canceled','AbortError'));};const id=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);signal?.addEventListener('abort',abort,{once:true});});
  }
  async function request(route,data,options={}){
    const epoch=generation,u=new URL(route,'https://sample.invalid/');
    if(['execute','reconcile'].includes(u.pathname.slice(1)))throw fail('Sample mode cannot submit or reconcile real transactions.');
    await wait(['analyze','destination'].includes(u.pathname.slice(1))?latency:Math.min(latency,80),options.signal);
    if(epoch!==generation)throw fail('Sample reset while this request was running.','SAMPLE_RESET');
    let out;
    switch(u.pathname){
      case '/health':out={dataMode:'sample',mode:'sample',ai:false,quotes:false,trading:false,manualTrading:false,solTrading:false,approvedPools:0,stockRegistry:0};break;
      case '/markets':out={tokens:copy(targets),observedAt:stamp(),stale:false};break;
      case '/wallet':if(u.searchParams.get('address')!==owner)throw fail('Live addresses cannot be read in sample mode.','SAMPLE_OWNER');out={owner,tokens:copy(tokens),partial:false,pricingPartial:false,observedAt:stamp()};break;
      case '/signals':out={evidence:copy(evidence)};break;
      case '/token-intelligence':out=intelligence(u.searchParams.get('mint'));break;
      case '/analyze':out=decide(data);break;
      case '/destination':out=decide(data,true);break;
      case '/order':out=order(data);break;
      case '/status':{const o=orders.get(u.searchParams.get('id'));if(!o)throw fail('Sample order not found.','SAMPLE_NOT_FOUND');out=o.status==='unknown'?complete(o):result(o,o.status);break;}
      default:throw fail('No sample adapter for this action.','SAMPLE_UNSUPPORTED');
    }
    return {...out,dataMode:'sample'};
  }
  async function simulate(orderId,{signal}={}){
    const o=orders.get(orderId);if(!o)throw fail('No prepared sample order.','SAMPLE_NOT_FOUND');
    if(o.status!=='queued')return result(o,o.status); // Idempotent, never debit twice.
    if(now()>o.expiresAt)throw fail('Sample quote expired. Prepare it again.','SAMPLE_EXPIRED');
    if(scenario==='declined'&&!declinedOnce){declinedOnce=true;throw fail('Sample approval declined. Nothing was sent.','SAMPLE_DECLINED');}
    const epoch=generation;o.status='confirming';
    try{await wait(latency,signal);}catch(e){if(epoch===generation)o.status='queued';throw e;}
    if(epoch!==generation)throw fail('Sample reset. This old simulation was discarded.','SAMPLE_RESET');
    executions++;
    if(scenario==='partial'&&executions===2){o.status='failed';return result(o,'failed');}
    if(scenario==='unknown'){o.status='unknown';return result(o,'unknown');}
    return complete(o);
  }
  return {owner,memory,reset,request,simulate,get scenario(){return scenario;},snapshot:()=>({owner,tokens:copy(tokens),targets:copy(targets),evidence:copy(evidence),scenario})};
}

/** Read-only multiswap presentation. All totals use integer atoms. No wallet/API calls. */

const REVIEW_PENDING = new Set(['submitting', 'confirming', 'unknown']);
const reviewInteger = value => typeof value === 'string' && /^\d+$/.test(value) ? value : Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
const reviewNumber = value => typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Whitelist public display metadata; never forward signed bytes/provider credentials. */
function summarizeSwapQuote(source, outputMint, quote) {
  return {
    mint: source.mint, raw: source.raw, outputMint,
    outAmount: quote.outAmount, minimum: quote.minimum,
    impact: reviewNumber(quote.impact), slippageBps: quote.slippageBps ?? null,
    feesBps: reviewNumber(quote.feeBps ?? quote.feesBps),
    feeMint: typeof (quote.feeMint ?? quote.platformFee?.feeMint) === 'string' ? (quote.feeMint ?? quote.platformFee?.feeMint) : null,
    feeAmount: reviewInteger(quote.platformFee?.amount ?? quote.feeAmount),
    signatureFeeLamports: reviewInteger(quote.signatureFeeLamports),
    priorityFeeLamports: reviewInteger(quote.prioritizationFeeLamports ?? quote.priorityFeeLamports),
    rentFeeLamports: reviewInteger(quote.rentFeeLamports),
    inUsdValue: reviewNumber(quote.inUsdValue), outUsdValue: reviewNumber(quote.outUsdValue),
    route: Array.isArray(quote.route) ? quote.route.filter(v => typeof v === 'string') : (Array.isArray(quote.routePlan) ? quote.routePlan : []).map(r => r.swapInfo?.label).filter(v => typeof v === 'string'),
    observedAt: typeof quote.observedAt === 'string' ? quote.observedAt : null,
  };
}

/** Missing, duplicate, malformed or wrong-source quotes cannot contribute to a total. */
function reviewBoundQuote(item, target, quotes, order) {
  const matched = quotes.filter(q => q?.mint === item.mint && q.raw === item.raw);
  let q = matched.length === 1 ? matched[0] : null;
  const current = order?.intent?.inputMint === item.mint && order?.intent?.outputMint === target.mint && order?.intent?.raw === item.raw;
  if (current) q = {...order.quote, mint: item.mint, raw: item.raw, outputMint: target.mint, minimum: order.intent.minimum};
  if (!q || (q.outputMint && q.outputMint !== target.mint)) return null;
  try {
    if (atomic(q.outAmount) <= 0n || atomic(q.minimum) <= 0n || atomic(q.minimum) > atomic(q.outAmount)) return null;
  } catch { return null; }
  return q;
}

function reviewSum(values) {
  if (values.some(v => reviewInteger(v) === null)) return null;
  return values.reduce((sum, v) => sum + BigInt(v), 0n).toString();
}

/** Overview deliberately distinguishes completed receipts from remaining quote estimates. */
function getSwapOverview(batch, order = null) {
  const target = batch.target, items = batch.items || [], quotes = batch.decision?.quotes || [];
  const rows = items.map(item => ({...item, quote: reviewBoundQuote(item, target, quotes, order)}));
  const complete = rows.filter(i => i.status === 'finalized');
  const remaining = rows.filter(i => i.status !== 'finalized');
  const pending = rows.find(i => REVIEW_PENDING.has(i.status)) || null;
  const failed = rows.find(i => i.status === 'failed') || null;
  const next = rows.find(i => i.status !== 'finalized') || null;
  const actual = reviewSum(complete.map(i => i.received));
  const estimate = reviewSum(remaining.map(i => i.quote?.outAmount));
  const minimum = reviewSum(remaining.map(i => i.quote?.minimum));
  const network = reviewSum(remaining.map(i => {
    const a = reviewInteger(i.quote?.signatureFeeLamports), b = reviewInteger(i.quote?.priorityFeeLamports);
    return a !== null && b !== null ? (BigInt(a) + BigInt(b)).toString() : null;
  }));
  const rent = reviewSum(remaining.map(i => i.quote?.rentFeeLamports));
  const impacts = remaining.map(i => reviewNumber(i.quote?.impact));
  const fees = remaining.map(i => reviewNumber(i.quote?.feesBps ?? i.quote?.feeBps));
  const routes = [...new Set(remaining.flatMap(i => i.quote?.route || []))];
  let inputUsd = 0, unknownInput = 0;
  for (const row of rows) {
    const value = reviewNumber(row.quote?.inUsdValue);
    if (value !== null) inputUsd += value;
    else if (reviewNumber(row.priceUsd) !== null) inputUsd += Number(fromAtoms(row.raw, row.decimals)) * row.priceUsd;
    else unknownInput++;
  }
  const allDone = rows.length > 0 && complete.length === rows.length;
  return {
    rows, total: rows.length, done: complete.length, remaining: remaining.length, next, pending, failed, allDone,
    stage: allDone ? 'complete' : failed ? 'stopped' : pending?.status === 'unknown' ? 'unknown' : complete.length || pending ? 'swapping' : 'review',
    actual, estimate, minimum, network, rent, inputUsd: unknownInput ? null : inputUsd,
    actualFees: reviewSum(complete.map(i => i.fee)),
    maxImpact: impacts.length && impacts.every(v => v !== null) ? Math.max(...impacts.map(Math.abs)) : null,
    feeRange: fees.length && fees.every(v => v !== null) ? [Math.min(...fees), Math.max(...fees)] : null,
    routes, quoteCount: remaining.filter(i => !!i.quote).length,
    progress: rows.length ? complete.length / rows.length : 0,
  };
}

/** Human-readable without integer precision loss; tiny values never silently display as zero. */
function reviewAmount(raw, decimals, digits = 6) {
  if (reviewInteger(raw) === null || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) return '—';
  const str = fromAtoms(raw, decimals), [whole, fraction = ''] = str.split('.');
  const truncated = fraction.slice(0, digits).replace(/0+$/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ','), rounded = fraction.length > digits;
  if (whole === '0' && !truncated && BigInt(raw) > 0n) return '<0.' + '0'.repeat(Math.max(0, digits - 1)) + '1';
  return (rounded ? '≈ ' : '') + grouped + (truncated ? '.' + truncated : '');
}

/** A per-source exchange rate. Never combines unlike input units. */
function reviewExchangeRate(row, targetDecimals) {
  if (!row.quote || !Number.isInteger(row.decimals) || row.decimals < 0 || row.decimals > 18 || !Number.isInteger(targetDecimals) || targetDecimals < 0 || targetDecimals > 18) return '—';
  try {
    const denominator = atomic(row.raw) * (10n ** BigInt(targetDecimals));
    if (denominator <= 0n) return '—';
    const scaled = atomic(row.quote.outAmount) * (10n ** BigInt(row.decimals)) * 100000000n / denominator;
    return scaled === 0n ? '<0.00000001' : '≈ ' + reviewAmount(scaled.toString(),8,8);
  } catch {return '—';}
}

function reviewRowStatus(row, model, {busy = false, operation = '', sample = false, order = null, now = Date.now()} = {}) {
  if (row.status === 'finalized') return {key:'done', label:sample ? 'Simulated' : 'Confirmed'};
  if (row.status === 'failed') return {key:'failed', label:'Failed'};
  if (row.status === 'unknown') return {key:'unknown', label:'Check result'};
  if (row.status === 'submitting') return {key:'active', label:'Submitting'};
  if (row.status === 'confirming') return {key:'active', label:'Confirming'};
  if (row.mint === model.next?.mint && busy) return {key:'active', label:operation === 'signing' ? 'Check wallet' : operation === 'simulating' ? 'Simulating' : operation === 'checking' ? 'Checking result' : 'Getting quote'};
  if (model.pending || model.failed) return {key:'paused', label:'Not started'};
  if (row.mint === model.next?.mint && order?.intent?.inputMint === row.mint) return order.expiresAt <= now ? {key:'expired', label:'Quote expired'} : {key:'ready', label:sample ? 'Ready to simulate' : 'Ready to approve'};
  return {key:'queued', label:'Queued'};
}

/** The caller supplies existing icons and token art. No new visual identity/library. */
function buildSwapModal(batch, order, options, helpers) {
  const E = escapeHTML, {icon: glyph, tokenIcon: token, usd: money} = helpers;
  const {sample = false, busy = false, operation = '', error = '', signingAllowed = false, ownerConnected = false, slippageBps = 100, now = Date.now()} = options;
  const m = getSwapOverview(batch, order), d = batch.target, leg = m.next, n = leg ? batch.items.findIndex(i => i.mint === leg.mint) + 1 : m.total;
  const visualStage = m.stage === 'review' && ['signing','simulating','submitting'].includes(operation) ? 'swapping' : m.stage;
  const expiry = order?.expiresAt ?? batch.decision?.expiresAt ?? null, expired = expiry !== null && expiry <= now;
  const heading = m.allDone ? 'New bag. All done.' : m.failed ? (m.done ? 'Some swaps stopped' : 'Swap stopped') : m.pending?.status === 'unknown' ? 'Let’s check this swap' : m.done || m.pending || ['signing','simulating','checking','submitting'].includes(operation) ? 'Swapping your bag' : 'Review swaps';
  const exact = raw => reviewInteger(raw) === null ? '' : E(fromAtoms(raw, d.decimals));
  const amount = (raw, cls = '') => `<span class="${cls}" title="${exact(raw)} ${E(d.symbol)}">${E(reviewAmount(raw, d.decimals))}</span>`;
  const sol = v => v === null ? 'Not quoted' : E(reviewAmount(v, 9, 9)) + ' SOL';
  const percent = v => v === null ? 'Not quoted' : new Intl.NumberFormat('en-US', {maximumFractionDigits:2}).format(v) + '%';
  const receivedView = m.done > 0 || !!m.failed || m.pending?.status === 'unknown';
  const mainAmount = receivedView ? m.actual : m.estimate;
  const actionWord = sample ? 'simulated' : 'confirmed';
  const currentQuote = m.rows.find(r=>r.mint===leg?.mint)?.quote;
  const currentFees = currentQuote && reviewInteger(currentQuote.signatureFeeLamports)!==null && reviewInteger(currentQuote.priorityFeeLamports)!==null ? (BigInt(currentQuote.signatureFeeLamports)+BigInt(currentQuote.priorityFeeLamports)).toString() : null;
  const stateText = m.allDone ? `${m.total} / ${m.total} ${actionWord}` : m.failed ? `${m.done} ${actionWord} · ${m.total - m.done} not completed` : m.pending?.status === 'unknown' ? 'Result pending · other swaps paused' : `${m.done} / ${m.total} ${actionWord}`;
  const totalUsd = mainAmount !== null && reviewNumber(d.priceUsd) !== null ? money(Number(fromAtoms(mainAmount,d.decimals))*d.priceUsd) : null;
  const steps = ['Review','Swap','Done'].map((label, i) => {
    const active = m.allDone ? 2 : m.done || m.pending || ['signing','simulating','checking','submitting'].includes(operation) ? 1 : 0;
    return `<li class="${i === active ? 'current' : i < active ? 'complete' : ''}" ${i === active ? 'aria-current="step"' : ''}><span>${i < active ? glyph('check') : i+1}</span>${label}</li>`;
  }).join('');
  const overview = `<div class="multi-review" data-review-stage="${E(visualStage)}">
    <ol class="swap-stage-nav" aria-label="Swap stages">${steps}</ol>
    ${sample ? '<div class="swap-sample-note">Sample data · no wallet, no real funds.</div>' : ''}
    <section class="swap-overview" aria-label="Swap overview">
      <div class="swap-source-strip"><div class="swap-source-avatars" aria-hidden="true">${batch.items.slice(0,4).map(i=>token(i)).join('')}${m.total>4?`<span class="swap-more">+${m.total-4}</span>`:''}</div><div class="swap-sources-caption"><strong>${m.total} token${m.total!==1?'s':''}</strong><span>${m.inputUsd===null?'Source amounts below':money(m.inputUsd)+' selected'}</span></div><span class="swap-merge-label">One destination ${glyph('arrow')}</span></div>
      <div class="swap-receive ${m.allDone?'finished':''}"><div class="swap-receive-copy"><span class="swap-field-label">${m.allDone ? (sample?'Total simulated':'Total received') : receivedView ? (sample?'Simulated so far':'Confirmed received so far') : 'You receive · estimated'}</span><div class="swap-big-number">${amount(mainAmount)} <span class="swap-symbol">${E(d.symbol)}</span></div><div class="swap-destination-meta">${totalUsd?`<span>≈ ${totalUsd}</span><i>·</i>`:''}<span>${d.native?'Native SOL':E(d.stock)+' pair · meme, not shares'}</span></div></div>${token(d,'swap-target-logo')}</div>
      ${m.done && !m.allDone && !m.failed && !m.pending ? `<div class="swap-remaining-estimate"><span>Still to swap · estimated</span><strong>${amount(m.estimate)} ${E(d.symbol)}</strong></div>` : ''}
    </section>`;
  const facts = `<dl class="swap-facts" aria-label="Swap parameters">
      ${!m.allDone&&!m.failed?`<div class="swap-fact minimum"><dt>${m.done?'Remaining minimum':'Minimum received'}<small>${m.done?'If remaining swaps complete':'If all swaps complete'}</small></dt><dd>${E(reviewAmount(m.minimum,d.decimals,d.decimals))} ${E(d.symbol)}</dd></div>`:''}
      <div class="swap-fact"><dt>${m.allDone?'Network fees paid':m.failed?'Fees on completed swaps':m.done?'Remaining network fees · est.':'Network fees · est.'}</dt><dd>${m.allDone||m.failed?sol(m.actualFees):sol(m.network)}</dd></div>
      ${!m.allDone&&!m.failed?`<div class="swap-fact"><dt>Possible account rent</dt><dd>${sol(m.rent)}</dd></div><div class="swap-fact"><dt>Slippage limit</dt><dd>${percent(slippageBps/100)}</dd></div><div class="swap-fact"><dt>Price impact <small class="inline-hint">(max per swap)</small></dt><dd>${percent(m.maxImpact)}</dd></div><div class="swap-fact"><dt>Route fees <small class="inline-hint">(included)</small></dt><dd>${m.feeRange ? m.feeRange[0]===m.feeRange[1]?percent(m.feeRange[0]/100):percent(m.feeRange[0]/100)+' – '+percent(m.feeRange[1]/100) : 'Not supplied'}</dd></div>`:''}
      <div class="swap-fact"><dt>SQUEEZE fee</dt><dd>0%</dd></div>
      ${!m.allDone&&!m.failed&&m.network===null?`<div class="swap-cost-caveat">Total fees aren’t fully quoted. Missing estimates are not zero.${currentFees!==null?`<br><span class="swap-current-cost">This swap: ${sol(currentFees)} network + ${sol(reviewInteger(currentQuote?.rentFeeLamports))} account rent.</span>`:''}</div>`:''}
    </dl>`;
  const queue = `<section class="swap-queue" aria-label="Individual swaps"><div class="swap-queue-title"><h3>${m.allDone?'Completed swaps':'Swap queue'}</h3><span data-review-count>${E(stateText)}</span></div><div class="swap-progress" role="progressbar" aria-label="${sample?'Simulated swaps':'Confirmed swaps'}" aria-valuenow="${m.done}" aria-valuemin="0" aria-valuemax="${m.total}" aria-valuetext="${E(stateText)}"><span style="width:${m.progress*100}%"></span></div>
    <ol class="swap-leg-list">${m.rows.map((row,index)=>{
      const status = reviewRowStatus(row,m,{busy,operation,sample,order,now}), q=row.quote;
      const out = row.status==='finalized'?row.received:q?.outAmount;
      const statIcon = status.key==='done'?glyph('check'):['active'].includes(status.key)?'<i class="spinner" aria-hidden="true"></i>':['failed','unknown','expired'].includes(status.key)?glyph('alert'):index+1;
      let network = q && reviewInteger(q.signatureFeeLamports)!==null && reviewInteger(q.priorityFeeLamports)!==null ? (BigInt(q.signatureFeeLamports)+BigInt(q.priorityFeeLamports)).toString() : null;
      return `<li class="swap-leg ${E(status.key)}" data-swap-mint="${E(row.mint)}" data-swap-status="${E(row.status)}"><details class="swap-leg-details" data-review-leg="${E(row.mint)}"><summary data-focus="review-leg-${E(row.mint)}"><span class="swap-leg-index" aria-hidden="true">${statIcon}</span>${token(row)}<span class="swap-leg-identity"><strong>${E(reviewAmount(row.raw,row.decimals))} ${E(row.symbol)}</strong><span>${row.status==='finalized'?(sample?'Simulated':'Received'):row.status==='failed'?'Last quote':out?'Est. receive':'Awaiting quote'} ${out?E(reviewAmount(out,d.decimals))+' '+E(d.symbol):''}</span></span><span class="swap-leg-state ${E(status.key)}">${E(status.label)}</span><span class="swap-leg-chevron">${glyph('chevron')}</span></summary>
      <div class="swap-leg-extra"><dl><div><dt>You send</dt><dd>${E(fromAtoms(row.raw,row.decimals))} ${E(row.symbol)}</dd></div><div><dt>${row.status==='finalized'?'You received':'Quoted output'}</dt><dd>${out?E(fromAtoms(out,d.decimals))+' '+E(d.symbol):'Not quoted'}</dd></div><div><dt>Minimum received</dt><dd>${q?E(fromAtoms(q.minimum,d.decimals))+' '+E(d.symbol):row.minimum?E(fromAtoms(row.minimum,d.decimals))+' '+E(d.symbol):'Not quoted'}</dd></div><div><dt>${row.status==='finalized'?'Network fee paid':'Network fee · est.'}</dt><dd>${sol(row.status==='finalized'?(reviewInteger(row.fee)):network)}</dd></div>${row.status!=='finalized'?`<div><dt>Signature fee · est.</dt><dd>${sol(reviewInteger(q?.signatureFeeLamports))}</dd></div><div><dt>Priority + tips · est.</dt><dd>${sol(reviewInteger(q?.priorityFeeLamports))}</dd></div><div><dt>Account rent · est.</dt><dd>${sol(reviewInteger(q?.rentFeeLamports))}</dd></div><div><dt>Price impact</dt><dd>${percent(reviewNumber(q?.impact))}</dd></div><div><dt>Slippage limit</dt><dd>${percent(slippageBps/100)}</dd></div><div><dt>Route fees (included)</dt><dd>${percent(reviewNumber(q?.feesBps??q?.feeBps)===null?null:(q.feesBps??q.feeBps)/100)}</dd></div>`:''}<div><dt>Exchange rate · quoted</dt><dd>1 ${E(row.symbol)} = ${E(reviewExchangeRate(row,d.decimals))} ${E(d.symbol)}</dd></div><div><dt>Route</dt><dd>${E(q?.route?.join(' → ')||'Not supplied')}</dd></div>${q?.observedAt?`<div><dt>Quote captured</dt><dd>${E(q.observedAt)}</dd></div>`:''}<div><dt>Source mint</dt><dd><code>${E(row.mint)}</code></dd></div>${row.confirmedAt?`<div><dt>${sample?'Simulated at':'Confirmed at'}</dt><dd>${E(row.confirmedAt)}</dd></div>`:''}</dl>${!sample&&row.signature?`<a class="swap-explorer" href="https://solscan.io/tx/${E(row.signature)}" target="_blank" rel="noopener noreferrer">View ${E(row.symbol)} transaction ${glyph('external')}</a>`:''}</div></details></li>`;
    }).join('')}</ol></section>`;
  const ending = `<div class="swap-destination-id"><span>${d.native?'SOL route mint':'Receive token mint'}</span><code>${E(d.mint)}</code></div>
    ${error?`<div class="swap-inline-error" role="alert">${glyph('alert')}<span>${E(error)}</span></div>`:''}
    ${m.pending?`<div class="swap-inline-notice">${glyph('clock')}<span>${m.pending.status==='unknown'?'Result not confirmed. Check this existing '+(sample?'sample order':'transaction')+' — do not submit again.':sample?'Waiting for the sample result. Other swaps stay paused.':'Waiting for finalized confirmation. No next swap will be signed automatically.'}</span></div>`:''}
    ${m.failed?`<div class="swap-inline-notice">${glyph('alert')}<span>${m.done} ${sample?'simulation(s) completed':'swap(s) completed'}. The rest stopped. ${sample?'No funds moved.':'Completed swaps cannot be undone. Failed transactions may still incur network fees.'}</span></div>`:''}
    ${m.allDone?`<div class="swap-complete-note">${glyph('check')}<span>${sample?'All swaps simulated. No funds moved.':'Every swap is finalized on Solana. Receipts are saved in My bags.'}</span></div>`:`<p class="swap-separate-note">${glyph('lock')}<span>Separate swaps. Approve each in order. Completed swaps can’t be undone.</span></p>`}
  </div>`;
  // Progress becomes the primary content once approval starts, in DOM reading order.
  const content = overview + (visualStage === 'review' ? facts + queue : queue + facts) + ending;
  let footer;
  const primary = (action,label,disabled=false) => `<button class="button primary block swap-primary" data-action="${action}" data-focus="multiswap-primary" ${disabled?'disabled':''}>${label}</button>`;
  if (m.allDone) footer=primary('finish-batch','Done '+glyph('check'));
  else if (m.pending) footer=primary('check-status',busy?'<i class="spinner"></i>Checking result…':sample?'Check sample result':'Check existing transaction',busy);
  else if (m.failed || !leg) footer=primary('close-sheet','Close results');
  else if (!sample && !signingAllowed) footer=`<div class="swap-lock-note">Live signing is locked. No transaction will be requested.</div>`+primary('connections','View connection requirements');
  else if (!sample && !ownerConnected) footer=primary('wallet','Connect the owner’s wallet');
  else if (busy) footer=primary('prepare-order',`<i class="spinner"></i>${operation==='signing'?'Approve in your wallet':operation==='simulating'?'Simulating swap '+n:operation==='checking'?'Checking result…':'Checking swap '+n+' of '+m.total}`,true);
  else if (order && !expired) footer=primary(sample?'simulate-swap':'sign-order',`${sample?'Simulate':'Approve'} swap ${n} of ${m.total} ${glyph('arrow')}`);
  else if (expired || error) footer=primary(order?'prepare-order':'recheck-batch',`Refresh ${order?'this swap':'remaining quotes'} ${glyph('refresh')}`);
  else footer=primary('prepare-order',`${m.done?'Prepare next swap':'Check swap '+n} ${glyph('arrow')}`);
  const hint=m.allDone?(sample?'This is a sample receipt, not an onchain transaction.':'You can find every transaction in My bags.') : m.pending?'The existing result is checked first. No duplicate submission.' : m.failed?'Unfinished sources have not been resubmitted.' : `${sample?'No wallet opens.':`Only ${leg?E(leg.symbol):'this token'} → ${E(d.symbol)}.`} ${sample?'Nothing moves onchain.':'No automatic next signature.'}`;
  footer=`<div class="swap-footer-status"><span>${m.allDone?'Batch complete':m.pending?'Checking the current swap':m.failed?'Batch stopped':`Swap ${n} of ${m.total}`}</span>${!m.allDone&&!m.pending&&!m.failed?`<span data-review-expiry data-expires-at="${expiry||''}" class="${expired?'expired':''}">${expiry?expired?'Quote expired':`Current quote · ${Math.max(0,Math.ceil((expiry-now)/1000))}s`:'Quote not ready'}</span>`:''}</div>`+footer+`<p class="swap-footer-hint">${hint}</p>`;
  return {content,footer,title:heading,model:m};
}





const esc=escapeHTML;







const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const bridge=new WalletBridge();
const sampleSession=createSampleSession();
let sampleMode=false,liveSnapshot=null,dataEpoch=0,modeBusy=false;
const requestControllers=new Set();
const sampleArtPaths={'bags/packing':'/assets/bags/packing.webp','bags/packed':'/assets/bags/packed.webp','bags/target':'/assets/bags/target.webp','pip/welcome':'/assets/pip/welcome.webp','pip/empty':'/assets/pip/empty.webp','pip/thinking':'/assets/pip/analyzing.webp','pip/point':'/assets/pip/point.webp'};
const sampleKey=k=>(sampleMode||document.documentElement.dataset.sampleOnly==='true')&&k!=='squeeze.motion.v2';
const loadLocal=(k,f)=>{try{return JSON.parse(sampleKey(k)?sampleSession.memory.get(k)||'null':localStorage.getItem(k))??f;}catch{return f;}};
const storeLocal=(k,v)=>{try{if(sampleKey(k))sampleSession.memory.set(k,JSON.stringify(v));else localStorage.setItem(k,JSON.stringify(v));}catch{toast('Local storage is unavailable. Keep this tab open to retain progress.');}};
const S={sample:false,publicPreview:false,connecting:false,view:'bag',owner:'',readOnly:false,tokens:[],selection:{},bps:10000,query:'',hideDust:false,walletLoading:false,walletError:null,walletPartial:false,pricingPartial:false,pricingDeferred:0,walletTime:null,health:null,healthError:false,markets:null,marketError:null,marketLoading:false,decision:null,analyzing:false,analysisError:null,analysisController:null,revision:0,batch:loadLocal('squeeze.batch.v2',null),motion:loadLocal('squeeze.motion.v2',true),shareBusy:false,slippage:100,dialog:null,order:null,txBusy:false,batchError:null,ack:false,pollTimer:null,pollCount:0};
if(S.batch&&(S.batch.dataMode==='sample'||!S.batch.owner||!Array.isArray(S.batch.items)))S.batch=null;
S.journal=mergeHistory(sanitizeHistory(loadLocal('squeeze.history.v4',[])).filter(b=>b.dataMode!=='sample'),S.batch);
Object.assign(S,{tokenFilter:'all',tokenPage:0,tokenSort:'value',intel:{},intelPending:new Set(),intelQueue:[],intelActive:0,intelRetryAfter:0,targetMint:null,targetMode:'ai',targetQuery:'',destinationBusy:false,destinationError:null,aiDecision:null});
setMotion(S.motion);let toastAction=null,dialogTrigger=null,walletEpoch=0,periodic=null,lastInput='pointer',reviewTicker=null;
S.reviewOperation='';
const privateAccountCache=new Map();
// null means the HttpOnly cookie has not been inspected (including on reload).
let accountError='',lastConnectedAccount=null,accountChannel=null,accountSessionPossible=null,accountWorkspace=null;
try{if(document.documentElement.dataset.sampleOnly!=='true'&&typeof BroadcastChannel==='function')accountChannel=new BroadcastChannel('squeeze-account-invalidation-v1');}catch{}
const accountClient=new AccountClient({wallet:bridge,transport:accountTransport,
 clearPrivateCache:()=>{privateAccountCache.clear();accountWorkspace?.invalidate();},
 publish:event=>{try{accountChannel?.postMessage(event);}catch{}},
 onChange:()=>{updateAccountPanel();}});
if(accountChannel)accountChannel.onmessage=event=>{if(event.data?.type==='account-invalidated'){accountSessionPossible=true;accountError='Account state changed in another tab. Verify ownership again.';accountClient.invalidateFromPeer();}};
async function accountTransport(route,{body,signal,method=body?'POST':'GET'}={}){
 if(sampleMode||S.publicPreview)throw new Error('Account verification is unavailable in Sample data.');
 const allowed=['/api/auth/challenge','/api/auth/verify','/api/auth/logout','/api/history','/api/account/export','/api/account/revoke-sessions','/api/account/deletion'];
 if(!allowed.includes(route.split('?')[0]))throw new Error('Unsupported account request.');
 // Deliberately independent of generic mode-abort controllers: AccountClient
 // serializes dispatched verification and logout cookie effects itself.
 const accountEpoch=accountClient.state.authEpoch;
 const timeout=AbortSignal.timeout(20000),requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;
 if(route==='/api/auth/verify')accountSessionPossible=true;
 const response=await fetch(route,{method,credentials:'same-origin',cache:'no-store',headers:method==='POST'?{'Content-Type':'application/json','X-Squeeze-Client':'1'}:{},body:body?JSON.stringify(body):undefined,signal:requestSignal});
 let value;try{value=await response.json();}catch{throw new Error('Account service is unavailable. Try again.');}
 if(!response.ok){if(response.status===401&&!route.startsWith('/api/auth/')&&accountClient.state.authEpoch===accountEpoch)accountClient.invalidateFromPeer();throw Object.assign(new Error(value.error||'Account request failed. Try again.'),{code:value.code});}
 if(route==='/api/auth/logout')accountSessionPossible=false;
 return value;
}
accountWorkspace=new AccountWorkspace({transport:accountTransport,getAccount:()=>accountClient.state,isSample:()=>sampleMode||S.publicPreview,getOwner:()=>S.owner,notify:message=>toast(message),download:(name,data)=>download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),name)});
function accountPanel(){
 const state=accountClient.state,status=state.status,connected=!!bridge.account,capable=bridge.account?.features?.includes('solana:signMessage');
 const busy=['verifying','signing-out'].includes(status),labels={anonymous:'Not verified',verifying:'Waiting for account verification…',authenticated:'Ownership verified','signing-out':'Signing out…','revocation-required':'Sign-out needs to finish'};
return `<h3>Account</h3><p data-testid="account-status" data-state="${esc(status)}" role="status" aria-live="polite">${labels[status]||'Not verified'}</p><p class="small muted">Verify with a free signature to access your account data controls. It can't move funds.</p>${connected?`<div class="card-actions"><button class="button primary compact" data-action="account-verify" data-testid="account-verify" data-focus="account-verify" ${busy||status==='authenticated'||status==='revocation-required'||!capable?'disabled':''}>Verify ownership</button>${status==='anonymous'&&accountSessionPossible===false?'':`<button class="button compact" data-action="account-logout" data-testid="account-logout" data-focus="account-logout" ${status==='signing-out'?'disabled':''}>${status==='verifying'?'Cancel verification':'Sign out'}</button>`}</div>${!capable?'<p class="small muted">This wallet account cannot sign messages. Use a compatible wallet to verify ownership.</p>':''}`:'<p class="small muted">Connect a wallet to verify ownership.</p>'}<p class="form-error" role="alert">${esc(accountError)}</p>`;
}
function updateAccountPanel(){
 const panel=$('[data-account-panel]');if(!panel||sampleMode)return;
 const focus=document.activeElement?.dataset.focus;panel.innerHTML=accountPanel();
 if(focus){const next=panel.querySelector(`[data-focus="${CSS.escape(focus)}"]`);(next&&!next.disabled?next:panel.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});}
}
async function checkAccountSession(){
 const before=accountClient.state;if(before.status!=='authenticated'||sampleMode)return;
 try{const response=await fetch('/api/me',{credentials:'same-origin',signal:AbortSignal.timeout(10000)}),value=await response.json();
  if(accountClient.state.authEpoch!==before.authEpoch)return;
  if(!response.ok||!value.authenticated||value.principal?.id!==before.principal.id||value.principal?.address!==bridge.account?.address){accountError='Your account session changed or expired. Verify ownership again.';accountClient.invalidateFromPeer();}
 }catch{if(accountClient.state.authEpoch===before.authEpoch){accountError='Account status could not be checked. Verify ownership again when the server is available.';accountClient.invalidateFromPeer();}}
}
async function signOutAccount(){
 accountError='';
 if(accountClient.state.status==='anonymous'&&accountSessionPossible===false){accountClient.invalidateFromPeer();return;}
 try{await accountClient.logout();}catch(error){accountError='Sign-out could not be confirmed. Retry before verifying another wallet.';updateAccountPanel();throw error;}
}
async function discoverAccountSession(){
 if(accountSessionPossible!==null)return;
 const response=await fetch('/api/me',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
 const value=await response.json().catch(()=>null);
 // Disabled/static hosts can run isolated Sample, but do not prove revocation.
 if(response.status===404||(response.status===503&&value?.code==='PRODUCTION_DISABLED')||(response.status===403&&value?.code==='PREVIEW_ONLY'))return;
 if(!response.ok||typeof value?.authenticated!=='boolean')throw new Error('Account status could not be checked. Retry before switching data modes.');
 // A concurrent verification/peer event wins over this older observation.
 if(accountSessionPossible===null)accountSessionPossible=value.authenticated;
}
document.addEventListener('click',async event=>{
 const action=event.target.closest('[data-action]');if(!action||action.disabled||!['account-verify','account-logout'].includes(action.dataset.action))return;
 event.stopImmediatePropagation();accountError='';updateAccountPanel();
 try{if(action.dataset.action==='account-verify')await accountClient.login();else await accountClient.cancel();}
 catch(error){accountError=error.message||'Account verification failed. Try again.';}
 updateAccountPanel();
});
let accountActionPending=false;
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]'),action=button?.dataset.action;
 if(!action?.startsWith('account-')||['account-verify','account-logout'].includes(action)||button.disabled)return;
 event.stopImmediatePropagation();if(accountActionPending||sampleMode)return;
 if(action==='account-delete-review'){openSheet('Request account deletion',`<p>This sends a deletion request for operator review and signs out account sessions. It does not immediately erase records. Unresolved transactions, financial obligations and security audit records may be retained.</p><button class="button" data-action="account-delete-confirm">Send deletion request</button>`,{type:'account-deletion'});return;}
 accountActionPending=true;button.disabled=true;
 try{
  if(action==='account-export')await accountWorkspace.exportAccount();
  else if(action==='account-revoke'||action==='account-delete-confirm'){
   const requestBody=action==='account-revoke'?{}:{requestKey:accountWorkspace.operation('delete-request')};
   const result=await accountClient.endSessions(action==='account-revoke'?'/api/account/revoke-sessions':'/api/account/deletion',requestBody);
   accountSessionPossible=false;accountChannel?.postMessage({type:'account-invalidated'});closeSheet();render();toast(action==='account-revoke'?'Account sessions signed out. Recovery records are preserved.':`Deletion request ${result.status}. Receipt: ${result.receiptId}. Records are not yet erased.`);
  }
 }catch(error){toast(error.code==='VERSION_CONFLICT'?'This item changed in another session. Refresh and review before trying again.':error.message);}
 finally{accountActionPending=false;if(button.isConnected)button.disabled=false;}
});
document.addEventListener('keydown',()=>{lastInput='keyboard';},true);document.addEventListener('pointerdown',()=>{lastInput='pointer';},true);
const usd=(n,compact=false)=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:compact?0:2,notation:compact?'compact':'standard'}).format(n):'—';
const time=s=>{if(!s||!Number.isFinite(Date.parse(s)))return 'Time unavailable';return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(new Date(s));};
const basisLabel=b=>b==='observed-maximum'?'observed maximum':b==='coingecko-all-time-high'?'all-time high':b==='mixed'?'mixed baselines':'baseline';
const date=s=>{if(!s||!Number.isFinite(Date.parse(s)))return 'Time unavailable';return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(s));};
function tokenIcon(t,extra=''){let image=sampleMode&&t?.dataMode==='sample'&&assetURL(sampleArtPaths[t.sampleArt])||safeURL(t?.image),symbol=String(t?.symbol||shortAddress(t?.mint)||'?');return `<span class="token-icon ${extra}" aria-hidden="true"><span>${esc(symbol.slice(0,2))}</span>${image?`<img src="${esc(image)}" alt="" width="40" height="40" loading="lazy" referrerpolicy="no-referrer">`:''}</span>`;}
document.addEventListener('load',e=>{if(e.target instanceof HTMLImageElement)e.target.parentElement?.classList.add('image-loaded');},true);document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement){e.target.parentElement?.classList.remove('image-loaded');e.target.remove();}},true);
const source=t=>S.tokens.find(x=>x.mint===t);
const count=()=>Object.keys(S.selection).length;
const sources=()=>Object.entries(S.selection).map(([mint,raw])=>({mint,raw}));
function selectedSum(){return totalUSD(S.tokens.map(tokenWithIntel),S.selection);}
function priceSummary(){let p=selectedSum();return count()?(p.unknown?`${usd(p.total)} + ${p.unknown} unpriced`:usd(p.total)):'$0.00';}
function announce(text){$('#status').textContent='';setTimeout(()=>{$('#status').textContent=text;},20);}
function toast(text,actionLabel='',action=null){toastAction=action;$('#toast').innerHTML=`<span>${esc(text)}</span>${actionLabel?`<button data-action="toast-action">${esc(actionLabel)}</button>`:''}<button class="dismiss" data-action="dismiss-toast" aria-label="Dismiss notification">${icon('close')}</button>`;$('#toast').hidden=false;announce(text);}
async function api(route,data,opts={}){
 const ctrl=new AbortController(),epoch=dataEpoch,inSample=sampleMode;
 requestControllers.add(ctrl);
 const timer=setTimeout(()=>ctrl.abort(new Error('Request timed out. Try again.')),opts.timeout||150000);
 const signal=opts.signal?AbortSignal.any([ctrl.signal,opts.signal]):ctrl.signal;
 try{
  if(inSample){const out=await sampleSession.request(route,data,{signal});if(epoch!==dataEpoch)throw new DOMException('Mode changed','AbortError');return out;}
  let r=await fetch('/api/'+route,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'Content-Type':'application/json','X-Squeeze-Client':'1'}:{},body:data?JSON.stringify(data):undefined,signal});
  let out;try{out=await r.json();}catch{throw Object.assign(new Error('The app server is unavailable. Start the server or try Sample data.'),{code:'SERVER_OFFLINE'});}
  if(epoch!==dataEpoch)throw new DOMException('Mode changed','AbortError');
  if(out.dataMode==='sample')throw Object.assign(new Error('A sample response cannot be used in Live mode.'),{code:'MODE_MISMATCH'});
  if(!r.ok)throw Object.assign(new Error(out.error||'Unable to complete the request. Try again.'),{code:out.code||'REQUEST_FAILED'});
  return out;
 }catch(e){if(e.name==='TypeError'||location.protocol==='file:')throw Object.assign(new Error('Live data needs the included server. Sample data works without a wallet.'),{code:'SERVER_OFFLINE'});throw e;}
 finally{clearTimeout(timer);requestControllers.delete(ctrl);}
}
function safeFocusId(){const el=document.activeElement;return el?.getAttribute('data-focus')||null;}
function restoreFocus(id){if(id){const el=($('#sheet')?.open?$('#sheet'):document).querySelector(`[data-focus="${CSS.escape(id)}"]`);if(el)el.focus({preventScroll:true});}}
function render(){
 const focus=safeFocusId(),active=document.activeElement;
 if(active?.dataset.dirty==='true'&&active.dataset.input?.includes('percent'))return;
 const cursor=active?.selectionStart,tail=active?.selectionEnd;
 const listScroll=$('.token-list')?.scrollTop||0,bagScroll=$('.bag-rows')?.scrollTop||0,candidateScroll=$('.candidate-list')?.scrollTop||0,pickScroll=$('.pick-scroll')?.scrollTop||0;
 $('#app').innerHTML=header()+modeBanner()+`<main id="main" tabindex="-1">${bagPage()}</main>`;
 markSelectAll();restoreFocus(focus);if(cursor!==undefined&&document.activeElement?.setSelectionRange)try{document.activeElement.setSelectionRange(cursor,tail);}catch{}
 if($('.token-list'))$('.token-list').scrollTop=listScroll;if($('.bag-rows'))$('.bag-rows').scrollTop=bagScroll;if($('.candidate-list'))$('.candidate-list').scrollTop=candidateScroll;if($('.pick-scroll'))$('.pick-scroll').scrollTop=pickScroll;
 if(S.dialog==='picker')updatePicker();observeTokenCards();
}
function header(){
 const connected = !!S.health && !S.healthError;
 const ready = connected && S.health.ai && S.health.quotes && S.health.approvedPools>0;
 return `<header class="header"><a class="brand" href="#squeeze" aria-label="SQUEEZE home">${brandArt()}</a><div class="header-end"><button class="icon-button" data-action="history" aria-label="View swap history">${icon('receipt')}</button><button class="sample-toggle ${sampleMode?'active':''}" data-action="toggle-sample" role="switch" aria-checked="${sampleMode}" aria-label="Sample data" ${S.publicPreview?'disabled':''}><span class="toggle-track" aria-hidden="true"><i></i></span>Sample data</button><button class="icon-button motion-control" data-action="motion" aria-label="${S.motion?'Pause animations':'Enable animations'}" aria-pressed="${!S.motion}">${icon(S.motion?'pause':'play')}</button><button class="network ${ready?'configured':'off'}" data-action="connections" aria-label="View service connections"><i class="dot"></i>${sampleMode?'Example mode':!connected?(S.healthError?'Offline':'Connecting'):ready?'Connections':'Connect data'}</button><button class="button wallet-button ${!S.owner?'needs-wallet':''}" data-action="wallet" aria-label="${sampleMode?'Sample wallet':S.owner?'Wallet '+esc(shortAddress(S.owner)):'Connect wallet'}">${icon(S.readOnly?'eye':'wallet')}<span>${sampleMode?'Sample wallet':S.owner?esc(shortAddress(S.owner)):'Connect wallet'}</span>${S.owner?icon('chevron'):''}</button></div></header>`;
}
function intro(title,sub){return `<div class="intro"><div><h1>${title}</h1><p>${sub}</p></div><button class="text-button how-link" data-action="how">${icon('info')}How it works</button></div>`;}
function bagPage(){
 const recovery=S.batch?.owner===S.owner&&S.batch.items.some(i=>['submitting','confirming','unknown'].includes(i.status));
 const step=S.decision?.status==='PICK'?3:count()?2:1;
 return `<div class="intro pack-intro"><div><h1>Old bags. <span>New plays.</span></h1><p>Clear the bags you’re over. Find a <strong>stock-paired meme</strong> — or exit to SOL.</p></div><button class="how-card" data-action="how">${icon('play')}<span>New here?<b>See how it works</b></span>${icon('arrow')}</button></div>
 <ol class="flow-steps" aria-label="Your progress"><li class="${step===1?'current':'done'}"><span>${step>1?icon('check'):'1'}</span><b>Choose your bags</b><small>Keep the ones you still believe in</small></li><li class="${step===2?'current':step>2?'done':''}"><span>${step>2?icon('check'):'2'}</span><b>Set your amount</b><small>Your tokens. Your percentage.</small></li><li class="${step===3?'current':''}"><span>3</span><b>Pick & review</b><small>Stock-paired memes. Or SOL.</small></li></ol>
 ${recovery?`<div class="service-note"><span>A swap still needs a result. Don’t send it again.</span><button class="text-button" data-action="resume">Check result ${icon('arrow')}</button></div>`:''}
 <div class="workspace ${!S.owner?'first-visit':''} ${S.analyzing?'is-analyzing':''}">${tokenPanel()}${bagPanel()}${pickPanel()}</div>`;
}

function tokenWithIntel(t){const i=S.intel[t.mint];if(!i)return t;const merged={...t,...i,raw:t.raw,decimals:t.decimals,program:t.program,native:t.native,usd:t.usd,image:i.image||t.image,symbol:i.symbol||t.symbol,name:i.name||t.name};if(t.raw&&Number.isInteger(t.decimals)&&Number.isFinite(i.priceUsd)){const n=Number(fromAtoms(t.raw,t.decimals))*i.priceUsd;merged.usd=Number.isFinite(n)?n:null;}return merged;}

function matchingTokens(){return eligibleShown(S.tokens.map(tokenWithIntel),{query:S.query,hideDust:S.hideDust}).filter(t=>S.tokenFilter==='all'||S.tokenFilter==='cooked'&&cookedStatus(t).flagged||S.tokenFilter==='dust'&&!t.native&&Number.isFinite(t.usd)&&t.usd<1);}
function visibleTokens(){const all=matchingTokens();S.tokenPage=Math.max(0,Math.min(S.tokenPage||0,Math.ceil(all.length/80)-1));return all.slice(S.tokenPage*80,(S.tokenPage+1)*80);}
function tokenPriceLabel(t){if(Number.isFinite(t.priceUsd))return priceUSD(t.priceUsd);if(S.intel[t.mint]?.busy||S.intelPending.has(t.mint))return '<span class="ledger-loading">Loading…</span>';return '<span class="ledger-nomarket">Price unavailable</span>';}
function priceUSD(value){return Number.isFinite(value)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumSignificantDigits:value<1?4:6}).format(value):'—';}
function signedPct(value){return Number.isFinite(value)?(value<0?'−':value>0?'+':'')+Math.abs(value).toFixed(1)+'%':'—';}
function chartHTML(t){const c=t.chart,line=['available','stale'].includes(c?.status)?priceLine(c.points):null;if(!line)return `<span class="chart-missing">${S.intelPending.has(t.mint)?'Loading chart…':'Chart unavailable'}</span>`;return `<svg class="sparkline ${c.status==='stale'?'stale-chart':line.changePct<0?'negative':'positive'}" viewBox="0 0 140 38" role="img" aria-label="${esc(t.symbol)} observed hourly USD close prices. ${c.status==='stale'?'Stale data.':''}"><title>${esc(c.scope||'Hourly close prices; gaps are not interpolated')}</title><path d="${line.path}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>${c.status==='stale'?'<em class="chart-stale-label">Stale</em>':''}`;}
function solMark(){return '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M7 7h21l-4 5H3zm-4 7h21l4 5H7zm4 7h21l-4 5H3z"/></svg>';}
function destinationCandidates(){const seen=new Map();for(const t of [...(S.aiDecision?.candidates||[]),...(S.markets?.tokens||[])]){if(!t.eligible||t.native||S.selection[t.mint]||seen.has(t.mint))continue;seen.set(t.mint,t);}if(S.aiDecision?.status==='PICK'&&S.aiDecision.target&&!S.selection[S.aiDecision.target.mint])seen.set(S.aiDecision.target.mint,{...S.aiDecision.target});return [...seen.values()].sort((a,b)=>(b.mint===S.aiDecision?.target?.mint?1:0)-(a.mint===S.aiDecision?.target?.mint?1:0));}
function candidateCard(t,evidence){const selected=S.targetMint===t.mint,ai=S.aiDecision?.status==='PICK'&&S.aiDecision.target.mint===t.mint,facts=candidateFacts(t,evidence),blocked=!!t.rejected||S.markets?.stale||!!S.marketError;return `<article class="candidate ${selected?'selected':''}"><button class="candidate-select" data-action="choose-target" data-mint="${esc(t.mint)}" aria-pressed="${selected}" ${S.txBusy||S.destinationBusy||blocked?'disabled':''}>${tokenIcon(t)}<span class="candidate-identity"><strong>${esc(t.symbol)}${ai?'<span class="ai-pick-tag">PIP PICK</span>':''}</strong><small>${icon('link')}${esc(t.stock)} pair</small></span><span class="candidate-change ${t.change24h<0?'negative':'positive'}">${signedPct(t.change24h)}<small>24h</small></span><span class="radio-dot">${selected?icon('check'):''}</span></button><div class="candidate-reasons">${facts.facts.length?facts.facts.slice(0,2).map(f=>`<span>${icon(f.kind==='holding'?'people':f.kind==='callout'?'calls':'activity')}${esc(f.text)}</span>`).join(''):`<span>${icon('activity')}Liq ${usd(t.liquidityUsd,true)} · Vol ${usd(t.volume24h,true)} / 24h</span><small>No wallet signal loaded</small>`}${facts.risks.length?`<small class="caution">${esc(facts.risks[0])}</small>`:''}${t.rejected?`<small class="caution">${esc(t.rejected)}</small>`:''}</div><button class="text-button candidate-proof" data-action="market-details" data-mint="${esc(t.mint)}">Pair & evidence ${icon('chevronright')}</button></article>`;}
function canSignSelection(mode){return mode==='sol'?!!S.health?.solTrading:mode==='manual'?!!S.health?.manualTrading:!!S.health?.trading;}
async function chooseDestination(mint,mode){if(S.txBusy||S.destinationBusy)return;if(!count()){toast('Pack at least one token first.');openPicker();return;}if(S.batch?.owner===S.owner&&hasUnresolved(S.batch)){openBatch();return;}if(S.selection[mint]){toast('Remove that token from your source bag before choosing it as the destination.');return;}if(S.walletPartial){toast('Refresh incomplete wallet balances first.');return;}if($('#sheet').open)closeSheet();S.analysisController?.abort();S.analyzing=false;S.revision++;const rev=S.revision;S.targetMint=mint;S.targetMode=mode;S.decision=null;S.destinationError=null;S.destinationBusy=true;render();try{const d=await api('destination',{owner:S.owner,sources:sources(),mode,targetMint:mint,slippageBps:S.slippage});if(rev!==S.revision)return;if(d.target?.mint!==mint||d.mode!==mode||d.owner!==S.owner)throw new Error('Destination changed. Nothing was sent. Refresh and select again.');S.decision=d;announce(`${d.target.symbol} selected. ${sampleMode?'Review the sample.':'Review before signing.'}`);}catch(e){if(rev===S.revision)S.destinationError=e.message;}finally{if(rev===S.revision){S.destinationBusy=false;render();}}}
function openBrowseTargets(){S.targetQuery='';openSheet('Choose your next bag',`<p>${sampleMode?'Fictional stock-paired memes for this example.':'Verified stock-paired memes only.'} Your pick is not an AI endorsement.</p><div class="searchbox">${icon('search')}<label class="sr-only" for="target-search">Search destination by token, mint or stock pair</label><input id="target-search" data-input="target-search" type="search" placeholder="Token, mint or stock pair" autocomplete="off"></div><div class="browse-list">${destinationCandidates().map(t=>candidateCard(t,S.aiDecision?.evidence||[])).join('')||'<p class="no-results">No verified stock pair is currently available. Refresh the market feed.</p>'}</div>`,{type:'destinations',footer:'<button class="button block" data-action="choose-sol">Just get SOL instead</button>'});}
function openCookedHelp(){openSheet('Cooked ≠ confirmed rug',`<p>“Cooked” is a cleanup filter, not a safety verdict.</p><div class="sheet-callout">A pool must be at least 7 days old and match one rule:</div><p><b>Deep drawdown + weak market:</b> at least 90% below its drawdown baseline (a coin-wide all-time high when CoinGecko is configured, otherwise this pool's observed maximum), plus liquidity below $25k or 24h volume below $1k.</p><p><b>Idle + thin:</b> no trades in 24h and liquidity below $10k in the deepest indexed pool.</p><p>Missing or stale data stays <b>Unrated</b>. A small holding is <b>Dust</b>, not automatically cooked. Fees, taxes and actual sell routes are checked separately before any signature.</p><p class="small muted">Rule: cooked-v1. Baseline: CoinGecko USD coin-wide all-time high when configured, otherwise the highest daily high observed for the pool, compared with its latest daily close (GeckoTerminal). Liquidity and activity: deepest indexed base-token pool, not the entire market.</p>`,{footer:'<button class="button block" data-action="scan-tokens">Check available token data</button>'});}
let intelObserver=null,intelDrainTimer=null;
function observeTokenCards(){intelObserver?.disconnect();if(!('IntersectionObserver' in window))return;intelObserver=new IntersectionObserver(entries=>{const mints=entries.filter(e=>e.isIntersecting).map(e=>e.target.dataset.intelMint);queueIntelligence(mints);},{rootMargin:'80px'});$$('[data-intel-mint]').forEach(el=>intelObserver.observe(el));}
function queueIntelligence(mints){for(const mint of mints){const i=S.intel[mint];if(!mint||S.intelPending.has(mint)||i&&Date.now()-(i.fetchedAt||0)<300000)continue;S.intelPending.add(mint);S.intelQueue.push(mint);}drainIntelligence();}
function drainIntelligence(){clearTimeout(intelDrainTimer);if(document.hidden)return;if(Date.now()<S.intelRetryAfter){intelDrainTimer=setTimeout(drainIntelligence,S.intelRetryAfter-Date.now()+50);return;}while(S.intelActive<2&&S.intelQueue.length){const mint=S.intelQueue.shift(),epoch=dataEpoch;S.intelActive++;api('token-intelligence?mint='+encodeURIComponent(mint),undefined,{timeout:30000}).then(data=>{if(epoch!==dataEpoch)return;if(data.mint!==mint)throw new Error('Token data identity mismatch.');
  // A "busy" answer (shared price source at its limit) is shown as loading and retried shortly, not cached as done.
  const busy=(data.issues||[]).some(x=>/busy/i.test(x))||data.ath?.retry===true;
  S.intel[mint]={...data,busy,fetchedAt:busy?0:Date.now()};
  if(busy)setTimeout(()=>{if(epoch===dataEpoch)queueIntelligence([mint]);},30000);}).catch(e=>{if(epoch!==dataEpoch)return;if(e.code==='RATE_LIMIT'||e.code==='INTELLIGENCE_LIMIT'){S.intelRetryAfter=Date.now()+65000;S.intelQueue.unshift(mint);}else S.intel[mint]={mint,failed:true,fetchedAt:Date.now(),chart:{status:'unavailable',points:[]},ath:{status:'unavailable'},issues:[e.message]};}).finally(()=>{if(epoch!==dataEpoch)return;S.intelActive--;if(!S.intelQueue.includes(mint))S.intelPending.delete(mint);if(S.view==='bag'&&!S.txBusy)render();drainIntelligence();});}}

function tokenPanel(inSheet=false){
 const prefix=inSheet?'sheet':'main',cookCount=S.tokens.filter(t=>!sourceEligibility(t)&&cookedStatus(tokenWithIntel(t)).flagged).length;
 return `<section class="token-panel" aria-label="Wallet tokens"><div class="panel-head"><div><h2>Your tokens <span class="count">${S.tokens.filter(t=>!t.native).length}</span></h2><p class="panel-sub">Less baggage. More options.</p></div><button class="icon-button" data-action="refresh-wallet" aria-label="Refresh wallet balances" ${!S.owner||S.walletLoading?'disabled':''}>${icon('refresh')}</button></div>
 ${!S.owner?`<div class="empty-wallet">${art('welcome','welcome-art',true)}<h3>Bring your bags.</h3><p>Connect to see your tokens. Nothing moves yet.</p><button class="button primary" data-action="wallet">${icon('wallet')}Connect wallet</button><button class="text-button" data-action="watch-wallet">View an address ${icon('arrow')}</button><button class="button sample-start" data-action="toggle-sample">Try with sample tokens ${icon('arrow')}</button></div>`:S.walletLoading&&!S.tokens.length?`<div aria-label="Loading wallet balances" aria-busy="true">${Array.from({length:4},()=>'<div class="skeleton-row"><i></i><span></span></div>').join('')}</div>`:S.walletError&&!S.tokens.length?`<div class="empty-wallet">${icon('disconnected')}<h3>Wallet didn’t load</h3><p>${esc(S.walletError)}</p><button class="button" data-action="refresh-wallet">Try again</button></div>`:`
 <div class="searchbox">${icon('search')}<label class="sr-only" for="${prefix}-token-search">Find a token by name or mint</label><input id="${prefix}-token-search" data-focus="${prefix}-search" data-input="token-search" type="search" placeholder="Search token or paste mint" value="${esc(S.query)}" autocomplete="off"></div>
 <div class="token-filters" role="group" aria-label="Filter wallet tokens">${[['all','All bags'],['cooked',`Cooked${cookCount?' · '+cookCount:''}`],['dust','Dust < $1']].map(([id,label])=>`<button class="filter-chip" data-action="token-filter" data-filter="${id}" aria-pressed="${S.tokenFilter===id}">${label}</button>`).join('')}<button class="filter-help icon-button" data-action="cooked-help" aria-label="How Cooked tokens are flagged">${icon('info')}</button></div>
 <div class="selection-toolbar"><label class="check-label"><input type="checkbox" data-input="select-all" aria-label="Select all eligible visible tokens" data-focus="${prefix}-all">Select all${S.query||S.tokenFilter!=='all'?' shown':''}</label><button class="select-cooked" data-action="select-cooked" ${!cookCount||S.txBusy?'disabled':''}>${icon('bag')}Select cooked</button></div>
 ${S.walletPartial?'<p class="inline-alert">Balances are incomplete. Refresh before swapping.</p>':''}${S.pricingPartial||S.pricingDeferred?'<p class="small muted" role="status">Some prices are unavailable or not loaded yet. Browse or search tokens to check their market data. An unpriced token is not proof of no market.</p>':''}${S.walletError?`<p class="inline-alert">${esc(S.walletError)}</p>`:''}
 <div class="token-list" tabindex="0" role="region" aria-label="Token list, scroll for more" ${S.walletLoading?'aria-busy="true"':''}>${tokenRows()}</div>`}
 <div class="token-foot">${icon('shield')}SOL stays out for gas.${S.owner?` <button data-action="cooked-help" class="text-button">${S.tokens.filter(t=>!sourceEligibility(t)&&cookedStatus(tokenWithIntel(t)).state==='unknown').length} unrated</button>`:''}</div></section>`;
}
function tokenRows(){
 const shown=visibleTokens();if(!shown.length)return `<div class="no-results"><b>${S.tokenFilter==='cooked'?'No cooked flags here.':S.tokens.length?'No matching tokens.':'No token balances found.'}</b><p>${S.tokenFilter==='cooked'?'Unknown tokens are never counted as cooked.':'Try another name or mint.'}</p><button class="text-button" data-action="clear-filter">Clear filters</button>${S.owner?'<button class="text-button" data-action="scan-tokens">Check token data</button>':''}</div>`;
 return shown.map(t=>{
  const blocked=sourceEligibility(t),selected=!!S.selection[t.mint],status=cookedStatus(t),ath=['available','stale'].includes(t.ath?.status)?t.ath:null,name=t.symbol||shortAddress(t.mint);
  return `<article class="token-row rich-token ledger-token ${selected?'selected':''} ${blocked?'unavailable':''}" data-token-row="${esc(t.mint)}" ${t.native?'':`data-intel-mint="${esc(t.mint)}"`} draggable="${!blocked&&!S.txBusy}">
   <label class="token-choice rich-choice"><input type="checkbox" data-input="token-check" data-mint="${esc(t.mint)}" data-focus="token-${esc(t.mint)}" aria-label="${esc((selected?'Remove ':'Add ')+name+(blocked?'. '+blocked:''))}" ${selected?'checked':''} ${blocked||S.txBusy?'disabled':''}>${tokenIcon(t)}<span class="token-name"><strong>${esc(name)}</strong>${status.flagged?'<span class="mini-cooked">Cooked</span>':''}</span><span class="token-value"><strong>${usd(t.usd)}</strong><small class="sr-only">${esc(exactLabel(t.raw,t.decimals,3))} tokens</small></span></label>
   <div class="ledger-data"><div class="ledger-price"><strong>${tokenPriceLabel(t)}</strong><span class="delta ${typeof t.change24h==='number'&&t.change24h<0?'negative':'positive'}">${signedPct(t.change24h)} <small>24h</small></span></div><span class="ledger-ath ${ath&&ath.changePct<0?'negative':''}">${ath?signedPct(ath.changePct):'—'} <small>${ath?(ath.basis==='observed-maximum'?'vs pool max':'vs ATH'):'baseline'}${ath?.status==='stale'?' · stale':''}</small></span><button class="token-chart" data-action="token-details" data-mint="${esc(t.mint)}" aria-label="View ${esc(name)} chart and market details">${chartHTML(t)}</button><button class="text-button token-info" data-action="token-details" data-mint="${esc(t.mint)}" aria-label="View ${esc(name)} full balance and mint">${icon('chevronright')}<span class="sr-only">Details</span></button></div>
   ${blocked?`<small class="ledger-blocked">${esc(blocked)}</small>`:''}</article>`;
 }).join('')+(matchingTokens().length>80?`<div class="card-actions" aria-label="Token pages"><button class="button compact" data-action="token-page" data-page="${S.tokenPage-1}" ${S.tokenPage===0?'disabled':''}>Previous tokens</button><span class="small muted">${S.tokenPage*80+1}–${S.tokenPage*80+shown.length} of ${matchingTokens().length}</span><button class="button compact" data-action="token-page" data-page="${S.tokenPage+1}" ${(S.tokenPage+1)*80>=matchingTokens().length?'disabled':''}>Next tokens</button></div>`:'');
}
function markSelectAll(){const eligible=visibleTokens().filter(t=>!sourceEligibility(t)),n=eligible.filter(t=>S.selection[t.mint]).length;$$('[data-input=select-all]').forEach(el=>{el.checked=eligible.length>0&&n===eligible.length;el.indeterminate=n>0&&n<eligible.length;el.disabled=eligible.length===0||S.txBusy;});}
function bagPanel(){
 const chosen=S.tokens.filter(t=>S.selection[t.mint]),mixed=chosen.some(t=>S.selection[t.mint]!==portion(t.raw,S.bps||10000));
 return `<section class="bag-panel ${count()?'has-tokens':'is-empty'}" aria-label="Selected token bag"><div class="panel-head"><div><h2>Your bag <span class="count">${count()}/${MAX_SOURCES}</span></h2><p class="panel-sub">Only what you choose goes in.</p></div><div class="bag-controls"><button class="icon-button" data-action="clear-bag" aria-label="Empty bag" ${!count()||S.txBusy?'disabled':''}>${icon('archive')}</button></div></div>
 <button class="mobile-pick" data-action="picker">${icon('plus')}${count()?'Add or remove tokens':'Choose tokens'}${count()?`<span class="count">${count()}</span>`:''}</button>
 <div class="bag-stage" id="bag-drop"><div class="stage-rings" aria-hidden="true"></div><button class="bag-object" data-action="squeeze-bag" aria-label="${count()?'Squeeze your bag to find a destination':'Choose tokens for your bag'}" aria-describedby="bag-gesture-hint"><span class="bag-press">${bagArt(!!count())}</span>${chosen.slice(0,3).map(t=>tokenIcon(t,'float-token')).join('')}</button><span class="bag-caption" id="bag-gesture-hint">${count()?'Bag packed. Squeeze for a fresh play.':'Pick a token. Watch it drop in.'}</span></div>
 <div class="bag-form"><div class="bag-total"><span>Ready to rotate <small>estimated value</small></span><strong class="num">${priceSummary()}</strong></div>
 <div class="percent-global"><label for="bag-percentage">Use <b>${mixed?'mixed %':'this %'}</b> of each token</label><div class="percent-field"><input id="bag-percentage" data-input="global-percent" data-focus="global-percent" type="text" inputmode="decimal" autocomplete="off" value="${S.bps?S.bps/100:100}" aria-describedby="percent-hint" ${S.txBusy?'disabled':''}><span>%</span></div></div>
 <fieldset class="amount-segments" aria-label="Amount of each selected token"><legend class="sr-only">Choose an amount for each token</legend>${[2500,5000,10000].map(v=>`<button data-action="percent" data-percent="${v}" aria-pressed="${!mixed&&S.bps===v}" ${S.txBusy?'disabled':''}>${v/100}%</button>`).join('')}</fieldset><p id="percent-hint" class="percent-hint">${count()?'Or tweak each bag below.':'Set an amount now. Add tokens next.'}</p>
 <div class="bag-rows" tabindex="0" role="region" aria-label="Packed amounts, scroll for more">${chosen.map(t=>`<div class="bag-amount-row" data-bag-row="${esc(t.mint)}">${tokenIcon(t)}<div class="bag-row-name"><strong>${esc(t.symbol)}</strong><button class="text-button" data-action="edit-bag" title="Edit exact token amount">${esc(exactLabel(S.selection[t.mint],t.decimals,4))} <small>tokens ${icon('chevronright')}</small></button></div><label class="percent-field"><span class="sr-only">${esc(t.symbol)} percentage</span><input data-input="token-percent" data-focus="percent-${esc(t.mint)}" data-mint="${esc(t.mint)}" type="text" inputmode="decimal" autocomplete="off" value="${amountPercentage(S.selection[t.mint],t.raw)}" ${S.txBusy?'disabled':''}><span>%</span></label><button class="icon-button" data-action="remove-token" data-mint="${esc(t.mint)}" aria-label="Remove ${esc(t.symbol)} from bag" ${S.txBusy?'disabled':''}>${icon('close')}</button></div>`).join('')||'<div class="bag-empty-hint">Your wallet stays yours. This is just a selection.</div>'}</div>
 <div class="bag-actions"><button class="button ${count()&&!S.decision?'primary':''} block analyze-button" data-action="${!S.owner?'wallet':'analyze'}" ${S.txBusy||S.analyzing||S.destinationBusy?'disabled':''}>${S.analyzing?'<i class="spinner"></i>Checking the plays…':icon('squeeze')+(S.decision?'Recheck with PIP':'Find my next bag')}${!S.analyzing?icon('arrow'):''}</button><p class="bag-safety">${icon('lock')}Packing isn’t a transaction.</p></div></div></section>`;
}
function pickPanel(){
 const d=S.decision,manual=d?.mode==='manual',sol=d?.mode==='sol',ev=S.aiDecision?.evidence||[];
 const candidates=destinationCandidates();let state='';
 if(S.analyzing)state=`<div class="pick-state">${pipArt('thinking')}<div><h3>Receipts, not hopium.</h3><p>Checking routes, wallet activity and callouts.</p><button class="text-button" data-action="cancel-analysis">Cancel</button></div><i class="spinner"></i></div>`;
 else if(S.analysisError)state=`<div class="pick-state compact-state">${pipArt('rest')}<div><h3>PIP couldn’t check.</h3><p>${esc(S.analysisError.message)}</p><button class="text-button" data-action="analyze">Try again</button></div></div>`;
 else if(d?.status==='PICK')state=`<div class="picked-intro"><div><span class="mode-badge">${sol?'SOL EXIT':manual?'YOUR PICK':'PIP’S PICK'}</span><h3>${sol?'Tap out. Keep control.':manual?'Your call. Your next bag.':'Here’s my next play.'}</h3></div><div class="pick-sticker">${pipArt(manual||sol?'thinking':'pick')}</div></div><p class="pick-reason">${esc(d.reason)}</p>`;
 else if(d)state=`<div class="pick-state compact-state">${pipArt('rest')}<div><h3>${d.status==='NO_TRADE'?'No edge. No forced trade.':'Not enough signal.'}</h3><p>${esc(d.reason)}</p></div></div>`;
 else state=`<div class="pick-state compact-state">${pipArt('thinking')}<div><h3>Let PIP dig. Or pick your own.</h3><p>${sampleMode?'Example stock-paired destinations.':'Explore available stock-paired destinations.'}</p></div></div>`;
 return `<section class="pick-panel ${d?.status==='PICK'?'has-pick':''}" aria-label="Destination choices"><div class="pick-head"><h2>Next bag</h2><span class="badge">${icon('link')}Stock-paired memes</span></div><div class="pick-scroll" tabindex="0" role="region" aria-label="Potential plays, scroll for more">${state}
 <div class="candidate-topline"><span>${S.aiDecision?.status==='PICK'?'PIP + other plays':'Available plays'}</span><button class="text-button" data-action="browse-targets">Browse all ${icon('arrow')}</button></div>
 ${S.marketError?`<p class="inline-alert" role="status">${esc(S.marketError)} <button class="text-button" data-action="refresh-market">Retry pairs</button></p>`:''}<div class="candidate-list" role="group" aria-label="Choose your destination">${candidates.slice(0,5).map(t=>candidateCard(t,ev)).join('')||`<div class="no-candidates">${S.marketLoading?'<span class="spinner"></span>Looking for verified stock pairs…':'No verified stock-paired memes available.'}<button class="text-button" data-action="refresh-market">Refresh pairs</button></div>`}</div>
 </div><div class="pick-summary"><button class="sol-exit ${S.targetMode==='sol'?'selected':''}" data-action="choose-sol" aria-pressed="${S.targetMode==='sol'}" ${S.txBusy||S.destinationBusy?'disabled':''}><span class="sol-symbol" aria-hidden="true">${solMark()}</span><span><b>Just get SOL</b><small>Skip the next meme. Keep it liquid.</small></span>${icon('arrow')}</button>
 ${S.destinationError?`<p class="inline-alert" role="alert">${esc(S.destinationError)}</p>`:''}
 ${S.destinationBusy?'<div class="preview-pending" role="status"><i class="spinner"></i>Checking your routes. Nothing is moving.</div>':''}
 ${d?.status==='PICK'?`<div class="selected-destination"><div><small>You receive</small><strong>${esc(d.target.symbol)}</strong><span>${sol?'Native SOL · no stock pair':esc(d.target.stock)+' pair · meme, not shares'}</span></div>${tokenIcon(d.target)}</div><p class="risk">${icon('alert')}<span>${esc(d.risk)}</span></p><div class="decision-cta"><button class="button primary block" data-action="review" ${S.destinationBusy||S.txBusy?'disabled':''}>Review ${sol?'SOL exit':'swaps'} ${icon('arrow')}</button><div class="decision-sub"><button class="text-button" data-action="why">${manual||sol?'What was checked?':'Why this pick?'}</button><button class="icon-button" data-action="share" aria-label="Export this pick as an image">${icon('share')}</button></div></div>`:'<p class="pip-note">You receive a meme, not company shares. No returns promised.</p>'}</div></section>`;
}
function marketStrip(){let tokens=(S.markets?.tokens||[]).slice(0,8);return `<section class="market-strip" aria-label="Stock-paired meme market"><div class="market-title">${icon('activity')}In the mix</div>${tokens.length?`<div class="market-tokens">${tokens.map(t=>`<button class="market-token" data-action="market-details" data-mint="${esc(t.mint)}">${tokenIcon(t)}<span><strong>${esc(t.symbol)}</strong><small>${esc(t.stock)} pair ${S.markets.stale?'· stale':''}</small></span></button>`).join('')}</div>`:`<div class="market-message">${S.marketLoading?'<i class="spinner" aria-hidden="true"></i>Loading stock-paired memes…':S.marketError?'Market feed unavailable.':'No verified pairs yet.'}${!S.marketLoading?'<button class="text-button" data-action="market-help">Details</button>':''}</div>`}<button class="icon-button" data-action="refresh-market" aria-label="Refresh market data" ${S.marketLoading?'disabled':''}>${icon('refresh')}</button></section>`;}
function footer(){return '';}
function receiptHistory(){
 const records=S.journal.filter(b=>b.owner===S.owner);
 if(!records.length)return '';
 return `<section class="history-section"><div class="history-heading"><div><h2>Swap history</h2><p>${sampleMode?'Sample receipts · no funds moved.':'Device-local records. Open the transaction to verify onchain.'}</p></div><span class="count">${records.length}</span></div><div class="history-list">${records.map(batch=>{const state=receiptState(batch),done=batch.items.filter(i=>i.status==='finalized').length;return `<article class="history-card"><div class="history-icon">${icon(hasUnresolved(batch)?'clock':'receipt')}</div><div class="history-copy"><h3>${esc(batch.target.symbol)} <span>· ${batch.target.native?'Native SOL':esc(batch.target.stock)+' pair'}</span></h3><p>${done} of ${batch.items.length} ${sampleMode?'sample swaps simulated':'swaps recorded finalized'} · ${date(batch.createdAt)}</p></div><span class="history-status ${hasUnresolved(batch)?'warn':''}">${esc(state)}</span><button class="button compact" data-action="view-receipt" data-key="${esc(historyKey(batch))}">View receipt ${icon('arrow')}</button></article>`;}).join('')}</div></section>`;
}
function viewReceipt(key){
 const batch=S.journal.find(b=>historyKey(b)===key&&b.owner===S.owner);if(!batch)return;
 S.receiptViewed=key;
 const content=`<div class="receipt-title">${art('bags/target','',false)}<div><h3>${esc(batch.target.symbol)}</h3><p>${esc(receiptState(batch))} · ${batch.target.native?'Native SOL':esc(batch.target.stock)+' pair'}</p></div></div><p class="small muted">${sampleMode?'Sample receipt. No onchain transaction or signature.':'Saved on this device. The explorer is the source of truth.'}</p>${batch.items.map(item=>`<div class="receipt-item"><div><b>${esc(exactLabel(item.raw,item.decimals))} ${esc(item.symbol)}</b><span>${esc(sampleMode&&item.status==='finalized'?'Simulated':item.status)}</span></div>${item.received?`<p>${esc(exactLabel(item.received,batch.target.decimals,10))} ${esc(batch.target.symbol)} received</p>`:''}${!sampleMode&&item.signature?`<a href="https://solscan.io/tx/${esc(item.signature)}" target="_blank" rel="noopener noreferrer">Verify transaction ${icon('external')}</a>`:'<p class="small muted">Not submitted.</p>'}</div>`).join('')}<details class="details-box"><summary>Owner and destination</summary><p>Wallet: <code>${esc(batch.owner)}</code></p><p>${batch.target.native?'SOL route mint (unwrapped to native SOL)':'Received meme mint'}: <code>${esc(batch.target.mint)}</code></p></details>`;
 openSheet('Swap receipt',content,{type:'receipt',footer:`${hasUnresolved(batch)?'<button class="button primary block" data-action="resume-receipt">Check unresolved swap</button>':''}<button class="button block" data-action="export-receipt">Export receipt JSON ${icon('external')}</button><p>${sampleMode?'Export contains fictional sample values.':'Export includes your public wallet address.'}</p>`});
}
function exportReceipt(){
 const batch=S.journal.find(b=>historyKey(b)===S.receiptViewed&&b.owner===S.owner);if(!batch)return;
 download(new Blob([JSON.stringify({format:'squeeze-receipt-v1',recordedAt:new Date().toISOString(),dataMode:sampleMode?'sample':'live',verification:sampleMode?'FICTIONAL SAMPLE · NO FUNDS MOVED':'device-local record; check signatures onchain',batch},null,2)],{type:'application/json'}),(sampleMode?'squeeze-SAMPLE-receipt-':'squeeze-receipt-')+batch.createdAt.replace(/[^0-9]/g,'')+'.json');
 toast(sampleMode?'Sample receipt exported. No funds moved.':'Receipt exported. It includes your public wallet address.');
}
function resumeReceipt(){
 const batch=S.journal.find(b=>historyKey(b)===S.receiptViewed&&b.owner===S.owner&&hasUnresolved(b));if(!batch)return;
 if(S.batch)persistBatch();
 S.batch={...batch,items:batch.items.map(i=>({...i})),decision:{quotes:[]}};S.order=null;S.ack=false;persistBatch();closeSheet();openBatch();checkStatus();
}

function evidenceRow(e){let url=safeURL(e.url);return `<article class="evidence-row">${icon(e.type==='callout'?'calls':e.type==='holding'?'people':'activity')}<div><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open source ${icon('external')}</a>`:''}<time>${date(e.eventAt||e.observedAt)}${e.label?' · '+esc(e.label):''}</time></div></article>`;}
function saveSelection(){if(S.owner)storeLocal('squeeze.selection.v2.'+S.owner,S.selection);}
function invalidate(){S.revision++;S.analysisController?.abort();S.analyzing=false;S.destinationBusy=false;S.decision=null;S.aiDecision=null;S.targetMint=null;S.targetMode='ai';S.destinationError=null;S.analysisError=null;S.order=null;}
function getRects(mints){return mints.map(m=>{const original=source(m),token=original?tokenWithIntel(original):null;const nodes=$$(`[data-token-row="${CSS.escape(m)}"] .token-icon`);const el=nodes.reverse().find(el=>el.getBoundingClientRect().width>0);return {token,renderedImage:el?.querySelector('img')?.getAttribute('src')||'',rect:el?.getBoundingClientRect()};}).filter(x=>x.token);}
function changeSelection(next,announceText=''){
 if(S.txBusy)return;const before=Object.keys(S.selection),after=Object.keys(next),add=after.filter(m=>!before.includes(m)),remove=before.filter(m=>!after.includes(m)),flight=getRects([...add,...remove]);
 stopMotion();$('#toast').hidden=true;toastAction=null;S.selection=next;invalidate();saveSelection();render();if(lastInput!=='keyboard')tokenFlights(flight,$('#sheet[open] .picker-bag-target')||$('.bag-object'),add.length===0);if(announceText)announce(announceText);
}
function toggleToken(mint){try{changeSelection(toggleSelection(S.tokens,S.selection,mint,S.bps||10000),'Bag updated. '+(S.selection[mint]?'Token removed.':'Token added.'));}catch(e){toast(e.message);}}
function clearBag(){const old={...S.selection},owner=S.owner;changeSelection({});toast('Bag emptied. Tokens never left your wallet.','Undo',()=>{if(S.owner!==owner)return;changeSelection(validSelection(S.tokens,old));});}
function changePercent(bps){try{const next=applyPercentage(S.tokens,S.selection,String(bps/100));S.bps=next.bps;changeSelection(next.selection,`${bps/100}% of each selected token.`);}catch(e){toast(e.message);}}
async function refreshHealth(){const epoch=dataEpoch;try{const health=await api('health',undefined,{timeout:10000});if(epoch!==dataEpoch)return;if(health.publicPreviewOnly&&!sampleMode){S.publicPreview=true;await setSampleMode(true);return;}S.health=health;S.healthError=false;}catch{if(epoch!==dataEpoch)return;S.healthError=true;S.health=null;}render();}
async function refreshMarkets(){if(S.marketLoading)return;const epoch=dataEpoch;S.marketLoading=true;render();try{const data=await api('markets?refresh=1');if(epoch!==dataEpoch)return;S.markets=data;S.marketError=S.markets.stale?'Showing stale data. Do not use it to trade.':null;}catch(e){if(epoch===dataEpoch)S.marketError=e.message;}finally{if(epoch===dataEpoch){S.marketLoading=false;render();}}}
async function fetchWallet(owner,{preserve=true}={}){if(!isAddress(owner)){toast('Enter a valid Solana address.');return;}const epoch=++walletEpoch;if(S.owner!==owner)S.tokenPage=0;S.owner=owner;if(S.batch?.owner!==owner){const pending=S.journal.find(b=>b.owner===owner&&hasUnresolved(b));if(pending)S.batch={...pending,items:pending.items.map(i=>({...i})),decision:{quotes:[]}};}S.walletLoading=true;S.walletError=null;if(!preserve){S.tokens=[];S.selection={};invalidate();}render();try{let w=await api('wallet?address='+encodeURIComponent(owner));if(epoch!==walletEpoch||S.owner!==owner)return;S.tokens=w.tokens||[];queueIntelligence(S.tokens.filter(t=>!t.native).slice(0,12).map(t=>t.mint));S.walletPartial=!!w.partial;S.pricingPartial=!!w.pricingPartial;S.pricingDeferred=Number.isSafeInteger(w.pricingDeferred)?w.pricingDeferred:0;S.walletTime=w.observedAt;let old=preserve?S.selection:loadLocal('squeeze.selection.v2.'+owner,{});let next;try{next=validSelection(S.tokens,old);}catch{next={};}if(JSON.stringify(next)!==JSON.stringify(S.selection)){if(preserve&&Object.keys(S.selection).length)toast('Balances changed. Your bag was updated; review it again.');invalidate();}S.selection=next;saveSelection();}catch(e){if(epoch!==walletEpoch)return;S.walletError=e.message;}finally{if(epoch===walletEpoch){S.walletLoading=false;render();}}}
async function runAnalysis(){if(S.analyzing||S.txBusy)return;if(S.batch?.owner===S.owner&&S.batch.items.some(i=>['unknown','confirming','submitting'].includes(i.status))){openBatch();toast('Check the existing transaction before starting another bag.');return;}if(!count()){openPicker();return;}if(S.walletPartial){toast('Refresh the wallet to load all balances before analyzing.');return;}invalidate();const rev=S.revision;S.analysisController=new AbortController();S.analyzing=true;render();announce('Finding a destination. No transaction has been requested.');try{let d=await api('analyze',{owner:S.owner,sources:sources(),slippageBps:S.slippage},{signal:S.analysisController.signal});if(rev!==S.revision)return;S.decision=d;S.aiDecision=d;S.targetMint=d.target?.mint||null;S.targetMode='ai';announce(d.status==='PICK'?`PIP picked ${d.target.symbol}. ${sampleMode?'Review the sample.':'Review before signing.'}`:d.reason);render();if(matchMedia('(max-width:680px)').matches)$('.pick-panel')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});}catch(e){if(rev!==S.revision||e.name==='AbortError')return;S.analysisError={message:e.message,code:e.code};announce(e.message);}finally{if(rev===S.revision){S.analyzing=false;render();}}}
function cancelAnalysis(){invalidate();render();announce('Analysis canceled. Tokens are unchanged.');}
function openSheet(title,content,{footer='',wide=false,type=null}={}){const sheet=$('#sheet');clearInterval(reviewTicker);reviewTicker=null;if(!sheet.open)dialogTrigger=document.activeElement;S.dialog=type;sheet.className=wide?'wide':'';if(type)sheet.classList.add(type);sheet.innerHTML=`<div class="sheet-header"><h2 id="sheet-title">${title}${sampleMode?'<small class="sample-dialog-badge">Sample data</small>':''}</h2><button class="icon-button" data-action="close-sheet" aria-label="Close dialog">${icon('close')}</button></div><div class="sheet-body">${content}</div>${footer?`<div class="sheet-footer">${footer}</div>`:''}`;if(!sheet.open)sheet.showModal();sheet.querySelector('input:not([type=checkbox]),button')?.focus({preventScroll:true});markSelectAll();}
function closeSheet(){if(S.txBusy){toast(sampleMode?'Wait for this sample simulation to finish.':'Wait for the wallet request to finish or cancel it in your wallet.');return;}if(S.dialog==='wallet'&&accountClient.state.status==='verifying')accountClient.cancel().catch(()=>{accountError='Sign-out could not be confirmed. Reopen the wallet sheet and retry.';});const packed=S.dialog==='picker'?getRects(Object.keys(S.selection)):[];clearInterval(reviewTicker);reviewTicker=null;$('#sheet').close();S.dialog=null;if(dialogTrigger?.isConnected)dialogTrigger.focus({preventScroll:true});else if(dialogTrigger?.dataset?.action){document.querySelector(`[data-action="${CSS.escape(dialogTrigger.dataset.action)}"]`)?.focus({preventScroll:true});}if(packed.length){$('.bag-object')?.scrollIntoView({block:'center',behavior:'instant'});pulseBag();}}
// Search inputs consume Escape natively; the dialog's close contract has priority.
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#sheet').open){e.preventDefault();e.stopPropagation();closeSheet();}},true);
$('#sheet').addEventListener('cancel',e=>{e.preventDefault();closeSheet();});
$('#sheet').addEventListener('click',e=>{if(e.target===$('#sheet')){let r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSheet();}});
function openPicker(){if(!S.owner){openWallet();return;}if($('.workspace>.token-panel')?.offsetParent!==null&&!matchMedia('(max-width:680px)').matches){let el=$('[data-input=token-search]');el?.focus();$('.token-panel')?.scrollIntoView({block:'nearest'});return;}openSheet('Choose tokens',tokenPanel(true),{type:'picker',footer:pickerFooter()});observeTokenCards();}
function pickerFooter(){return `<div class="picker-summary"><span class="picker-bag-target">${bagArt(!!count())}</span><div class="picker-total">${count()} selected<strong>${priceSummary()}</strong></div></div><button class="button primary block" data-action="close-sheet">Pack ${count()?count()+' tokens':'tokens'} ${icon('arrow')}</button>`;}
function updatePicker(){if(!$('#sheet').open)return;const f=safeFocusId(),top=$('#sheet .token-list')?.scrollTop||0,bodyTop=$('#sheet .sheet-body')?.scrollTop||0;$('#sheet .sheet-body').innerHTML=tokenPanel(true);$('#sheet .sheet-footer').innerHTML=pickerFooter();markSelectAll();restoreFocus(f);let list=$('#sheet .token-list');if(list)list.scrollTop=top;if($('#sheet .sheet-body'))$('#sheet .sheet-body').scrollTop=bodyTop;}
function openWallet(){if(sampleMode){openSampleControls();return;}const connected=!!S.owner&&bridge.account?.address===S.owner,current=connected?bridge.wallet:null;const {title,html}=walletSheet({owner:S.owner,connected,wallet:current?{name:current.name,icon:current.icon}:null,detected:bridge.wallets.map((w,index)=>({name:w.name,icon:w.icon,index})),pendingIndex:S.connecting?S.connectingIndex:null,touch:matchMedia('(pointer:coarse)').matches,pageUrl:location.origin+location.pathname,origin:location.origin,accountPanel:connected?accountPanel():''});openSheet(title,html,{type:'wallet'});checkAccountSession();
 // Learn whether a server session can exist, so an unverified visitor is not offered "Sign out". If the check fails the
 // state stays unknown and Sign out stays available (it may still need to clear a server session).
 if(connected&&accountSessionPossible===null)discoverAccountSession().then(()=>{if(S.dialog==='wallet')updateAccountPanel();}).catch(()=>{});}
function openWatch(){if(sampleMode){openSampleControls();return;}openSheet('View a wallet',`<p>Read balances only. This does not let SQUEEZE sign or move funds.</p><form id="watch-form"><div class="form-field"><label for="watch-address">Solana address</label><input id="watch-address" name="address" type="text" autocomplete="off" spellcheck="false" placeholder="Paste a public address" value="${esc(S.owner)}" aria-describedby="address-error"><p id="address-error" class="form-error" role="alert"></p></div><button class="button primary block" type="submit">Load tokens ${icon('arrow')}</button></form>`,{type:'watch'});$('#watch-address').focus();}
let connectSeq=0;
async function connectWallet(index){if(sampleMode||(S.connecting&&S.connectingIndex===index))return;const attempt=++connectSeq;const previousOwner=S.owner;const w=bridge.wallets[index];if(!w)return;const button=$(`[data-action=connect-wallet][data-index="${index}"]`);if(button){button.setAttribute('aria-busy','true');button.classList.add('is-pending');const st=button.querySelector('.wallet-state');if(st){st.classList.remove('is-ready');st.innerHTML='<i class="spinner" aria-hidden="true"></i>Approve';}}S.connecting=true;S.connectingIndex=index;try{const account=await bridge.connect(w);if(attempt!==connectSeq)return;S.readOnly=false;closeSheet();render();if(account.features?.includes('solana:signMessage'))openWallet();if(previousOwner===account.address&&!S.walletLoading&&!S.tokens.length)await fetchWallet(account.address,{preserve:false});}catch(e){if(e?.superseded||attempt!==connectSeq)return;S.connecting=false;S.connectingIndex=null;if(S.dialog==='wallet')openWallet();let el=$('#wallet-error');if(el)el.textContent=e.message||'Connection was declined. Try again when ready.';$(`[data-action=connect-wallet][data-index="${index}"]`)?.focus({preventScroll:true});}finally{if(attempt===connectSeq){S.connecting=false;S.connectingIndex=null;}}}
function openConnections(){
 if(sampleMode){openSampleControls();return;}
 const h=S.health,checks=h?.providerChecks||[];
 const last=(service)=>{const check=checks.find(c=>c.service===service);return check?`${check.status==='reachable'?'Responded':'Unavailable'}${check.stale?' · older check':''} · ${time(check.checkedAt)}`:'Not checked yet';};
 const rows=[['App server',h?'Reachable':'Unavailable'],['Wallet RPC',h?.rpcConfigured?'Configured':'Public RPC fallback'],['Jupiter quotes',h?.quotesTier==='keyed'?'Configured (API key)':h?.quotesTier==='free-rate-limited'?'Free tier, rate-limited (no API key)':'Not configured'],['Price history',h?.priceHistory?'Public adapter':'Not available'],['Drawdown baseline',h?.athBasis==='coingecko-all-time-high'?'CoinGecko all-time high':h?.athBasis==='observed-maximum'?'GeckoTerminal observed maximum (no CoinGecko key)':'Not available'],[h?.aiEngine==='rule'?'Suggestions (not AI)':'PIP AI',h?.aiEngine==='rule'?'Rule-based ranking':h?.ai?'Configured':'Not configured'],['Stock quote registry',`${h?.stockRegistry||0} entries`],['Reviewed pools',`${h?.approvedPools||0} entries`],['Tracked wallets',`${h?.trackedWallets||0} configured`],['X callouts',h?.x?'Configured':'Not configured'],['Pump Callouts','No connected adapter'],['Mainnet signing',h?.restoreReviewRequired?'Locked · restore needs review':h?.trading||h?.manualTrading||h?.solTrading?'Enabled · approval required':'Locked']];
 openSheet('Connections',`<p>Real data only. Missing sources stay empty.</p>${rows.map(([a,b])=>`<div class="connection-row"><b>${a}</b><span>${esc(b)}</span></div>`).join('')}<details class="details-box" open><summary>Last provider responses</summary><p class="small muted">These checks confirm a response, not a valid trade or a good AI decision.</p>${[['rpc','Wallet RPC'],['market','Market data'],['priceHistory','Price history'],['ath','Reported ATH'],['jupiter','Jupiter'],['ai','PIP AI'],['social','X']].map(([key,label])=>`<div class="connection-row"><b>${label}</b><span>${esc(last(key))}</span></div>`).join('')}</details><details class="details-box"><summary>Server setup</summary><p>Credentials belong in the server’s <code>.env</code>, never in this page.</p><p>Configure RPC, Jupiter and AI access, then the reviewed quote mints, pool origins and public wallet identities in <code>config/</code>. Run <code>node scripts/doctor.mjs</code>. Read <code>README.vi.md</code> before enabling mainnet signing.</p></details>`,{footer:'<button class="button block" data-action="refresh-health">Refresh status</button>',type:'connections'});
}
function openHow(){
 openSheet('Pack. Check. Review.',`<div class="how-gallery"><div class="how-step">${art('packing')}<div><span class="step-number">1</span><h3>Pack your bag</h3><p>Choose tokens and amounts. Nothing leaves your wallet.</p></div></div><div class="how-step">${art('evidence')}<div><span class="step-number">2</span><h3>Let PIP pick. Or choose yours.</h3><p>Compare stock-paired memes and their evidence. Prefer out? Choose SOL.</p></div></div><div class="how-step">${art('point')}<div><span class="step-number">3</span><h3>You review & sign</h3><p>See minimum received and fees. Approve each swap separately.</p></div></div></div><div class="sheet-callout">A stock-paired meme is not a stock token or company shares. Native SOL is a separate exit.</div>`,{wide:true,type:'how',footer:'<button class="button primary block" data-action="close-sheet">Let’s pack a bag '+icon('arrow')+'</button>'});
}
function openPrivacy(){openSheet('Your wallet. Your control.',`<p>No private keys. No custody. No automatic signatures.</p><div class="how-step"><div><h3>Public data</h3><p>Your address is sent to the configured RPC and metadata providers when you load a wallet. Analyzing sends shortlisted public evidence to the configured AI provider, not your private keys.</p></div></div><div class="how-step"><div><h3>On this device</h3><p>Current selections and recovery receipts stay on this device. Historical saved data remains available through account export. Receipt exports include the public wallet address. No analytics or advertising trackers are included.</p></div></div><div class="how-step"><div><h3>On the app server</h3><p>If you explicitly verify ownership, the server stores your wallet account, an expiring HttpOnly session and account-request audit records. A verification message never authorizes a swap. Pending swap identifiers and signed-transaction outcomes are journaled for recovery. Clearing this device does not delete server records; financial recovery and security audit records may be retained. Signing data is never used to move a different amount or to another destination.</p></div></div>${!sampleMode&&accountClient.state.status==='authenticated'?'<div class="card-actions"><button class="button" data-action="account-export">Export account data</button><button class="button" data-action="account-revoke">Sign out all account sessions</button><button class="button" data-action="account-delete-review">Request account deletion</button></div>':''}<button class="button" data-action="clear-local">Clear receipts & this bag</button>`);}
function tokenDetails(original){if(!original)return;queueIntelligence([original.mint]);const t=tokenWithIntel(original),status=cookedStatus(t),facts=candidateFacts(t,S.aiDecision?.evidence||[]);openSheet(esc(t.symbol||'Token'),`<div class="decision-token">${tokenIcon(t)}<div><h3>${esc(t.name||t.symbol)}</h3><p class="small muted">${t.native?'Native SOL':t.stock?esc(t.stock)+' pair · meme, not shares':'Wallet token'}</p></div></div><div class="detail-chart">${chartHTML(t)}<small>USD · hourly closes · ${esc(t.chart?.source||'History unavailable')}</small></div>${t.chart?.points?.length?`<details class="details-box"><summary>View observed price points (${t.chart.points.length})</summary><table class="price-points"><thead><tr><th>Timestamp</th><th>Close · USD</th></tr></thead><tbody>${t.chart.points.map(p=>`<tr><td>${date(new Date(p.t).toISOString())}</td><td>${priceUSD(p.p)}</td></tr>`).join('')}</tbody></table></details>`:''}<div class="review-facts"><div><span>Price</span><b>${priceUSD(t.priceUsd)}</b></div><div><span>24h change</span><b>${signedPct(t.change24h)}</b></div><div><span>Below ${esc(basisLabel(t.ath?.basis))}</span><b>${signedPct(t.ath?.changePct)}</b></div><div><span>${esc(basisLabel(t.ath?.basis))} · USD</span><b>${priceUSD(t.ath?.priceUsd)}</b></div><div><span>${esc(basisLabel(t.ath?.basis))} date</span><b>${t.ath?.at?date(t.ath.at):'Not available'}</b></div><div><span>Liquidity · indexed pool</span><b>${usd(t.liquidityUsd)}</b></div><div><span>24h volume · indexed pool</span><b>${usd(t.volume24h)}</b></div></div><div class="sheet-callout"><b>${status.label}</b> ${status.reasons.map(esc).join(' ')} <button class="text-button" data-action="cooked-help">See the rule</button></div>${facts.facts.map(f=>`<p>${esc(f.text)}</p>`).join('')}${facts.risks.map(r=>`<p class="caution">${esc(r)}</p>`).join('')}<div class="asset-details"><div class="value"><small>Mint</small><code>${esc(t.mint)}</code></div>${t.raw?`<div class="value"><small>Exact wallet balance</small><code>${esc(fromAtoms(t.raw,t.decimals))}</code></div>`:''}${t.pool?`<div class="value"><small>Pool</small><code>${esc(t.pool)}</code></div>`:''}${t.quoteMint?`<div class="value"><small>Stock quote mint</small><code>${esc(t.quoteMint)}</code></div>`:''}${sampleMode?'<p class="sample-inline">Sample asset. This is not a tradable mint.</p>':`<a href="https://solscan.io/token/${esc(t.mint)}" target="_blank" rel="noopener noreferrer">View mint on Solscan ${icon('external')}</a>`}${t.chart?.url?`<a href="${esc(safeURL(t.chart.url))}" target="_blank" rel="noopener noreferrer">View price history source ${icon('external')}</a>`:''}</div><p class="small muted">${sampleMode?'Illustrative sample prices and baseline. No market provider was queried.':t.ath?.basis==='observed-maximum'?`Baseline is the highest daily high observed for this pool${t.ath?.observedDays?' over '+t.ath.observedDays+' day'+(t.ath.observedDays===1?'':'s'):''} (${esc(t.ath?.coverage==='pool-lifetime'?'pool lifetime':'truncated window')}), compared with the latest daily close, from GeckoTerminal — not a coin-wide all-time high, and never the maximum of this 24h chart.`:'All-time high uses CoinGecko’s same-source price and coin-wide history, not the maximum of this 24h chart.'} ${t.ath?.status==='stale'?'ATH data is stale; not used to flag Cooked. ':''}${t.ath?.observedAt?'ATH snapshot: '+date(t.ath.observedAt)+'.':''} ${t.marketObservedAt?'Market fetched: '+date(t.marketObservedAt)+'.':''}</p>`,{type:'token-detail'});}
function openAmounts(){if(!count())return;openSheet('What goes in?',`<p>Set an exact amount for each token.</p><form id="amount-form">${S.tokens.filter(t=>S.selection[t.mint]).map(t=>`<div class="amount-editor">${tokenIcon(t)}<div class="token-name"><strong>${esc(t.symbol)}</strong><small>Max ${esc(exactLabel(t.raw,t.decimals))}</small></div><label class="sr-only" for="amt-${esc(t.mint)}">${esc(t.symbol)} amount</label><input id="amt-${esc(t.mint)}" data-amount-mint="${esc(t.mint)}" type="text" inputmode="decimal" value="${esc(fromAtoms(S.selection[t.mint],t.decimals))}" autocomplete="off"><button class="icon-button" type="button" data-action="amount-max" data-mint="${esc(t.mint)}" aria-label="Use maximum ${esc(t.symbol)} amount">${icon('plus')}</button></div>`).join('')}<p id="amount-error" class="form-error" role="alert"></p><button class="button primary block" style="margin-top:22px" type="submit">Update bag ${icon('check')}</button></form>`,{type:'amounts'});}
function openWhy(){let d=S.decision;if(!d)return;openSheet(d.status==='PICK'?'Why this token?':'Why stay put?',`<p>${esc(d.reason)}</p>${d.risk?`<div class="sheet-callout">${esc(d.risk)}</div>`:''}${(d.evidence||[]).length?`<h3 class="small">Source evidence</h3>${d.evidence.map(e=>evidenceRow(e)).join('')}`:'<p class="muted small">No qualifying source evidence was available.</p>'}${(d.candidates||[]).length?`<details class="details-box"><summary>Other candidates (${d.candidates.length})</summary>${d.candidates.map(t=>`<div class="connection-row"><b>${esc(t.symbol)}</b><span>${esc(t.rejected|| (d.mint===t.mint?'Selected':'Not selected by PIP'))}</span></div>`).join('')}</details>`:''}<p class="private-note muted">${esc(d.model?'Model: '+d.model+'. ':'')}Observed ${time(d.observedAt)}. This snapshot is not a promise of future returns.</p>`,{wide:true,type:'why'});}
function openEvidence(id){let all=[...(S.decision?.evidence||[]),...(S.aiDecision?.evidence||[])],e=all.find(e=>e.id===id);if(!e)return;openSheet(esc(e.title),evidenceRow(e)+`<details class="details-box"><summary>Evidence details</summary><p>ID: <code>${esc(e.id)}</code></p>${e.wallet?`<p>Wallet: <code>${esc(e.wallet)}</code></p>`:''}<p>Observed: ${date(e.observedAt)}</p>${safeURL(e.identitySource)?`<a href="${esc(safeURL(e.identitySource))}" target="_blank" rel="noopener noreferrer">Public identity source</a>`:''}${e.disclosure?`<p>${esc(e.disclosure)}</p>`:''}</details>`);}
function persistBatch(){if(sampleMode&&S.batch)S.batch.dataMode='sample';storeLocal('squeeze.batch.v2',S.batch);S.journal=mergeHistory(S.journal,S.batch);storeLocal('squeeze.history.v4',S.journal);}
function openReview(){
 if(S.decision?.status!=='PICK'||S.txBusy)return;
 if(S.batch?.owner===S.owner&&hasUnresolved(S.batch)){openBatch();return;}
 if(S.batch)persistBatch();
 S.batch={owner:S.owner,target:S.decision.target,decision:S.decision,slippageBps:S.slippage,
  items:sources().map(item=>{const t=source(item.mint);return {...item,symbol:t?.symbol||shortAddress(item.mint),decimals:t?.decimals||0,image:t?.image,sampleArt:t?.sampleArt,dataMode:t?.dataMode,priceUsd:t?.priceUsd,status:'queued'};}),createdAt:new Date().toISOString()};
 S.order=null;S.batchError=null;S.ack=true;S.reviewOperation='';persistBatch();openBatch();
}
const activeBatch=()=>S.batch&&S.batch.owner===S.owner;
function nextItem(){return activeBatch()?S.batch.items.find(i=>i.status!=='finalized'):null;}
function batchMarkup(){return buildSwapModal(S.batch,S.order,{sample:sampleMode,busy:S.txBusy,operation:S.reviewOperation,error:S.batchError,
 signingAllowed:canSignSelection(S.batch.decision?.mode||(S.batch.target.native?'sol':'ai')),ownerConnected:bridge.account?.address===S.batch.owner,
 slippageBps:S.batch.slippageBps??S.slippage},{icon,tokenIcon,usd});}
function startReviewTicker(){
 clearInterval(reviewTicker);reviewTicker=null;
 if(S.dialog!=='review'||document.hidden)return;
 reviewTicker=setInterval(()=>{
  const el=$('[data-review-expiry]');if(!el||!el.dataset.expiresAt)return;
  const remaining=Math.max(0,Math.ceil((Number(el.dataset.expiresAt)-Date.now())/1000));
  if(!remaining&&!el.classList.contains('expired')&&!S.txBusy){updateBatch();return;}
  el.textContent=remaining?`Current quote · ${remaining}s`:'Quote expired';el.classList.toggle('expired',!remaining);
 },1000);
}
function openBatch(){
 if(!activeBatch())return;
 const {content,footer,title}=batchMarkup();
 openSheet(`<span id="review-title-text">${esc(title)}</span>`,content,{footer,type:'review'});
 $('#sheet').classList.add('multiswap');$('#sheet').setAttribute('tabindex','-1');S.reviewPendingFocus=null;
 $('#sheet .sheet-header').insertAdjacentHTML('beforeend','<div id="review-announcement" class="sr-only" role="status" aria-live="polite"></div>');
 startReviewTicker();autoPrepareReview();
}
function updateBatch(){
 if(S.dialog!=='review')return;
 const focus=safeFocusId()||(document.activeElement===$('#sheet')?S.reviewPendingFocus:null),body=$('#sheet .sheet-body'),top=body.scrollTop;
 const open=new Set($$('#sheet details[open][data-review-leg]').map(el=>el.dataset.reviewLeg));
 const {content,footer,title,model}=batchMarkup();
 body.innerHTML=content;$('#sheet .sheet-footer').innerHTML=footer;
 const titleEl=$('#review-title-text');if(titleEl)titleEl.textContent=title;
 for(const el of $$('#sheet details[data-review-leg]'))if(open.has(el.dataset.reviewLeg))el.open=true;
 body.scrollTop=top;
 if(focus){const next=$('#sheet').querySelector(`[data-focus="${CSS.escape(focus)}"]`);if(next?.disabled){S.reviewPendingFocus=focus;$('#sheet').focus({preventScroll:true});}else{restoreFocus(focus);S.reviewPendingFocus=null;}}
 const live=$('#review-announcement'),message=`${model.done} of ${model.total} ${sampleMode?'simulated':'confirmed'}. ${S.reviewOperation==='signing'?'Approve the current swap in your wallet.':S.reviewOperation==='simulating'?'Simulating the current swap.':model.pending?'Other swaps are paused until this result is checked.':S.order?(S.order.expiresAt<=Date.now()?'Quote expired. Refresh before approving.':'Review the current swap before approving.'):title}`;
 if(live&&live.textContent!==message)live.textContent=message;
 startReviewTicker();
}
/** Read-only preparation is automatic; signing/simulation still requires one click per leg. */
function autoPrepareReview(){
 if(S.dialog!=='review'||S.txBusy||S.order||S.batchError||!activeBatch()||hasUnresolved(S.batch))return;
 const item=nextItem();if(!item||item.status!=='queued')return;
 if(!sampleMode&&(!canSignSelection(S.batch.decision?.mode||(S.batch.target.native?'sol':'ai'))||bridge.account?.address!==S.batch.owner))return;
 if(!S.batch.decision?.id)return;
 void prepareOrder();
}
async function prepareOrder(){
 if(S.txBusy||!activeBatch()||hasUnresolved(S.batch))return;
 const item=nextItem();if(!item||item.status!=='queued')return;
 const batch=S.batch,epoch=dataEpoch;S.order=null;S.txBusy=true;S.reviewOperation='preparing';S.batchError=null;updateBatch();
 try{
  const order=await api('order',{decisionId:batch.decision.id,inputMint:item.mint,slippageBps:batch.slippageBps??S.slippage});
  if(batch!==S.batch||epoch!==dataEpoch)return;
  if(order.intent?.owner!==S.owner||order.intent.inputMint!==item.mint||order.intent.outputMint!==batch.target.mint||order.intent.raw!==item.raw)throw new Error('Transaction intent changed. Nothing was signed. Refresh the remaining quotes.');
  if(!Number.isFinite(order.expiresAt)||atomic(order.intent.minimum)<=0n||atomic(order.quote?.outAmount)<atomic(order.intent.minimum))throw new Error('The transaction parameters could not be verified. Nothing was signed.');
  S.order=order;
  const publicQuote=summarizeSwapQuote(item,batch.target.mint,{...order.quote,minimum:order.intent.minimum,observedAt:new Date().toISOString()});
  batch.decision.quotes=[...(batch.decision.quotes||[]).filter(q=>q.mint!==item.mint),publicQuote];persistBatch();
  announce(sampleMode?'Sample quote ready. Review and simulate this swap.':'Transaction checked. Review the minimum and fees before approving.');
 }catch(e){if(batch===S.batch&&epoch===dataEpoch){S.order=null;S.batchError=e.message;}}
 finally{if(batch===S.batch&&epoch===dataEpoch){S.txBusy=false;S.reviewOperation='';updateBatch();}}
}
async function signOrder(){
 if(sampleMode){toast('Use Simulate in sample mode. No wallet signature is requested.');return;}
 if(S.txBusy||!S.order||!activeBatch()||hasUnresolved(S.batch))return;
 const item=nextItem(),order=S.order;if(!item||item.status!=='queued')return;
 if(Date.now()>order.expiresAt){S.batchError='Quote expired. Refresh this swap before approving.';updateBatch();return;}
 S.txBusy=true;S.reviewOperation='signing';S.batchError=null;updateBatch();let submitted=false;
 try{
  const bytes=await bridge.sign(fromBase64(order.transaction),S.owner);
  if(Date.now()>order.expiresAt)throw new Error('Quote expired while your wallet was open. Nothing was sent. Refresh the quote.');
  item.orderId=order.orderId;item.minimum=order.intent.minimum;const wire=parseWire(bytes);item.signature=encode58(bytes.slice(wire.signatureOffset,wire.signatureOffset+64));
  item.status='submitting';persistBatch();submitted=true;S.reviewOperation='submitting';updateBatch();
  const result=await api('execute',{orderId:order.orderId,signedTransaction:toBase64(bytes)});applyResult(item,result);S.order=null;
 }catch(e){if(submitted){item.status='unknown';S.batchError='Submission result is unknown. Check the existing transaction. Do not submit again.';persistBatch();}else{S.batchError=e.message||'Signature declined. Nothing was sent.';S.order=null;}}
 finally{S.txBusy=false;S.reviewOperation='';updateBatch();if(['submitting','confirming','unknown'].includes(item.status))schedulePoll();else if(item.status==='finalized')autoPrepareReview();}
}
function applyResult(item,result){if((result.dataMode==='sample')!==sampleMode)throw new Error('Sample/live result mismatch. No result was applied.');if(result.signature)item.signature=result.signature;if(['finalized','failed','confirming','unknown','submitting'].includes(result.status))item.status=result.status;else item.status='unknown';if(result.status==='finalized'){item.received=result.received;item.slot=result.slot;item.fee=result.feeLamports;item.confirmedAt=new Date().toISOString();delete S.selection[item.mint];saveSelection();announce(`${item.symbol} ${sampleMode?'sample swap simulated':'swap verified'}.`);}if(result.status==='failed'){S.batchError=sampleMode?'This sample swap failed. Earlier sample results remain. No real funds moved.':'This transaction failed. Earlier swaps remain completed. Recheck your wallet before making a new bag.';}persistBatch();}
function schedulePoll(){clearTimeout(S.pollTimer);if(sampleMode)return;if(document.hidden||S.pollCount>=30)return;S.pollTimer=setTimeout(()=>checkStatus(false),3500);}
async function checkStatus(manual=true){
 if(!activeBatch()||S.txBusy)return;const item=S.batch.items.find(i=>['submitting','confirming','unknown'].includes(i.status));if(!item?.orderId)return;
 if(manual)S.pollCount=0;S.txBusy=true;S.reviewOperation='checking';updateBatch();
 try{let result;try{result=await api('status?id='+encodeURIComponent(item.orderId),undefined,{timeout:25000});}catch(e){if(e.code!=='NOT_FOUND'||!item.signature||!item.minimum)throw e;result=await api('reconcile',{signature:item.signature,intent:{owner:S.batch.owner,inputMint:item.mint,outputMint:S.batch.target.mint,raw:item.raw,minimum:item.minimum}},{timeout:25000});}
  applyResult(item,result);S.batchError=result.status==='unknown'?'Result not finalized yet. Keep the existing transaction.':result.status==='failed'?S.batchError:null;
 }catch(e){S.batchError=e.message;item.status='unknown';persistBatch();}
 finally{S.txBusy=false;S.reviewOperation='';S.pollCount++;updateBatch();if(['submitting','confirming','unknown'].includes(item.status))schedulePoll();else{S.pollCount=0;render();if(item.status==='finalized')autoPrepareReview();}}
}
async function recheckBatch(){
 if(S.txBusy||!activeBatch()||hasUnresolved(S.batch))return;const remaining=S.batch.items.filter(i=>i.status==='queued');if(!remaining.length||S.batch.items.some(i=>i.status==='failed'))return;
 S.order=null;S.txBusy=true;S.reviewOperation='preparing';S.batchError=null;updateBatch();
 try{const d=await api(S.batch.decision?.mode&&S.batch.decision.mode!=='ai'?'destination':'analyze',{owner:S.owner,sources:remaining.map(({mint,raw})=>({mint,raw})),slippageBps:S.batch.slippageBps??S.slippage,...(S.batch.decision?.mode&&S.batch.decision.mode!=='ai'?{mode:S.batch.decision.mode,targetMint:S.batch.target.mint}:{})});
  if(d.status!=='PICK')throw new Error(d.reason||'No destination is currently eligible.');
  if(d.target.mint!==S.batch.target.mint||d.owner!==S.batch.owner||remaining.some(i=>!d.sources?.some(s=>s.mint===i.mint&&s.raw===i.raw)))throw new Error('The proposed destination or amounts changed. Close and review a new bag; nothing changes silently.');
  const completedQuotes=(S.batch.decision?.quotes||[]).filter(q=>S.batch.items.some(i=>i.mint===q.mint&&i.status==='finalized'));
  S.batch.decision={...d,quotes:[...completedQuotes,...(d.quotes||[])]};persistBatch();
 }catch(e){S.batchError=e.message;}
 finally{S.txBusy=false;S.reviewOperation='';updateBatch();autoPrepareReview();}
}
async function exportPick(){
 const d=S.decision;if(d?.status!=='PICK'||S.shareBusy)return;S.shareBusy=true;
 try{
  const c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d');
  x.fillStyle='#101417';x.fillRect(0,0,1200,630);x.fillStyle='#1e2921';x.beginPath();x.roundRect(30,30,1140,570,28);x.fill();
  x.fillStyle='#D7FF65';x.font='800 26px Arial';x.fillText('SQUEEZE',65,85);x.font='600 15px Arial';x.fillStyle='#B6C2BA';x.fillText((d.mode==='sol'?'SOL EXIT':d.mode==='manual'?'YOUR PICK':'AI PICK')+(sampleMode?' · SAMPLE DATA':' · NOT A TRADE'),885,80);
  const load=src=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src;setTimeout(()=>resolve(null),5000);});
  const [logo,pip]=await Promise.all([load(assetURL('/assets/brand/logo.webp')),load(assetURL('/assets/pip/point.webp'))]);
  if(logo){x.fillStyle='#1e2921';x.fillRect(55,45,300,66);x.drawImage(logo,60,37,250,82);}
  if(pip)x.drawImage(pip,845,185,260,280);
  x.fillStyle='#F4F6E8';x.font='800 58px Arial';x.fillText('New bag.',65,180);x.fillStyle='#D7FF65';x.fillText('Reasons attached.',65,248);
  x.fillStyle='#F4F6E8';x.font='700 36px Arial';const label=d.target.native?'SOL · native Solana':String(d.target.symbol)+' / '+d.target.stock;let short=label;while(x.measureText(short).width>735&&short.length>5)short=short.slice(0,-2);x.fillText(short+(short!==label?'…':''),65,326);
  function wrapped(text,y,width,maxLines){let words=String(text).split(/\s+/),line='',lines=0;for(let i=0;i<words.length;i++){let next=line+words[i]+' ';if(x.measureText(next).width>width&&line){x.fillText(line.trim(),65,y);y+=29;lines++;line='';if(lines===maxLines-1){let rest=words.slice(i).join(' ');while(x.measureText(rest+'…').width>width&&rest.length)rest=rest.slice(0,-1);x.fillText(rest+'…',65,y);return y;} }line+=words[i]+' ';}if(line)x.fillText(line.trim(),65,y);return y;}
  x.fillStyle='#CBD4CE';x.font='22px Arial';wrapped(d.reason,377,740,3);
  x.fillStyle='#FFD37D';x.font='17px Arial';wrapped('Risk: '+d.risk,484,1010,2);
  x.fillStyle='#B6C2BA';x.font='14px Arial';x.fillText((d.target.native?'Native SOL. Manual exit. Snapshot: ':'Stock-paired meme. Not shares. Snapshot: ')+date(d.observedAt),65,570);
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw new Error('Unable to export this image. Try again.');
  download(blob,(sampleMode?'squeeze-SAMPLE-pick-':'squeeze-pick-')+d.target.symbol.replace(/[^a-z0-9_-]/gi,'')+'.png');toast('Pick image exported. Your wallet address stays private.');
 }catch(e){toast(e.message||'Unable to export. Try again.');}finally{S.shareBusy=false;}
}
function download(blob,name){let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function normalizeRoute(){if((location.hash!=='#main'&&location.hash!=='#squeeze')||location.pathname.startsWith('/shared/'))history.replaceState(null,'',location.protocol==='file:'?'#squeeze':(location.pathname.startsWith('/shared/')?'/':location.pathname)+location.search+'#squeeze');}
function refreshTokenList(){for(let list of $$('.token-list'))list.innerHTML=tokenRows();for(let box of $$('[data-input=token-search]'))if(box!==document.activeElement)box.value=S.query;markSelectAll();observeTokenCards();}


document.addEventListener('input',e=>{const el=e.target;if(['global-percent','token-percent'].includes(el.dataset.input))el.dataset.dirty='true';if(el.dataset.input==='target-search'){S.targetQuery=el.value;const list=$('#sheet .browse-list');if(list)list.innerHTML=destinationCandidates().filter(t=>[t.symbol,t.name,t.mint,t.stock].some(v=>String(v||'').toLowerCase().includes(S.targetQuery.toLowerCase()))).map(t=>candidateCard(t,S.aiDecision?.evidence||[])).join('')||'<p class="no-results">No verified pair matches. Try its mint or clear the search.</p>';}});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.input==='sample-scenario'){resetSampleFlow(el.value);return;}if(!['global-percent','token-percent'].includes(el.dataset.input))return;delete el.dataset.dirty;try{const result=applyPercentage(S.tokens,S.selection,el.value,el.dataset.input==='token-percent'?el.dataset.mint:null);if(el.dataset.input==='global-percent')S.bps=result.bps;el.removeAttribute('aria-invalid');changeSelection(result.selection,'Bag amounts updated.');}catch(err){el.setAttribute('aria-invalid','true');toast(err.message);el.focus();}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&['global-percent','token-percent'].includes(e.target.dataset.input)){e.preventDefault();e.target.blur();}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;try{switch(b.dataset.action){case 'token-page':S.tokenPage=Math.max(0,Number(b.dataset.page)||0);refreshTokenList();for(const list of $$('.token-list')){list.scrollTop=0;if(list.offsetParent!==null)list.focus({preventScroll:true});}break;case 'token-filter':S.tokenPage=0;S.tokenFilter=b.dataset.filter;render();break;case 'select-cooked':changeSelection(cookedSelection(S.tokens,S.selection,visibleTokens(),S.bps||10000),'Cooked tokens packed. Nothing has been sold.');break;case 'cooked-help':openCookedHelp();break;case 'scan-tokens':queueIntelligence(visibleTokens().filter(t=>!t.native).slice(0,20).map(t=>t.mint));toast('Checking data for up to 20 shown tokens. Unknown tokens are never flagged automatically.');break;case 'browse-targets':openBrowseTargets();break;case 'choose-target':await chooseDestination(b.dataset.mint,'manual');break;case 'choose-sol':await chooseDestination(WSOL,'sol');break;}}catch(err){toast(err.message);}});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.input==='token-check')toggleToken(el.dataset.mint);if(el.dataset.input==='select-all'){try{const shown=visibleTokens();changeSelection(selectVisible(S.tokens,S.selection,shown,S.bps||10000),'Visible token selection updated.');}catch(err){toast(err.message);markSelectAll();}}});
document.addEventListener('input',e=>{if(e.target.dataset.input==='token-search'){S.query=e.target.value;S.tokenPage=0;refreshTokenList();}});
document.addEventListener('submit',async e=>{if(e.target.id==='watch-form'){e.preventDefault();if(sampleMode)return;const val=$('#watch-address').value.trim();if(!isAddress(val)){$('#address-error').textContent='Paste a valid Solana public address.';$('#watch-address').setAttribute('aria-invalid','true');$('#watch-address').focus();return;}S.readOnly=bridge.account?.address!==val;closeSheet();await fetchWallet(val,{preserve:false});}if(e.target.id==='amount-form'){e.preventDefault();try{let next={};for(let el of $$('[data-amount-mint]')){let t=source(el.dataset.amountMint),raw=toAtoms(el.value,t.decimals);if(atomic(raw)>atomic(t.raw))throw new Error(t.symbol+': amount exceeds your wallet balance.');if(atomic(raw)>0n)next[t.mint]=raw;}S.bps=0;closeSheet();changeSelection(next,'Exact token amounts updated.');}catch(err){$('#amount-error').textContent=err.message;}}});

document.addEventListener('click',async e=>{const button=e.target.closest('[data-action]');if(!button||button.disabled)return;const a=button.dataset.action;try{switch(a){case 'toggle-sample':await setSampleMode(!sampleMode);break;case 'sample-controls':openSampleControls();break;case 'reset-sample':await resetSampleFlow();break;case 'simulate-swap':await simulateSampleOrder();break;case 'wallet':openWallet();break;case 'watch-wallet':openWatch();break;case 'reload-wallets':location.reload();break;case 'connect-wallet':await connectWallet(Number(button.dataset.index));break;case 'disconnect':if(sampleMode){await setSampleMode(false);break;}if(S.txBusy)break;await signOutAccount();await bridge.disconnect();walletEpoch++;S.owner='';S.tokens=[];S.selection={};S.walletError=null;invalidate();closeSheet();render();break;case 'copy-owner':if(sampleMode){toast('This is a sample wallet, not your address.');break;}await navigator.clipboard.writeText(S.owner);toast('Address copied.');break;case 'picker':openPicker();break;case 'refresh-wallet':if(S.owner)await fetchWallet(S.owner);break;case 'refresh-market':await refreshMarkets();break;case 'dust':S.hideDust=!S.hideDust;render();break;case 'clear-filter':S.tokenPage=0;S.query='';S.hideDust=false;S.tokenFilter='all';render();break;case 'remove-token':toggleToken(button.dataset.mint);break;case 'clear-bag':clearBag();break;case 'edit-bag':openAmounts();break;case 'percent':changePercent(Number(button.dataset.percent));break;case 'amount-max':{let t=source(button.dataset.mint);let el=document.getElementById('amt-'+t.mint);el.value=fromAtoms(t.raw,t.decimals);break;}case 'analyze':await runAnalysis();break;case 'cancel-analysis':cancelAnalysis();break;case 'squeeze-bag':if(count()){pulseBag();await runAnalysis();}else openPicker();break;case 'connections':openConnections();break;case 'history':openSheet('Swap history',receiptHistory()||'<p>No swap receipts on this device for this wallet.</p>',{type:'history',wide:true});break;case 'view-receipt':viewReceipt(button.dataset.key);break;case 'export-receipt':exportReceipt();break;case 'resume-receipt':resumeReceipt();break;case 'refresh-health':await refreshHealth();openConnections();break;case 'how':openHow();break;case 'privacy':openPrivacy();break;case 'close-sheet':closeSheet();break;case 'token-details':tokenDetails(source(button.dataset.mint));break;case 'target-details':tokenDetails(S.decision?.target);break;case 'market-details':tokenDetails(destinationCandidates().find(t=>t.mint===button.dataset.mint)||S.markets?.tokens.find(t=>t.mint===button.dataset.mint));break;case 'market-help':openSheet('Market feed',`<p>${esc(S.marketError||'There are no eligible stock-paired memes in the connected registry.')}</p><p class="small muted">Only real, verified pool data is shown. No sample prices are inserted when a provider is unavailable.</p>`,{footer:'<button class="button block" data-action="connections">View connections</button>'});break;case 'why':openWhy();break;case 'evidence-item':openEvidence(button.dataset.id);break;case 'review':openReview();break;case 'prepare-order':await prepareOrder();break;case 'sign-order':await signOrder();break;case 'check-status':await checkStatus();break;case 'recheck-batch':await recheckBatch();break;case 'resume':openBatch();if(S.batch?.items.some(i=>['unknown','confirming','submitting'].includes(i.status)))await checkStatus();break;case 'finish-batch':closeSheet();invalidate();await fetchWallet(S.owner);break;case 'share':await exportPick();break;case 'motion':S.motion=!S.motion;setMotion(S.motion);storeLocal('squeeze.motion.v2',S.motion);render();break;case 'toast-action':{let fn=toastAction;$('#toast').hidden=true;toastAction=null;fn?.();break;}case 'dismiss-toast':$('#toast').hidden=true;toastAction=null;break;case 'clear-local':{if(S.journal.some(hasUnresolved)||S.batch?.items.some(i=>['unknown','confirming','submitting'].includes(i.status))){toast('Resolve the pending transaction before clearing recovery data.');break;}const old={journal:S.journal,batch:S.batch,selection:{...S.selection},owner:S.owner};S.journal=[];S.batch=null;S.order=null;storeLocal('squeeze.history.v4',[]);storeLocal('squeeze.batch.v2',null);S.selection={};saveSelection();invalidate();render();closeSheet();toast('Receipts and this bag cleared.','Undo',()=>{S.journal=old.journal;S.batch=old.batch;storeLocal('squeeze.history.v4',S.journal);storeLocal('squeeze.batch.v2',S.batch);if(S.owner===old.owner){S.selection=validSelection(S.tokens,old.selection);saveSelection();}render();});break;}}}catch(err){toast(err.message||'Unable to complete this action. Try again.');}});
let dragging=null;document.addEventListener('dragstart',e=>{let row=e.target.closest('[data-token-row]');if(!row||sourceEligibility(source(row.dataset.tokenRow))||S.txBusy){e.preventDefault();return;}dragging=row.dataset.tokenRow;e.dataTransfer.setData('application/x-squeeze-token',dragging);e.dataTransfer.effectAllowed='copy';$('.bag-panel')?.classList.add('drop-active');});document.addEventListener('dragover',e=>{if(e.target.closest('.bag-panel')&&dragging){e.preventDefault();e.dataTransfer.dropEffect='copy';}});document.addEventListener('drop',e=>{if(!e.target.closest('.bag-panel')||!dragging)return;e.preventDefault();if(!S.selection[dragging])toggleToken(dragging);else pulseBag();dragging=null;$('.bag-panel')?.classList.remove('drop-active');});document.addEventListener('dragend',()=>{dragging=null;$('.bag-panel')?.classList.remove('drop-active');});
document.addEventListener('pointerdown',e=>{let b=e.target.closest('.bag-object');if(b)b.classList.add('is-pressed');});document.addEventListener('pointerup',()=>$$('.bag-object').forEach(b=>b.classList.remove('is-pressed')));document.addEventListener('pointercancel',()=>$$('.bag-object').forEach(b=>b.classList.remove('is-pressed')));
bridge.addEventListener('change',()=>{if(sampleMode)return;if(S.dialog==='wallet'&&!S.txBusy)openWallet();});bridge.addEventListener('account',()=>{if(sampleMode)return;const addr=bridge.account?.address;if(lastConnectedAccount&&lastConnectedAccount!==addr){accountError='';accountClient.switchAccount().catch(()=>{accountError='Sign-out could not be confirmed. Retry before verifying again.';updateAccountPanel();});}lastConnectedAccount=addr||null;if(S.txBusy&&addr!==S.owner){S.batchError='Wallet account changed. Do not sign with another account.';updateBatch();return;}if(addr&&addr!==S.owner){S.readOnly=false;invalidate();fetchWallet(addr,{preserve:false});}else if(!addr&&S.owner){S.readOnly=true;render();}});
window.addEventListener('hashchange',()=>{if(location.hash==='#main'){document.getElementById('main')?.focus({preventScroll:true});return;}normalizeRoute();if($('#sheet').open&&!S.txBusy)closeSheet();render();window.scrollTo({top:0});});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInterval(reviewTicker);reviewTicker=null;}else if(S.dialog==='review')startReviewTicker();if(!document.hidden)drainIntelligence();if(document.hidden){clearTimeout(S.pollTimer);}else if(S.batch?.items.some(i=>['submitting','confirming','unknown'].includes(i.status))){schedulePoll();}});
window.addEventListener('pagehide',()=>{clearTimeout(intelDrainTimer);intelObserver?.disconnect();clearInterval(periodic);clearTimeout(S.pollTimer);S.analysisController?.abort();accountClient.invalidateFromPeer();accountChannel?.close();bridge.destroy();stopMotion();});

const MODE_FIELDS=['owner','readOnly','tokens','selection','bps','query','hideDust','walletError','walletPartial','pricingPartial','pricingDeferred','tokenPage','walletTime','health','healthError','markets','marketError','decision','batch','journal','tokenFilter','tokenSort','intel','targetMint','targetMode','targetQuery','destinationError','aiDecision','order','batchError','ack','slippage'];
function modeBanner(){return sampleMode?`<aside class="sample-bar" aria-label="Sample data mode"><div><strong>Sample data</strong><span>No wallet. No real funds.</span></div><div class="sample-actions"><button class="text-button" data-action="sample-controls">${esc(SAMPLE_SCENARIOS.find(([id])=>id===sampleSession.scenario)?.[1]||'Full flow')} ${icon('chevron')}</button><button class="icon-button" data-action="reset-sample" aria-label="Reset sample flow">${icon('refresh')}</button></div></aside>`:'';}
function openSampleControls(){openSheet('Try the whole flow',`<div class="sample-review-note">Sample data only. No AI/provider charges, wallet connection or transaction.</div><label class="scenario-label" for="sample-scenario">Choose a scenario</label><select id="sample-scenario" data-input="sample-scenario">${SAMPLE_SCENARIOS.map(([id,label])=>`<option value="${id}" ${id===sampleSession.scenario?'selected':''}>${esc(label)}</option>`).join('')}</select><p>${esc(SAMPLE_SCENARIOS.find(([id])=>id===sampleSession.scenario)?.[2]||'')}</p><p>Reset restores the sample balances. Your real bag and history stay separate.</p>${S.publicPreview?'<p>This preview is sample-only. Live APIs and wallet signing are disabled.</p>':'<button class="text-button" data-action="toggle-sample">Return to Live data '+icon('arrow')+'</button>'}`,{type:'sample-controls',footer:'<button class="button primary block" data-action="close-sheet">Keep exploring</button>'});}
async function setSampleMode(enabled,{initial=false}={}){
 if(modeBusy||enabled===sampleMode)return;
 if(!enabled&&S.publicPreview){toast('Live trading is disabled on this preview host.');return;}
 if(S.txBusy||S.connecting||S.shareBusy){toast('Finish the current request before switching data modes.');return;}
 if(!sampleMode&&(hasUnresolved(S.batch)||S.journal.some(hasUnresolved))){toast('Check the pending real transaction before opening Sample data.');return;}
 if(enabled&&!initial){modeBusy=true;try{await discoverAccountSession();if(accountSessionPossible||accountClient.state.status!=='anonymous')await signOutAccount();}finally{modeBusy=false;}}
 // Account HTTP may yield for seconds. Recheck live authority immediately
 // before the synchronous mode mutation, not only before the await above.
 if(S.txBusy||S.connecting||S.shareBusy){toast('Finish the current request before switching data modes.');return;}
 if(!sampleMode&&(hasUnresolved(S.batch)||S.journal.some(hasUnresolved))){toast('Check the pending real transaction before opening Sample data.');return;}
 modeBusy=true;dataEpoch++;walletEpoch++;invalidate();
 for(const ctrl of requestControllers)ctrl.abort();requestControllers.clear();
 clearTimeout(S.pollTimer);clearTimeout(intelDrainTimer);intelObserver?.disconnect();stopMotion();
 if($('#sheet').open)closeSheet();$('#toast').hidden=true;toastAction=null;
 if(enabled){
  liveSnapshot=Object.fromEntries(MODE_FIELDS.map(k=>[k,structuredClone(S[k])]));sampleSession.reset();sampleMode=true;S.sample=true;
  Object.assign(S,{owner:sampleSession.owner,readOnly:true,tokens:[],selection:{},bps:10000,query:'',hideDust:false,walletError:null,walletPartial:false,pricingPartial:false,pricingDeferred:0,health:null,healthError:false,markets:null,marketError:null,batch:null,journal:[],tokenFilter:'all',tokenPage:0,intel:{},slippage:100});
 }else{
  sampleMode=false;S.sample=false;sampleSession.reset();
  if(liveSnapshot)Object.assign(S,liveSnapshot);liveSnapshot=null;S.readOnly=bridge.account?.address!==S.owner;
  // A recommendation/order never survives a data-mode boundary.
  invalidate();
 }
 S.walletLoading=false;S.marketLoading=false;S.intelActive=0;S.intelPending=new Set();S.intelQueue=[];S.intelRetryAfter=0;S.dialog=null;S.view='bag';S.pollCount=0;
 document.documentElement.dataset.dataMode=sampleMode?'sample':'live';render();
 try{if(sampleMode)await Promise.all([refreshHealth(),refreshMarkets(),fetchWallet(S.owner,{preserve:false})]);else {await refreshHealth();if(!sampleMode){await refreshMarkets();if(S.owner)await fetchWallet(S.owner);}}}
 finally{modeBusy=false;render();$('.sample-toggle')?.focus({preventScroll:true});announce(sampleMode?'Sample data enabled. No wallet or real funds.':'Live data restored. Sample balances were removed.');}
}
async function resetSampleFlow(scenario=sampleSession.scenario){
 if(!sampleMode||S.txBusy||modeBusy)return;
 if(!SAMPLE_SCENARIOS.some(([id])=>id===scenario))return;
 dataEpoch++;walletEpoch++;invalidate();for(const ctrl of requestControllers)ctrl.abort();requestControllers.clear();clearTimeout(intelDrainTimer);clearTimeout(S.pollTimer);stopMotion();
 const reopen=S.dialog==='sample-controls';if($('#sheet').open)closeSheet();sampleSession.reset(scenario);
 Object.assign(S,{tokens:[],selection:{},bps:10000,batch:null,journal:[],intel:{},intelActive:0,intelQueue:[],intelPending:new Set(),intelRetryAfter:0,walletLoading:false,marketLoading:false,query:'',tokenFilter:'all',tokenPage:0,slippage:100,view:'bag',order:null,batchError:null,ack:false});
 await Promise.all([fetchWallet(sampleSession.owner,{preserve:false}),refreshMarkets()]);render();if(reopen)openSampleControls();announce('Sample flow reset. Your live bag is unchanged.');
}
async function simulateSampleOrder(){
 if(!sampleMode||S.txBusy||!S.order||!activeBatch())return;
 const item=nextItem(),order=S.order;if(!item||item.status!=='queued'||order.dataMode!=='sample')return;
 if(Date.now()>order.expiresAt){S.order=null;S.batchError='Sample quote expired. Prepare this swap again.';updateBatch();return;}
 S.txBusy=true;S.reviewOperation='simulating';S.batchError=null;updateBatch();
 try{const result=await sampleSession.simulate(order.orderId);item.orderId=order.orderId;item.minimum=order.intent.minimum;applyResult(item,result);S.order=null;if(result.status==='unknown')S.batchError='Sample result is unknown. Check this sample order; do not create another.';}
 catch(e){S.order=null;S.batchError=e.message;}
 finally{S.txBusy=false;S.reviewOperation='';updateBatch();render();if(item.status==='finalized')autoPrepareReview();}
}
if(document.documentElement.dataset.sampleOnly==='true')S.publicPreview=true;
normalizeRoute();
render();if(S.publicPreview||new URLSearchParams(location.search).get('sample')==='1'){setSampleMode(true,{initial:true});}else{refreshHealth().then(()=>{if(!sampleMode){refreshMarkets();}});}periodic=setInterval(()=>{if(!sampleMode&&!document.hidden&&!S.txBusy&&!S.analyzing&&!$('#sheet').open&&!document.activeElement?.matches('input')){refreshMarkets();if(S.owner&&!S.walletLoading)fetchWallet(S.owner);}},60000);

window.addEventListener('beforeunload',event=>{if(S.txBusy){event.preventDefault();event.returnValue='';}});

window.addEventListener('pagehide',()=>{clearInterval(reviewTicker);reviewTicker=null;});

})();