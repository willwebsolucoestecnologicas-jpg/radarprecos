// script.js - FRONTEND (GITHUB)
const APPS_SCRIPT_URL = 'SUA_URL_AQUI/exec'; 
let html5QrCode;

// --- 1. CONTROLE DE NAVEGAÇÃO (TROCA DE ABAS) ---
function trocarAba(aba) {
    const reg = document.getElementById('registrar-container');
    const cons = document.getElementById('consultar-container');
    
    // Reset visual das abas
    if (aba === 'registrar') {
        reg.classList.remove('hidden');
        cons.classList.add('hidden');
    } else {
        reg.classList.add('hidden');
        cons.classList.remove('hidden');
        if (html5QrCode) html5QrCode.stop(); // Para a câmera ao sair da aba
    }
}

// --- 2. LÓGICA DO SCANNER (REGISTRAR) ---
async function iniciarCamera() {
    const btn = document.getElementById('start-scan-btn');
    btn.disabled = true;
    
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            onScanSuccess
        );
    } catch (err) {
        alert("Erro na câmera: " + err);
        btn.disabled = false;
    }
}

async function onScanSuccess(decodedText) {
    await html5QrCode.stop();
    document.getElementById('scan-message').textContent = "Identificando...";
    
    // Busca nome do produto
    const res = await fetch(`${APPS_SCRIPT_URL}?ean=${decodedText}`, { redirect: 'follow' });
    const data = await res.json();
    
    document.getElementById('ean-field').value = decodedText;
    document.getElementById('product-name').value = data.nome || "Produto Novo";
    
    // Mostra formulário de envio
    document.getElementById('scanner-section').classList.add('hidden');
    document.getElementById('price-form-section').classList.remove('hidden');
}

// --- 3. CONSULTA E DESTAQUE "MAIS BARATO" ---
async function pesquisarPrecos() {
    const eanBusca = document.getElementById('ean-busca').value;
    const container = document.getElementById('resultados-consulta');
    
    if (!eanBusca) return alert("Digite ou escaneie um código");
    
    container.innerHTML = '<div class="loader"></div>';

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=consultarPrecos&ean=${eanBusca}`, { redirect: 'follow' });
        const data = await res.json();

        if (!data.resultados || data.resultados.length === 0) {
            container.innerHTML = '<p class="text-center p-4">Nenhum preço encontrado.</p>';
            return;
        }

        // Ordena por preço (Menor -> Maior)
        const lista = data.resultados.sort((a, b) => a.preco - b.preco);
        container.innerHTML = '';

        lista.forEach((item, index) => {
            const eMaisBarato = index === 0;
            const card = document.createElement('div');
            
            // Estilização dinâmica
            card.className = `p-4 rounded-2xl mb-4 transition-all duration-300 shadow-lg ${
                eMaisBarato 
                ? 'bg-gradient-to-br from-yellow-500 to-orange-600 border-2 border-yellow-200 scale-105 shadow-yellow-500/20' 
                : 'bg-gray-800 border border-gray-700'
            }`;

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        ${eMaisBarato ? '<span class="bg-yellow-200 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase mb-2 inline-block">Mínimo Histórico</span>' : ''}
                        <h3 class="text-3xl font-black ${eMaisBarato ? 'text-white' : 'text-green-400'}">R$ ${item.preco.toFixed(2)}</h3>
                        <p class="font-bold text-sm uppercase tracking-wide">${item.mercado}</p>
                        <p class="text-[11px] opacity-80 mt-1">
                            <i class="fas fa-user"></i> Inserido por: <strong>${item.usuario || 'Anônimo'}</strong>
                        </p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] opacity-60">${new Date(item.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        alert("Erro na busca: " + err);
    }
}

// --- 4. ENVIO DE DADOS ---
async function salvarPreco(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;

    const payload = {
        ean: document.getElementById('ean-field').value,
        produto: document.getElementById('product-name').value,
        preco: document.getElementById('price').value,
        mercado: document.getElementById('market').value,
        usuario: document.getElementById('username').value
    };

    await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
    });

    alert("Registrado com sucesso!");
    location.reload();
}

// --- 5. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Menu de Navegação
    document.getElementById('nav-registrar').addEventListener('click', () => trocarAba('registrar'));
    document.getElementById('nav-consultar').addEventListener('click', () => trocarAba('consultar'));

    // Botão Scanner
    document.getElementById('start-scan-btn').addEventListener('click', iniciarCamera);

    // Botão Pesquisar (Lupa)
    document.getElementById('btn-pesquisar').addEventListener('click', pesquisarPrecos);

    // Formulário
    document.getElementById('price-form').addEventListener('submit', salvarPreco);

    // Carregar nome salvo
    document.getElementById('username').value = localStorage.getItem('user_radar') || '';
    document.getElementById('username').addEventListener('input', (e) => localStorage.setItem('user_radar', e.target.value));
});
