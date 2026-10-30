/* Avisos internos y sugerencias. No solicita permisos push ni envia correo. */
(function () {
  'use strict';
  if (window.RedCafeRecordatorios) return;
  var token = '', installPrompt = null, busy = false, counter = null;
  var installKey = 'redcafe-instalacion-recordatorio-v1';
  function node(tag, text, attrs) {
    var e = document.createElement(tag);
    if (text) e.textContent = text;
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function request(action, data) {
    return fetch('/api/recordatorios.php?action=' + action, {
      credentials: 'same-origin', cache: 'no-store', method: data ? 'POST' : 'GET',
      headers: {'Content-Type':'application/json','X-RC-Token':token},
      body: data ? JSON.stringify(data) : undefined
    }).then(function (r) { return r.json(); }).then(function (r) {
      if (!r.ok) throw new Error(r.error || 'No se pudo guardar.');
      if (r.data.token) token = r.data.token;
      return r.data;
    });
  }
  function button(label, action) {
    var b = node('button', label, {type:'button'});
    b.addEventListener('click', function (event) {
      event.stopPropagation();
      b.disabled = true;
      Promise.resolve().then(action).catch(function (err) {
        var msg = b.parentNode.querySelector('[role="status"]') || b.parentNode.appendChild(node('p','',{role:'status'}));
        msg.textContent = err.message;
      }).finally(function () { b.disabled = false; });
    });
    return b;
  }
  function installState(value) {
    try {
      if (value) localStorage.setItem(installKey, JSON.stringify(value));
      return JSON.parse(localStorage.getItem(installKey) || '{}');
    } catch (_) { return {}; }
  }
  function installed() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || installState().installed; }
  function installDue() { var s=installState();return !installed() && !s.disabled && !(s.next>Date.now()); }
  function count(n) {
    n = Math.max(0, Number(n) || 0);
    if(counter) {counter.textContent='';counter.hidden=true;counter.setAttribute('aria-hidden','true');counter.setAttribute('aria-label',n+' recordatorios pendientes');}
    try { document.dispatchEvent(new CustomEvent('redcafe:recordatorios-contador', { detail: { total: n } })); } catch (_) {}
  }
  async function summary(bell,user) {
    if (!user || user.id==='redcafe_admin' || counter) return;
    counter=node('span','',{class:'rc-recordatorios-contador',hidden:'hidden'});bell.appendChild(counter);
    try { await request('list');var d=await request('entregar',{});count(d.recordatorios.length+(installDue()?1:0)); } catch (_) { /* Los avisos operativos no dependen de este modulo. */ }
  }
  window.addEventListener('beforeinstallprompt', function (event) { installPrompt = event; });
  window.addEventListener('appinstalled', function () {
    installPrompt = null; installState({installed:true});
    var row = document.getElementById('rc-recordatorio-instalar'); if (row) row.remove();
  });
  function installCard(container) {
    var state = installState();
    if (installed() || state.disabled || (state.next || 0)>Date.now()) return;
    var a = node('article','',{id:'rc-recordatorio-instalar'});
    a.appendChild(node('h3','Instala Red Café Ecuador'));
    a.appendChild(node('p','Accede a tu panel desde la pantalla de inicio de este dispositivo.'));
    a.appendChild(button('Instalar aplicación', async function () {
      if (installPrompt) {
        var prompt = installPrompt; installPrompt = null;
        await prompt.prompt(); var choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') installState({installed:true});
        else installState({next:Date.now()+7*86400000});
        a.remove();count(container.querySelectorAll('article').length);
      } else {
        var help = a.querySelector('[role="status"]') || a.appendChild(node('p','',{role:'status'}));
        help.textContent = /iPad|iPhone|iPod/.test(navigator.userAgent)
          ? 'En Safari, abre Compartir y selecciona Añadir a pantalla de inicio.'
          : 'Abre el menú del navegador y busca Instalar aplicación o Añadir a pantalla de inicio. Si no aparece, prueba con un navegador compatible.';
      }
    }));
    a.appendChild(button('En 7 días',function () { installState({next:Date.now()+7*86400000}); a.remove();count(container.querySelectorAll('article').length); }));
    a.appendChild(button('No recordar',function () { installState({disabled:true}); a.remove();count(container.querySelectorAll('article').length); }));
    container.appendChild(a);
  }
  async function mount(container) {
    if (busy) return;
    busy = true;
    var box = container.querySelector('.rc-recordatorios') || container.appendChild(node('section','',{class:'rc-recordatorios','data-redcafe-propio':'1','aria-label':'Recordatorios'}));
    box.replaceChildren(node('h2','Recordatorios'));
    try {
      await request('list');
      var result = await request('entregar',{});
      count(result.recordatorios.length+(installDue()?1:0));
      result.recordatorios.forEach(function (r) {
        var a = node('article'); a.appendChild(node('h3',r.titulo)); a.appendChild(node('p',r.texto));
        if (r.enlace) a.appendChild(node('a','Abrir',{href:r.enlace}));
        [['Leído','leido'],['En 7 días','posponer'],['No recordar','desactivar']].forEach(function (v) {
          a.appendChild(button(v[0],async function () { await request('preferencia',{id:r.id,modo:v[1]}); a.remove();count(box.querySelectorAll('article').length); }));
        });
        box.appendChild(a);
      });
      installCard(box);
      if (!box.querySelector('article')) box.appendChild(node('p','No tienes recordatorios pendientes.'));
      var prefs = node('details'); prefs.appendChild(node('summary','Preferencias de recordatorios'));
      [['lote','Recordar publicar lotes'],['requerimiento','Recordar publicar requerimientos']].forEach(function (v) {
        prefs.appendChild(button(v[1],async function () { await request('preferencia',{id:v[0],modo:'reactivar'}); await mountAfter(); }));
      });
      prefs.appendChild(button('Recordar instalar en este dispositivo',async function () { if (!installed()) installState({}); await mountAfter(); }));
      box.appendChild(prefs);
    } catch (err) { box.appendChild(node('p',err.message,{role:'status'})); }
    finally { busy=false; }
    function mountAfter() { return mount(container); }
  }
  async function admin() {
    if (!/^\/admin\/?$/.test(location.pathname)) return;
    var data;
    try { data = await request('admin-list'); } catch (_) { return; }
    if (document.getElementById('rc-admin-recordatorios')) return;
    var section=node('section','',{id:'rc-admin-recordatorios',class:'rc-recordatorios','data-redcafe-propio':'1'});
    section.appendChild(node('h2','Avisos y recordatorios'));
    section.appendChild(node('p','Avisos internos para los miembros. Se entregan cuando acceden a sus recordatorios; no se envían correos ni avisos push.'));
    var form=node('form'), fields={};
    function field(key,label,type,required) {
      var l=node('label',label), input=node(type==='textarea'?'textarea':'input','',{name:key});
      if (type!=='textarea') input.type=type;
      input.required=!!required; fields[key]=input; l.appendChild(input);form.appendChild(l); return input;
    }
    field('titulo','Título','text',true).maxLength=100;
    field('texto','Mensaje','textarea',true).maxLength=400;
    field('enlace','Enlace interno (opcional)','text',false).placeholder='/marketplace/';
    var roles=node('fieldset');roles.appendChild(node('legend','Destinatarios (sin seleccionar: todos los miembros)'));
    ['productor','comprador','vendedor','bar','exportador','barista','amante','asesor','transportista','pilador','certificador','proveedor'].forEach(function (r) {
      var label=node('label',r);label.appendChild(node('input','',{type:'checkbox',name:'rol',value:r}));roles.appendChild(label);
    });form.appendChild(roles);
    var fl=node('label','Frecuencia'), select=node('select','',{name:'dias'});
    [[0,'Una vez'],[1,'Diaria'],[7,'Semanal'],[30,'Cada 30 días']].forEach(function (r) { select.appendChild(node('option',r[1],{value:r[0]})); });
    fl.appendChild(select);form.appendChild(fl);
    field('inicio','Desde (opcional, hora local)','datetime-local',false);
    field('fin','Hasta (opcional, hora local)','datetime-local',false);
    var save=node('button','Crear aviso',{type:'submit'}), message=node('p','',{role:'status'}), list=node('div');
    form.appendChild(save); form.appendChild(button('Cancelar edición',function () {form.reset();editing='';save.textContent='Crear aviso';}));form.appendChild(message);
    var editing='';
    form.addEventListener('submit',async function (ev) {
      ev.preventDefault(); save.disabled=true;
      try {
        await request('guardar',{id:editing,titulo:fields.titulo.value,texto:fields.texto.value,enlace:fields.enlace.value,
          roles:Array.from(form.querySelectorAll('[name="rol"]:checked')).map(function (e) {return e.value;}),dias:Number(select.value),
          inicio:fields.inicio.value ? new Date(fields.inicio.value).toISOString() : '',fin:fields.fin.value ? new Date(fields.fin.value).toISOString() : ''});
        form.reset();editing='';save.textContent='Crear aviso';message.textContent='Aviso guardado.';await refresh();
      } catch(err) {message.textContent=err.message;} finally {save.disabled=false;}
    });
    async function refresh() {
      var d=await request('admin-list'); list.replaceChildren();
      d.campanas.forEach(function (c) {
        var a=node('article');a.appendChild(node('h3',c.titulo));a.appendChild(node('p',c.texto));
        a.appendChild(node('p',(c.activo?'Activo':'Pausado')+' · '+(c.dias?'Cada '+c.dias+' días':'Una vez')+' · '+(c.roles.join(', ')||'Todos los miembros')));
        a.appendChild(button('Editar',function () {
          editing=c.id;['titulo','texto','enlace'].forEach(function(k){fields[k].value=c[k];});select.value=String(c.dias);
          ['inicio','fin'].forEach(function(k){var d=new Date(c[k]*1000);fields[k].value=c[k]?new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16):'';});
          form.querySelectorAll('[name="rol"]').forEach(function(e){e.checked=c.roles.includes(e.value);});save.textContent='Guardar cambios';fields.titulo.focus();
        }));
        a.appendChild(button(c.activo?'Pausar / cancelar':'Reactivar',async function () {await request('estado',{id:c.id,activo:!c.activo});await refresh();}));list.appendChild(a);
      });
    }
    section.appendChild(form);section.appendChild(list);document.body.appendChild(section);
    var nav=document.getElementById('redcafe-nav-extra');
    if(nav) nav.appendChild(node('a','Gestionar avisos',{href:'#rc-admin-recordatorios'}));
    await refresh();
  }
  var style=node('style');style.textContent='.rc-recordatorios{color:#242a27;background:#fff;padding:16px;border-top:1px solid #d2dad5;font:13px/1.5 Inter,system-ui,sans-serif}.rc-recordatorios h2{font-size:19px}.rc-recordatorios h3{font-size:15px;margin:0 0 6px}.rc-recordatorios article{padding:14px 0;border-bottom:1px solid #d2dad5}.rc-recordatorios button,.rc-recordatorios a{display:inline-flex;align-items:center;min-height:44px;padding:6px 10px;margin:3px;border:1px solid #aebbb3;background:#fff;color:#254b38;border-radius:4px;font:inherit}.rc-recordatorios :focus-visible{outline:2px solid #254b38;outline-offset:2px}.rc-recordatorios label{display:block;margin:8px 0}.rc-recordatorios input:not([type=checkbox]),.rc-recordatorios select,.rc-recordatorios textarea{display:block;box-sizing:border-box;max-width:100%;width:100%;padding:10px;font:16px system-ui;border:1px solid #aebbb3}.rc-recordatorios fieldset{display:flex;flex-wrap:wrap;gap:12px;border:1px solid #d2dad5}.rc-recordatorios input[type=checkbox]{margin-left:8px}#rc-admin-recordatorios{max-width:960px;margin:24px auto}.rc-recordatorios summary{cursor:pointer;min-height:44px;padding:10px 0}.rc-recordatorios button:disabled{opacity:.55}';
  document.head.appendChild(style);
  style.textContent += '.redcafe-avisos-panel>.rc-recordatorios{overflow:auto;min-height:0;max-height:45vh;flex:0 1 auto}.redcafe-avisos-panel .redcafe-avisos-lista{min-height:90px}';
  window.RedCafeRecordatorios={montar:mount,resumen:summary};
  if (document.readyState==='complete') admin(); else window.addEventListener('load',admin,{once:true});
})();
