import { chromium } from "/Users/pedrorojas/Documents/Proyectos/redcafeecuador-sitio/qa/node_modules/playwright/index.mjs";
import fs from "node:fs"; import path from "node:path";
const SITIO='/Users/pedrorojas/Documents/Proyectos/redcafeecuador-sitio/local/publicada-20261001c';
const rutas=[]; (function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory()){ if(d===SITIO&&['_next','data','uploads','fonts','img','video','api','socios'].includes(e.name))continue; w(p);} else if(e.name==='index.html') rutas.push('/'+path.relative(SITIO,d).split(path.sep).join('/')+(d===SITIO?'':'/'));}})(SITIO);
const B=process.argv[2]; const b=await chromium.launch(); const out=[];
for (const r0 of rutas.sort()) { const r=r0.replace(/^\/\/$/,'/');
  const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage();
  await p.addInitScript(()=>{ window.__t={oc:0,pr:0,ini:null,ult:null}; new MutationObserver(l=>{const t=performance.now(); for(const m of l){ let hit=false; if(m.type==='attributes'&&m.attributeName==='data-redcafe-oculto-react'){window.__t.oc++;hit=true} if(m.type==='childList'){for(const n of m.addedNodes){ if(n.nodeType===1&&(n.hasAttribute('data-redcafe-propio')||n.querySelector?.('[data-redcafe-propio]'))){window.__t.pr++;hit=true}}} if(hit){ if(window.__t.ini===null) window.__t.ini=t; window.__t.ult=t; } } }).observe(document,{subtree:true,attributes:true,childList:true,attributeFilter:['data-redcafe-oculto-react']}); });
  try { await p.goto(B+r,{waitUntil:'load',timeout:30000}); await p.waitForTimeout(4500);
    const m=await p.evaluate(()=>{const f=performance.getEntriesByName('first-contentful-paint')[0]; return {fcp:f?Math.round(f.startTime):null, ...window.__t, ocFinal:document.querySelectorAll('[data-redcafe-oculto-react="1"]').length, prFinal:document.querySelectorAll('[data-redcafe-propio]').length};});
    const ventana = (m.ult!=null&&m.fcp!=null)? Math.max(0,Math.round(m.ult-m.fcp)) : 0;
    out.push({r, ventana, oc:m.ocFinal, pr:m.prFinal});
  } catch(e){ out.push({r, ventana:-1, oc:0, pr:0}); }
  await c.close();
}
await b.close();
out.sort((a,b)=>b.ventana-a.ventana);
fs.writeFileSync(process.argv[3], JSON.stringify(out,null,1));
const con=out.filter(x=>x.ventana>300);
console.log(`páginas medidas: ${out.length} · con parpadeo visible (>0,3 s): ${con.length} · sin parpadeo: ${out.length-con.length}`);
console.log('ruta | parpadeo (s) | bloques React ocultos | bloques pintados por la capa');
out.forEach(x=>console.log(`${x.r} | ${(x.ventana/1000).toFixed(1)} | ${x.oc} | ${x.pr}`));
