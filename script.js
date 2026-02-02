// script.js - v10.1 (Correção de Login Mobile + Debug)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzs1hlJIptANs_zPYIB4KWgsNmoXsPxp874bOti2jkSt0yCHh4Oj-fQuRMC57ygntNw/exec'; 

// --- CONFIGURAÇÃO DO FIREBASE (Suas chaves reais) ---
const firebaseConfig = {
    apiKey: "AIzaSyCwNVNTZiUJ9qeqniRK9GHDofB9HaQTJ_c",
    authDomain: "kalango-app.firebaseapp.com",
    projectId: "kalango-app",
    storageBucket: "kalango-app.firebasestorage.app",
    messagingSenderId: "1060554025879",
    appId: "1:1060554025879:web:c41affa1cd8e8b346172d2",
    measurementId: "G-SMR42PSTBS"
};

// INICIALIZA FIREBASE
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- VARIÁVEIS GLOBAIS ---
let currentUser = null;
let html5QrCode;
let scannerIsRunning = false;
let catalogoDados = [];
let carrinho = JSON.parse(localStorage.getItem('kalango_cart')) || [];
let modoScanAtual = 'registrar';

const USUARIOS_VERIFICADOS = ['Will', 'Admin', 'Kalango', 'WillWeb', 'Suporte'];

// --- AUTENTICAÇÃO E LOGIN (ATUALIZADO) ---

// 1. Função de Login com Persistência Forçada
function fazerLoginGoogle() {
    // Força a persistência LOCAL antes de redirecionar para garantir que o celular salve a sessão
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            const provider = new firebase.auth.GoogleAuthProvider();
            return auth.signInWithRedirect(provider);
        })
        .catch((error) => {
            console.error("Erro ao iniciar login:", error);
            mostrarNotificacao("Erro ao iniciar: " + error.message, "erro");
        });
}

// 2. Detetive de Retorno (Verifica erros quando volta do Google)
auth.getRedirectResult()
    .then((result) => {
        if (result.user) {
            mostrarNotificacao(`Login Confirmado: ${result.user.displayName.split(' ')[0]}`);
        } else {
            console.log("Nenhum retorno de login processado nesta carga.");
        }
    })
    .catch((error) => {
        console.error("ERRO NO LOGIN (REDIRECT):", error);
        // ALERTA VISUAL PARA DEBUG (Vai aparecer na tela do celular)
        alert("ERRO NO LOGIN:\nCódigo: " + error.code + "\nMensagem: " + error.message);
        mostrarNotificacao("Falha no Login. Veja o alerta.", "erro");
    });

// Monitora se o usuário entrou ou saiu
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        // Esconde tela de login e mostra app
        document.getElementById('login-screen').classList.add('hidden');
        
        // Configura o cabeçalho com foto e nome
        const profileDiv = document.getElementById('user-profile');
        if(profileDiv) {
            profileDiv.classList.remove('hidden');
            profileDiv.classList.add('flex');
            document.getElementById('user-name-display').textContent = user.displayName.split(' ')[0];
            document.getElementById('user-avatar').src = user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
        }

        // Preenche o nome no formulário de registro automaticamente
        const campoUser = document.getElementById('username');
        if(campoUser) campoUser.value = user.displayName;

        // Libera botão do carrinho
        const btnCart = document.getElementById('btn-carrinho-flutuante');
        if(btnCart && carrinho.length > 0) btnCart.classList.remove('hidden');

        // Carrega o histórico de conversa
        carregarHistoricoChat(); 
    } else {
        currentUser = null;
        document.getElementById('login-screen').classList.remove('hidden');
        if(document.getElementById('user-profile')) document.getElementById('user-profile').classList.add('hidden');
    }
});

// --- SISTEMA DE CHAT COM HISTÓRICO (FIREBASE) ---
let unsubscribeChat = null;

function carregarHistoricoChat() {
    if(!currentUser) return;
    const chatArea = document.getElementById('chat-messages');
    chatArea.innerHTML = ''; 
    
    // Para de ouvir o chat antigo se houver troca de usuário
    if(unsubscribeChat) unsubscribeChat();

    // Ouve o banco de dados em tempo real
    unsubscribeChat = db.collection('chats')
        .doc(currentUser.uid)
        .collection('mensagens')
        .orderBy('timestamp', 'asc')
        .limit(100)
        .onSnapshot((snapshot) => {
            // Limpa e redesenha (ou adiciona novos)
            const area = document.getElementById('chat-messages');
            
            if(snapshot.empty) {
                area.innerHTML = `<div class="chat-ai text-sm mb-2">Opa, <b>${currentUser.displayName.split(' ')[0]}</b>! 🦎<br>Sou o Kalango. Pode falar o que tu quer comprar que eu monto a lista.</div>`;
            } else {
                area.innerHTML = ''; // Limpa para garantir ordem correta (poderia ser otimizado, mas assim é mais seguro)
                snapshot.forEach((doc) => {
                    const msg = doc.data();
                    renderizarMensagem(msg.texto, msg.remetente);
                });
            }
            area.scrollTop = area.scrollHeight;
        });
}

function renderizarMensagem(texto, remetente) {
    const area = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = remetente === 'user' ? "chat-user text-sm mb-2" : "chat-ai text-sm mb-2";
    div.innerHTML = texto.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    area.appendChild(div);
}

async function enviarMensagemGemini() {
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    if (!txt || !currentUser) return;
    
    input.value = ''; // Limpa campo
    
    // 1. Salva pergunta do usuário no Firebase
    try {
        await db.collection('chats').doc(currentUser.uid).collection('mensagens').add({
            texto: txt,
            remetente: 'user',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.error("Erro ao salvar msg user", e); }

    // Feedback visual de "Digitando..."
    const idLoad = 'load-' + Date.now();
    const area = document.getElementById('chat-messages');
    area.innerHTML += `<div id="${idLoad}" class="chat-ai text-sm mb-2 opacity-50"><i class="fas fa-circle-notch fa-spin"></i> Pensando...</div>`;
    area.scrollTop = area.scrollHeight;

    // 2. Envia para IA (Apps Script)
    try {
        // Envia o nome do usuário para a IA personalizar a resposta
        const promptContexto = `[Usuário: ${currentUser.displayName}] ${txt}`;
        
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=chatGemini&pergunta=${encodeURIComponent(promptContexto)}`, { redirect: 'follow' });
        const data = await res.json();
        
        // Remove o loading (a mensagem real virá pelo onSnapshot do Firebase)
        if(document.getElementById(idLoad)) document.getElementById(idLoad).remove();
        
        let resposta = data.resposta || "Oxe, me perdi aqui. Tenta de novo?";
        
        // Processa Comandos de Adicionar ao Carrinho (||ADD: Produto :: Preço :: Mercado||)
        const comandoAdd = resposta.match(/\|\|ADD:(.*?)\|\|/);
        if (comandoAdd && comandoAdd[1]) {
            const partes = comandoAdd[1].split('::');
            const produto = partes[0] ? partes[0].trim() : "Item";
            const preco = partes[1] ? parseFloat(partes[1].trim()) : 0;
            const mercado = partes[2] ? partes[2].trim() : "Via Chat";
            
            adicionarAoCarrinho(produto, preco, mercado);
            resposta = resposta.replace(comandoAdd[0], ""); // Remove o comando visível
        }

        // 3. Salva resposta da IA no Firebase (Isso aciona o onSnapshot e exibe na tela)
        await db.collection('chats').doc(currentUser.uid).collection('mensagens').add({
            texto: resposta,
            remetente: 'ai',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

    } catch (e) {
        if(document.getElementById(idLoad)) document.getElementById(idLoad).remove();
        mostrarNotificacao("Erro de conexão com o Kalango", "erro");
    }
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
    if (btnCarrinho) { 
        // Esconde carrinho no chat para não atrapalhar a digitação, mostra nos outros se tiver itens
        if (aba === 'chat' || carrinho.length === 0) {
            btnCarrinho.classList.add('hidden');
        } else {
            btnCarrinho.classList.remove('hidden');
        }
    }

    if (aba === 'catalogo') carregarCatalogo();
    if (aba === 'chat') { 
        const ca = document.getElementById('chat-messages'); 
        setTimeout(() => ca.scrollTop = ca.scrollHeight, 100); 
    }
}

// --- CARRINHO & MODAL ---
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
    const btnCarrinho = document.getElementById('btn-carrinho-flutuante');
    
    if(badge) { 
        badge.textContent = count; 
        badge.classList.toggle('hidden', count === 0); 
    }
    
    // Se estiver vazio, esconde o botão (exceto se estiver na aba carrinho, mas ok)
    if (count === 0 && btnCarrinho) btnCarrinho.classList.add('hidden');
    else if (count > 0 && btnCarrinho && !document.getElementById('chat-container').classList.contains('hidden') === false) {
        btnCarrinho.classList.remove('hidden');
    }
}

function adicionarAoCarrinho(produto, preco, mercado) {
    let precoFinal = parseFloat(preco);
    if (isNaN(precoFinal)) precoFinal = 0;

    const id = produto + mercado; 
    const existente = carrinho.find(i => i.id === id);
    if (existente) existente.qtd++; else carrinho.push({ id, produto, preco: precoFinal, mercado, qtd: 1 });
    
    salvarCarrinho();
    
    if (precoFinal === 0) mostrarNotificacao(`⚠️ ${produto} (Sem preço)`, "erro");
    else mostrarNotificacao(`+1 ${produto}`);
    
    const btnCart = document.getElementById('btn-carrinho-flutuante');
    if(btnCart) { 
        btnCart.classList.remove('hidden');
        btnCart.classList.add('scale-125'); 
        setTimeout(() => btnCart.classList.remove('scale-125'), 200); 
    }
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

function abrirModalLimpeza() { document.getElementById('confirm-modal').classList.remove('hidden'); }
function fecharModalConfirmacao() { document.getElementById('confirm-modal').classList.add('hidden'); }
function confirmarLimpeza() { carrinho = []; salvarCarrinho(); renderizarCarrinho(); fecharModalConfirmacao(); toggleCarrinho(); }
function salvarCarrinho() { localStorage.setItem('kalango_cart', JSON.stringify(carrinho)); atualizarContadorCarrinho(); }

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

// --- CÂMERA E SCANNER ---
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
}

// --- SALVAR PREÇO (ENVIAR PARA PLANILHA) ---
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
        mostrarNotificacao("Salvo!"); 
        setTimeout(() => location.reload(), 1500); 
    } catch (err) { 
        mostrarNotificacao("Erro", "erro"); 
        btn.innerHTML = txt; btn.disabled = false; 
    } 
}

// --- UTILITÁRIOS E UI ---
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

function gerarSeloUsuario(nome) {
    if (!nome) return `<span class="text-[9px] text-slate-500 italic">Anônimo</span>`;
    const isVerificado = USUARIOS_VERIFICADOS.some(u => u.toLowerCase() === nome.toLowerCase());
    if (isVerificado) return `<span class="text-[9px] text-blue-400 font-bold flex items-center gap-1 bg-blue-400/10 px-1.5 py-0.5 rounded-full border border-blue-400/20"><i class="fas fa-certificate text-[8px]"></i> ${nome}</span>`;
    return `<span class="text-[9px] text-slate-400 flex items-center gap-1"><i class="fas fa-user text-[8px]"></i> ${nome}</span>`;
}

function comprimirImagem(file) { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (e) => { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const scale = 800 / img.width; canvas.width = 800; canvas.height = img.height * scale; ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }; }; }); }

// --- CATÁLOGO E BUSCA ---
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

// --- SETUP INICIAL ---
document.addEventListener('DOMContentLoaded', () => {
    atualizarContadorCarrinho();
    
    // Listeners
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

    // Carrega mercados para o select
    (async () => { try { const res = await fetch(`${APPS_SCRIPT_URL}?acao=buscarMercados`, { redirect: 'follow' }); const d = await res.json(); const s = document.getElementById('market'); if(d.mercados && s) { s.innerHTML = ''; d.mercados.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; s.appendChild(o); }); } } catch(e) {} })();
});
