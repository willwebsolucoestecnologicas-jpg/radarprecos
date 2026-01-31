// script.js - FRONTEND (GITHUB)
// LEMBRE-SE: Mantenha a URL que já estava funcionando
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; 

let html5QrCode;

// --- 1. CONTROLE DE NAVEGAÇÃO E UI ---
function trocarAba(aba) {
    const reg = document.getElementById('registrar-container');
    const cons = document.getElementById('consultar-container');
    const navReg = document.getElementById('nav-registrar');
    const navCons = document.getElementById('nav-consultar');
    
    // Parar scanner se estiver rodando ao mudar de aba
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.log("Stop failed: ", err));
    }

    if (aba === 'registrar') {
        reg.classList.remove('hidden');
        cons.classList.add('hidden');
        
        // Estilo do Menu Ativo
        navReg.classList.remove('text-slate-500');
        navReg.classList.add('text-blue-400');
        navCons.classList.remove('text-yellow-400');
        navCons.classList.add('text-slate-500');
    } else {
        reg.classList.add('hidden');
        cons.classList.remove('hidden');

        // Estilo do Menu Ativo
        navReg.classList.remove('text-blue-400');
        navReg.classList.add('text-slate-500');
        navCons.classList.remove('text-slate-500');
        navCons.classList.add('text-yellow-400');
    }
}

// --- 2. LÓGICA DO SCANNER ---
async function iniciarCamera() {
    const btn = document.getElementById('start-scan-btn');
    const msg = document.getElementById('scan-message');
    
    btn.disabled = true;
    btn.innerHTML = '<div class="loader"></div>'; // Feedback visual
    msg.classList.remove('hidden');
    
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess
        );
        
        btn.classList.add('hidden'); // Esconde o botão após iniciar
    } catch (err) {
        alert("Erro ao abrir câmera: " + err);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-qrcode"></i> Abrir Câmera';
        msg.classList.add('hidden');
    }
}

async function onScanSuccess(decodedText) {
    await html5QrCode.stop();
    
    const scannerSection = document.getElementById('scanner-section');
    const formSection = document.getElementById('price-form-section');
    
    // Troca para o formulário
    scannerSection.classList.add('hidden');
    formSection.classList.remove('hidden');
    
    document.getElementById('ean-field').value = decodedText;
    document.getElementById('product-name').value = "Buscando...";
    document.getElementById('product-name').disabled = true;

    // Busca nome do produto na API
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?ean=${decodedText}`, { redirect: 'follow' });
        const data = await res.json();
        document.getElementById('product-name').value = data.nome || "";
    } catch (e) {
        document.getElementById('product-name').value = "";
    } finally {
        document.getElementById('product-name').disabled = false;
    }
}

// --- 3. CARREGAR MERCADOS ---
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
    } catch (e) {
        select.innerHTML = '<option value="Geral">Mercado Geral</option>';
    }
}

// --- 4. CONSULTA E CARD DOURADO ---
async function pesquisarPrecos() {
    const eanBusca = document.getElementById('ean-busca').value;
    const container = document.getElementById('resultados-consulta');
    const btn = document.getElementById('btn-pesquisar');
    
    if (!eanBusca) return alert("Digite um código!");
    
    // UI de Carregamento
    const iconeOriginal = btn.innerHTML;
    btn.innerHTML = '<div class="loader w-4 h-4 border-slate-900"></div>';
    container.innerHTML = ''; // Limpa

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=consultarPrecos&ean=${eanBusca}`, { redirect: 'follow' });
        const data = await res.json();

        btn.innerHTML = iconeOriginal;

        if (!data.resultados || data.resultados.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 bg-slate-900 rounded-xl border border-slate-800">
                    <i class="fas fa-box-open text-4xl text-slate-600 mb-2"></i>
                    <p class="text-slate-400 text-sm">Nenhum preço encontrado.</p>
                </div>`;
            return;
        }

        // Ordena (Menor -> Maior)
        const lista = data.resultados.sort((a, b) => a.preco - b.preco);

        lista.forEach((item, index) => {
            const eMaisBarato = index === 0;
            const card = document.createElement('div');
            
            // Design do Card
            card.className = `p-5 rounded-2xl mb-4 relative overflow-hidden transition-all ${
                eMaisBarato 
                ? 'bg-gradient-to-br from-yellow-500 to-orange-600 shadow-xl shadow-orange-900/40 border border-yellow-400 scale-[1.02]' 
                : 'bg-slate-800 border border-slate-700'
            }`;

            card.innerHTML = `
                ${eMaisBarato ? '<div class="absolute -top-10 -right-10 w-32 h-32 bg-yellow-300 opacity-20 rounded-full blur-2xl"></div>' : ''}
                
                <div class="relative z-10">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            ${eMaisBarato ? `
                            <span class="inline-flex items-center gap-1 bg-white/90 text-orange-700 text-[10px] font-black px-2 py-1 rounded shadow mb-2 uppercase tracking-wide">
                                <i class="fas fa-trophy text-yellow-500"></i> Campeão
                            </span>` : ''}
                            <h3 class="text-3xl font-black ${eMaisBarato ? 'text-white drop-shadow-sm' : 'text-emerald-400'}">
                                R$ ${item.preco.toFixed(2).replace('.', ',')}
                            </h3>
                        </div>
                        <div class="text-right">
                             <p class="text-[10px] font-mono opacity-60 ${eMaisBarato ? 'text-yellow-100' : 'text-slate-500'}">
                                ${new Date(item.data).toLocaleDateString('pt-BR')}
                             </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 mb-4">
                        <i class="fas fa-store ${eMaisBarato ? 'text-yellow-200' : 'text-slate-500'} text-xs"></i>
                        <p class="font-bold text-sm uppercase tracking-wide ${eMaisBarato ? 'text-white' : 'text-slate-300'}">
                            ${item.mercado}
                        </p>
                    </div>

                    <div class="pt-3 border-t ${eMaisBarato ? 'border-white/20' : 'border-slate-700'} flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700 shadow-inner">
                                <i class="fas fa-star text-[10px] text-yellow-400"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[8px] uppercase font-bold opacity-60">Colaborador</span>
                                <span class="text-xs font-bold">${item.usuario || 'Anônimo'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        alert("Erro: " + err);
        btn.innerHTML = iconeOriginal;
    }
}

// --- 5. ENVIO DE DADOS ---
async function salvarPreco(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<div class="loader"></div> Salvando...';

    const payload = {
        ean: document.getElementById('ean-field').value,
        produto: document.getElementById('product-name').value,
        preco: document.getElementById('price').value,
        mercado: document.getElementById('market').value,
        usuario: document.getElementById('username').value
    };

    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
        alert("Preço salvo com sucesso!");
        location.reload();
    } catch (err) {
        alert("Erro ao salvar: " + err);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// --- 6. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    loadMarkets();
    
    // Navegação
    document.getElementById('nav-registrar').addEventListener('click', () => trocarAba('registrar'));
    document.getElementById('nav-consultar').addEventListener('click', () => trocarAba('consultar'));

    // Ações
    document.getElementById('start-scan-btn').addEventListener('click', iniciarCamera);
    document.getElementById('btn-pesquisar').addEventListener('click', pesquisarPrecos);
    document.getElementById('price-form').addEventListener('submit', salvarPreco);

    // Persistência do Nome
    const userField = document.getElementById('username');
    userField.value = localStorage.getItem('radar_user') || '';
    userField.addEventListener('input', (e) => localStorage.setItem('radar_user', e.target.value));
});
