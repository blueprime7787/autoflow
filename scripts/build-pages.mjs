import{build}from'esbuild';import{writeFile,mkdir}from'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['worker/pages.ts'],outfile:'dist/_worker.js',bundle:true,format:'esm',external:['cloudflare:sockets'],platform:'browser',target:'es2022',minify:true});
await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]},null,2));
await writeFile('dist/_headers','/api/*\n  Cache-Control: no-store\n  X-Content-Type-Options: nosniff\n');
console.log('Pages server bundled: dist/_worker.js; /api/* routed to Functions');
