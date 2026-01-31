// script.js - FRONTEND FINAL

const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; 

let html5QrCode;

// --- 1. CONTROLE DE NAVEGAÇÃO ---
function switchTab(tabName) {
    // UI: Ajusta as seções
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.remove('hidden');

    // UI: Ajusta a cor dos botões do menu
    const btnReg = document.getElementById('nav-registrar');
    const btnCon = document.getElementById('nav-consultar');
    
    if(tabName === 'registrar') {
        btnReg.classList.add('active-tab', 'text-blue-400');
        btnReg.classList.remove('text-slate-500');
        btnCon.classList.remove('active-tab', 'text-blue-400');
        btnCon.classList.add('text-slate-500');
    } else {
        btnCon.classList.add('active-tab', 'text-blue-400');
        btnCon.classList.remove('text-slate-500');
        btnReg.classList.remove('active-tab', 'text-blue-400');
        btnReg.classList.add('text-slate-500');
    }

    // CÂMERA: Desliga se sair da aba registrar
    if (tabName !== 'registrar' && html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            document.getElementById('scan-message').classList.add('hidden');
            document.getElementById('start-scan-btn').disabled = false;
        }).catch(err => console.error(err));
    }
}

// --- 2. FUNÇÕES DO SCANNER ---
async function startScanner() {
    const startBtn = document.getElementById('start-scan-btn');
    const scanMsg = document.getElementById('scan-message');
    
    startBtn.disabled = true;
    scanMsg.classList.remove('hidden');
    scanMsg.textContent = "Solicitando permissão da câmera...";

    try {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }
        
        // Configuração otimizada para celular
        const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

        await html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            onScanSuccess
        );

        scanMsg.textContent = "Posicione o código no quadrado";
        
    } catch (err) {
        console.error("Erro câmera:", err);
        alert("Erro ao abrir câmera: " + err);
        scanMsg.textContent = "Erro de acesso.";
        startBtn.disabled = false;
    }
}

async function onScanSuccess(decodedText) {
    try {
        await html5QrCode.stop();
        document.getElementById('scan-message').textContent = "Buscando produto...";

        // Busca dados
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?ean=${decodedText}`, { redirect: 'follow' });
        const data = await response.json();

        // Preenche e exibe form
        document.getElementById('ean-field').value = decodedText;
        document.getElementById('product-name').value = data.nome || "";
        
        // Esconde scanner, mostra form
        document.getElementById('scanner-container').classList.add('hidden');
        document.getElementById('price-form-section').classList.remove('hidden');
        
    } catch (error) {
        alert("Erro ao buscar: " + error);
        document.getElementById('start-scan-btn').disabled = false;
    }
}

// --- 3. CARREGAR MERCADOS ---
async function loadMarkets() {
    const select = document.getElementById('market');
    try {
        const res = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?acao=buscarMercados`, { redirect: 'follow' });
        const data = await res.json();
        
        if (data.sucesso && data.mercados) {
            select.innerHTML = '<option value="">Selecione o Mercado</option>' + 
                data.mercados.map(m => `<option value="${m}">${m}</option>`).join('');
        }
    } catch (e) {
        console.error("Erro mercados:", e);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

// --- 4. REGISTRAR PREÇO ---
async function enviarParaPlanilha(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Enviando...";

    const payload = {
        ean: document.getElementById('ean-field').value,
        produto: document.getElementById('product-name').value,
        preco: document.getElementById('price').value,
        mercado: document.getElementById('market').value,
        usuario: document.getElementById('username').value
    };

    try {
        await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
        alert("Preço salvo com sucesso!");
        location.reload();
    } catch (err) {
        alert("Erro: " + err);
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}

// --- 5. PESQUISAR PREÇOS (VISUAL NOVO) ---
async function pesquisarOfertas() {
    const termo = document.getElementById('search-input').value;
    const div = document.getElementById('search-results');
    
    if (!termo) return alert("Digite algo para buscar.");

    div.innerHTML = '<div class="text-center py-4"><div class="loader"></div><p class="text-slate-400 mt-2">Caçando ofertas...</p></div>';

    try {
        const res = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?acao=buscarPrecos&busca=${termo}`, { redirect: 'follow' });
        const data = await res.json();

        if (data.sucesso && data.ofertas.length > 0) {
            let html = "";
            
            // 1. CABEÇALHO DO PRODUTO (FOTO)
            // Se a API retornou detalhes e tem foto, mostramos em destaque
            if (data.detalhes && data.detalhes.thumbnail) {
                html += `
                    <div class="bg-slate-800/50 p-4 rounded-2xl flex gap-4 items-center mb-6 border border-slate-700 backdrop-blur-sm">
                        <div class="bg-white p-2 rounded-xl shrink-0">
                            <img src="${data.detalhes.thumbnail}" class="w-16 h-16 object-contain">
                        </div>
                        <div>
                            <h3 class="font-bold text-lg leading-tight text-white">${data.detalhes.nome}</h3>
                            <p class="text-xs text-slate-400 font-mono mt-1">${data.detalhes.marca}</p>
                        </div>
                    </div>
                `;
            }

            // 2. LISTA DE OFERTAS
            html += data.ofertas.map((item, index) => {
                // Lógica do Vencedor (1º lugar)
                const isWinner = index === 0;
                
                // Estilos condicionais
                const cardClass = isWinner 
                    ? "bg-slate-800 border-2 border-yellow-500/70 shadow-[0_0_20px_rgba(234,179,8,0.2)] scale-[1.02]" 
                    : "bg-slate-900 border border-slate-800";
                
                const priceClass = isWinner ? "text-yellow-400" : "text-emerald-400";
                
                // Lógica do Selo de Verificação (Exemplo: Se o usuário for WillWeb)
                // Você pode mudar a regra depois
                const isVerified = ['will', 'willweb', 'admin'].includes(item.usuario.toLowerCase());
                const badge = isVerified 
                    ? `<svg class="w-3 h-3 text-blue-400 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"></path></svg>`
                    : ``;

                return `
                <div class="${cardClass} p-4 rounded-2xl mb-3 flex justify-between items-center transition-all relative overflow-hidden">
                    ${isWinner ? '<div class="absolute top-0 right-0 bg-yellow-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">MENOR PREÇO 🏆</div>' : ''}
                    
                    <div>
                        <div class="${priceClass} font-bold text-2xl tracking-tight">R$ ${parseFloat(item.preco).toFixed(2)}</div>
                        <div class="text-white font-medium text-sm mt-1">${item.mercado}</div>
                        
                        <div class="flex items-center gap-1 mt-2 text-xs text-slate-500 bg-black/20 w-fit px-2 py-1 rounded-full">
                            <span>👤 ${item.usuario}</span>
                            ${badge}
                        </div>
                    </div>
                    
                    <div class="text-right flex flex-col justify-end h-full">
                        <div class="text-[10px] text-slate-600 font-mono">${item.data}</div>
                    </div>
                </div>
            `}).join('');
            
            div.innerHTML = html;
        } else {
            div.innerHTML = `
                <div class="text-center py-10 opacity-50">
                    <svg class="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <p>Nenhum preço encontrado.</p>
                </div>`;
        }
    } catch (e) {
        div.innerHTML = '<p class="text-center text-red-400">Erro na conexão.</p>';
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    loadMarkets();

    // Event Listeners (Agora os IDs batem com o HTML!)
    document.getElementById('nav-registrar').addEventListener('click', () => switchTab('registrar'));
    document.getElementById('nav-consultar').addEventListener('click', () => switchTab('consultar'));
    
    document.getElementById('start-scan-btn').addEventListener('click', startScanner);
    document.getElementById('price-form').addEventListener('submit', enviarParaPlanilha);
    document.getElementById('search-btn').addEventListener('click', pesquisarOfertas);
    
    // Botão cancelar form
    const btnCancel = document.getElementById('cancel-scan-btn');
    if(btnCancel) {
        btnCancel.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('price-form-section').classList.add('hidden');
            document.getElementById('scanner-container').classList.remove('hidden');
        });
    }

    // Recuperar Usuário
    const user = localStorage.getItem('radar_user');
    if (user) document.getElementById('username').value = user;
    document.getElementById('username').addEventListener('input', (e) => localStorage.setItem('radar_user', e.target.value));
});

