// script.js - FRONTEND FINAL E CORRIGIDO

const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; 

let html5QrCode;

// --- 1. CONTROLE DE NAVEGAÇÃO (ABAS) ---
function switchTab(tabName) {
    // Esconde todas as abas (procura por elementos com classe 'tab-content')
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.add('hidden'));

    // Mostra a aba selecionada
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }

    // Se sair da aba de registrar, para a câmera para não travar
    if (tabName !== 'registrar' && html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            console.log("Câmera parada ao mudar de aba.");
            document.getElementById('scan-message').classList.add('hidden');
            document.getElementById('start-scan-btn').disabled = false;
        }).catch(err => console.error("Erro ao parar câmera:", err));
    }
}

// --- 2. FUNÇÕES DO SCANNER ---
async function startScanner() {
    const startBtn = document.getElementById('start-scan-btn');
    const scanMsg = document.getElementById('scan-message');
    
    startBtn.disabled = true;
    scanMsg.classList.remove('hidden');
    scanMsg.textContent = "Iniciando câmera...";

    try {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }
        
        const config = { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.777 };

        // Tenta iniciar a câmera
        await html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            onScanSuccess
        );

        scanMsg.textContent = "Aponte para o código de barras.";
        
    } catch (err) {
        console.error("Erro câmera:", err);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
        scanMsg.classList.add('hidden');
        startBtn.disabled = false;
    }
}

async function onScanSuccess(decodedText) {
    try {
        await html5QrCode.stop(); // Para o scanner
        document.getElementById('scan-message').textContent = "Buscando produto...";

        // Consulta API
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?ean=${decodedText}`, { redirect: 'follow' });
        const data = await response.json();

        // Preenche formulário
        document.getElementById('ean-field').value = decodedText;
        document.getElementById('product-name').value = data.nome || "Produto não identificado";
        
        // Exibe o formulário
        document.getElementById('scanner-section').classList.add('hidden');
        document.getElementById('price-form-section').classList.remove('hidden');
        
    } catch (error) {
        alert("Erro ao buscar produto: " + error);
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
            select.innerHTML = '<option value="">Selecione um local</option>' + 
                data.mercados.map(m => `<option value="${m}">${m}</option>`).join('');
        }
    } catch (e) {
        console.error("Erro ao carregar mercados", e);
    }
}

// --- 4. ENVIAR DADOS (REGISTRAR) ---
async function enviarParaPlanilha(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = "Salvando...";

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
        alert("Erro ao salvar: " + err);
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}

// --- 5. PESQUISAR PREÇOS (CONSULTAR) ---
async function pesquisarOfertas() {
    const termo = document.getElementById('search-input').value;
    const resultadoDiv = document.getElementById('search-results');
    
    if (!termo) return alert("Digite o nome de um produto.");

    resultadoDiv.innerHTML = '<p class="text-center text-gray-400 mt-4">Pesquisando...</p>';

    try {
        const res = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?acao=buscarPrecos&busca=${termo}`, { redirect: 'follow' });
        const data = await res.json();

        if (data.sucesso && data.ofertas.length > 0) {
            resultadoDiv.innerHTML = data.ofertas.map(item => `
                <div class="bg-gray-800 p-4 rounded-xl mb-3 border border-gray-700 shadow flex justify-between items-center">
                    <div>
                        <div class="text-emerald-400 font-bold text-xl">R$ ${parseFloat(item.preco).toFixed(2)}</div>
                        <div class="text-white font-medium">${item.produto}</div>
                        <div class="text-sm text-gray-400">${item.mercado}</div>
                    </div>
                    <div class="text-xs text-gray-500 text-right">${item.data}</div>
                </div>
            `).join('');
        } else {
            resultadoDiv.innerHTML = '<p class="text-center text-gray-500 mt-4">Nenhum preço encontrado.</p>';
        }
    } catch (e) {
        resultadoDiv.innerHTML = '<p class="text-center text-red-400 mt-4">Erro na busca.</p>';
    }
}

// --- 6. INICIALIZAÇÃO (CONECTAR TUDO) ---
document.addEventListener('DOMContentLoaded', () => {
    loadMarkets(); // Carrega mercados

    // CONECTAR BOTÕES DO MENU INFERIOR
    // Certifique-se que no HTML os botões têm id="nav-registrar" e "nav-consultar"
    const btnRegistrar = document.getElementById('nav-registrar');
    const btnConsultar = document.getElementById('nav-consultar');

    if (btnRegistrar) btnRegistrar.addEventListener('click', () => switchTab('registrar'));
    if (btnConsultar) btnConsultar.addEventListener('click', () => switchTab('consultar'));

    // CONECTAR BOTÃO DA CÂMERA
    const btnCamera = document.getElementById('start-scan-btn');
    if (btnCamera) btnCamera.addEventListener('click', startScanner);

    // CONECTAR FORMULÁRIO DE ENVIO
    const formPrice = document.getElementById('price-form');
    if (formPrice) formPrice.addEventListener('submit', enviarParaPlanilha);

    // CONECTAR BOTÃO DE PESQUISA
    const btnSearch = document.getElementById('search-btn');
    if (btnSearch) btnSearch.addEventListener('click', pesquisarOfertas);

    // BOTÃO CANCELAR
    const btnCancel = document.getElementById('cancel-scan-btn');
    if (btnCancel) btnCancel.addEventListener('click', () => location.reload());

    // RECUPERAR NOME DE USUÁRIO
    const savedUser = localStorage.getItem('radar_user');
    const userField = document.getElementById('username');
    if (savedUser && userField) userField.value = savedUser;
    if (userField) userField.addEventListener('input', (e) => localStorage.setItem('radar_user', e.target.value));
});
