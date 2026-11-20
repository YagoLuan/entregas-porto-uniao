/* ===== Painel do dono ===== */
async function showOwner(){
  if (!user || role() !== 'owner'){ app.innerHTML = '<h2 class="t">Minha loja</h2><p class="mute">Área exclusiva para donos de loja.</p>'; return; }
  if (!allStores.length) await loadBase();
  const { data: mine, error } = await sb.from('stores').select('*').eq('owner_id', user.id);
  app.innerHTML = `<h2 class="t">Minha loja</h2>${error?`<p class="msg err">${esc(error.message)}</p>`:''}
  <div class="panel"><h3 style="margin-top:0">Cadastrar loja</h3>
    <label for="sn">Nome</label><input id="sn"><label for="sc">Categoria</label><select id="sc"><option value="">Sem categoria</option>${cats.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
    <label for="sf">Taxa de entrega (R$)</label><input id="sf" type="number" min="0" step="0.5" value="0">
    <label>Foto da loja</label><div class="row"><button type="button" class="ghost sm" id="sp">🖼️ Escolher imagem</button><span id="sps" class="mute">Nenhuma imagem escolhida</span></div>
    <div class="row" style="margin-top:12px"><button id="ss">Salvar loja</button></div><div id="sm" class="msg"></div></div><div id="mine"></div>`;
  let sPick = null;
  $('#sp').onclick = async () => { const r = await pickImage(); if (r){ sPick = r; $('#sps').textContent = r.file || r.upload.name; } };
  $('#ss').onclick = async () => {
    const m = $('#sm'), name = $('#sn').value.trim(), fee = parseFloat($('#sf').value||'0');
    if (!name || isNaN(fee) || fee<0){ m.className='msg err'; m.textContent='Informe nome e taxa válidos.'; return; }
    m.className='msg'; m.textContent='Salvando…';
    const { data, error } = await sb.from('stores').insert({ owner_id:user.id, name, category_id:$('#sc').value?Number($('#sc').value):null, delivery_fee:fee }).select().maybeSingle();
    if (error){ m.className='msg err'; m.textContent=error.message; return; }
    try { const r = await applyImage('stores', data.id, sPick); m.className='msg ok'; m.textContent='Loja salva.' + imgNote(r); }
    catch(e){ m.className='msg ok'; m.textContent='Loja salva, mas a foto não foi enviada: '+storageMsg(e); }
    setTimeout(showOwner, 1500);
  };
  for (const s of (mine||[])){
    const p = document.createElement('div'); p.className='panel';
    p.innerHTML = `<h3 style="margin-top:0">${esc(s.name)}</h3>
      <label>Nome e taxa de entrega</label><div class="row" style="margin-bottom:10px"><input class="sname" value="${esc(s.name)}" aria-label="Nome da loja" style="flex:2 1 200px"><input class="sfee" type="number" min="0" step="0.5" value="${Number(s.delivery_fee)||0}" aria-label="Taxa de entrega (R$)" style="flex:1 1 100px"><button class="sm ssave">Salvar nome</button></div>
      <div class="row" style="margin-bottom:6px"><div class="img" style="width:84px;height:52px;aspect-ratio:auto;border-radius:10px;${bg(imgPath('stores',s))}"></div><button class="sm ghost chg">🖼️ Trocar imagem da loja</button></div><h4>Pedidos recebidos</h4><div class="ords mute">Carregando…</div>
      <h4>Cardápio</h4><div class="items"></div><hr style="border:0;border-top:1px solid var(--line)">
      <div class="row"><input class="in" placeholder="Nome do produto" style="flex:2 1 160px"><input class="ip" type="number" step="0.01" min="0" placeholder="Preço" style="flex:1 1 90px"></div>
      <label>Descrição</label><input class="idesc"><label>Foto</label><div class="row"><button type="button" class="ghost sm ipick">🖼️ Escolher imagem</button><span class="mute ipn">Nenhuma imagem escolhida</span></div>
      <div class="row" style="margin-top:12px"><button class="add">Adicionar produto</button></div><div class="msg"></div>`;
    app.querySelector('#mine').append(p);
    const m = p.querySelector('.msg'), say = (ok,t) => { m.className = ok?'msg ok':'msg err'; m.textContent = t; };
    p.querySelector('.ssave').onclick = async () => {
      const name = p.querySelector('.sname').value.trim(), fee = parseFloat(p.querySelector('.sfee').value || '0');
      if (!name || isNaN(fee) || fee < 0) return say(false, 'Informe nome e taxa válidos.');
      say(true, 'Salvando…');
      const { data, error } = await sb.from('stores').update({ name, delivery_fee:fee }).eq('id', s.id).select();
      if (error) return say(false, error.message);
      if (!data?.length) return say(false, 'Não foi possível salvar (sem permissão para alterar esta loja).');
      s.name = name; s.delivery_fee = fee; p.querySelector('h3').textContent = name;
      const k = allStores.find(x => x.id === s.id); if (k){ k.name = name; k.delivery_fee = fee; }
      if (cart.store?.id === s.id){ cart.store.name = name; cart.store.delivery_fee = fee; renderCart(); }
      say(true, 'Loja atualizada.');
    };
    let iPick = null;
    p.querySelector('.ipick').onclick = async () => { const r = await pickImage(); if (r){ iPick = r; p.querySelector('.ipn').textContent = r.file || r.upload.name; } };
    p.querySelector('.chg').onclick = async () => { const r = await pickImage(); if (!r) return; say(true,'Aplicando imagem…');
      try { const x = await applyImage('stores', s.id, r); say(true,'Imagem da loja atualizada.' + imgNote(x)); setTimeout(showOwner, 1200); } catch(e){ say(false, storageMsg(e)); } };
    sb.from('orders').select('*').eq('store_id', s.id).order('created_at',{ascending:false}).limit(20).then(({data,error}) => {
      const b = p.querySelector('.ords'); b.className = 'ords';
      b.innerHTML = error ? `<span class="msg err">${esc(error.message)}</span>` : (data.length ? data.map(o=>`<div class="ln"><span class="n">Pedido #${o.id} · ${esc(fmtDate(o.created_at))}</span><b>${money(o.total_price)}</b></div>`).join('') : '<span class="mute">Nenhum pedido ainda.</span>');
    });
    const loadItems = async () => {
      const { data } = await sb.from('menu_items').select('*').eq('store_id', s.id).order('name'), box = p.querySelector('.items'); box.innerHTML = '';
      (data||[]).forEach(i => { const d = document.createElement('div'); d.className='ln';
        d.innerHTML = `<div class="img" style="width:44px;height:44px;aspect-ratio:1;border-radius:8px;flex:none;${bg(imgPath('items',i))}"></div><span class="n">${esc(i.name)} · ${money(i.price)}${i.is_available===false?' <span class="tag">indisponível</span>':''}</span>
          <button class="sm ghost">${i.is_available===false?'Disponibilizar':'Pausar'}</button><button class="sm ghost" title="Trocar imagem">🖼️</button><button class="sm ghost">Editar</button><button class="sm danger">Excluir</button>`;
        const [tg,im,ed,del] = d.querySelectorAll('button');
        im.onclick = async () => { const r = await pickImage(); if (!r) return; say(true,'Aplicando imagem…'); try { const x = await applyImage('items', i.id, r); say(true,'Imagem do produto atualizada.' + imgNote(x)); } catch(e){ say(false, storageMsg(e)); } loadItems(); };
        tg.onclick = async () => { const { error } = await sb.from('menu_items').update({ is_available: i.is_available===false }).eq('id', i.id); error ? say(false,error.message) : loadItems(); };
        ed.onclick = async () => { const nn = prompt('Nome do produto:', i.name); if (nn===null) return; const np = parseFloat(String(prompt('Preço:', i.price)).replace(',','.'));
          if (!nn.trim() || isNaN(np) || np<0) return say(false,'Nome ou preço inválido.');
          const { error } = await sb.from('menu_items').update({ name:nn.trim(), price:np }).eq('id', i.id); error ? say(false,error.message) : (say(true,'Produto atualizado.'), loadItems()); };
        del.onclick = async () => { if (!confirm('Excluir este produto?')) return; const { error } = await sb.from('menu_items').delete().eq('id', i.id); error ? say(false,error.message) : (say(true,'Produto excluído.'), loadItems()); };
        box.append(d); });
    };
    loadItems();
    p.querySelector('.add').onclick = async () => {
      const name = p.querySelector('.in').value.trim(), price = parseFloat(p.querySelector('.ip').value);
      if (!name || isNaN(price) || price<0) return say(false,'Informe nome e preço válidos.');
      say(true,'Salvando…');
      const { data, error } = await sb.from('menu_items').insert({ store_id:s.id, name, price, description:p.querySelector('.idesc').value.trim(), is_available:true }).select().maybeSingle();
      if (error) return say(false,error.message);
      try { const x = await applyImage('items', data.id, iPick); say(true,'Produto adicionado.' + imgNote(x)); }
      catch(e){ say(true,'Produto adicionado, mas a foto não foi enviada: '+storageMsg(e)); }
      ['.in','.ip','.idesc'].forEach(q=>p.querySelector(q).value=''); iPick = null; p.querySelector('.ipn').textContent = 'Nenhuma imagem escolhida'; loadItems();
    };
  }
}
