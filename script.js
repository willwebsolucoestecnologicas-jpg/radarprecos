// script.js - v8.8 (Comando de Voz + Modal Bonito + Câmera Global)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzs1hlJIptANs_zPYIB4KWgsNmoXsPxp874bOti2jkSt0yCHh4Oj-fQuRMC57ygntNw/exec'; 

let html5QrCode;
let scannerIsRunning = false;
let catalogoDados = [];
let carrinho = JSON.parse(localStorage.getItem('kalango_cart')) || [];
let modoScanAtual = 'registrar';

const USUARIOS_VERIFICADOS = ['Will', 'Admin', 'Kalango', 'WillWeb', 'Suporte'];

function gerarSeloUsuario(nome) {
    if (!nome) return `<span class="text-[9px] text-slate-500 italic">Anônimo</span>`;
    const isVerificado = USUARIOS_VERIFICADOS.some(u => u.toLowerCase() === nome.toLowerCase());
    if (isVerificado) return `<span class="text-[9px] text-blue-400 font-bold flex items-center gap-1 bg-blue-400/10 px-1.5 py-0.5 rounded-full border border-blue-400/20"><i class="fas fa-certificate text-[8px]"></i> ${nome}</span>`;
    return `<span class="text-[9px] text-slate-400 flex items-center gap-1"><i class="fas fa-user text-[8px]"></i> ${nome}</span>`;
}

// --- NAVEGAÇÃO ---
async function trocarAba(aba) {
    const abas = ['registrar', 'consultar', 'catalogo', 'chat'];
    if (scannerIsRunning) fecharCamera();
    abas.forEach(a => { 
        document.getElementById(a + '-container').classList.add('hidden'); 
        document.getElementById('nav-' + a).className = "nav-btn text-slate-500";
    });
    document.getElementById(aba + '-container').classList.remove('hidden');
    document.getElementById('nav-' + aba).className = "nav-btn text-emerald-500";
    
    const btnCarrinho = document.getElementById('btn-carrinho-flutuante');
    if (btnCarrinho) { aba === 'chat' ? btnCarrinho.classList.add('hidden') : btnCarrinho.classList.remove('hidden'); }

    if (aba === 'catalogo') carregarCatalogo();
    if (aba === 'chat') { const ca = document.getElementById('chat-messages'); setTimeout(() => ca.scrollTop = ca.scrollHeight, 100); }
}

// --- CARRINHO & MODAL DE LIMPEZA (NOVO!) ---
function toggleCarrinho() {
    const modal = document.getElementById('cart-modal');
    const content = document.getElementById('cart-content');
    if (modal.classList.contains('hidden')) {
        renderizarCarrinho();
        modal.classList.remove('hidden');
        setTimeout(() => content.classList.remove('translate-y-full'), 10);
    } else {
        content.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function atualizarContadorCarrinho() {
    const count = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    const badge = document.getElementById('cart-count');
    if(badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); }
}

function adicionarAoCarrinho(produto, preco, mercado) {
    // Se preço não for número (comando de voz), assume 0 ou busca
    if (typeof preco !== 'number') preco = 0; 
    
    const id = produto + mercado; 
    const existente = carrinho.find(i => i.id === id);
    if (existente) existente.qtd++; else carrinho.push({ id, produto, preco, mercado, qtd: 1 });
    salvarCarrinho();
    mostrarNotificacao(`+1 ${produto} na lista!`);
    const btnCart = document.getElementById('btn-carrinho-flutuante');
    if(btnCart) { btnCart.classList.add('scale-125'); setTimeout(() => btnCart.classList.remove('scale-125'), 200); }
}

function alterarQtd(id, delta) {
    const item = carrinho.find(i => i.id === id);
    if (item) {
        item.qtd += delta;
        if (item.qtd <= 0) carrinho = carrinho.filter(i => i.id !== id);
    }
    salvarCarrinho();
    renderizarCarrinho();
}

// NOVA LÓGICA DE LIMPEZA (JANELA BONITA)
function abrirModalLimpeza() {
    document.getElementById('confirm-modal').classList.remove('hidden');
}
function fecharModalConfirmacao() {
    document.getElementById('confirm-modal').classList.add('hidden');
}
function confirmarLimpeza() {
    carrinho = [];
    salvarCarrinho();
    renderizarCarrinho();
    fecharModalConfirmacao();
    toggleCarrinho();
}

function salvarCarrinho() {
    localStorage.setItem('kalango_cart', JSON.stringify(carrinho));
    atualizarContadorCarrinho();
}

function renderizarCarrinho() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total-price');
    const totalItemsEl = document.getElementById('cart-total-items');
    if (carrinho.length === 0) {
        container.innerHTML = `<div class="text-center py-20 opacity-30"><i class="fas fa-basket-shopping text-4xl mb-3"></i><p>Lista vazia.</p></div>`;
        totalEl.textContent = "R$ 0,00"; totalItemsEl.textContent = "0 itens"; return;
    }
    container.innerHTML = ''; let total = 0; let qtdTotal = 0;
    carrinho.forEach(item => {
        total += item.preco * item.qtd; qtdTotal += item.qtd;
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 mb-2";
        div.innerHTML = `
            <div class="flex-1 min-w-0 pr-2">
                <h4 class="text-sm font-bold text-white line-clamp-1">${item.produto}</h4>
                <p class="text-[10px] text-slate-400">${item.mercado}</p>
                <p class="text-xs text-emerald-400 font-bold mt-1">Total: R$ ${(item.preco * item.qtd).toFixed(2)}</p>
            </div>
            <div class="flex items-center gap-3 bg-slate-900 rounded-lg p-1 border border-slate-700">
                <button onclick="alterarQtd('${item.id}', -1)" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-slate-800 rounded font-bold">-</button>
                <span class="text-sm font-bold text-white w-4 text-center">${item.qtd}</span>
                <button onclick="alterarQtd('${item.id}', 1)" class="w-8 h-8 flex items-center justify-center text-emerald-400 hover:bg-slate-800 rounded font-bold">+</button>
            </div>
        `;
        container.appendChild(div);
    });
    totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`; totalItemsEl.textContent = `${qtdTotal} itens`;
}

// --- CÂMERA ---
async function iniciarCamera(modo) {
    if (scannerIsRunning) return;
    modoScanAtual = modo;
    const titulo = document.getElementById('scanner-title');
    titulo.textContent = modo === 'pesquisar' ? "Escanear para Buscar" : "Escanear para Registrar";
    document.getElementById('scanner-modal').classList.remove('hidden');
    document.getElementById('scanner-modal').classList.add('flex');
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        scannerIsRunning = true;
        await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess);
    } catch (err) { fecharCamera(); mostrarNotificacao("Erro: Permita a câmera!", "erro"); }
}
async function fecharCamera() {
    if (html5QrCode && scannerIsRunning) { try { await html5QrCode.stop(); } catch(e) {} scannerIsRunning = false; document.getElementById('reader').innerHTML = ''; }
    document.getElementById('scanner-modal').classList.add('hidden'); document.getElementById('scanner-modal').classList.remove('flex');
}
async function onScanSuccess(decodedText) {
    fecharCamera();
    if (modoScanAtual === 'pesquisar') {
        trocarAba('consultar'); document.getElementById('ean-busca').value = decodedText; pesquisarPrecos();
    } else {
        trocarAba('registrar'); document.getElementById('registrar-home').classList.add('hidden'); document.getElementById('price-form-section').classList.remove('hidden'); document.getElementById('ean-field').value = decodedText; document.getElementById('product-name').value = "Buscando...";
        try { const res = await fetch(`${APPS_SCRIPT_URL}?ean=${decodedText}`, { redirect: 'follow' }); const data = await res.json(); document.getElementById('product-name').value = data.nome || ""; if(data.imagem && data.imagem.startsWith('http')) { document.getElementById('image-url-field').value = data.imagem; document.getElementById('preview-imagem').src = data.imagem; document.getElementById('preview-imagem').classList.remove('hidden'); document.getElementById('btn-camera-foto').classList.add('hidden'); } } catch(e) { document.getElementById('product-name').value = ""; }
    }
}

async function salvarPreco(e) { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const txt = btn.innerHTML; btn.innerHTML = '...'; btn.disabled = true; const payload = { ean: document.getElementById('ean-field').value, produto: document.getElementById('product-name').value, preco: document.getElementById('price').value, mercado: document.getElementById('market').value, usuario: document.getElementById('username').value, imagem: document.getElementById('image-url-field').value }; try { await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) }); mostrarNotificacao("Salvo!"); setTimeout(() => location.reload(), 1500); } catch (err) { mostrarNotificacao("Erro", "erro"); btn.innerHTML = txt; btn.disabled = false; } }

// --- CHAT COM INTELIGÊNCIA DE COMANDO (VOZ PARA AÇÃO) ---
async function enviarMensagemGemini() {
    const input = document.getElementById('chat-input');
    const area = document.getElementById('chat-messages');
    const txt = input.value.trim();
    if (!txt) return;
    
    area.innerHTML += `<div class="chat-user text-sm mb-2">${txt}</div>`;
    input.value = ''; area.scrollTop = area.scrollHeight;
    
    const id = 'load-' + Date.now();
    area.innerHTML += `<div id="${id}" class="chat-ai text-sm mb-2 opacity-50"><i class="fas fa-circle-notch fa-spin"></i> Digitando...</div>`;
    area.scrollTop = area.scrollHeight;
    
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=chatGemini&pergunta=${encodeURIComponent(txt)}`, { redirect: 'follow' });
        const data = await res.json();
        document.getElementById(id).remove();
        
        if (data.resposta) {
            let respostaLimpa = data.resposta;
            
            // DETECTA COMANDO DE ADICIONAR (||ADD:Produto||)
            const comandoAdd = respostaLimpa.match(/\|\|ADD:(.*?)\|\|/);
            if (comandoAdd && comandoAdd[1]) {
                const produtoParaAdicionar = comandoAdd[1].trim();
                adicionarAoCarrinho(produtoParaAdicionar, 0, "Via Kalango"); // Adiciona com preço 0
                respostaLimpa = respostaLimpa.replace(comandoAdd[0], ""); // Remove o código da fala
            }

            const r = respostaLimpa.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            area.innerHTML += `<div class="chat-ai text-sm mb-2">${r}</div>`;
        } else {
            area.innerHTML += `<div class="chat-ai text-sm mb-2 text-yellow-400">Sem resposta.</div>`;
        }
    } catch (e) {
        if(document.getElementById(id)) document.getElementById(id).remove();
        area.innerHTML += `<div class="chat-ai text-sm mb-2 text-red-400">Erro de conexão.</div>`;
    }
    area.scrollTop = area.scrollHeight;
}

// --- UTILITÁRIOS FINAIS ---
function mostrarNotificacao(msg, tipo = 'sucesso') {
    const t = document.getElementById('toast-notification');
    const m = document.getElementById('toast-message');
    if(!t) return;
    m.textContent = msg;
    const baseClass = "fixed top-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 font-bold transition-all duration-300 w-max max-w-[90%] pointer-events-auto";
    const colorClass = tipo === 'erro' ? "bg-red-500 text-white" : "bg-emerald-600 text-white";
    t.className = `${baseClass} ${colorClass}`;
    t.classList.remove('-translate-y-32', 'opacity-0');
    setTimeout(() => { t.classList.add('-translate-y-32', 'opacity-0'); t.classList.remove('pointer-events-auto'); t.classList.add('pointer-events-none'); }, 3000);
}
function comprimirImagem(file) { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (e) => { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const scale = 800 / img.width; canvas.width = 800; canvas.height = img.height * scale; ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }; }; }); }
async function carregarCatalogo() {
    const lista = document.getElementById('lista-catalogo'); const select = document.getElementById('filtro-mercado-catalogo'); if(!lista) return;
    lista.innerHTML = `<div class="text-center py-10 opacity-30"><i class="fas fa-spinner fa-spin text-2xl"></i><p>Buscando...</p></div>`;
    try { const res = await fetch(`${APPS_SCRIPT_URL}?acao=listarCatalogo`, { redirect: 'follow' }); const data = await res.json(); if (data.catalogo && data.catalogo.length > 0) { catalogoDados = data.catalogo; atualizarListaCatalogo(catalogoDados); if(select && select.options.length <= 1) { [...new Set(catalogoDados.map(i => i.mercado))].forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; select.appendChild(opt); }); } } else { lista.innerHTML = `<div class="text-center py-10 opacity-30"><p>Nada cadastrado.</p></div>`; } } catch (e) { lista.innerHTML = `<div class="text-center py-10 opacity-50"><p>Erro conexão.</p></div>`; }
}
function atualizarListaCatalogo(dados) {
    const lista = document.getElementById('lista-catalogo'); if(!lista) return; lista.innerHTML = '';
    dados.forEach(item => { 
        const img = (item.imagem && item.imagem.length > 10) ? item.imagem : "https://cdn-icons-png.flaticon.com/512/2748/2748558.png"; 
        const div = document.createElement('div'); 
        div.className = "bg-slate-800 border border-slate-700 p-3 rounded-xl flex gap-3 items-center shadow-sm mb-3"; 
        div.innerHTML = `
            <div class="w-12 h-12 bg-white/5 rounded-lg p-1 flex-shrink-0 flex items-center justify-center"><img src="${img}" class="max-w-full max-h-full object-contain"></div>
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-white truncate">${item.produto}</h4>
                <div class="flex justify-between items-end mt-1">
                    <div><span class="text-emerald-400 font-black text-sm block">R$ ${item.preco.toFixed(2).replace('.', ',')}</span><span class="text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded truncate max-w-[80px] inline-block">${item.mercado}</span></div>
                    <div class="text-right">${gerarSeloUsuario(item.usuario)}</div>
                </div>
            </div>
            <button onclick="adicionarAoCarrinho('${item.produto.replace(/'/g, "\\'")}', ${item.preco}, '${item.mercado.replace(/'/g, "\\'")}')" class="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors"><i class="fas fa-plus"></i></button>
        `; 
        lista.appendChild(div); 
    });
}
async function pesquisarPrecos() {
    const busca = document.getElementById('ean-busca').value; const container = document.getElementById('resultados-consulta'); const btn = document.getElementById('btn-pesquisar'); if (!busca) return mostrarNotificacao("Digite algo!", "erro");
    const iconOriginal = btn.innerHTML; btn.innerHTML = '<div class="loader w-4 h-4 border-slate-900"></div>'; container.innerHTML = ''; 
    try { const res = await fetch(`${APPS_SCRIPT_URL}?acao=consultarPrecos&ean=${encodeURIComponent(busca)}`, { redirect: 'follow' }); const data = await res.json(); btn.innerHTML = iconOriginal; if (!data.resultados || data.resultados.length === 0) { container.innerHTML = `<div class="text-center py-8 opacity-50 bg-slate-800 rounded-xl"><p>Não achei nada.</p></div>`; return; } 
    const lista = data.resultados.sort((a, b) => a.preco - b.preco); const h = document.createElement('div'); h.className = "mb-4 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20"; h.innerHTML = `<h3 class="text-sm font-bold text-emerald-400">Resultados para "${busca}"</h3>`; container.appendChild(h); 
    lista.forEach((item, index) => { 
        const eMaisBarato = index === 0; const img = (item.imagem && item.imagem.length > 10) ? item.imagem : "https://cdn-icons-png.flaticon.com/512/2748/2748558.png"; 
        const card = document.createElement('div'); card.className = `p-4 rounded-2xl mb-3 relative overflow-hidden flex gap-3 ${eMaisBarato ? 'bg-gradient-to-br from-emerald-900 to-slate-800 border border-emerald-500 shadow-lg' : 'bg-slate-800 border border-slate-700'}`; 
        card.innerHTML = `<div class="w-14 h-14 bg-white/5 rounded-xl p-1 flex-shrink-0 flex items-center justify-center"><img src="${img}" class="max-w-full max-h-full object-contain"></div><div class="flex-1 relative z-10 min-w-0">${eMaisBarato ? `<span class="bg-emerald-500 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase absolute -top-1 right-0">Só o Ouro</span>` : ''}<h3 class="text-xl font-black ${eMaisBarato ? 'text-emerald-400' : 'text-white'}">R$ ${item.preco.toFixed(2).replace('.', ',')}</h3><p class="font-bold text-xs uppercase text-slate-300 truncate">${item.mercado}</p><div class="mt-1 flex justify-between items-end"><p class="text-[9px] text-slate-500 truncate max-w-[100px]">${item.produto}</p>${gerarSeloUsuario(item.usuario)}</div></div><button onclick="adicionarAoCarrinho('${item.produto.replace(/'/g, "\\'")}', ${item.preco}, '${item.mercado.replace(/'/g, "\\'")}')" class="self-center w-10 h-10 rounded-full bg-slate-700 hover:bg-emerald-500 hover:text-white text-emerald-500 flex items-center justify-center transition-colors shadow-lg z-20"><i class="fas fa-cart-plus"></i></button>`; container.appendChild(card); }); } catch (err) { mostrarNotificacao("Erro na busca.", "erro"); btn.innerHTML = iconOriginal; }
}

// SETUP
document.addEventListener('DOMContentLoaded', () => {
    atualizarContadorCarrinho();
    const f = document.getElementById('filtro-mercado-catalogo'); if(f) f.addEventListener('change', () => { const v = f.value; if(v === 'todos') atualizarListaCatalogo(catalogoDados); else atualizarListaCatalogo(catalogoDados.filter(i => i.mercado === v)); });
    if(document.getElementById('btn-enviar-chat')) document.getElementById('btn-enviar-chat').addEventListener('click', enviarMensagemGemini);
    if(document.getElementById('btn-pesquisar')) document.getElementById('btn-pesquisar').addEventListener('click', pesquisarPrecos);
    if(document.getElementById('price-form')) document.getElementById('price-form').addEventListener('submit', salvarPreco);
    // Botão de foto
    const btnFoto = document.getElementById('btn-camera-foto');
    const inputFoto = document.getElementById('input-foto-produto');
    const imgPreview = document.getElementById('preview-imagem');
    const urlField = document.getElementById('image-url-field');
    if(btnFoto && inputFoto) {
        btnFoto.addEventListener('click', () => inputFoto.click());
        inputFoto.addEventListener('change', async (e) => {
            if(e.target.files && e.target.files[0]) {
                const file = e.target.files[0]; btnFoto.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>'; 
                try { const base64 = await comprimirImagem(file); imgPreview.src = base64; imgPreview.classList.remove('hidden'); btnFoto.classList.add('hidden'); urlField.value = base64; } catch(err) { mostrarNotificacao("Erro na foto", "erro"); btnFoto.innerHTML = '<i class="fas fa-camera text-slate-400 text-2xl mb-1"></i><span class="text-[9px] text-slate-400 font-bold uppercase">Foto</span>'; }
            }
        });
    }
    (async () => { try { const res = await fetch(`${APPS_SCRIPT_URL}?acao=buscarMercados`, { redirect: 'follow' }); const d = await res.json(); const s = document.getElementById('market'); if(d.mercados && s) { s.innerHTML = ''; d.mercados.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; s.appendChild(o); }); } } catch(e) {} })();
});
