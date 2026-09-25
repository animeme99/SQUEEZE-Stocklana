import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const inventory=JSON.parse(fs.readFileSync(path.join(root,'export-manifest.json'),'utf8'));
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const expected=new Map(inventory.files.map(f=>[f.path,f.sha256]));
const allowedRoot=new Set(['README.md','README.vi.md','PROJECT_INFO.md','NOTICE.md','THIRD_PARTY_NOTICES.md','package.json','bun.lock','.gitignore','export-manifest.json']);
const allowedDirs=new Set(['demo','docs','src','tests','scripts','submission','licenses']);
const issues=[];let count=0;
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const full=path.join(dir,entry.name),rel=path.relative(root,full).split(path.sep).join('/');
 if(rel==='.git')continue;
 if(entry.isSymbolicLink()){issues.push(rel+': symlink');continue;}
 if(entry.isDirectory()){if(!allowedDirs.has(rel.split('/')[0]))issues.push(rel+': unexpected directory');else walk(full);continue;}
 if(!rel.includes('/')&&!allowedRoot.has(rel))issues.push(rel+': unexpected root file');
 if(/(?:^|\/)(?:\.env(?:\..*)?|server|config|deploy|\.agents|\.ght|node_modules)(?:\/|$)|\.(?:pem|key|sqlite|zip|map|log)$/.test(rel))issues.push(rel+': forbidden path');
 if(rel==='export-manifest.json')continue;
 count++;
 const data=fs.readFileSync(full);
 if(expected.get(rel)!==hash(data))issues.push(rel+': inventory hash mismatch');
 expected.delete(rel);
 if(!/\.(png|webp)$/.test(rel)){
  const s=data.toString('utf8');
  const secrets=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{40,}\b/,/\bAKIA[0-9A-Z]{16}\b/,/https?:\/\/[^\s/@]+:[^\s/@]+@/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{25,}\b/];
  if(secrets.some(re=>re.test(s)))issues.push(rel+': credential pattern (value withheld)');
  if(/[A-Z]:\\Users\\|\/opt\/[a-z]+\/|https?:\/\/(?:\d{1,3}\.){3}\d{1,3}/.test(s.replaceAll('http://127.0.0.1','loopback')))issues.push(rel+': internal path or host');
  if(/\.md$/.test(rel))for(const m of s.matchAll(/(?:\]\(|\b(?:src|href)=")([^\s)"#]+)(?:#[^\s)"]*)?[)"]/g)){
   const link=m[1];if(/^(?:https?:|data:|mailto:)/.test(link))continue;
   if(!fs.existsSync(path.resolve(path.dirname(full),link)))issues.push(rel+': broken relative link '+link);
  }
 }
}}
walk(root);
for(const file of expected.keys())issues.push(file+': missing');
if(issues.length){console.error(JSON.stringify({passed:false,issues},null,2));process.exitCode=1;}
else console.log(JSON.stringify({passed:true,files:count,checks:['exact inventory hashes','path allowlist','credential patterns','internal paths/hosts','relative Markdown links'],scope:'curated export; not a comprehensive security audit'}));
