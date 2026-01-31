// script.js - ESTE FICA NO GITHUB

const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; // <--- COLOQUE SUA URL AQUI

let html5QrCode;

async function startScanner() {
    const startBtn = document.getElementById('start-scan-btn');
    const scanMsg = document.getElementById('scan-message');
    
    startBtn.disabled = true;
    scanMsg.classList.remove('hidden');
    scanMsg.textContent = "Solicitando acesso à câmera...";

    try {
        // 1. Criar a instância se não existir
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }
        
        // 2. Configurações do Scanner
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.777778 // Força 16:9 para celulares
        };

        // 3. Tenta iniciar usando a câmera traseira ("environment")
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

// Função chamada quando o código é lido
async function onScanSuccess(decodedText, decodedResult) {
    try {
        await html5QrCode.stop();
        document.getElementById('scan-message').textContent = "Buscando produto...";

        // Consulta o seu Apps Script
        const response = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?ean=${decodedText}`);
        const data = await response.json();

        // Preenche o formulário
        document.getElementById('ean-field').value = decodedText;
        document.getElementById('product-name').value = data.nome || "Produto não identificado";
        
        // Troca as telas
        document.getElementById('scanner-section').classList.add('hidden');
        document.getElementById('price-form-section').classList.remove('hidden');
        document.getElementById('price-form-section').style.opacity = "1";
        
    } catch (error) {
        alert("Erro na comunicação com o servidor: " + error);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-scan-btn').addEventListener('click', startScanner);
    
    // Envio do formulário
    document.getElementById('price-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
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
                mode: 'no-cors',
                body: JSON.stringify(payload)
            });
            alert("Sucesso! Preço salvo na planilha.");
            location.reload(); // Recarrega para novo scan
        } catch (err) {
            alert("Erro ao salvar: " + err);
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Registrar Preço";
        }
    });
});
