/* ===== Carrinho e finalização ===== */
const feeOf = () => Number(cart.store?.delivery_fee || 0);
const subtotal = () => Object.values(cart.lines).reduce((t,l)=>t+l.qty*Number(l.item.price),0);
function renderCart(){
  lsSet('pu_cart', cart); renderNav();
  const n = cartCount(), bar = $('#cartBar');
  if (!n){ bar.hidden = true; return; }
  bar.hidden = false; bar.innerHTML = `<span><b>${n} ${n>1?'itens':'item'}</b> · ${money(subtotal())}</span><button id="open">Ver carrinho</button>`;
  $('#open').onclick = cartDialog;
}
function cartDialog(){
  const L = Object.entries(cart.lines);
  if (!L.length){
    dlg.innerHTML = '<h2 style="margin-top:0">Carrinho</h2><p class="mute">Seu carrinho está vazio. Escolha uma loja e adicione produtos.</p><div class="row"><button id="cl">Fechar</button></div>';
    $('#cl').onclick = () => dlg.close(); if (!dlg.open) dlg.showModal(); return renderCart();
  }
  dlg.innerHTML = `<h2 style="margin-top:0">Carrinho · ${esc(cart.store.name)}</h2><div id="ls"></div>
    <p class="mute">Subtotal ${money(subtotal())} · Entrega ${money(feeOf())}</p><p><b>Total ${money(subtotal()+feeOf())}</b></p>
    <div class="row"><button id="nx">Finalizar pedido</button><button class="ghost" id="cl">Fechar</button></div>`;
  L.forEach(([id,l]) => {
    const r = document.createElement('div'); r.className='ln';
    r.innerHTML = `<span class="n">${esc(l.item.name)}<br><span class="mute">${money(l.item.price)}</span></span>
      <span class="qty"><button class="sm ghost" aria-label="Diminuir">−</button><b>${l.qty}</b><button class="sm ghost" aria-label="Aumentar">+</button></span><button class="sm danger" aria-label="Remover">✕</button>`;
    const [m,p,x] = r.querySelectorAll('button');
    m.onclick = () => { if (--l.qty<=0) delete cart.lines[id]; cartDialog(); renderCart(); };
    p.onclick = () => { l.qty++; cartDialog(); renderCart(); };
    x.onclick = () => { delete cart.lines[id]; cartDialog(); renderCart(); };
    $('#ls').append(r);
  });
  $('#cl').onclick = () => dlg.close();
  $('#nx').onclick = () => user ? checkoutDialog() : (dlg.close(), authDialog(false));
  if (!dlg.open) dlg.showModal();
}
function checkoutDialog(){
  const sv = ls('pu_addr',{});
  dlg.innerHTML = `<h2 style="margin-top:0">Finalizar pedido</h2><p class="mute">Entrega em Porto União – SC</p>
    <label for="nm">Seu nome</label><input id="nm" value="${esc(sv.nm||profile?.full_name||'')}">
    <label for="ph">Telefone</label><input id="ph" inputmode="tel" value="${esc(sv.ph||'')}">
    <label for="ru">Rua e número</label><input id="ru" value="${esc(sv.ru||'')}">
    <label for="ba">Bairro</label><input id="ba" value="${esc(sv.ba||'')}">
    <label for="rf">Referência (opcional)</label><input id="rf" value="${esc(sv.rf||'')}">
    <label for="pg">Pagamento</label><select id="pg"><option>Pix</option><option>Dinheiro</option><option>Cartão na entrega</option></select>
    <div id="cm" class="msg" role="status"></div><div class="row"><button id="ok">Confirmar pedido</button><button class="ghost" id="bk">Voltar</button></div>`;
  $('#bk').onclick = cartDialog;
  $('#ok').onclick = async () => {
    const f = { nm:$('#nm').value.trim(), ph:$('#ph').value.trim(), ru:$('#ru').value.trim(), ba:$('#ba').value.trim(), rf:$('#rf').value.trim() }, cm = $('#cm');
    if (!f.nm || f.ph.replace(/\D/g,'').length<10 || !f.ru || !f.ba){ cm.className='msg err'; cm.textContent='Preencha nome, telefone com DDD, rua e bairro.'; return; }
    const total = subtotal()+feeOf(), pay = $('#pg').value;
    cm.className='msg'; cm.textContent='Enviando…';
    const { data, error } = await sb.from('orders').insert({ user_id:user.id, store_id:cart.store.id, total_price:total }).select().maybeSingle();
    if (error){ cm.className='msg err'; cm.textContent='Não foi possível registrar o pedido: '+error.message; return; }
    lsSet('pu_addr', f);
    const lines = Object.values(cart.lines).map(l => ({ nome:l.item.name, qty:l.qty, preco:Number(l.item.price) }));
    const text = `*Novo pedido – ${cart.store.name}*\n` + lines.map(l=>`${l.qty}x ${l.nome} (${money(l.qty*l.preco)})`).join('\n') +
      `\nEntrega: ${money(feeOf())}\n*Total: ${money(total)}*\nPagamento: ${pay}\nCliente: ${f.nm} · ${f.ph}\nEndereço: ${f.ru}, ${f.ba}, Porto União – SC${f.rf?'\nRef.: '+f.rf:''}`;
    lsSet('pu_orders', [{ dbId:data?.id, loja:cart.store.name, lines, pay, addr:`${f.ru}, ${f.ba}`, text }, ...ls('pu_orders',[])]);
    cart = { store:null, lines:{} }; dlg.close(); renderCart(); showOrders('Pedido registrado! Envie os detalhes à loja pelo botão do WhatsApp.');
  };
}
