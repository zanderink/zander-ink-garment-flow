'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=__dirname, PUB=path.join(ROOT,'public'),DATA=process.env.DATA_DIR || path.join(ROOT,'data'),DB=path.join(DATA,'board.json');
fs.mkdirSync(DATA,{recursive:true});
const columns=['New Orders','Artwork Approval','Approved Designs','Need to Order','Ordered','Pull Stock','Ready to Print - All In','Contract - Ready Print','Printing Now','Printing Now - Waiting on Missing','OMG Bagging','Needs Shipped','Ready for Pickup','Shipped/Picked Up - Needs to Pay','Invoiced Out','Picked Up and Paid','Blue Angels Mocks Up'];
const initial={columns:columns.map(name=>({id:crypto.randomUUID(),name})),cards:[],updatedAt:new Date().toISOString()};
if(!fs.existsSync(DB))fs.writeFileSync(DB,JSON.stringify(initial,null,2));
const read=()=>JSON.parse(fs.readFileSync(DB,'utf8'));
let serial=Promise.resolve();
function update(fn){const task=serial.then(()=>{const db=read(); const result=fn(db);db.updatedAt=new Date().toISOString();let tmp=DB+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,DB);return {result,db}});serial=task.then(()=>{},()=>{});return task;}
function send(res,code,obj,extra={}){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra});res.end(JSON.stringify(obj))}
function input(req){return new Promise((resolve,reject)=>{let data='',size=0;req.on('data',ch=>{size+=ch.length;if(size>24*1024*1024){reject(new Error('Upload exceeds 24MB'));req.destroy();return;}data+=ch});req.on('end',()=>{try{resolve(JSON.parse(data||'{}'))}catch(e){reject(e)}});req.on('error',reject)})}
const port=Number(process.env.PORT||8080);const secret=process.env.BOARD_ACCESS_KEY||'';
function allowed(req){if(!secret)return true;const bearer=(req.headers.authorization||'').replace(/^Bearer /i,'');return bearer===secret;}
function cleanCard(c){return {id:String(c.id||crypto.randomUUID()),columnId:String(c.columnId||''),title:String(c.title||'Untitled').slice(0,300),email:String(c.email||'').slice(0,300),address:String(c.address||'').slice(0,1000),notes:String(c.notes||'').slice(0,12000),dueDate:String(c.dueDate||''),process:String(c.process||'Screen Print'),delivery:String(c.delivery||'Pickup'),image:String(c.image||''),attachments:Array.isArray(c.attachments)?c.attachments.slice(0,8).map(a=>({id:String(a.id||crypto.randomUUID()),name:String(a.name||'image').slice(0,100),data:String(a.data||'')})):[],garments:Array.isArray(c.garments)?c.garments.slice(0,80):[],createdAt:c.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),order:Number(c.order||0),activity:Array.isArray(c.activity)?c.activity.slice(-300).map(a=>({id:String(a.id||crypto.randomUUID()),author:String(a.author||'Team').slice(0,80),message:String(a.message||'').slice(0,5000),at:String(a.at||new Date().toISOString())})):[]}}
async function catalog(q,provider){if(provider==='ss'){
 const key=process.env.SS_API_KEY,account=process.env.SS_ACCOUNT_NUMBER;
 if(!key||!account)throw new Error('S&S API credentials have not been configured');
 const term=q.trim().slice(0,70);if(!term) return [];
 const url='https://api.ssactivewear.com/v2/products/?style='+encodeURIComponent(term);
 const r=await fetch(url,{headers:{authorization:'Basic '+Buffer.from(account+':'+key).toString('base64'),accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('S&S catalog returned '+r.status);
 const data=await r.json();return (Array.isArray(data)?data:[]).slice(0,300).map(x=>({style:x.styleName||'',brand:x.brandName||'',color:x.colorName||'',size:x.sizeName||'',image:x.colorFrontImage?'https://www.ssactivewear.com/'+x.colorFrontImage:'',source:'S&S'}));
 } throw new Error('SanMar API is not configured; enter style and color manually');}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){
 if(url.pathname==='/api/health')return send(res,200,{ok:true});
 if(!allowed(req))return send(res,401,{error:'Access key required'});
 if(req.method==='GET'&&url.pathname==='/api/board')return send(res,200,read());
 if(req.method==='POST'&&url.pathname==='/api/cards'){const body=await input(req);return send(res,200,(await update(db=>{const card=cleanCard(body);card.columnId=db.columns.some(c=>c.id===card.columnId)?card.columnId:db.columns[0].id;db.cards.push(card);return card})).result)}
 if(req.method==='PUT'&&url.pathname.startsWith('/api/cards/')){const id=url.pathname.split('/')[3];const body=await input(req);return send(res,200,(await update(db=>{const i=db.cards.findIndex(c=>c.id===id);if(i<0)throw Error('Card not found');const card=cleanCard({...db.cards[i],...body,id,createdAt:db.cards[i].createdAt});if(!db.columns.some(c=>c.id===card.columnId))throw Error('Invalid column');db.cards[i]=card;
 const peers=db.cards.filter(c=>c.id!==id&&c.columnId===card.columnId).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
 const index=Math.max(0,Math.min(peers.length,(Number(card.order)||1)-1));peers.splice(index,0,card);peers.forEach((c,n)=>{c.order=n+1});return card})).result)}
 if(req.method==='DELETE'&&url.pathname.startsWith('/api/cards/')){const id=url.pathname.split('/')[3];return send(res,200,(await update(db=>{db.cards=db.cards.filter(c=>c.id!==id);return {ok:true}})).result)}
 if(req.method==='POST'&&url.pathname==='/api/columns'){const body=await input(req);return send(res,200,(await update(db=>{const col={id:crypto.randomUUID(),name:String(body.name||'New List').slice(0,80)};db.columns.push(col);return col})).result)}
 if(req.method==='PUT'&&url.pathname==='/api/columns'){const body=await input(req);return send(res,200,(await update(db=>{if(!Array.isArray(body.columns))throw Error('Invalid columns');for(const c of db.columns){const incoming=body.columns.find(x=>x.id===c.id);if(incoming)c.name=String(incoming.name||c.name).slice(0,80)}return db.columns})).result)}
 if(req.method==='GET'&&url.pathname==='/api/catalog'){const items=await catalog(url.searchParams.get('q')||'',url.searchParams.get('provider')||'ss');return send(res,200,{items})}
 return send(res,404,{error:'Not found'});
 }
 const p=decodeURIComponent(url.pathname)==='/'?'/index.html':decodeURIComponent(url.pathname);const file=path.resolve(PUB,'.'+p);if(!file.startsWith(PUB+path.sep))return send(res,403,{error:'Forbidden'});if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,{error:'Missing'});res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 }catch(e){send(res,e.message==='Card not found'?404:400,{error:e.message||'Unknown error'})}}).listen(port,'0.0.0.0',()=>console.log('Garment Flow listening on '+port+'; data in '+DB));
