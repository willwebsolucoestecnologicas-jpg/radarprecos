// script.js - v4.3 STABLE
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; 

let html5QrCode;
let scannerIsRunning = false; // Trava de segurança da câmera

// --- 1. NAVEGAÇÃO SEGURA ---
async function trocarAba(aba) {
    const reg = document.getElementById('registrar-container');
    const cons = document.getElementById('consultar-container');
    const navReg = document.getElementById('nav-registrar');
    const navCons = document.getElementById('nav-consultar');
    
    // Se a câmera estiver ligada, desliga com segurança antes de trocar
    if (scannerIsRunning && html5QrCode) {
        try {
            await html5QrCode.stop();
            scannerIsRunning = false;
            document.getElementById('reader').innerHTML = ''; // Limpa o DOM do scanner
        } catch (e) { console.log("Erro ao limpar câmera:", e); }
    }

    if (aba === 'registrar') {
        reg.classList.remove('hidden');
        cons.classList.add('hidden');
        navReg.className = "flex flex-col items-center justify-center w-full py-2 text-blue-400";
        navCons.className = "flex flex-col items-center justify-center w-full py-2 text-slate-500 hover:text-yellow-400";
    } else {
        reg.classList.add('hidden');
        cons.classList.remove('hidden');
        navReg.className = "flex flex-col items-center justify-center w-full py-2 text-slate-500 hover:text-blue-400";
        navCons.className = "flex flex-col items-center justify-center w-full py-2 text-yellow-400";
    }
}

// --- 2. SCANNER BLINDADO (CORREÇÃO DO ERRO) ---
async function iniciarCamera(modo) {
    // Se já estiver rodando, não faz nada (previne o clique duplo e o erro de transição)
    if (scannerIsRunning) return;

    if (modo === 'pesquisar') {
        await trocarAba('registrar'); 
        document.getElementById('start-scan-btn').classList.add('hidden');
    }

    const msg = document.getElementById('scan-message');
    msg.classList.remove('hidden');
    msg.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Iniciando...`;
    
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        
        // Configuração vital para evitar erros de estado
        scannerIsRunning = true;
        
        await html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 250 } }, 
            (texto) => onScanSuccess(texto, modo) // Passa o modo para o sucesso
        );
    } catch (err) {
        scannerIsRunning = false;
        alert("Erro ao iniciar câmera. Recarregue a página.");
        console.error(err);
        msg.classList.add('hidden');
        document.getElementById('start-scan-btn').classList.remove('hidden');
    }
}

async function onScanSuccess(decodedText, modo) {
    // Para o scanner imediatamente
    if (html5QrCode) {
        await html5QrCode.stop();
        scannerIsRunning = false;
        document.getElementById('reader').innerHTML = ''; // Limpa visualmente
    }

    // Lógica de Redirecionamento
    if (modo === 'pesquisar') {
        await trocarAba('consultar');
        document.getElementById('ean-busca').value = decodedText;
        pesquisarPrecos();
        document.getElementById('start-scan-btn').classList.remove('hidden');
        return;
    }

    // Modo Registrar
    const scannerSection = document.getElementById('scanner-section');
    const formSection = document.getElementById('price-form-section');
    const imgPreview = document.getElementById('preview-imagem');
    const urlField = document.getElementById('image-url-field');
    
    scannerSection.classList.add('hidden');
    formSection.classList.remove('hidden');
    
    document.getElementById('ean-field').value = decodedText;
    document.getElementById('product-name').value = "Buscando...";
    document.getElementById('product-name').disabled = true;
    
    imgPreview.classList.add('hidden');
    imgPreview.src = "";
    urlField.value = "";

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?ean=${decodedText}`, { redirect: 'follow' });
        const data = await res.json();
        
        document.getElementById('product-name').value = data.nome || "";
        
        if (data.imagem && data.imagem.startsWith('http')) {
            imgPreview.src = data.imagem;
            imgPreview.classList.remove('hidden');
            urlField.value = data.imagem;
        }
    } catch (e) {
        document.getElementById('product-name').value = "";
    } finally {
        document.getElementById('product-name').disabled = false;
    }
}

// --- 3. VISUAL RESTAURADO (CARD DOURADO PREMIUM) ---
async function pesquisarPrecos() {
    const eanBusca = document.getElementById('ean-busca').value;
    const container = document.getElementById('resultados-consulta');
    const btn = document.getElementById('btn-pesquisar');
    
    if (!eanBusca) return alert("Digite um código!");
    
    const iconeOriginal = btn.innerHTML;
    btn.innerHTML = '<div class="loader w-4 h-4 border-slate-900"></div>';
    container.innerHTML = ''; 

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=consultarPrecos&ean=${eanBusca}`, { redirect: 'follow' });
        const data = await res.json();
        btn.innerHTML = iconeOriginal;

        if (!data.resultados || data.resultados.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-10 opacity-40">
                    <i class="fas fa-ghost text-4xl mb-2"></i>
                    <p class="text-sm">Nada encontrado.</p>
                </div>`;
            return;
        }

        const lista = data.resultados.sort((a, b) => a.preco - b.preco);

        lista.forEach((item, index) => {
            const eMaisBarato = index === 0;
            // Ícone genérico de sacola de compras se não tiver foto
            const imgUrl = (item.imagem && item.imagem.length > 10) ? item.imagem : "https://cdn-icons-png.flaticon.com/512/1170/1170678.png";

            const card = document.createElement('div');
            
            // O VISUAL QUE VOCÊ GOSTAVA (Restaurado)
            card.className = `p-4 rounded-2xl mb-4 relative overflow-hidden transition-all flex gap-4 ${
                eMaisBarato 
                ? 'bg-gradient-to-br from-yellow-500 to-orange-600 shadow-xl shadow-orange-900/30 border border-yellow-300 transform scale-[1.02]' 
                : 'bg-slate-800 border border-slate-700'
            }`;

            card.innerHTML = `
                ${eMaisBarato ? '<div class="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>' : ''}
                
                <div class="w-20 h-20 bg-white/10 rounded-xl p-2 flex-shrink-0 flex items-center justify-center backdrop-blur-sm border border-white/10">
                    <img src="${imgUrl}" class="max-w-full max-h-full object-contain drop-shadow-md opacity-90">
                </div>

                <div class="flex-1 relative z-10 flex flex-col justify-between">
                    <div>
                        ${eMaisBarato ? `
                        <div class="absolute -top-1 -right-1">
                            <span class="bg-white text-orange-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm flex items-center gap-1">
                                <i class="fas fa-crown text-yellow-500"></i> Campeão
                            </span>
                        </div>` : ''}
                        
                        <h3 class="text-3xl font-black tracking-tighter ${eMaisBarato ? 'text-white drop-shadow-sm' : 'text-emerald-400'}">
                            R$ ${item.preco.toFixed(2).replace('.', ',')}
                        </h3>
                        
                        <p class="font-bold text-xs uppercase ${eMaisBarato ? 'text-yellow-100' : 'text-slate-300'} line-clamp-1 mt-0.5">
                            <i class="fas fa-store mr-1 opacity-70"></i> ${item.mercado}
                        </p>
                    </div>

                    <div class="flex justify-between items-end border-t ${eMaisBarato ? 'border-white/20' : 'border-slate-700'} pt-2 mt-2">
                        <div class="flex items-center gap-1.5">
                            <div class="w-5 h-5 rounded-full ${eMaisBarato ? 'bg-orange-700' : 'bg-slate-700'} flex items-center justify-center text-[10px]">
                                <i class="fas fa-user text-white"></i>
                            </div>
                            <span class="text-[10px] font-bold ${eMaisBarato ? 'text-white' : 'text-slate-400'}">${item.usuario || 'Anônimo'}</span>
                        </div>
                        <span class="text-[9px] font-mono opacity-60 ${eMaisBarato ? 'text-white' : 'text-slate-500'}">
                            ${new Date(item.data).toLocaleDateString('pt-BR').slice(0,5)}
                        </span>
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

// --- 4. SALVAR DADOS ---
async function salvarPreco(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
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
        alert("Salvo com sucesso!");
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
    
    document.getElementById('nav-registrar').addEventListener('click', () => trocarAba('registrar'));
    document.getElementById('nav-consultar').addEventListener('click', () => trocarAba('consultar'));
    
    // Note a chamada para iniciarCamera('registrar')
    document.getElementById('start-scan-btn').addEventListener('click', () => iniciarCamera('registrar'));
    
    // Botão de scanner na barra de pesquisa (ícone de código de barras)
    const btnScanSearch = document.querySelector('button[onclick*="pesquisar"]');
    if (btnScanSearch) {
        btnScanSearch.onclick = null; // Remove o handler inline antigo
        btnScanSearch.addEventListener('click', (e) => {
            e.preventDefault();
            iniciarCamera('pesquisar');
        });
    }

    document.getElementById('btn-pesquisar').addEventListener('click', pesquisarPrecos);
    document.getElementById('price-form').addEventListener('submit', salvarPreco);
    
    const user = localStorage.getItem('radar_user');
    if(user) document.getElementById('username').value = user;
    document.getElementById('username').addEventListener('input', (e) => localStorage.setItem('radar_user', e.target.value));
});

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
