const $ = s => document.querySelector(s), app = $('#app'), dlg = $('#dlg');
const money = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls = (k,d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };
const pub = p => sb.storage.from(BUCKET).getPublicUrl(p).data.publicUrl;
const bg = p => `background-image:url('${esc(pub(p))}'),linear-gradient(135deg,#FF9A1F,#E63B1F)`;
const fmtDate = d => new Date(d).toLocaleString('pt-BR');
/* ----- Bucket img_comidas: lista os arquivos da raiz (mesma lógica da galeria) ----- */
let bucketFiles = null; // Map: nome-sem-extensão (minúsculo) -> nome do arquivo
const slug = t => String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
async function listDir(prefix, depth){
  const out = []; let off = 0, failed = false;
  for (;;){
    const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit:100, offset:off, sortBy:{ column:'name', order:'asc' } });
    if (error){ failed = true; break; }
    if (!data?.length) break;
    for (const f of data){
      const path = prefix ? `${prefix}/${f.name}` : f.name;
      if (f.id === null){ if (depth > 0){ const r = await listDir(path, depth-1); out.push(...r.files); failed = failed || r.failed; } }
      else if (/\.(webp|jpe?g|png|avif|gif)$/i.test(f.name)) out.push(path);
    }
    off += data.length; if (data.length < 100) break;
  }
  return { files: out, failed };
}
async function loadBucket(){
  if (bucketFiles) return bucketFiles;
  const map = new Map(), { files, failed } = await listDir('', 2);
  files.forEach(p => {
    const key = p.replace(/\.[^.]+$/,'').toLowerCase();            // ex.: stores/67  ou  stores-67
    map.set(key, p);
    if (key.includes('/')) map.set(key.replace('/','-'), p);          // stores/67 -> stores-67
    const base = key.split('/').pop(); if (!map.has(base)) map.set(base, p);
  });
  if (!failed) bucketFiles = map;   // não guarda resultado de uma listagem que falhou
  return map;
}
/* Procura a foto: <tipo>-<id>, <tipo>/<id> ou o nome do produto/loja */
/* Acha o arquivo do bucket que combina com o nome da loja/produto:
   1) nome do arquivo contém o nome inteiro; 2) o arquivo tem todas as palavras do nome. */
function fuzzyImg(o){
  const s = slug(o.name); if (!bucketFiles || s.length < 3) return null;
  for (const [k, v] of bucketFiles) if (k.includes(s)) return v;
  const w = s.split('-').filter(x => x.length >= 3); if (!w.length) return null;
  let best = null, bs = 0;
  for (const [k, v] of bucketFiles){
    const kw = k.split(/[-_ ]+/), n = w.filter(x => kw.includes(x)).length;
    if (n === w.length && (n > bs || (n === bs && best && k.length < best[0].length))){ best = [k, v]; bs = n; }
  }
  return best ? best[1] : null;
}
/* Sem imagem escolhida pelo dono: escolhe uma do bucket pelo NOME da loja/produto.
   1) palavras do nome (e sinônimos) que aparecem no nome do arquivo; 2) categoria; 3) qualquer uma.
   A escolha é fixa por loja/produto e varia entre lojas diferentes. */
const FOOD = {
  burger : ['burger','hamburger','hamburguer','lanche','sandwich'],
  doce   : ['doce','dessert','sobremesa','cake','bolo','cheesecake','brigadeiro','chocolate','sweet','cupcake','donut','pie','torta','pudim','mousse'],
  pizza  : ['pizza'],
  japa   : ['sushi','japon','ramen','temaki','sashimi','yakisoba'],
  sorvete: ['sorvete','acai','icecream','ice-cream','gelato','picole'],
  pastel : ['pastel','coxinha','salgado','empada','esfiha'],
  salada : ['salad','salada','healthy','saudavel','fruit','fruta','bowl','juice','suco'],
  carne  : ['churrasco','bbq','barbecue','steak','carne','espeto','grill'],
  prato  : ['feijoada','marmita','rice','arroz','prato','meal','feijao'],
  cafe   : ['cafe','coffee','pao','bread','padaria','croissant'],
  bebida : ['cerveja','beer','drink','bebida','cocktail'],
  wrap   : ['wrap','kebab','shawarma','burrito','taco','mexic','fries']
};
const NAME_RULES = [
  [/burg|hambur|lanch|snack|sandu|x-/, 'burger'], [/doce|bolo|sobrem|confeit|brigad|encant|sweet|cake|choc|pudim/, 'doce'],
  [/pizz/, 'pizza'], [/sushi|japa|temaki|yaki|oriental|ramen/, 'japa'], [/acai|sorvet|gelad|ice/, 'sorvete'],
  [/past[ei]l|coxinha|salgad|esfiha/, 'pastel'], [/salad|fit|natur|saud|vegan|suco|fruta/, 'salada'],
  [/churr|grill|espet|carne|bbq|steak/, 'carne'], [/marmit|prato|cozinha|brasil|feijo|comida|comer|restaur/, 'prato'],
  [/cafe|padaria|pao|panific|coffee/, 'cafe'], [/bar\b|chop|cerv|bebid|drink/, 'bebida'], [/wrap|kebab|taco|burrito|mexic|arabe|shawarma/, 'wrap']
];
const CAT_GROUP = { hamburguer:'burger', doces:'doce', pizza:'pizza', japonesa:'japa', saudavel:'salada', brasileira:'prato' };
const hash = t => { let h = 0; for (const c of String(t)) h = (h*31 + c.charCodeAt(0)) >>> 0; return h; };
function autoImg(kind, o){
  if (!bucketFiles?.size) return null;
  const names = [...new Set(bucketFiles.values())].sort(), low = n => n.toLowerCase();
  const pick = keys => { const p = names.filter(n => keys.some(k => low(n).includes(k))); return p.length ? p[hash(kind + o.id) % p.length] : null; };
  const nm = slug(o.name), words = nm.split('-').filter(w => w.length >= 4);
  // 1) o nome da loja/produto aponta para um tipo de comida (ou a palavra aparece no arquivo)
  const groups = NAME_RULES.filter(([re]) => re.test(nm)).map(([, g]) => g);
  for (const g of groups){ const r = pick(FOOD[g]); if (r) return r; }
  const w = pick(words); if (w) return w;
  // 2) categoria da loja
  const catId = kind === 'stores' ? o.category_id : allStores.find(s => s.id === o.store_id)?.category_id;
  const c = slug(catName(catId)), g = CAT_GROUP[c], r = g ? pick(FOOD[g]) : (c ? pick([c]) : null);
  return r || names[hash(kind + o.id) % names.length];
}
function imgPath(kind, o){
  const m = bucketFiles;
  return o.image_file || ls('pu_imgmap', {})[`${kind}-${o.id}`] || m?.get(`${kind}-${o.id}`) || m?.get(`${kind}/${o.id}`) || m?.get(slug(o.name)) || fuzzyImg(o) || autoImg(kind, o) || `${kind}-${o.id}.webp`;
}
async function toWebp(file){
  try {
    const bm = await createImageBitmap(file), k = Math.min(1, 1000/Math.max(bm.width, bm.height));
    const c = document.createElement('canvas'); c.width = Math.round(bm.width*k); c.height = Math.round(bm.height*k);
    c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
    const b = await new Promise(r => c.toBlob(r, 'image/webp', .85));
    if (b && b.type === 'image/webp') return b;
  } catch {}
  return null;
}
/* Envia um arquivo para a raiz do bucket (tenta criar; se já existe, substitui) */
async function putFile(name, body, type){
  let r = await sb.storage.from(BUCKET).upload(name, body, { upsert:false, contentType:type });
  if (r.error && /already exists|duplicate/i.test(r.error.message)) r = await sb.storage.from(BUCKET).upload(name, body, { upsert:true, contentType:type });
  if (r.error) throw r.error;
  bucketFiles = null;
}
const storageMsg = e => /row-level security|policy|unauthorized|forbidden|403/i.test(e?.message||'')
  ? 'sem permissão de envio no bucket img_comidas (o dono do projeto precisa liberar o envio de imagens).' : (e?.message || 'erro desconhecido');
async function uploadImg(kind, id, file){
  const w = await toWebp(file), ext = w ? 'webp' : (file.name.split('.').pop() || 'jpg').toLowerCase(), name = `${kind}-${id}.${ext}`;
  await putFile(name, w || file, w ? 'image/webp' : file.type);
  return name;
}
let user = null, profile = null, cats = [], allStores = [], catFilter = null, cart = ls('pu_cart', { store:null, lines:{} });
const cartCount = () => Object.values(cart.lines).reduce((t,l)=>t+l.qty,0);
const role = () => profile?.role || user?.user_metadata?.role || 'user';
const catName = id => cats.find(c => c.id === id)?.name || '';

/* Guarda no banco (coluna image_file) qual imagem do bucket a loja/produto usa.
   Se o banco recusar (coluna ainda não criada ou sem permissão), guarda só neste navegador. */
const TABLE = { stores:'stores', items:'menu_items' };
async function setImage(kind, id, fileName){
  const { data, error } = await sb.from(TABLE[kind]).update({ image_file:fileName }).eq('id', id).select();
  const map = ls('pu_imgmap', {});
  if (!error && data?.length){ delete map[`${kind}-${id}`]; lsSet('pu_imgmap', map); return 'bucket'; }
  map[`${kind}-${id}`] = fileName; lsSet('pu_imgmap', map); return 'local';
}
async function applyImage(kind, id, pick){
  if (!pick) return 'none';
  if (pick.upload){ const n = await uploadImg(kind, id, pick.upload); return setImage(kind, id, n); }
  return setImage(kind, id, pick.file);
}
const imgNote = r => r === 'local' ? ' Atenção: a imagem ficou salva só neste navegador. Rode o SQL da coluna image_file no Supabase para ela aparecer para todos.' : '';
