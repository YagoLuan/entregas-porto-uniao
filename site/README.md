# Entrega Porto União – SC

Site de delivery (HTML + CSS + JavaScript) ligado ao Supabase.
Tudo fica nesta única pasta, sem subpastas.

## Arquivos
- index.html – página única
- style.css – estilos (tema claro/escuro)
- config.js – URL, Publishable Key e bucket
- utils.js – funções auxiliares, estado e imagens do bucket
- auth.js – cadastro, login e perfil
- home.js – lojas, categorias, busca e cardápio
- cart.js – carrinho e finalização do pedido
- orders.js – histórico de pedidos
- picker.js – seletor de imagens do bucket img_comidas
- owner.js – painel do dono da loja
- main.js – inicialização
- banco-imagens.sql – rode uma vez no Supabase (cria a coluna image_file)

## Como abrir
VS Code → extensão Live Server → botão "Go Live" (ou abra o index.html no navegador).
A ordem dos <script> no index.html importa: não troque.
