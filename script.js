// script.js - ESTE FICA NO GITHUB

const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; // <--- COLOQUE SUA URL AQUI

// script.js - FRONTEND (GITHUB) 

let html5QrCode;

// --- FUNÇÃO PARA INICIAR O SCANNER ---
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
        alert("Erro ao abrir câmera: " + err);
        scanMsg.textContent = "Erro ao acessar câmera.";
        startBtn.disabled = false;
    }
}

// --- FUNÇÃO CHAMADA QUANDO O CÓDIGO É LIDO COM SUCESSO ---
async function onScanSuccess(decodedText, decodedResult) {
    try {
        // Para o scanner para economizar bateria e processamento
        await html5QrCode.stop();
        document.getElementById('scan-message').textContent = "Buscando produto...";

        // CONSULTA O BACKEND (GET) - Aqui usamos o 'redirect: follow'
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?ean=${decodedText}`, {
            method: 'GET',
            redirect: 'follow' 
        });
        
        const data = await response.json();

        // Preenche os campos do formulário
        document.getElementById('ean-field').value = decodedText;
        document.getElementById('product-name').value = data.nome || "Produto de Teste";
        
        // Transição visual para o formulário
        document.getElementById('scanner-section').classList.add('hidden');
        document.getElementById('price-form-section').classList.remove('hidden');
        document.getElementById('price-form-section').style.opacity = "1";
        
    } catch (error) {
        console.error(error);
        alert("Erro de comunicação: " + error);
        // Se der erro, volta o botão para tentar novamente
        document.getElementById('start-scan-btn').disabled = false;
    }
}

// --- FUNÇÃO PARA ENVIAR OS DADOS PARA A PLANILHA ---
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
        // ENVIO DOS DADOS (POST)
        await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Essencial para evitar bloqueio de CORS no POST do Google
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        alert("Sucesso! Preço registrado na planilha.");
        
        // Limpa e reinicia a página para um novo scan
        location.reload(); 

    } catch (err) {
        console.error(err);
        alert("Erro ao salvar dados: " + err);
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
    }
}

// --- INICIALIZAÇÃO DOS EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    // Botão de Iniciar Scan
    const startBtn = document.getElementById('start-scan-btn');
    if(startBtn) startBtn.addEventListener('click', startScanner);
    
    // Formulário de Preço
    const form = document.getElementById('price-form');
    if(form) form.addEventListener('submit', enviarParaPlanilha);

    // Botão de Cancelar (Opcional, se existir no seu HTML)
    const cancelBtn = document.getElementById('cancel-scan-btn');
    if(cancelBtn) {
        cancelBtn.addEventListener('click', () => location.reload());
    }
});

async function loadMarkets() {
    const marketSelect = document.getElementById('market');
    
    try {
        // Busca a lista real da sua aba "Estabelecimentos"
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?acao=buscarMercados`, {
            method: 'GET',
            redirect: 'follow'
        });
        const data = await response.json();

        if (data.sucesso) {
            marketSelect.innerHTML = '<option value="">Selecione um local</option>';
            data.mercados.forEach(nome => {
                const option = document.createElement('option');
                option.value = nome;
                option.textContent = nome;
                marketSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar mercados:", error);
        // Fallback caso a planilha esteja vazia ou dê erro
        marketSelect.innerHTML = '<option value="Mercado Geral">Mercado Geral (Erro ao carregar)</option>';
    }
}

// Chame essa função dentro do DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    loadMarkets(); // <--- Isso vai preencher o select automaticamente
    // ... resto dos seus event listeners
});
