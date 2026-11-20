/* ===== Navegação e autenticação ===== */
function renderNav(){
  const n = $('#nav'); n.innerHTML = '';
  const add = (t,fn,cls='ghost') => { const b=document.createElement('button'); b.className=cls+' sm'; b.textContent=t; b.onclick=fn; n.append(b); };
  add('Início', showHome); add('Meus pedidos', showOrders);
  if (user && role()==='owner') add('Minha loja', showOwner);
  user ? add('Perfil', showProfile) : add('Entrar', () => authDialog(false), '');
  add('🛒 Carrinho (' + cartCount() + ')', cartDialog, 'cartbtn');
}
function authDialog(signup){
  dlg.innerHTML = `<h2 style="margin-top:0">${signup?'Criar conta':'Entrar'}</h2>
  ${signup?`<label for="fn">Nome completo</label><input id="fn" autocomplete="name">`:''}
  <label for="em">E-mail</label><input id="em" type="email" autocomplete="email">
  <label for="pw">Senha (mín. 6 caracteres)</label><input id="pw" type="password" autocomplete="${signup?'new-password':'current-password'}">
  ${signup?`<label for="rl">Tipo de conta</label><select id="rl"><option value="user">Cliente</option><option value="owner">Dono de loja</option></select>`:''}
  <div id="am" class="msg" role="status"></div>
  <div class="row"><button id="go">${signup?'Criar conta':'Entrar'}</button><button class="ghost" id="sw">${signup?'Já tenho conta':'Criar conta'}</button><button class="ghost" id="cl">Fechar</button></div>${signup?'':'<p style="margin:12px 0 0"><button type="button" class="ghost sm" id="fg">Esqueci minha senha</button></p>'}`;
  $('#cl').onclick = () => dlg.close(); $('#sw').onclick = () => authDialog(!signup);
  if (!signup) $('#fg').onclick = () => resetDialog($('#em').value.trim());
  $('#go').onclick = async () => {
    const email = $('#em').value.trim(), password = $('#pw').value, m = $('#am');
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6){ m.className='msg err'; m.textContent='Informe um e-mail válido e senha de 6+ caracteres.'; return; }
    m.className='msg'; m.textContent='Aguarde…';
    const r = signup ? await sb.auth.signUp({ email, password, options:{ data:{ role:$('#rl').value, full_name:$('#fn').value.trim() } } })
                     : await sb.auth.signInWithPassword({ email, password });
    if (r.error){ m.className='msg err'; m.textContent=r.error.message; return; }
    if (signup && !r.data.session){ m.className='msg ok'; m.textContent='Conta criada. Confirme o e-mail e depois entre.'; return; }
    dlg.close();
  };
  dlg.showModal();
}
sb.auth.onAuthStateChange((_e, s) => {
  user = s?.user || null; profile = null;
  setTimeout(async () => {
    if (user){ const r = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle(); profile = r.data; }
    renderNav(); showHome();
    if (_e === 'PASSWORD_RECOVERY') newPassDialog();
  }, 0);
});
function showProfile(){
  app.innerHTML = `<h2 class="t">Perfil</h2><div class="panel"><p><b>Nome:</b> ${esc(profile?.full_name||'—')}</p><p><b>E-mail:</b> ${esc(user.email)}</p>
  <p><b>Tipo de conta:</b> ${role()==='owner'?'Dono de loja':'Cliente'}</p><button id="out" class="danger">Sair</button></div>`;
  $('#out').onclick = () => sb.auth.signOut();
}

/* ----- Recuperação de senha ----- */
function resetDialog(email=''){
  dlg.innerHTML = `<h2 style="margin-top:0">Recuperar senha</h2><p class="mute">Informe o e-mail da conta. Enviaremos um link para você criar uma nova senha.</p>
  <label for="re">E-mail</label><input id="re" type="email" autocomplete="email" value="${esc(email)}"><div id="rm" class="msg" role="status"></div>
  <div class="row"><button id="rs">Enviar link</button><button class="ghost" id="rb">Voltar</button></div>`;
  $('#rb').onclick = () => authDialog(false);
  $('#rs').onclick = async () => {
    const em = $('#re').value.trim(), m = $('#rm');
    if (location.protocol === 'file:'){ m.className = 'msg err'; m.textContent = 'Abra o site por um servidor (Live Server do VS Code ou hospedagem) para usar a recuperação de senha.'; return; }
    if (!/^\S+@\S+\.\S+$/.test(em)){ m.className = 'msg err'; m.textContent = 'Informe um e-mail válido.'; return; }
    m.className = 'msg'; m.textContent = 'Enviando…';
    const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname });
    if (error){ m.className = 'msg err'; m.textContent = error.message; return; }
    m.className = 'msg ok'; m.textContent = 'Se este e-mail estiver cadastrado, o link chegará em instantes. Confira também a caixa de spam.';
  };
}
function newPassDialog(){
  dlg.innerHTML = `<h2 style="margin-top:0">Criar nova senha</h2>
  <label for="n1">Nova senha (mín. 6 caracteres)</label><input id="n1" type="password" autocomplete="new-password">
  <label for="n2">Repita a nova senha</label><input id="n2" type="password" autocomplete="new-password">
  <div id="nm2" class="msg" role="status"></div><div class="row"><button id="ns">Salvar senha</button></div>`;
  $('#ns').onclick = async () => {
    const a = $('#n1').value, b = $('#n2').value, m = $('#nm2');
    if (a.length < 6){ m.className = 'msg err'; m.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
    if (a !== b){ m.className = 'msg err'; m.textContent = 'As senhas não são iguais.'; return; }
    m.className = 'msg'; m.textContent = 'Salvando…';
    const { error } = await sb.auth.updateUser({ password:a });
    if (error){ m.className = 'msg err'; m.textContent = error.message; return; }
    m.className = 'msg ok'; m.textContent = 'Senha alterada! Você já está logado.';
    history.replaceState(null, '', location.pathname); setTimeout(() => dlg.close(), 1500);
  };
  if (!dlg.open) dlg.showModal();
}
