// script.js - VERSÃO FINAL 4.2 (COM FOTOS E SCANNER DE PESQUISA)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; 

let html5QrCode;
let modoScanner = 'registrar'; // Define se o scanner vai preencher o form ou a busca

// --- 1. NAVEGAÇÃO ENTRE ABAS ---
function trocarAba(aba) {
    const reg = document.getElementById('registrar-container');
    const cons = document.getElementById('consultar-container');
    const navReg = document.getElementById('nav-registrar');
    const navCons = document.getElementById('nav-consultar');
    
    // Para a câmera se estiver ligada ao trocar de aba
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.log("Stop failed", err));
    }

    if (aba === 'registrar') {
        reg.classList.remove('hidden');
        cons.classList.add('hidden');
        // Estilo visual do menu
        navReg.className = "flex flex-col items-center justify-center w-full py-2 group text-blue-400";
        navCons.className = "flex flex-col items-center justify-center w-full py-2 group text-slate-500 hover:text-yellow-400";
    } else {
        reg.classList.add('hidden');
        cons.classList.remove('hidden');
        // Estilo visual do menu
        navReg.className = "flex flex-col items-center justify-center w-full py-2 group text-slate-500 hover:text-blue-400";
        navCons.className = "flex flex-col items-center justify-center w-full py-2 group text-yellow-400";
    }
}

// --- 2. SCANNER INTELIGENTE (DUPLA FUNÇÃO) ---
async function iniciarCamera(modo) {
    modoScanner = modo; // Salva qual botão chamou a câmera ('registrar' ou 'pesquisar')
    
    // Se o usuário clicar no scanner da aba de pesquisa, forçamos a ida para a tela de registro
    // (porque é lá que o elemento visual #reader da câmera está)
    if (modo === 'pesquisar') {
        trocarAba('registrar'); 
        document.getElementById('start-scan-btn').classList.add('hidden'); // Esconde o botão "Abrir Câmera" original para não confundir
    }

    const msg = document.getElementById('scan-message');
    msg.classList.remove('hidden');
    // Mostra mensagem personalizada
    msg.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Escaneando para ${modo === 'registrar' ? 'registrar novo' : 'pesquisar'}...`;
    
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess);
    } catch (err) {
        alert("Erro ao abrir câmera: " + err);
        location.reload();
    }
}

async function onScanSuccess(decodedText) {
    await html5QrCode.stop();
    
    // === CAMINHO A: MODO PESQUISA (LUPA) ===
    if (modoScanner === 'pesquisar') {
        trocarAba('consultar'); // Volta para a tela de consulta
        document.getElementById('ean-busca').value = decodedText; // Joga o código na barra
        pesquisarPrecos(); // Clica na lupa automaticamente
        
        // Restaura o botão original da câmera
        document.getElementById('start-scan-btn').classList.remove('hidden');
        return;
    }

    // === CAMINHO B: MODO REGISTRO (FORMULÁRIO) ===
    const scannerSection = document.getElementById('scanner-section');
    const formSection = document.getElementById('price-form-section');
    const imgPreview = document.getElementById('preview-imagem');
    const urlField = document.getElementById('image-url-field');
    
    scannerSection.classList.add('hidden');
    formSection.classList.remove('hidden');
    
    document.getElementById('ean-field').value = decodedText;
    document.getElementById('product-name').value = "Buscando...";
    document.getElementById('product-name').disabled = true;
    
    // Reseta imagem anterior
    imgPreview.classList.add('hidden');
    imgPreview.src = "";
    urlField.value = "";

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?ean=${decodedText}`, { redirect: 'follow' });
        const data = await res.json();
        
        document.getElementById('product-name').value = data.nome || "";
        
        // Se a API retornou uma imagem válida, exibe ela
        if (data.imagem && data.imagem.startsWith('http')) {
            imgPreview.src = data.imagem;
            imgPreview.classList.remove('hidden');
            urlField.value = data.imagem; // Salva no input oculto para enviar depois
        }
    } catch (e) {
        document.getElementById('product-name').value = "";
    } finally {
        document.getElementById('product-name').disabled = false;
    }
}

// --- 3. CONSULTA COM FOTOS (GRID DE RESULTADOS) ---
async function pesquisarPrecos() {
    const eanBusca = document.getElementById('ean-busca').value;
    const container = document.getElementById('resultados-consulta');
    const btn = document.getElementById('btn-pesquisar');
    
    if (!eanBusca) return alert("Digite um código ou use o scanner!");
    
    const iconeOriginal = btn.innerHTML;
    btn.innerHTML = '<div class="loader w-4 h-4 border-slate-900"></div>'; // Loading no botão
    container.innerHTML = ''; 

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=consultarPrecos&ean=${eanBusca}`, { redirect: 'follow' });
        const data = await res.json();
        btn.innerHTML = iconeOriginal;

        if (!data.resultados || data.resultados.length === 0) {
            container.innerHTML = `<div class="text-center py-8 opacity-50 bg-slate-900 rounded-xl border border-slate-800"><p>Nenhum preço encontrado para este produto.</p></div>`;
            return;
        }

        // Ordena do mais barato para o mais caro
        const lista = data.resultados.sort((a, b) => a.preco - b.preco);

        lista.forEach((item, index) => {
            const eMaisBarato = index === 0;
            // Usa imagem salva ou um ícone padrão se não tiver foto
            const imgUrl = item.imagem || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";

            const card = document.createElement('div');
            // Estilo condicional (Dourado se for o mais barato)
            card.className = `p-4 rounded-2xl mb-4 relative overflow-hidden transition-all flex gap-4 ${
                eMaisBarato 
                ? 'bg-gradient-to-r from-slate-800 to-slate-900 border border-yellow-500/50 shadow-yellow-900/20 shadow-xl' 
                : 'bg-slate-800 border border-slate-700'
            }`;

            card.innerHTML = `
                <div class="w-20 h-20 bg-white rounded-lg p-1 flex-shrink-0 flex items-center justify-center border border-slate-200">
                    <img src="${imgUrl}" class="max-w-full max-h-full object-contain">
                </div>

                <div class="flex-1 relative z-10">
                    ${eMaisBarato ? `<span class="absolute -top-1 -right-1 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm"><i class="fas fa-trophy"></i> Melhor Preço</span>` : ''}
                    
                    <h3 class="text-2xl font-black ${eMaisBarato ? 'text-yellow-400' : 'text-white'}">
                        R$ ${item.preco.toFixed(2).replace('.', ',')}
                    </h3>
                    
                    <p class="font-bold text-xs uppercase text-slate-300 mt-1 mb-2 line-clamp-1">
                        <i class="fas fa-store text-slate-500 mr-1"></i> ${item.mercado}
                    </p>

                    <div class="flex justify-between items-end border-t border-white/10 pt-2">
                        <div class="flex items-center gap-1">
                            <i class="fas fa-star text-[10px] text-yellow-500"></i>
                            <span class="text-[10px] text-slate-400 font-bold">${item.usuario || 'Anônimo'}</span>
                        </div>
                        <p class="text-[9px] font-mono text-slate-500">${new Date(item.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        alert("Erro na pesquisa: " + err);
        btn.innerHTML = iconeOriginal;
    }
}

// --- 4. SALVAR DADOS (AGORA COM FOTO) ---
async function salvarPreco(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<div class="loader"></div> Salvando...';
    btn.disabled = true;

    const payload = {
        ean: document.getElementById('ean-field').value,
        produto: document.getElementById('product-name').value,
        preco: document.getElementById('price').value,
        mercado: document.getElementById('market').value,
        usuario: document.getElementById('username').value,
        imagem: document.getElementById('image-url-field').value // Envia a URL da imagem oculta
    };

    try {
        await fetch(APPS_SCRIPT_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify(payload) 
        });
        alert("Preço registrado com sucesso!");
        location.reload();
    } catch (err) {
        alert("Erro ao salvar: " + err);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- 5. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    loadMarkets();
    
    // Eventos de Navegação
    document.getElementById('nav-registrar').addEventListener('click', () => trocarAba('registrar'));
    document.getElementById('nav-consultar').addEventListener('click', () => trocarAba('consultar'));
    
    // Eventos de Câmera (Note os parâmetros diferentes)
    document.getElementById('start-scan-btn').addEventListener('click', () => iniciarCamera('registrar'));
    
    // O botão de código de barras na barra de pesquisa
    // Precisamos garantir que este botão exista no HTML ou o código não quebre se ele não existir
    const btnScanSearch = document.querySelector('button[onclick="iniciarCamera(\'pesquisar\')"]');
    if (btnScanSearch) {
        // Remove o onclick do HTML para gerenciar tudo via JS (Opcional, mas mais limpo)
        btnScanSearch.onclick = null; 
        btnScanSearch.addEventListener('click', () => iniciarCamera('pesquisar'));
    }

    document.getElementById('btn-pesquisar').addEventListener('click', pesquisarPrecos);
    document.getElementById('price-form').addEventListener('submit', salvarPreco);
    
    // Memória do Usuário
    const user = localStorage.getItem('radar_user');
    if(user) document.getElementById('username').value = user;
    document.getElementById('username').addEventListener('input', (e) => localStorage.setItem('radar_user', e.target.value));
});

// Função Auxiliar: Carregar lista de mercados
async function loadMarkets() {
    const select = document.getElementById('market');
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=buscarMercados`, { redirect: 'follow' });
        const data = await res.json();
        if(data.mercados) {
            select.innerHTML = '<option value="">Selecione...</option>';
            data.mercados.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                select.appendChild(opt);
            });
        }
    } catch (e) { select.innerHTML = '<option value="Geral">Mercado Geral</option>'; }
}
