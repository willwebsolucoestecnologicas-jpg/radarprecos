// script.js - v8.3 (Carrinho Restaurado + Chat Fixo)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzs1hlJIptANs_zPYIB4KWgsNmoXsPxp874bOti2jkSt0yCHh4Oj-fQuRMC57ygntNw/exec'; 

let html5QrCode;
let scannerIsRunning = false;
let catalogoDados = [];
let carrinho = JSON.parse(localStorage.getItem('kalango_cart')) || [];

// --- CARRINHO / LISTA DE COMPRAS ---
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
    if(badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

function adicionarAoCarrinho(produto, preco, mercado) {
    const id = produto + mercado; // ID único simples
    const existente = carrinho.find(i => i.id === id);
    
    if (existente) {
        existente.qtd++;
    } else {
        carrinho.push({ id, produto, preco, mercado, qtd: 1 });
    }
    
    salvarCarrinho();
    mostrarNotificacao(`+1 ${produto} na lista!`);
    
    // Efeito visual de pulo no botão
    const btnCart = document.querySelector('.fixed.bottom-24');
    if(btnCart) {
        btnCart.classList.remove('animate-bounce-slow');
        void btnCart.offsetWidth; // Trigger reflow
        btnCart.classList.add('animate-bounce-slow');
    }
}

function removerDoCarrinho(id) {
    carrinho = carrinho.filter(i => i.id !== id);
    salvarCarrinho();
    renderizarCarrinho();
}

function limparCarrinho() {
    if(confirm("Limpar toda a lista?")) {
        carrinho = [];
        salvarCarrinho();
        renderizarCarrinho();
        toggleCarrinho();
    }
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
        container.innerHTML = `<div class="text-center py-20 opacity-30"><i class="fas fa-basket-shopping text-4xl mb-3"></i><p>Sua lista está vazia.</p></div>`;
        totalEl.textContent = "R$ 0,00";
        totalItemsEl.textContent = "0 itens";
        return;
    }

    container.innerHTML = '';
    let total = 0;
    let qtdTotal = 0;

    carrinho.forEach(item => {
        total += item.preco * item.qtd;
        qtdTotal += item.qtd;
        
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700";
        div.innerHTML = `
            <div>
                <h4 class="text-sm font-bold text-white">${item.produto}</h4>
                <p class="text-[10px] text-slate-400">${item.mercado}</p>
                <p class="text-xs text-emerald-400 font-bold mt-1">${item.qtd}x R$ ${item.preco.toFixed(2)}</p>
            </div>
            <button onclick="removerDoCarrinho('${item.id}')" class="text-red-400 hover:text-red-300 p-2">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });

    totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    totalItemsEl.textContent = `${qtdTotal} itens na lista`;
}

// --- NAVEGAÇÃO ---
async function trocarAba(aba) {
    const abas = ['registrar', 'consultar', 'catalogo', 'chat'];
    abas.forEach(a => {
        const el = document.getElementById(a + '-container');
        if(el) el.classList.add('hidden');
    });
    abas.forEach(id => {
        const btn = document.getElementById('nav-' + id);
        if(btn) btn.className = "nav-btn text-slate-500";
    });

    if (scannerIsRunning && html5QrCode) {
        try { await html5QrCode.stop(); scannerIsRunning = false; document.getElementById('reader').innerHTML = ''; } catch(e){}
    }

    const ativo = document.getElementById(aba + '-container');
    if(ativo) ativo.classList.remove('hidden');
    
    const btnAtivo = document.getElementById('nav-' + aba);
    if(btnAtivo) btnAtivo.className = "nav-btn text-emerald-500";

    if (aba === 'registrar') {
        const t = document.querySelector('#scanner-section h2');
        if(t) t.textContent = "Registrar Preço";
    }
    if (aba === 'catalogo') carregarCatalogo();
}

// --- SISTEMAS (NOTIFICAÇÃO, IMAGEM, SCANNER) ---
function mostrarNotificacao(msg, tipo = 'sucesso') {
    const t = document.getElementById('toast-notification');
    const m = document.getElementById('toast-message');
    if(!t) return;
    m.textContent = msg;
    t.className = tipo === 'erro' 
        ? "fixed top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-5 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 font-bold transition-all duration-300 w-max max-w-[90%]"
        : "fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 font-bold transition-all duration-300 w-max max-w-[90%]";
    t.classList.remove('-translate-y-32', 'opacity-0');
    setTimeout(() => t.classList.add('-translate-y-32', 'opacity-0'), 3000);
}

function comprimirImagem(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = 800; 
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}

// --- CATÁLOGO & BUSCA (ATUALIZADOS COM BOTÃO +) ---
async function carregarCatalogo() {
    const lista = document.getElementById('lista-catalogo');
    const select = document.getElementById('filtro-mercado-catalogo');
    if(!lista) return;
    lista.innerHTML = `<div class="text-center py-10 opacity-30"><i class="fas fa-spinner fa-spin text-2xl"></i><p>Carregando...</p></div>`;

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=listarCatalogo`, { redirect: 'follow' });
        const data = await res.json();
        
        if (data.catalogo && data.catalogo.length > 0) {
            catalogoDados = data.catalogo;
            atualizarListaCatalogo(catalogoDados);
            if(select) {
                select.innerHTML = '<option value="todos">Todos</option>';
                [...new Set(catalogoDados.map(i => i.mercado))].forEach(m => {
                    const opt = document.createElement('option'); opt.value = m; opt.textContent = m; select.appendChild(opt);
                });
            }
        } else {
            lista.innerHTML = `<div class="text-center py-10 opacity-30"><p>Nada cadastrado.</p></div>`;
        }
    } catch (e) { lista.innerHTML = `<div class="text-center py-10 opacity-50"><p>Erro conexão.</p></div>`; }
}

function atualizarListaCatalogo(dados) {
    const lista = document.getElementById('lista-catalogo');
    if(!lista) return;
    lista.innerHTML = '';
    
    dados.forEach(item => {
        const img = (item.imagem && item.imagem.length > 10) ? item.imagem : "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
        const div = document.createElement('div');
        div.className = "bg-slate-800 border border-slate-700 p-3 rounded-xl flex gap-3 items-center shadow-sm";
        div.innerHTML = `
            <div class="w-12 h-12 bg-white/5 rounded-lg p-1 flex-shrink-0 flex items-center justify-center"><img src="${img}" class="max-w-full max-h-full object-contain"></div>
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-white truncate">${item.produto}</h4>
                <div class="flex justify-between items-center mt-1">
                    <span class="text-emerald-400 font-black text-sm">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
                    <span class="text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded truncate max-w-[80px]">${item.mercado}</span>
                </div>
            </div>
            <button onclick="adicionarAoCarrinho('${item.produto}', ${item.preco}, '${item.mercado}')" class="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors">
                <i class="fas fa-plus"></i>
            </button>
        `;
        lista.appendChild(div);
    });
}

// --- LÓGICA DE BUSCA ---
async function pesquisarPrecos() {
    const busca = document.getElementById('ean-busca').value;
    const container = document.getElementById('resultados-consulta');
    const btn = document.getElementById('btn-pesquisar');
    
    if (!busca) return mostrarNotificacao("Digite algo!", "erro");
    
    const iconOriginal = btn.innerHTML;
    btn.innerHTML = '<div class="loader w-4 h-4 border-slate-900"></div>'; 
    container.innerHTML = ''; 
    
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=consultarPrecos&ean=${encodeURIComponent(busca)}`, { redirect: 'follow' });
        const data = await res.json();
        btn.innerHTML = iconOriginal;
        
        if (!data.resultados || data.resultados.length === 0) { 
            container.innerHTML = `<div class="text-center py-8 opacity-50 bg-slate-800 rounded-xl"><p>Não achei nada.</p></div>`; 
            return; 
        }
        
        const lista = data.resultados.sort((a, b) => a.preco - b.preco);
        
        // Cabeçalho do Resultado
        const h = document.createElement('div');
        h.className = "mb-4 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20";
        h.innerHTML = `<h3 class="text-sm font-bold text-emerald-400">Resultados para "${busca}"</h3>`;
        container.appendChild(h);
        
        lista.forEach((item, index) => {
            const eMaisBarato = index === 0;
            const img = (item.imagem && item.imagem.length > 10) ? item.imagem : "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
            
            const card = document.createElement('div');
            card.className = `p-4 rounded-2xl mb-3 relative overflow-hidden flex gap-3 ${eMaisBarato ? 'bg-gradient-to-br from-emerald-900 to-slate-800 border border-emerald-500 shadow-lg' : 'bg-slate-800 border border-slate-700'}`;
            
            card.innerHTML = `
                <div class="w-14 h-14 bg-white/5 rounded-xl p-1 flex-shrink-0 flex items-center justify-center"><img src="${img}" class="max-w-full max-h-full object-contain"></div>
                <div class="flex-1 relative z-10">
                    ${eMaisBarato ? `<span class="bg-emerald-500 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase absolute -top-1 right-0">Melhor Preço</span>` : ''}
                    <h3 class="text-xl font-black ${eMaisBarato ? 'text-emerald-400' : 'text-white'}">R$ ${item.preco.toFixed(2).replace('.', ',')}</h3>
                    <p class="font-bold text-[10px] uppercase text-slate-300 line-clamp-1">${item.mercado}</p>
                    <p class="text-[9px] text-slate-500 mt-1">Enviado por ${item.usuario || 'Anônimo'} em ${new Date(item.data).toLocaleDateString()}</p>
                </div>
                <button onclick="adicionarAoCarrinho('${item.produto}', ${item.preco}, '${item.mercado}')" class="self-center w-10 h-10 rounded-full bg-slate-700 hover:bg-emerald-500 hover:text-white text-emerald-500 flex items-center justify-center transition-colors shadow-lg">
                    <i class="fas fa-cart-plus"></i>
                </button>
            `;
            container.appendChild(card);
        });
    } catch (err) { mostrarNotificacao("Erro na busca.", "erro"); btn.innerHTML = iconOriginal; }
}

// --- CHAT KALANGO ---
async function enviarMensagemGemini() {
    const input = document.getElementById('chat-input');
    const area = document.getElementById('chat-messages');
    const txt = input.value.trim();
    if (!txt) return;
    
    area.innerHTML += `<div class="chat-user text-sm mb-2">${txt}</div>`;
    input.value = '';
    area.scrollTop = area.scrollHeight; // Auto scroll
    
    // Loading falso
    const id = 'load-' + Date.now();
    area.innerHTML += `<div id="${id}" class="chat-ai text-sm mb-2 opacity-50"><i class="fas fa-circle-notch fa-spin"></i> Digitando...</div>`;
    area.scrollTop = area.scrollHeight;
    
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=chatGemini&pergunta=${encodeURIComponent(txt)}`, { redirect: 'follow' });
        const data = await res.json();
        document.getElementById(id).remove();
        
        if (data.resposta) {
            const r = data.resposta.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
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

// --- SCANNER & INIT ---
async function iniciarCamera(modo) {
    if (scannerIsRunning) return;
    if (modo === 'pesquisar') {
        trocarAba('registrar'); // Reusa a aba de registro para escanear
        document.querySelector('#scanner-section h2').textContent = "Escanear para Pesquisar";
        // Override function success temporariamente
        const originalSuccess = onScanSuccess;
        onScanSuccess = async (t) => {
            html5QrCode.stop().then(() => { 
                document.getElementById('reader').innerHTML = ''; scannerIsRunning = false; 
                trocarAba('consultar');
                document.getElementById('ean-busca').value = t;
                pesquisarPrecos();
                onScanSuccess = originalSuccess; // Restaura
            });
        };
    }
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        scannerIsRunning = true;
        await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess);
        document.getElementById('start-scan-btn').classList.add('hidden');
    } catch (err) {
        scannerIsRunning = false;
        mostrarNotificacao("Erro na câmera", "erro");
        document.getElementById('start-scan-btn').classList.remove('hidden');
    }
}

async function onScanSuccess(decodedText) {
    if (html5QrCode) {
        html5QrCode.stop().then(() => { document.getElementById('reader').innerHTML = ''; scannerIsRunning = false; }).catch(() => scannerIsRunning = false);
    }
    document.getElementById('start-scan-btn').classList.remove('hidden');
    
    // Modo Registro
    document.getElementById('scanner-section').classList.add('hidden');
    document.getElementById('price-form-section').classList.remove('hidden');
    document.getElementById('ean-field').value = decodedText;
    document.getElementById('product-name').value = "Buscando...";
    
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?ean=${decodedText}`, { redirect: 'follow' });
        const data = await res.json();
        document.getElementById('product-name').value = data.nome || "";
        if(data.imagem && data.imagem.startsWith('http')) {
            document.getElementById('image-url-field').value = data.imagem;
            document.getElementById('preview-imagem').src = data.imagem;
            document.getElementById('preview-imagem').classList.remove('hidden');
            document.getElementById('btn-camera-foto').classList.add('hidden');
        }
    } catch(e) { document.getElementById('product-name').value = ""; }
}

async function salvarPreco(e) {
    e.preventDefault(); 
    const btn = e.target.querySelector('button[type="submit"]'); 
    const txt = btn.innerHTML; 
    btn.innerHTML = '...'; btn.disabled = true;
    
    const payload = { 
        ean: document.getElementById('ean-field').value, 
        produto: document.getElementById('product-name').value, 
        preco: document.getElementById('price').value, 
        mercado: document.getElementById('market').value, 
        usuario: document.getElementById('username').value, 
        imagem: document.getElementById('image-url-field').value 
    };
    
    try { 
        await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) }); 
        mostrarNotificacao("Salvo com sucesso!"); 
        setTimeout(() => location.reload(), 1500); 
    } catch (err) { 
        mostrarNotificacao("Erro ao salvar", "erro"); 
        btn.innerHTML = txt; btn.disabled = false; 
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    atualizarContadorCarrinho();
    
    const f = document.getElementById('filtro-mercado-catalogo');
    if(f) f.addEventListener('change', () => {
        const v = f.value;
        if(v === 'todos') atualizarListaCatalogo(catalogoDados);
        else atualizarListaCatalogo(catalogoDados.filter(i => i.mercado === v));
    });

    // Load initial data
    (async () => {
        try { 
            const res = await fetch(`${APPS_SCRIPT_URL}?acao=buscarMercados`, { redirect: 'follow' }); 
            const d = await res.json();
            const s = document.getElementById('market');
            if(d.mercados && s) {
                s.innerHTML = '';
                d.mercados.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; s.appendChild(o); });
            }
        } catch(e) {}
    })();
});
