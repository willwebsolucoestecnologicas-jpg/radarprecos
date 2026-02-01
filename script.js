// script.js - v8.6 (Otimizado: Câmera Fixa + Qtd Carrinho + Usuário Verificado)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzs1hlJIptANs_zPYIB4KWgsNmoXsPxp874bOti2jkSt0yCHh4Oj-fQuRMC57ygntNw/exec'; 

let html5QrCode;
let scannerIsRunning = false;
let catalogoDados = [];
let carrinho = JSON.parse(localStorage.getItem('kalango_cart')) || [];

// --- CONFIGURAÇÃO DE USUÁRIOS ---
const USUARIOS_VERIFICADOS = ['Will', 'Admin', 'Kalango', 'WillWeb', 'Suporte'];

function gerarSeloUsuario(nome) {
    if (!nome) return `<span class="text-[9px] text-slate-500 italic">Anônimo</span>`;
    // Verifica se o nome está na lista (ignorando maiúsculas/minúsculas)
    const isVerificado = USUARIOS_VERIFICADOS.some(u => u.toLowerCase() === nome.toLowerCase());
    
    if (isVerificado) {
        return `<span class="text-[9px] text-blue-400 font-bold flex items-center gap-1 bg-blue-400/10 px-1.5 py-0.5 rounded-full border border-blue-400/20"><i class="fas fa-certificate text-[8px]"></i> ${nome}</span>`;
    }
    return `<span class="text-[9px] text-slate-400 flex items-center gap-1"><i class="fas fa-user text-[8px]"></i> ${nome}</span>`;
}

// --- NAVEGAÇÃO ---
async function trocarAba(aba) {
    const abas = ['registrar', 'consultar', 'catalogo', 'chat'];
    
    // Esconde todas as abas e reseta cores dos botões
    abas.forEach(a => { 
        document.getElementById(a + '-container').classList.add('hidden'); 
        document.getElementById('nav-' + a).className = "nav-btn text-slate-500";
    });

    // Se a câmera estiver ligada e mudar de aba, desliga ela
    if (scannerIsRunning && html5QrCode) {
        try { await html5QrCode.stop(); scannerIsRunning = false; document.getElementById('reader').innerHTML = ''; } catch(e){}
    }

    // Mostra a aba certa e pinta o botão de verde
    document.getElementById(aba + '-container').classList.remove('hidden');
    document.getElementById('nav-' + aba).className = "nav-btn text-emerald-500";

    // Lógica especial: Esconder botão do carrinho se estiver no Chat
    const btnCarrinho = document.getElementById('btn-carrinho-flutuante');
    if (btnCarrinho) {
        aba === 'chat' ? btnCarrinho.classList.add('hidden') : btnCarrinho.classList.remove('hidden');
    }

    // Ações específicas ao entrar na aba
    if (aba === 'registrar') document.querySelector('#scanner-section h2').textContent = "Registrar Preço";
    if (aba === 'catalogo') carregarCatalogo();
    if (aba === 'chat') { 
        const chatArea = document.getElementById('chat-messages'); 
        setTimeout(() => chatArea.scrollTop = chatArea.scrollHeight, 100); 
    }
}

// --- CARRINHO INTELIGENTE (COM QUANTIDADE) ---
function toggleCarrinho() {
    const modal = document.getElementById('cart-modal');
    const content = document.getElementById('cart-content');
    
    if (modal.classList.contains('hidden')) {
        renderizarCarrinho(); // Atualiza a lista antes de mostrar
        modal.classList.remove('hidden');
        // Pequeno delay para a animação deslizar pra cima
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
    // Cria um ID único juntando produto e mercado pra não duplicar linhas
    const id = produto + mercado; 
    const existente = carrinho.find(i => i.id === id);
    
    if (existente) {
        existente.qtd++;
    } else {
        carrinho.push({ id, produto, preco, mercado, qtd: 1 });
    }
    
    salvarCarrinho();
    mostrarNotificacao(`+1 ${produto} na lista!`);
    
    // Efeito de "pulo" no botão do carrinho
    const btnCart = document.getElementById('btn-carrinho-flutuante');
    if(btnCart) { 
        btnCart.classList.add('scale-125'); 
        setTimeout(() => btnCart.classList.remove('scale-125'), 200); 
    }
}

// --- AQUI ESTÁ A LÓGICA DE ALTERAR QUANTIDADE (+ / -) ---
function alterarQtd(id, delta) {
    const item = carrinho.find(i => i.id === id);
    if (item) {
        item.qtd += delta;
        // Se a quantidade for zero ou menor, remove o item
        if (item.qtd <= 0) {
            carrinho = carrinho.filter(i => i.id !== id);
        }
    }
    salvarCarrinho();
    renderizarCarrinho(); // Redesenha a lista na hora
}

function limparCarrinho() {
    if(confirm("Limpar toda a lista de compras?")) {
        carrinho = [];
        salvarCarrinho();
        renderizarCarrinho();
        toggleCarrinho(); // Fecha o modal
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
        div.className = "flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 mb-2";
        
        // HTML do Item com Botões de + e -
        div.innerHTML = `
            <div class="flex-1 min-w-0 pr-2">
                <h4 class="text-sm font-bold text-white line-clamp-1">${item.produto}</h4>
                <p class="text-[10px] text-slate-400">${item.mercado}</p>
                <p class="text-xs text-emerald-400 font-bold mt-1">Total: R$ ${(item.preco * item.qtd).toFixed(2)}</p>
            </div>
            <div class="flex items-center gap-3 bg-slate-900 rounded-lg p-1 border border-slate-700">
                <button onclick="alterarQtd('${item.id}', -1)" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-slate-800 rounded font-bold transition-colors active:scale-90">-</button>
                <span class="text-sm font-bold text-white w-4 text-center">${item.qtd}</span>
                <button onclick="alterarQtd('${item.id}', 1)" class="w-8 h-8 flex items-center justify-center text-emerald-400 hover:bg-slate-800 rounded font-bold transition-colors active:scale-90">+</button>
            </div>
        `;
        container.appendChild(div);
    });

    totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    totalItemsEl.textContent = `${qtdTotal} itens`;
}

// --- UTILITÁRIOS ---
function mostrarNotificacao(msg, tipo = 'sucesso') {
    const t = document.getElementById('toast-notification');
    const m = document.getElementById('toast-message');
    if(!t) return;
    
    m.textContent = msg;
    const baseClass = "fixed top-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 font-bold transition-all duration-300 w-max max-w-[90%] pointer-events-auto";
    const colorClass = tipo === 'erro' ? "bg-red-500 text-white" : "bg-emerald-600 text-white";
    
    t.className = `${baseClass} ${colorClass}`;
    t.classList.remove('-translate-y-32', 'opacity-0');
    
    setTimeout(() => {
        t.classList.add('-translate-y-32', 'opacity-0');
        t.classList.remove('pointer-events-auto');
        t.classList.add('pointer-events-none');
    }, 3000);
}

// Função para reduzir tamanho da imagem antes de enviar (Salva dados do usuário)
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
                const scale = 800 / img.width; // Reduz para largura de 800px
                canvas.width = 800;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6)); // Qualidade 60%
            };
        };
    });
}

// --- CÂMERA (CORRIGIDA) ---
async function iniciarCamera(modo) {
    if (scannerIsRunning) return;
    
    // Se for modo "pesquisar", muda a interface para parecer que está na busca
    if (modo === 'pesquisar') {
        trocarAba('registrar'); 
        document.querySelector('#scanner-section h2').textContent = "Escanear para Buscar";
        
        // Guarda a função original de sucesso
        const originalSuccess = onScanSuccess;
        
        // Cria uma função temporária para lidar com o scan de PESQUISA
        onScanSuccess = async (t) => {
            html5QrCode.stop().then(() => { 
                document.getElementById('reader').innerHTML = ''; 
                scannerIsRunning = false; 
                trocarAba('consultar'); 
                document.getElementById('ean-busca').value = t; 
                pesquisarPrecos(); 
                onScanSuccess = originalSuccess; // Restaura a função original
            });
        };
    } else {
        document.querySelector('#scanner-section h2').textContent = "Registrar Preço";
    }
    
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        scannerIsRunning = true;
        
        // Inicia a câmera
        await html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 250 } }, 
            onScanSuccess
        );
        
        document.getElementById('start-scan-btn').classList.add('hidden');
    } catch (err) { 
        scannerIsRunning = false;
        mostrarNotificacao("Erro: Permita o uso da câmera!", "erro");
        document.getElementById('start-scan-btn').classList.remove('hidden');
    }
}

// O que acontece quando o scanner lê um código (MODO REGISTRAR)
async function onScanSuccess(decodedText) {
    if (html5QrCode) {
        html5QrCode.stop().then(() => { 
            document.getElementById('reader').innerHTML = ''; 
            scannerIsRunning = false; 
        }).catch(() => scannerIsRunning = false);
    }
    
    // Mostra o formulário de preço
    document.getElementById('start-scan-btn').classList.remove('hidden');
    document.getElementById('scanner-section').classList.add('hidden');
    document.getElementById('price-form-section').classList.remove('hidden');
    
    // Preenche o código lido
    document.getElementById('ean-field').value = decodedText;
    document.getElementById('product-name').value = "Buscando nome...";
    
    // Busca nome do produto na API ou Memória
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?ean=${decodedText}`, { redirect: 'follow' });
        const data = await res.json();
        document.getElementById('product-name').value = data.nome || "";
        
        // Se já tiver imagem, mostra
        if(data.imagem && data.imagem.startsWith('http')) {
            document.getElementById('image-url-field').value = data.imagem;
            document.getElementById('preview-imagem').src = data.imagem;
            document.getElementById('preview-imagem').classList.remove('hidden');
            document.getElementById('btn-camera-foto').classList.add('hidden');
        }
    } catch(e) {
        document.getElementById('product-name').value = "";
    }
}

// Salvar novo preço no Google Sheets
async function salvarPreco(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<div class="loader w-5 h-5 border-white"></div>';
    btn.disabled = true;
    
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
        mostrarNotificacao("Preço Salvo com Sucesso!");
        setTimeout(() => location.reload(), 1500);
    } catch (err) {
        mostrarNotificacao("Erro ao salvar", "erro");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- CATÁLOGO & BUSCA ---
async function carregarCatalogo() {
    const lista = document.getElementById('lista-catalogo');
    const select = document.getElementById('filtro-mercado-catalogo');
    if(!lista) return;
    
    lista.innerHTML = `<div class="text-center py-10 opacity-30"><i class="fas fa-spinner fa-spin text-2xl"></i><p>O Kalango tá buscando...</p></div>`;
    
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=listarCatalogo`, { redirect: 'follow' });
        const data = await res.json();
        
        if (data.catalogo && data.catalogo.length > 0) {
            catalogoDados = data.catalogo;
            atualizarListaCatalogo(catalogoDados);
            
            // Popula o filtro se estiver vazio
            if(select && select.options.length <= 1) {
                const mercadosUnicos = [...new Set(catalogoDados.map(i => i.mercado))];
                mercadosUnicos.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    select.appendChild(opt);
                });
            }
        } else {
            lista.innerHTML = `<div class="text-center py-10 opacity-30"><p>Nada cadastrado ainda.</p></div>`;
        }
    } catch (e) {
        lista.innerHTML = `<div class="text-center py-10 opacity-50"><p>Sem conexão.</p></div>`;
    }
}

function atualizarListaCatalogo(dados) {
    const lista = document.getElementById('lista-catalogo');
    if(!lista) return;
    lista.innerHTML = '';
    
    dados.forEach(item => {
        const imgUrl = (item.imagem && item.imagem.length > 10) ? item.imagem : "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
        
        const div = document.createElement('div');
        div.className = "bg-slate-800 border border-slate-700 p-3 rounded-xl flex gap-3 items-center shadow-sm mb-3";
        
        // AQUI ESTÁ O SELO DE USUÁRIO VERIFICADO 👇
        div.innerHTML = `
            <div class="w-12 h-12 bg-white/5 rounded-lg p-1 flex-shrink-0 flex items-center justify-center border border-white/5"><img src="${imgUrl}" class="max-w-full max-h-full object-contain"></div>
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-white truncate">${item.produto}</h4>
                <div class="flex justify-between items-end mt-1">
                    <div>
                        <span class="text-emerald-400 font-black text-sm block">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
                        <span class="text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded truncate max-w-[80px] inline-block">${item.mercado}</span>
                    </div>
                    <div class="text-right">
                        ${gerarSeloUsuario(item.usuario)}
                    </div>
                </div>
            </div>
            <button onclick="adicionarAoCarrinho('${item.produto.replace(/'/g, "\\'")}', ${item.preco}, '${item.mercado.replace(/'/g, "\\'")}')" class="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors">
                <i class="fas fa-plus"></i>
            </button>
        `;
        lista.appendChild(div);
    });
}

// --- BUSCA (AGORA COM NOME DE USUÁRIO) ---
async function pesquisarPrecos() {
    const busca = document.getElementById('ean-busca').value;
    const container = document.getElementById('resultados-consulta');
    const btn = document.getElementById('btn-pesquisar');
    
    if (!busca) return mostrarNotificacao("Digite algo pra buscar!", "erro");
    
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<div class="loader w-4 h-4 border-slate-900"></div>'; 
    container.innerHTML = ''; 
    
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=consultarPrecos&ean=${encodeURIComponent(busca)}`, { redirect: 'follow' });
        const data = await res.json();
        btn.innerHTML = originalIcon;
        
        if (!data.resultados || data.resultados.length === 0) { 
            container.innerHTML = `<div class="text-center py-8 opacity-50 bg-slate-800 rounded-xl"><p>Não achei nada, patrão.</p></div>`; 
            return; 
        }
        
        const lista = data.resultados.sort((a, b) => a.preco - b.preco);
        
        // Cabeçalho
        const h = document.createElement('div');
        h.className = "mb-4 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20";
        h.innerHTML = `<h3 class="text-sm font-bold text-emerald-400">Resultados para "${busca}"</h3>`;
        container.appendChild(h);
        
        lista.forEach((item, index) => {
            const eMaisBarato = index === 0;
            const imgUrl = (item.imagem && item.imagem.length > 10) ? item.imagem : "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
            
            const card = document.createElement('div');
            card.className = `p-4 rounded-2xl mb-3 relative overflow-hidden flex gap-3 ${eMaisBarato ? 'bg-gradient-to-br from-emerald-900 to-slate-800 border border-emerald-500 shadow-lg' : 'bg-slate-800 border border-slate-700'}`;
            
            card.innerHTML = `
                <div class="w-14 h-14 bg-white/5 rounded-xl p-1 flex-shrink-0 flex items-center justify-center"><img src="${imgUrl}" class="max-w-full max-h-full object-contain"></div>
                <div class="flex-1 relative z-10 min-w-0">
                    ${eMaisBarato ? `<span class="bg-emerald-500 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase absolute -top-1 right-0">Só o Ouro</span>` : ''}
                    <h3 class="text-xl font-black ${eMaisBarato ? 'text-emerald-400' : 'text-white'}">R$ ${item.preco.toFixed(2).replace('.', ',')}</h3>
                    <p class="font-bold text-xs uppercase text-slate-300 truncate">${item.mercado}</p>
                    <div class="mt-1 flex justify-between items-end">
                        <p class="text-[9px] text-slate-500 truncate max-w-[100px]">${item.produto}</p>
                        ${gerarSeloUsuario(item.usuario)}
                    </div>
                </div>
                <button onclick="adicionarAoCarrinho('${item.produto.replace(/'/g, "\\'")}', ${item.preco}, '${item.mercado.replace(/'/g, "\\'")}')" class="self-center w-10 h-10 rounded-full bg-slate-700 hover:bg-emerald-500 hover:text-white text-emerald-500 flex items-center justify-center transition-colors shadow-lg z-20">
                    <i class="fas fa-cart-plus"></i>
                </button>
            `;
            container.appendChild(card);
        });
    } catch (err) { 
        mostrarNotificacao("Erro na busca.", "erro"); 
        btn.innerHTML = originalIcon; 
    }
}

// --- CHAT KALANGO ---
async function enviarMensagemGemini() {
    const input = document.getElementById('chat-input');
    const area = document.getElementById('chat-messages');
    const texto = input.value.trim();
    
    if (!texto) return;
    
    // Mensagem Usuário
    area.innerHTML += `<div class="chat-user text-sm mb-2">${texto}</div>`;
    input.value = '';
    area.scrollTop = area.scrollHeight;
    
    // Loading
    const loadingId = 'loading-' + Date.now();
    area.innerHTML += `<div id="${loadingId}" class="chat-ai text-sm mb-2 opacity-50"><i class="fas fa-circle-notch fa-spin"></i> Digitando...</div>`;
    area.scrollTop = area.scrollHeight;
    
    try {
        const url = `${APPS_SCRIPT_URL}?acao=chatGemini&pergunta=${encodeURIComponent(texto)}`;
        const res = await fetch(url, { redirect: 'follow' });
        const data = await res.json();
        
        document.getElementById(loadingId).remove();
        
        if (data.resposta) {
            const respFormatada = data.resposta.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            area.innerHTML += `<div class="chat-ai text-sm mb-2">${respFormatada}</div>`;
        } else {
            area.innerHTML += `<div class="chat-ai text-sm mb-2 text-yellow-400">O Kalango não entendeu.</div>`;
        }

    } catch (e) {
        if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        area.innerHTML += `<div class="chat-ai text-sm mb-2 text-red-400">Sem internet, patrão.</div>`;
    }
    area.scrollTop = area.scrollHeight;
}

// --- SETUP INICIAL ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Atualiza contador do carrinho ao abrir
    atualizarContadorCarrinho();

    // Filtro do Catálogo
    const selectFiltro = document.getElementById('filtro-mercado-catalogo');
    if(selectFiltro) {
        selectFiltro.addEventListener('change', () => {
            const val = selectFiltro.value;
            if (val === 'todos') atualizarListaCatalogo(catalogoDados);
            else atualizarListaCatalogo(catalogoDados.filter(item => item.mercado === val));
        });
    }

    // Listeners de Click (Garantia extra)
    const btnChat = document.getElementById('btn-enviar-chat');
    if(btnChat) btnChat.addEventListener('click', enviarMensagemGemini);
    
    const btnBusca = document.getElementById('btn-pesquisar');
    if(btnBusca) btnBusca.addEventListener('click', pesquisarPrecos);

    const formPreco = document.getElementById('price-form');
    if(formPreco) formPreco.addEventListener('submit', salvarPreco);

    // Carrega mercados para o <select>
    (async () => {
        try {
            const res = await fetch(`${APPS_SCRIPT_URL}?acao=buscarMercados`, { redirect: 'follow' });
            const data = await res.json();
            const selectMercado = document.getElementById('market');
            if(data.mercados && selectMercado) {
                selectMercado.innerHTML = ''; // Limpa antes de por
                data.mercados.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    selectMercado.appendChild(opt);
                });
            }
        } catch(e) {}
    })();
});
