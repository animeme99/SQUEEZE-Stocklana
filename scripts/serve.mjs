import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../demo/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp'};
export function createDemoServer(){
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    try{
      const url=new URL(req.url,'http://localhost');
      const name=decodeURIComponent(url.pathname);
      if(name.includes('\\')||name.includes('\0'))throw Error('Invalid path');
      const candidate=path.resolve(root,'.'+(name==='/'?'/index.html':name));
      const relative=path.relative(root,candidate);
      if(relative.startsWith('..')||path.isAbsolute(relative)||!types[path.extname(candidate)])throw Error('Outside demo');
      const actual=await fs.realpath(candidate);
      const realRelative=path.relative(await fs.realpath(root),actual);
      if(realRelative.startsWith('..')||path.isAbsolute(realRelative))throw Error('Outside demo');
      const data=await fs.readFile(actual);
      res.writeHead(200,{'Content-Type':types[path.extname(actual)]});
      res.end(req.method==='HEAD'?undefined:data);
    }catch{res.writeHead(404);res.end('Not found');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createDemoServer();
  server.on('error',error=>{console.error('Could not start sample demo:',error.message);process.exitCode=1;});
  server.listen(4187,'127.0.0.1',()=>console.log('SQUEEZE sample demo: http://127.0.0.1:4187 — fictional data; no wallet or transactions.'));
}
