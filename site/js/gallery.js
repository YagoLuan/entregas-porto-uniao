/* Galeria do bucket img_comidas: ver as imagens e (logado) enviar novas */
async function showGallery(){
  app.innerHTML = `<h2 class="t">Galeria de comidas</h2>
    <div class="panel"><h3>Enviar imagem</h3>${user ? `
      <p class="mute">Dê à imagem o mesmo nome do produto ou da loja (ex.: <b>pizza-calabresa</b>) para ela aparecer automaticamente no cardápio.</p>
      <label for="gf">Arquivo</label><input id="gf" type="file" accept="image/*">
      <label for="gn">Nome da imagem</label><input id="gn" placeholder="pizza-calabresa">
      <div class="row" style="margin-top:12px"><button id="gu">Enviar</button></div><div id="gm2" class="msg" role="status"></div>`
      : '<p class="mute">Entre na sua conta para enviar imagens.</p>'}</div>
    <p class="mute" id="gs">Carregando…</p><div class="grid" id="gal"></div>
    <div class="row" style="justify-content:center;margin-top:16px"><button id="gm" hidden>Carregar mais</button></div>`;
  if (user){
    $('#gf').onchange = () => { const f = $('#gf').files[0]; if (f && !$('#gn').value) $('#gn').value = slug(f.name.replace(/\.[^.]+$/,'')); };
    $('#gu').onclick = async () => {
      const f = $('#gf').files[0], n = slug($('#gn').value), m = $('#gm2');
      if (!f || !n){ m.className = 'msg err'; m.textContent = 'Escolha um arquivo e informe um nome.'; return; }
      m.className = 'msg'; m.textContent = 'Enviando…';
      try {
        const w = await toWebp(f), ext = w ? 'webp' : (f.name.split('.').pop() || 'jpg').toLowerCase();
        await putFile(`${n}.${ext}`, w || f, w ? 'image/webp' : f.type);
        m.className = 'msg ok'; m.textContent = 'Imagem enviada!'; setTimeout(showGallery, 900);
      } catch (e) { m.className = 'msg err'; m.textContent = 'Não foi possível enviar: ' + storageMsg(e); }
    };
  }
  const files = [...(await loadBucket()).values()], PAGE = 8; let shown = 0;
  if (!files.length){ $('#gs').textContent = 'Nenhuma imagem encontrada no bucket (ou o bucket não permite listar).'; return; }
  const more = () => {
    files.slice(shown, shown + PAGE).forEach(name => {
      const d = document.createElement('div'); d.className = 'gcard';
      d.innerHTML = `<img loading="lazy" alt="${esc(name)}" src="${esc(pub(name))}"><p>${esc(name)}</p>`;
      $('#gal').append(d);
    });
    shown = Math.min(files.length, shown + PAGE);
    $('#gs').textContent = `${shown} de ${files.length} imagem(ns)`;
    $('#gm').hidden = shown >= files.length;
  };
  $('#gm').onclick = more; more();
}
