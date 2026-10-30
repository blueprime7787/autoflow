import{readFile,writeFile}from'node:fs/promises';import{spawn}from'node:child_process';
const template=await readFile('wrangler.pages.local.jsonc','utf8');
try{const existing=await readFile('wrangler.jsonc','utf8');if(existing!==template)throw Error('기존 wrangler.jsonc를 덮어쓸 수 없습니다. 로컬 설정을 확인하세요.')}catch(e){if(e.code!=='ENOENT')throw e;await writeFile('wrangler.jsonc',template)}
const args=['wrangler','pages','dev','dist','--port','8787','--persist-to','.wrangler/pages-demo',...process.argv.slice(2)];
const child=spawn(process.platform==='win32'?'npx.cmd':'npx',args,{stdio:'inherit',shell:process.platform==='win32'});child.on('exit',code=>process.exit(code||0));
