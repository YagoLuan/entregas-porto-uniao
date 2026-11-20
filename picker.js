/* Seletor de imagens do bucket img_comidas (usa a listagem da raiz do bucket).
   Resolve com { file:'nome.webp' } (imagem existente), { upload:File } (nova) ou null (cancelou). */
function pickImage(){
  return new Promise(async resolve => {
    dlg.innerHTML = `<h2 style="margin-top:0">Escolher imagem</h2>
      <input id="pq" type="search" placeholder="Buscar imagem pelo nome…" aria-label="Buscar imagem">
      <p class="mute" id="ps">Carregando imagens…</p><div class="pgrid" id="pgd"></div>
      <div class="row"><label class="filebtn">📤 Enviar nova imagem<input id="pf" type="file" accept="image/*" hidden></label><button class="ghost" id="pc">Cancelar</button></div>`;
    let done = false;
    const fin = v => { if (done) return; done = true; if (dlg.open) dlg.close(); resolve(v); };
    dlg.addEventListener('close', () => fin(null), { once:true });
    $('#pc').onclick = () => fin(null);
    $('#pf').onchange = () => { const f = $('#pf').files[0]; if (f) fin({ upload:f }); };
    if (!dlg.open) dlg.showModal();
    const files = [...new Set((await loadBucket()).values())];
    const draw = () => {
      const q = $('#pq').value.trim().toLowerCase(), list = files.filter(n => n.toLowerCase().includes(q));
      $('#ps').textContent = files.length ? `${list.length} imagem(ns) — toque para escolher` : 'Nenhuma imagem encontrada no bucket.';
      $('#pgd').innerHTML = '';
      list.forEach(n => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pth';
        b.innerHTML = `<img loading="lazy" alt="" src="${esc(pub(n))}"><span>${esc(n)}</span>`; b.onclick = () => fin({ file:n }); $('#pgd').append(b); });
    };
    $('#pq').oninput = draw; draw();
  });
}
