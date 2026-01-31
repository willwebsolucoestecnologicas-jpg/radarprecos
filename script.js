// script.js - FRONTEND COMPLETO E ATUALIZADO

// 1. COLOQUE AQUI SUA URL DO APPS SCRIPT (A que termina em /exec)
const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; 

let html5QrCode;

// --- FUNÇÃO 1: CARREGAR A LISTA DE MERCADOS (NOVIDADE!) ---
async function loadMarkets() {
    const marketSelect = document.getElementById('market');
    
    try {
        // Chama o backend pedindo a lista de mercados
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?acao=buscarMercados`, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const data = await response.json();

        if (data.sucesso && data.mercados.length > 0) {
            marketSelect.innerHTML = '<option value="">Selecione um local</option>';
            // Cria uma opção para cada mercado encontrado na planilha
            data.mercados.forEach(nome => {
                const option = document.createElement('option');
                option.value = nome;
                option.textContent = nome;
                marketSelect.appendChild(option);
            });
        } else {
            marketSelect.innerHTML = '<option value="">Nenhum local encontrado</option>';
        }
    } catch (error) {
        console.error("Erro ao carregar mercados:", error);
        // Fallback caso dê erro na conexão
        marketSelect.innerHTML = '<option value="Outros">Outros (Erro ao carregar)</option>';
    }
}

// --- FUNÇÃO 2: INICIAR O SCANNER ---
async function startScanner() {
    const startBtn = document.getElementById('start-scan-btn');
    const scanMsg = document.getElementById('scan-message');
    
    startBtn.disabled = true;
    scanMsg.classList.remove('hidden');
    scanMsg.textContent = "Solicitando acesso à câmera...";

    try {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }
        
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.777778 
        };

        await html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            onScanSuccess
        );

        scanMsg.textContent = "Câmera iniciada! Aponte para o código.";
        
    } catch (err) {
        console.error("Erro ao abrir câmera:", err);
        alert("Erro ao abrir câmera. Verifique se o site tem permissão HTTPS.");
        scanMsg.textContent = "Erro ao acessar câmera.";
        startBtn.disabled = false;
    }
}

// --- FUNÇÃO 3: QUANDO O SCANNER LÊ O CÓDIGO ---
async function onScanSuccess(decodedText, decodedResult) {
    try {
        await html5QrCode.stop();
        document.getElementById('scan-message').textContent = "Buscando produto...";

        // Busca o produto no Backend
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?ean=${decodedText}`, {
            method: 'GET',
            redirect: 'follow' 
        });
        
        const data = await response.json();

        // Preenche o formulário
        document.getElementById('ean-field').value = decodedText;
        document.getElementById('product-name').value = data.nome || "Produto não identificado";
        
        // Troca a tela para o formulário
        document.getElementById('scanner-section').classList.add('hidden');
        document.getElementById('price-form-section').classList.remove('hidden');
        document.getElementById('price-form-section').style.opacity = "1";
        
    } catch (error) {
        alert("Erro ao buscar produto: " + error);
        document.getElementById('start-scan-btn').disabled = false;
    }
}

// --- FUNÇÃO 4: ENVIAR PREÇO PARA A PLANILHA ---
async function enviarParaPlanilha(e) {
    e.preventDefault();
    
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.textContent;
    
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Enviando...";

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
            mode: 'no-cors', // Essencial para o POST funcionar
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        alert("Sucesso! Preço registrado.");
        location.reload(); // Recarrega para o próximo scan

    } catch (err) {
        alert("Erro ao salvar: " + err);
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    loadMarkets(); // <--- Carrega a lista de mercados assim que abre o site

    const startBtn = document.getElementById('start-scan-btn');
    if(startBtn) startBtn.addEventListener('click', startScanner);
    
    const form = document.getElementById('price-form');
    if(form) form.addEventListener('submit', enviarParaPlanilha);

    const cancelBtn = document.getElementById('cancel-scan-btn');
    if(cancelBtn) cancelBtn.addEventListener('click', () => location.reload());
    
    // Recupera o nome do usuário salvo anteriormente
    const savedUser = localStorage.getItem('radar_username');
    if (savedUser) document.getElementById('username').value = savedUser;
    
    // Salva o nome do usuário quando ele digita
    document.getElementById('username').addEventListener('input', (e) => {
        localStorage.setItem('radar_username', e.target.value);
    });
});

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
}

async function pesquisarOfertas() {
    const busca = document.getElementById('search-input').value;
    const container = document.getElementById('search-results');
    container.innerHTML = "<p class='text-center'>Buscando melhores preços...</p>";

    const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?acao=buscarPrecos&busca=${busca}`, { redirect: 'follow' });
    const data = await response.json();

    if (data.sucesso && data.ofertas.length > 0) {
        let html = "";
        
        // Header com Detalhes do Produto (API Cosmos)
        if (data.detalhes) {
            html += `
                <div class="bg-slate-800 p-4 rounded-xl mb-4 border-l-4 border-emerald-500">
                    <div class="flex items-center gap-4">
                        <img src="${data.detalhes.thumbnail || 'https://via.placeholder.com/100'}" class="w-20 h-20 rounded-lg object-contain bg-white">
                        <div>
                            <h3 class="font-bold text-lg">${data.detalhes.nome}</h3>
                            <p class="text-sm text-gray-400">${data.detalhes.marca}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Lista de Preços
        data.ofertas.forEach(item => {
            html += `
                <div class="bg-slate-800 p-4 rounded-xl flex justify-between items-center shadow-lg border border-slate-700">
                    <div>
                        <p class="text-emerald-400 font-bold text-xl">R$ ${item.preco.toFixed(2)}</p>
                        <p class="text-sm text-gray-300 font-semibold">${item.mercado}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] text-gray-500">Visto em: ${item.data}</p>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } else {
        container.innerHTML = "<p class='text-center text-gray-400'>Nenhum preço encontrado para este produto.</p>";
    }
}

