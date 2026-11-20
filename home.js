/* ===== Início ===== */
let allItems = [];
/* Selo da loja na tela principal: mostra o valor TOTAL (itens + frete).
   Com itens dessa loja no carrinho = total do carrinho; sem carrinho = menor pedido possível (item mais barato + frete). */
function totalLabel(s){
  const fee = Number(s.delivery_fee) || 0;
  if (cart.store?.id === s.id && cartCount() > 0) return `🛒 Total ${money(subtotal() + fee)}`;
  const p = allItems.filter(i => i.store_id === s.id && i.is_available !== false).map(i => Number(i.price));
  return p.length ? `🛵 A partir de ${money(Math.min(...p) + fee)}` : (fee > 0 ? `🛵 Frete ${money(fee)}` : '🛵 Entrega grátis');
}
async function loadBase(){
  const [c, s, i] = await Promise.all([ sb.from('categories').select('*').order('name'), sb.from('stores').select('*').order('name'), sb.from('menu_items').select('*').order('name') ]);
  await loadBucket(); cats = c.data || []; allStores = s.data || []; allItems = i.data || [];
  return s.error;
}
async function showHome(){
  cart.store ? renderCart() : ($('#cartBar').hidden = true);
  app.innerHTML = `<div class="hero"><span class="eyebrow">📍 Porto União – SC</span><h2>Fome? Peça de quem é <span class="hl">da cidade</span></h2><p>Escolha uma loja, monte o pedido e receba em casa.</p>
    <input id="q" type="search" placeholder="Buscar lojas ou produtos…" aria-label="Buscar"><ul class="perks"><li>🛵 Entrega local</li><li>⚡ Pedido em poucos toques</li><li>🏪 Lojas da cidade</li></ul></div><div id="chips" class="chips"></div><div id="res"><p class="mute">Carregando lojas…</p></div>`;
  const err = await loadBase();
  if (err){ $('#res').innerHTML = `<p class="msg err">Erro ao carregar lojas: ${esc(err.message)}</p>`; return; }
  const drawChips = () => {
    $('#chips').innerHTML = '';
    [{id:null,name:'Todas'}, ...cats].forEach(c => { const b=document.createElement('button'); b.className='chip sm'+(catFilter===c.id?' on':''); b.textContent=c.name;
      b.onclick = () => { catFilter = c.id; drawChips(); draw(); }; $('#chips').append(b); });
  };
  const draw = async () => {
    const q = $('#q').value.trim().toLowerCase();
    const list = allStores.filter(s => (catFilter===null || s.category_id===catFilter) && (!q || s.name.toLowerCase().includes(q)));
    $('#res').innerHTML = `<h2 class="t">Lojas disponíveis (${list.length})</h2>` + (list.length ? '<div class="grid" id="stores"></div>' : '<p class="mute">Nenhuma loja encontrada.</p>');
    list.forEach(s => {
      const b = document.createElement('button'); b.className='store';
      b.innerHTML = `<div class="img" style="${bg(imgPath('stores',s))}"><span class="badge" title="Valor dos itens + frete">${totalLabel(s)}</span></div><div class="b"><b>${esc(s.name)}</b>
        <span class="mute">${esc(catName(s.category_id))}</span></div>`;
      b.onclick = () => showStore(s); $('#stores').append(b);
    });
    const pool = allStores.filter(s => catFilter===null || s.category_id===catFilter);
    const its = allItems.filter(i => i.is_available !== false && pool.some(s => s.id===i.store_id) && (!q || i.name.toLowerCase().includes(q)));
    if (its.length){
      const box = document.createElement('div'); box.innerHTML = `<h2 class="t">${q?'Produtos':'Lanches'} (${its.length})</h2><div class="grid" id="lanches"></div>`;
      $('#res').append(box);
      its.slice(0, 24).forEach(i => {
        const st = allStores.find(s => s.id===i.store_id), b = document.createElement('button'); b.className = 'store';
        b.innerHTML = `<div class="img" style="${bg(imgPath('items',i))}"><span class="badge" title="Produto + frete">🛵 Total ${money(Number(i.price) + Number(st.delivery_fee||0))}</span></div><div class="b"><b>${esc(i.name)}</b><span class="mute">${money(i.price)} + frete ${Number(st.delivery_fee)>0?money(st.delivery_fee):'grátis'} · em ${esc(st.name)}</span></div>`;
        b.onclick = () => showStore(st); $('#lanches').append(b);
      });
    }
  };
  let t; $('#q').oninput = () => { clearTimeout(t); t = setTimeout(draw, 250); };
  drawChips(); draw();
}

/* ===== Loja e cardápio ===== */
async function showStore(s){
  app.innerHTML = `<button class="back">← Todas as lojas</button><h2 class="t" style="margin-top:0">${esc(s.name)}</h2>
    <p class="mute">${esc(catName(s.category_id))} · Entrega ${Number(s.delivery_fee)>0?money(s.delivery_fee):'grátis'}</p><div id="menu"><p class="mute">Carregando cardápio…</p></div>`;
  app.querySelector('.back').onclick = showHome;
  await loadBucket();
  app.querySelector('.back').insertAdjacentHTML('afterend', `<div class="img store-hero" style="${bg(imgPath('stores',s))}"></div>`);
  const { data, error } = await sb.from('menu_items').select('*').eq('store_id', s.id).order('name');
  const box = $('#menu'), list = (data||[]).filter(i => i.is_available !== false);
  if (error){ box.innerHTML = `<p class="msg err">${esc(error.message)}</p>`; return; }
  if (!list.length){ box.innerHTML = '<p class="mute">Esta loja ainda não tem produtos disponíveis.</p>'; return; }
  box.innerHTML = '';
  list.forEach(i => {
    const d = document.createElement('div'); d.className='item';
    d.innerHTML = `<div class="img" style="${bg(imgPath('items',i))}"></div><div class="info"><b>${esc(i.name)}</b>
      <div class="mute">${esc(i.description||'')}</div><div class="price">${money(i.price)}</div></div><button>Adicionar</button>`;
    d.querySelector('button').onclick = () => {
      if (cart.store && cart.store.id !== s.id){ if (!confirm('Seu carrinho tem itens de outra loja. Limpar e começar um novo?')) return; cart = { store:null, lines:{} }; }
      cart.store = s; cart.lines[i.id] = cart.lines[i.id] || { item:i, qty:0 }; cart.lines[i.id].qty++; renderCart();
    };
    box.append(d);
  });
  renderCart();
}
