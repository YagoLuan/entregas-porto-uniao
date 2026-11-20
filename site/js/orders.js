/* ===== Meus pedidos ===== */
async function showOrders(note){
  if (!user){ app.innerHTML = '<h2 class="t">Meus pedidos</h2><p class="mute">Entre na sua conta para ver o histórico.</p>'; return; }
  app.innerHTML = `<h2 class="t">Meus pedidos</h2>${typeof note==='string'&&note?`<p class="msg ok">${esc(note)}</p>`:''}<p class="mute">Carregando…</p>`;
  if (!allStores.length) await loadBase();
  const { data, error } = await sb.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending:false });
  app.querySelector('p.mute').remove();
  if (error){ app.insertAdjacentHTML('beforeend', `<p class="msg err">${esc(error.message)}</p>`); return; }
  if (!data.length) app.insertAdjacentHTML('beforeend', '<p class="mute">Você ainda não fez pedidos.</p>');
  const local = ls('pu_orders',[]);
  data.forEach(o => {
    const st = allStores.find(s => s.id===o.store_id), l = local.find(x => x.dbId===o.id), d = document.createElement('div'); d.className='panel';
    d.innerHTML = `<b>Pedido #${o.id} · ${esc(st?.name||'Loja')}</b><br><span class="mute">${esc(fmtDate(o.created_at))}</span><br><span class="tag">Registrado</span>
      ${l?`<div class="mute">${l.lines.map(x=>`${x.qty}x ${esc(x.nome)}`).join(', ')}</div><div>${esc(l.pay)} · ${esc(l.addr)}</div>`:''}
      <div class="price">${money(o.total_price)}</div>${l?'<button class="sm" style="margin-top:8px">Enviar pelo WhatsApp</button>':''}`;
    d.querySelector('button')?.addEventListener('click', () => window.open('https://wa.me/?text='+encodeURIComponent(l.text),'_blank'));
    app.append(d);
  });
}
