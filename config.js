/* ===== Configuração (somente URL + Publishable Key) ===== */
const SUPABASE_URL = 'https://byycxurjjonbhrreoost.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CyvZ6fSv-rnd3tc_KhoVhg_jWxTrWOj';
const BUCKET = 'img_comidas';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* Esquema real: stores(id,owner_id,name,category_id,location,delivery_fee) · categories(id,name)
   menu_items(id,store_id,name,price,description,is_available) · orders(id,user_id,store_id,total_price,created_at)
   profiles(id,full_name,role). Imagens: bucket img_comidas em stores/<id> e items/<id> (sem coluna no banco). */
