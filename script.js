// script.js

// COLOQUE AQUI A URL DO SEU DEPLOY DO APPS SCRIPT (FINALIZA COM /exec)
const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; 

// Elementos do DOM
const scannerSection = document.getElementById('scanner-section');
const priceFormSection = document.getElementById('price-form-section');
const startScanBtn = document.getElementById('start-scan-btn');
const scanMessage = document.getElementById('scan-message');
const priceForm = document.getElementById('price-form');
const eanField = document.getElementById('ean-field');
const productNameField = document.getElementById('product-name');
const priceField = document.getElementById('price');
const marketSelect = document.getElementById('market');
const usernameField = document.getElementById('username');
const cancelScanBtn = document.getElementById('cancel-scan-btn');
const readerDiv = document.getElementById('reader');

let html5QrCode; // Variável para a instância do scanner

// --- Funções de UI e Transições ---

function showSection(sectionToShow) {
    [scannerSection, priceFormSection].forEach(section => {
        section.classList.add('hidden', 'opacity-0');
        section.classList.remove('visible', 'opacity-100');
    });

    sectionToShow.classList.remove('hidden', 'opacity-0');
    // Força o reflow para a transição funcionar
    void sectionToShow.offsetWidth; 
    sectionToShow.classList.add('visible', 'opacity-100');
}

function showLoader(element, message = "Carregando...") {
    element.innerHTML = `<div class="loader"></div><p class="text-center text-gray-400 mt-2">${message}</p>`;
    element.disabled = true;
}

function hideLoader(element, originalContent) {
    element.innerHTML = originalContent;
    element.disabled = false;
}

function showAlert(message, type = 'success', targetElement = priceFormSection) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-${type} mt-4 animate-fade-in`;
    alertDiv.textContent = message;
    targetElement.insertBefore(alertDiv, targetElement.firstChild);
    setTimeout(() => {
        alertDiv.classList.add('animate-fade-out');
        alertDiv.addEventListener('animationend', () => alertDiv.remove());
    }, 3000);
}

// --- Funções do Scanner ---

async function startScanner() {
    startScanBtn.disabled = true;
    scanMessage.classList.remove('hidden');
    scanMessage.textContent = "Iniciando câmera...";

    try {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }
        
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                // Adicione outros formatos de código de barras se necessário
            ]
        };
        
        await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanError);
        scanMessage.textContent = "Aponte a câmera para o código de barras...";
        readerDiv.style.border = '3px solid var(--secondary)'; // Indica que o scanner está ativo
    } catch (err) {
        scanMessage.textContent = `Erro ao iniciar câmera: ${err.message}. Verifique as permissões.`;
        scanMessage.classList.add('text-red-400');
        startScanBtn.disabled = false;
        readerDiv.style.border = '3px solid rgba(79, 70, 229, 0.5)';
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    await html5QrCode.stop();
    scanMessage.classList.add('hidden');
    readerDiv.style.border = '3px solid rgba(79, 70, 229, 0.5)'; // Volta para a borda original

    showLoader(startScanBtn, "Buscando produto...");
    
    // Armazena o EAN para uso no formulário
    eanField.value = decodedText;

    try {
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?ean=${decodedText}`);
        const data = await response.json();

        if (data.sucesso) {
            productNameField.value = data.nome || "Produto sem nome";
        } else {
            productNameField.value = `Produto desconhecido (EAN: ${decodedText})`;
            showAlert("Produto não encontrado em nossa base. Por favor, digite o nome.", 'error');
        }
        showSection(priceFormSection);
        productNameField.focus(); // Foca no campo para o usuário preencher
    } catch (error) {
        showAlert("Erro ao buscar informações do produto.", 'error');
        productNameField.value = `Erro ao carregar produto (EAN: ${decodedText})`;
    } finally {
        hideLoader(startScanBtn, "Iniciar Scanner");
    }
}

function onScanError(errorMessage) {
    // console.warn(`Scan error: ${errorMessage}`); // Útil para debug
}

async function stopScanner() {
    if (html5QrCode && html5QrCode.is scanning) {
        await html5QrCode.stop();
    }
    scanMessage.classList.add('hidden');
    startScanBtn.disabled = false;
    showSection(scannerSection); // Volta para a tela do scanner
}

// --- Funções do Formulário de Preço ---

async function loadMarkets() {
    // TODO: No futuro, você pode ter uma função no Apps Script para buscar
    // a lista de mercados da aba 'Estabelecimentos' da sua planilha.
    // Por enquanto, vamos hardcodar alguns para teste.
    const mockMarkets = [
        { id: '1', name: 'Supermercado Central' },
        { id: '2', name: 'Farmácia da Esquina' },
        { id: '3', name: 'Atacadão da Cidade' },
        { id: '4', name: 'Padaria do Bairro' },
    ];

    marketSelect.innerHTML = '<option value="">Selecione um local</option>';
    mockMarkets.forEach(market => {
        const option = document.createElement('option');
        option.value = market.name; // Usamos o nome como valor por simplicidade inicial
        option.textContent = market.name;
        marketSelect.appendChild(option);
    });
}

async function submitPrice(event) {
    event.preventDefault();
    showLoader(priceForm.querySelector('button[type="submit"]'), "Registrando...");

    const dados = {
        ean: eanField.value,
        produto: productNameField.value,
        preco: parseFloat(priceField.value),
        mercado: marketSelect.value,
        usuario: usernameField.value || "Anônimo" // Pega do campo ou usa Anônimo
    };

    try {
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Necessário para evitar o erro CORS preflight, o Apps Script lida com isso.
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados),
        });
        
        // Com mode: 'no-cors', a resposta sempre será opaca e não teremos acesso ao status real.
        // O Apps Script já foi configurado para retornar 200 sempre que processa a requisição.
        // Para verificar o sucesso, você precisaria de um proxy CORS ou configurar o Apps Script para
        // retornar o status direto, o que o torna mais complexo.
        // Por simplicidade, assumimos sucesso se a requisição foi enviada.

        showAlert("Preço registrado com sucesso! Obrigado por contribuir.");
        priceForm.reset(); // Limpa o formulário
        showSection(scannerSection); // Volta para o scanner
    } catch (error) {
        console.error("Erro ao enviar dados:", error);
        showAlert("Erro ao registrar preço. Tente novamente.", 'error');
    } finally {
        hideLoader(priceForm.querySelector('button[type="submit"]'), "Registrar Preço");
    }
}

// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    loadMarkets(); // Carrega os mercados quando a página carrega

    startScanBtn.addEventListener('click', startScanner);
    priceForm.addEventListener('submit', submitPrice);
    cancelScanBtn.addEventListener('click', stopScanner);

    // Salvar o nome do usuário para preenchimento automático
    if (localStorage.getItem('radar_username')) {
        usernameField.value = localStorage.getItem('radar_username');
    }
    usernameField.addEventListener('change', () => {
        localStorage.setItem('radar_username', usernameField.value);
    });
});