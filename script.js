// script.js - v8.0 (Kalango Edition - Sem Alertas)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; 

let html5QrCode;
let scannerIsRunning = false;
let catalogoDados = [];

// --- SISTEMA DE NOTIFICAÇÃO (TOAST) ---
function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    
    // Se não existir toast no HTML, cria um dinamicamente (segurança)
    if (!toast) return console.log(mensagem);

    toastMsg.textContent = mensagem;
    if (tipo === 'erro') {
        toast.className = "fixed top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 font-bold transition-all duration-500 w-max max-w-[90%]";
        if(toastIcon) toastIcon.className = 'fas fa-circle-xmark text-xl';
    } else {
        toast.className = "fixed top-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 font-bold transition-all duration-500 w-max max-w-[90%]";
        if(toastIcon) toastIcon.className = 'fas fa-circle-check text-xl';
    }
    toast.classList.remove('-translate-y-32', 'opacity-0');
    setTimeout(() => toast.classList.add('-translate-y-32', 'opacity-0'), 4000);
}

// --- UTILITÁRIO DE IMAGEM ---
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

// --- NAVEGAÇÃO ---
async function trocarAba(aba) {
    const abas = ['registrar', 'consultar', 'catalogo', 'chat'];
    abas.forEach(a => {
        const container = document.getElementById(a + '-container');
        if(container) container.classList.add('hidden');
    });
    
    ['registrar', 'consultar', 'catalogo', 'chat'].forEach(id => {
        const btn = document.getElementById('nav-' + id);
        if(btn) btn.className = "nav-btn text-slate-500";
    });

    if (scannerIsRunning && html5QrCode) {
        try { await html5QrCode.stop(); scannerIsRunning = false; document.getElementById('reader').innerHTML = ''; } catch(e){}
    }

    const containerAtivo = document.getElementById(aba + '-container');
    if(containerAtivo) containerAtivo.classList.remove('hidden');
    
    if (aba === 'registrar') {
        document.getElementById('nav-registrar').className = "nav-btn text-blue-400";
        const titulo = document.querySelector('#scanner-section h2');
        if(titulo) titulo.textContent = "Registrar";
    }
    if (aba === 'consultar') document.getElementById('nav-consultar').className = "nav-btn text-yellow-400";
    if (aba === 'catalogo') {
        document.getElementById('nav-catalogo').className = "nav-btn text-emerald-400";
        carregarCatalogo();
    }
    if (aba === 'chat') {
        document.getElementById('nav-chat').className = "nav-btn text-purple-500";
    }
}

// --- CATÁLOGO ---
async function carregarCatalogo() {
    const lista = document.getElementById('lista-catalogo');
    const selectFiltro = document.getElementById('filtro-mercado-catalogo');
    
    if(!lista) return;

    lista.innerHTML = `<div class="text-center py-10 opacity-30"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="text-sm mt-2">O Kalango tá buscando...</p></div>`;

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=listarCatalogo`, { redirect: 'follow' });
        const data = await res.json();
        
        if (data.catalogo && data.catalogo.length > 0) {
            catalogoDados = data.catalogo;
            atualizarListaCatalogo(catalogoDados);
            
            // Popula filtro
            if(selectFiltro) {
                selectFiltro.innerHTML = '<option value="todos">Todos os Mercados</option>';
                const mercados = [...new Set(catalogoDados.map(item => item.mercado))];
                mercados.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    selectFiltro.appendChild(opt);
                });
            }
        } else {
            lista.innerHTML = `<div class="text-center py-10 opacity-30"><p>Nada cadastrado ainda, patrão.</p></div>`;
        }
    } catch (e) {
        lista.innerHTML = `<div class="text-center py-10 opacity-50"><p>Deu zebra na conexão.</p></div>`;
    }
}

function atualizarListaCatalogo(dados) {
    const lista = document.getElementById('lista-catalogo');
    if(!lista) return;
    lista.innerHTML = '';
    
    dados.forEach(item => {
        const imgUrl = (item.imagem && item.imagem.length > 10) ? item.imagem : "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
        
        const div = document.createElement('div');
        div.className = "bg-slate-900 border border-slate-800 p-3 rounded-xl flex gap-3 items-center";
        div.innerHTML = `
            <div class="w-12 h-12 bg-white/10 rounded-lg p-1 flex-shrink-0 flex items-center justify-center"><img src="${imgUrl}" class="max-w-full max-h-full object-contain"></div>
            <div class="flex-1">
                <h4 class="text-xs font-bold text-white line-clamp-1">${item.produto}</h4>
                <div class="flex justify-between items-center mt-1">
                    <span class="text-emerald-400 font-black text-sm">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
                    <span class="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">${item.mercado}</span>
                </div>
            </div>
        `;
        lista.appendChild(div);
    });
}

function filtrarCatalogo() {
    const filtro = document.getElementById('filtro-mercado-catalogo').value;
    if (filtro === 'todos') {
        atualizarListaCatalogo(catalogoDados);
    } else {
        const filtrados = catalogoDados.filter(item => item.mercado === filtro);
        atualizarListaCatalogo(filtrados);
    }
}

// --- CHAT KALANGO (ATUALIZADO) ---
async function enviarMensagemGemini() {
    const input = document.getElementById('chat-input');
    const area = document.getElementById('chat-messages');
    const texto = input.value.trim();
    
    if (!texto) return;
    
    // Usuário
    area.innerHTML += `<div class="chat-user text-sm mb-2">${texto}</div>`;
    input.value = '';
    area.scrollTop = area.scrollHeight;
    
    // Loading
    const loadingId = 'loading-' + Date.now();
    area.innerHTML += `<div id="${loadingId}" class="chat-ai text-sm mb-2 opacity-50"><i class="fas fa-circle-notch fa-spin"></i> O Kalango tá pensando...</div>`;
    area.scrollTop = area.scrollHeight;
    
    try {
        const url = `${APPS_SCRIPT_URL}?acao=chatGemini&pergunta=${encodeURIComponent(texto)}`;
        const res = await fetch(url, { redirect: 'follow' });
        const data = await res.json();
        
        document.getElementById(loadingId).remove();
        
        if (data.resposta) {
            // Formatação básica
            const respFormatada = data.resposta.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            const cor = data.resposta.startsWith('❌') ? 'text-red-400' : 'text-slate-200';
            area.innerHTML += `<div class="chat-ai text-sm mb-2 ${cor}">${respFormatada}</div>`;
        } else {
            area.innerHTML += `<div class="chat-ai text-sm mb-2 text-yellow-400">O Kalango ficou mudo. Tente de novo.</div>`;
        }

    } catch (e) {
        if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        area.innerHTML += `<div class="chat-ai text-sm mb-2 text-red-400">Sem internet, patrão.</div>`;
    }
    area.scrollTop = area.scrollHeight;
}

// --- SCANNER E FUNÇÕES GERAIS ---
async function iniciarCamera(modo) {
    if (scannerIsRunning) return;
    const msg = document.getElementById('scan-message');
    const tituloScanner = document.querySelector('#scanner-section h2');
    
    if(msg) {
        msg.classList.remove('hidden');
        msg.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Iniciando...`;
    }

    if (modo === 'pesquisar') {
        document.getElementById('consultar-container').classList.add('hidden');
        document.getElementById('registrar-container').classList.remove('hidden');
        document.getElementById('scanner-section').classList.remove('hidden');
        document.getElementById('price-form-section').classList.add('hidden');
        document.getElementById('nav-registrar').className = "nav-btn text-slate-500";
        document.getElementById('nav-consultar').className = "nav-btn text-yellow-400";
        if(tituloScanner) tituloScanner.textContent = "Pesquisar Código";
        document.getElementById('start-scan-btn').classList.add('hidden');
    } else {
        if(tituloScanner) tituloScanner.textContent = "Registrar";
    }
    
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        scannerIsRunning = true;
        await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (t) => onScanSuccess(t, modo));
    } catch (err) {
        scannerIsRunning = false;
        mostrarNotificacao("Erro na câmera.", "erro");
        if(msg) msg.classList.add('hidden');
        document.getElementById('start-scan-btn').classList.remove('hidden');
        if (modo === 'pesquisar') trocarAba('consultar');
    }
}

async function onScanSuccess(decodedText, modo) {
    if (html5QrCode) {
        html5QrCode.stop().then(() => { document.getElementById('reader').innerHTML = ''; scannerIsRunning = false; }).catch(() => scannerIsRunning = false);
    }
    if (modo === 'pesquisar') {
        document.querySelector('#scanner-section h2').textContent = "Registrar";
        await trocarAba('consultar');
        document.getElementById('ean-busca').value = decodedText;
        pesquisarPrecos();
        return;
    }
    document.getElementById('scanner-section').classList.add('hidden');
    document.getElementById('price-form-section').classList.remove('hidden');
    document.getElementById('ean-field').value = decodedText;
    document.getElementById('product-name').value = "Buscando...";
    document.getElementById('product-name').disabled = true;
    
    const imgPreview = document.getElementById('preview-imagem');
    const btnFoto = document.getElementById('btn-camera-foto');
    const urlField = document.getElementById('image-url-field');
    
    imgPreview.src = ""; imgPreview.classList.add('hidden'); 
    if(btnFoto) btnFoto.classList.add('hidden'); 
    urlField.value = "";

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?ean=${decodedText}`, { redirect: 'follow' });
        const data = await res.json();
        document.getElementById('product-name').value = data.nome || "";
        if (data.imagem && data.imagem.startsWith('http')) {
            imgPreview.src = data.imagem; imgPreview.classList.remove('hidden'); btnFoto.classList.add('hidden'); urlField.value = data.imagem;
        } else {
            imgPreview.classList.add('hidden'); 
            if(btnFoto) {
                btnFoto.classList.remove('hidden');
                btnFoto.innerHTML = '<i class="fas fa-camera text-slate-400 text-2xl mb-1"></i><span class="text-[9px] text-slate-400 font-bold uppercase">Foto</span>';
            }
        }
    } catch (e) { 
        document.getElementById('product-name').value = ""; 
        if(btnFoto) btnFoto.classList.remove('hidden'); 
    } 
    finally { document.getElementById('product-name').disabled = false; }
}

async function pesquisarPrecos() {
    const eanBusca = document.getElementById('ean-busca').value;
    const container = document.getElementById('resultados-consulta');
    const btn = document.getElementById('btn-pesquisar');
    
    if (!eanBusca) return mostrarNotificacao("Digite um código!", "erro");
    
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<div class="loader w-4 h-4 border-slate-900"></div>'; 
    container.innerHTML = ''; 
    
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=consultarPrecos&ean=${eanBusca}`, { redirect: 'follow' });
        const data = await res.json();
        btn.innerHTML = originalIcon;
        
        if (!data.resultados || data.resultados.length === 0) { 
            container.innerHTML = `<div class="text-center py-8 opacity-50 bg-slate-900 rounded-xl"><p>O Kalango não achou esse preço.</p></div>`; 
            return; 
        }
        
        const lista = data.resultados.sort((a, b) => a.preco - b.preco);
        const nomeProdutoGeral = lista[0].produto;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = "flex justify-between items-center mb-4 bg-purple-500/10 p-4 rounded-xl border border-purple-500/20";
        headerDiv.innerHTML = `<div><h3 class="text-sm font-bold text-white line-clamp-1">${nomeProdutoGeral}</h3><p class="text-[10px] text-slate-400">EAN: ${eanBusca}</p></div>`;
        
        container.appendChild(headerDiv);
        
        lista.forEach((item, index) => {
            const eMaisBarato = index === 0;
            const imgUrl = (item.imagem && item.imagem.length > 10) ? item.imagem : "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
            
            const card = document.createElement('div');
            card.className = `p-4 rounded-2xl mb-4 relative overflow-hidden flex gap-4 ${eMaisBarato ? 'bg-gradient-to-br from-yellow-500 to-orange-600 shadow-xl border border-yellow-300 transform scale-[1.02]' : 'bg-slate-800 border border-slate-700'}`;
            
            card.innerHTML = `${eMaisBarato ? '<div class="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>' : ''}<div class="w-16 h-16 bg-white/10 rounded-xl p-1 flex-shrink-0 flex items-center justify-center border border-white/10"><img src="${imgUrl}" class="max-w-full max-h-full object-contain"></div><div class="flex-1 relative z-10 flex flex-col justify-between"><div>${eMaisBarato ? `<div class="absolute -top-1 -right-1"><span class="bg-white text-orange-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm"><i class="fas fa-crown"></i> Só o Ouro</span></div>` : ''}<h3 class="text-2xl font-black ${eMaisBarato ? 'text-white' : 'text-emerald-400'}">R$ ${item.preco.toFixed(2).replace('.', ',')}</h3><p class="font-bold text-xs uppercase ${eMaisBarato ? 'text-white' : 'text-slate-300'} line-clamp-1 mt-0.5"><i class="fas fa-store mr-1 opacity-70"></i> ${item.mercado}</p></div><div class="flex justify-between items-end border-t ${eMaisBarato ? 'border-white/20' : 'border-slate-700'} pt-2 mt-2"><div class="flex items-center gap-1.5"><i class="fas fa-user text-[10px]"></i><span class="text-[10px] font-bold">${item.usuario || 'Anônimo'}</span></div><span class="text-[9px] opacity-60">${new Date(item.data).toLocaleDateString('pt-BR').slice(0,5)}</span></div></div>`;
            container.appendChild(card);
        });
    } catch (err) { mostrarNotificacao("Erro na busca.", "erro"); btn.innerHTML = originalIcon; }
}

async function salvarPreco(e) {
    e.preventDefault(); const btn = e.target.querySelector('button'); const originalText = btn.innerHTML; btn.innerHTML = '<div class="loader w-5 h-5 border-white"></div>'; btn.disabled = true;
    const payload = { ean: document.getElementById('ean-field').value, produto: document.getElementById('product-name').value, preco: document.getElementById('price').value, mercado: document.getElementById('market').value, usuario: document.getElementById('username').value, imagem: document.getElementById('image-url-field').value };
    try { await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) }); mostrarNotificacao("Preço registrado!"); setTimeout(() => location.reload(), 2000); } catch (err) { mostrarNotificacao("Erro ao salvar.", "erro"); btn.innerHTML = originalText; btn.disabled = false; }
}

async function loadMarkets() {
    const select = document.getElementById('market');
    if(!select) return;
    try { const res = await fetch(`${APPS_SCRIPT_URL}?acao=buscarMercados`, { redirect: 'follow' }); const data = await res.json(); if(data.mercados) { select.innerHTML = '<option value="">Selecione...</option>'; data.mercados.forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; select.appendChild(opt); }); } } catch (e) { select.innerHTML = '<option value="Geral">Mercado Geral</option>'; }
}

// --- INICIALIZAÇÃO E BOAS VINDAS DO KALANGO ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. FORÇAR A MENSAGEM DO KALANGO (Sobrescreve o HTML antigo)
    const chatArea = document.getElementById('chat-messages');
    if(chatArea) {
        chatArea.innerHTML = `
            <div class="chat-ai text-sm mb-2">
                Opa, meu patrão! O <b>Kalango</b> tá on! 🦎<br>
                Tô de olho nos preços de Luís Gomes.<br>
                O que a gente vai caçar hoje?
            </div>
        `;
    }

    loadMarkets();

    // Listeners
    if(document.getElementById('nav-registrar')) document.getElementById('nav-registrar').addEventListener('click', () => trocarAba('registrar'));
    if(document.getElementById('nav-consultar')) document.getElementById('nav-consultar').addEventListener('click', () => trocarAba('consultar'));
    if(document.getElementById('nav-catalogo')) document.getElementById('nav-catalogo').addEventListener('click', () => trocarAba('catalogo'));
    if(document.getElementById('nav-chat')) document.getElementById('nav-chat').addEventListener('click', () => trocarAba('chat'));
    
    if(document.getElementById('start-scan-btn')) document.getElementById('start-scan-btn').addEventListener('click', () => iniciarCamera('registrar'));
    
    const btnScanSearch = document.getElementById('btn-scan-pesquisa'); 
    if (btnScanSearch) btnScanSearch.addEventListener('click', (e) => { e.preventDefault(); iniciarCamera('pesquisar'); });
    
    if(document.getElementById('btn-pesquisar')) document.getElementById('btn-pesquisar').addEventListener('click', pesquisarPrecos);
    if(document.getElementById('price-form')) document.getElementById('price-form').addEventListener('submit', salvarPreco);
    if(document.getElementById('filtro-mercado-catalogo')) document.getElementById('filtro-mercado-catalogo').addEventListener('change', filtrarCatalogo);
    if(document.getElementById('btn-enviar-chat')) document.getElementById('btn-enviar-chat').addEventListener('click', enviarMensagemGemini);

    // Camera Input manual
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

    const user = localStorage.getItem('radar_user'); 
    if(user && document.getElementById('username')) document.getElementById('username').value = user; 
    if(document.getElementById('username')) document.getElementById('username').addEventListener('input', (e) => localStorage.setItem('radar_user', e.target.value));
});
