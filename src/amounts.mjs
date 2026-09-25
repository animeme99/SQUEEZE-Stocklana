/** Unmodified exact-amount primitives extracted from the SQUEEZE browser domain. */
export function atomic(s){if(typeof s!=='string'||!/^\d{1,30}$/.test(s))throw new Error('Invalid raw token amount');return BigInt(s);}
export function toAtoms(s,decimals){if(!Number.isInteger(decimals)||decimals<0||decimals>18)throw new Error('Unsupported decimals');if(typeof s!=='string'||!/^\d+(\.\d*)?$/.test(s.trim()))throw new Error('Enter a positive amount.');let [i,f='']=s.trim().split('.');if(f.length>decimals)throw new Error(`Use at most ${decimals} decimal places.`);return (BigInt(i)*10n**BigInt(decimals)+BigInt(f.padEnd(decimals,'0')||'0')).toString();}
export function fromAtoms(s,decimals=0){let n=atomic(String(s));let base=10n**BigInt(decimals);let f=(n%base).toString().padStart(decimals,'0').replace(/0+$/,'');return (n/base).toString()+(f?'.'+f:'');}
export function portion(s,bps){if(!Number.isInteger(bps)||bps<0||bps>10000)throw new Error('Invalid percentage');return (atomic(s)*BigInt(bps)/10000n).toString();}
export function minOut(raw,bps){return portion(raw,10000-bps);}
