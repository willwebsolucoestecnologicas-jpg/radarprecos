// script.js - FRONTEND (GITHUB)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; 
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
            
            // Estilização dinâmica do Container
            card.className = `p-4 rounded-2xl mb-4 transition-all duration-300 shadow-lg relative overflow-hidden ${
                eMaisBarato 
                ? 'bg-gradient-to-br from-yellow-500 to-orange-600 border-2 border-yellow-200 scale-105 shadow-yellow-500/20' 
                : 'bg-gray-800 border border-gray-700'
            }`;

            // HTML Interno do Card (Novo Design)
            card.innerHTML = `
                ${eMaisBarato ? '<div class="absolute top-0 right-0 w-24 h-24 bg-yellow-400 opacity-10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>' : ''}
                
                <div class="z-10 w-full relative">
                    ${eMaisBarato ? `
                    <div class="flex items-center gap-1 mb-2">
                        <span class="bg-yellow-100 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-wider border border-yellow-200 flex items-center">
                            <i class="fas fa-trophy text-yellow-600 mr-1 text-xs"></i>Melhor Preço
                        </span>
                    </div>` : ''}

                    <h3 class="text-3xl font-black tracking-tight ${eMaisBarato ? 'text-white drop-shadow-md' : 'text-emerald-400'}">
                        R$ ${item.preco.toFixed(2).replace('.', ',')}
                    </h3>
                    
                    <p class="font-bold text-sm text-gray-300 uppercase tracking-wide mt-1 flex items-center gap-2">
                        <i class="fas fa-store text-gray-500 text-xs"></i> ${item.mercado}
                    </p>

                    <div class="mt-3 pt-3 border-t border-gray-700/50 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <div class="bg-gray-700 p-1.5 rounded-full shadow-inner border border-gray-600 flex items-center justify-center w-8 h-8">
                                <i class="fas fa-star text-yellow-400 text-xs"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[9px] text-gray-400 uppercase font-semibold leading-tight">Colaborador</span>
                                <strong class="text-xs text-gray-200">${item.usuario || 'Anônimo'}</strong>
                            </div>
                        </div>
                        
                        <p class="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                            ${new Date(item.data).toLocaleDateString('pt-BR')}
                        </p>
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
