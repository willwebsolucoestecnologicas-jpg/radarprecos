// script.js - v5.0 (CARRINHO E COMPARADOR)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzz2eQeyVidWZinYx86ErR43hHQg-MQhQwSz8Hj19OzHoJLPaKXrrI0cZeFr1RY58K1/exec'; 

let html5QrCode;
let scannerIsRunning = false;
let carrinho = JSON.parse(localStorage.getItem('radar_carrinho')) || []; // Carrega carrinho salvo

// --- NOTIFICAÇÃO ---
function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastMsg.textContent = mensagem;
    if (tipo === 'erro') {
        toast.className = "fixed top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 font-bold transition-all duration-500 w-max max-w-[90%]";
        toastIcon.className = 'fas fa-circle-xmark text-xl';
    } else {
        toast.className = "fixed top-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 font-bold transition-all duration-500 w-max max-w-[90%]";
        toastIcon.className = 'fas fa-circle-check text-xl';
    }
    toast.classList.remove('-translate-y-32', 'opacity-0');
    setTimeout(() => toast.classList.add('-translate-y-32', 'opacity-0'), 3000);
}

// --- NAVEGAÇÃO ---
async function trocarAba(aba) {
    const abas = ['registrar', 'consultar', 'carrinho'];
    abas.forEach(a => document.getElementById(a + '-container').classList.add('hidden'));
    
    // Reseta cores menu
    document.getElementById('nav-registrar').className = "nav-btn text-slate-500";
    document.getElementById('nav-consultar').className = "nav-btn text-slate-500";
    document.getElementById('nav-carrinho').className = "nav-btn text-slate-500";

    // Para Câmera
    if (scannerIsRunning && html5QrCode) {
        try { await html5QrCode.stop(); scannerIsRunning = false; document.getElementById('reader').innerHTML = ''; } catch(e){}
    }

    // Ativa aba
    document.getElementById(aba + '-container').classList.remove('hidden');
    
    if (aba === 'registrar') document.getElementById('nav-registrar').className = "nav-btn text-blue-400";
    if (aba === 'consultar') document.getElementById('nav-consultar').className = "nav-btn text-yellow-400";
    if (aba === 'carrinho') {
        document.getElementById('nav-carrinho').className = "nav-btn text-purple-400";
        renderizarCarrinho(); // Atualiza visual do carrinho
    }
}

// --- GESTÃO DO CARRINHO ---
function atualizarContadorCarrinho() {
    const contador = document.getElementById('cart-counter');
    if (carrinho.length > 0) {
        contador.textContent = carrinho.length;
        contador.classList.remove('hidden');
    } else {
        contador.classList.add('hidden');
    }
    localStorage.setItem('radar_carrinho', JSON.stringify(carrinho));
}

function adicionarAoCarrinho(ean, produto) {
    // Verifica se já existe
    if (!carrinho.find(item => item.ean === ean)) {
        carrinho.push({ ean, produto });
        atualizarContadorCarrinho();
        mostrarNotificacao("Item adicionado à lista!");
    } else {
        mostrarNotificacao("Item já está na lista!", "erro");
    }
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    atualizarContadorCarrinho();
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const container = document.getElementById('lista-itens-carrinho');
    const btnCalcular = document.getElementById('btn-calcular-carrinho');
    const resultadoDiv = document.getElementById('resultado-comparacao');
    
    container.innerHTML = '';
    resultadoDiv.classList.add('hidden'); // Esconde resultados antigos se mudar a lista

    if (carrinho.length === 0) {
        container.innerHTML = `<div class="text-center py-10 opacity-30"><i class="fas fa-cart-shopping text-6xl mb-4"></i><p class="text-sm">Lista vazia.</p></div>`;
        btnCalcular.classList.add('hidden');
        return;
    }

    btnCalcular.classList.remove('hidden');

    carrinho.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center";
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs">${index + 1}</div>
                <p class="text-sm font-bold text-white line-clamp-1">${item.produto}</p>
            </div>
            <button onclick="removerDoCarrinho(${index})" class="text-red-500 hover:text-red-400 p-2"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
}

// --- LÓGICA DE COMPARAÇÃO (BACKEND) ---
async function calcularComparacao() {
    const btn = document.getElementById('btn-calcular-carrinho');
    const resultadoDiv = document.getElementById('resultado-comparacao');
    const rankingDiv = document.getElementById('ranking-mercados');
    const totalOtimizadoEl = document.getElementById('total-otimizado');
    const originalText = btn.innerHTML;

    btn.innerHTML = '<div class="loader w-4 h-4 border-white"></div> Calculando...';
    btn.disabled = true;

    // Prepara lista de EANs
    const eans = carrinho.map(item => item.ean);

    try {
        // Envia POST para processar a lista pesada
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // POST requer no-cors, mas não retorna JSON legível direto
            body: JSON.stringify({ acao: "compararCarrinho", eans: eans })
        });
        
        // TRUQUE: Como POST 'no-cors' não retorna dados, precisamos de uma estratégia diferente.
        // O Apps Script v5.0 que te passei suporta lógica complexa, mas para receber JSON de volta
        // no Front de forma fácil sem proxy, o ideal é usar GET se a URL não for gigante,
        // OU (melhor), mudar a abordagem para processamento no cliente se forem poucos dados.
        // VAMOS USAR UMA ADAPTAÇÃO: Vamos usar GET com parametros.
        // Se a lista for muito grande, daria erro de URL, mas para uso pessoal é ok.
        
        const params = new URLSearchParams();
        params.append('acao', 'compararCarrinho'); // Não existe no GET do v5, vamos simular via POST abaixo
        
        // Correção para funcionar 100% com Apps Script simples:
        // Vamos forçar o script v5 a aceitar "compararCarrinho" no DO_POST e retornar via DO_GET se chamarmos.
        // Como isso é complexo, vamos fazer o seguinte:
        // O script DoPost processa, mas o front não lê.
        // SOLUÇÃO: Vamos fazer chamadas individuais para pegar o melhor preço de cada item (Front-end Logic)
        // Isso é mais lento mas garantido de funcionar sem Backend complexo.
        
        // 1. Calcular Otimizado (Misturado)
        let totalOtimizado = 0;
        let precosPorMercado = {}; // { 'Mercado A': 0, 'Mercado B': 0 }
        let contagemMercado = {};  // { 'Mercado A': 5 itens }

        // Busca dados de cada item
        for (const item of carrinho) {
            const res = await fetch(`${APPS_SCRIPT_URL}?acao=consultarPrecos&ean=${item.ean}`, { redirect: 'follow' });
            const data = await res.json();
            
            if (data.resultados && data.resultados.length > 0) {
                // Ordena pelo menor
                data.resultados.sort((a, b) => a.preco - b.preco);
                
                // Soma ao otimizado
                totalOtimizado += data.resultados[0].preco;

                // Processa mercados individuais
                // Para cada mercado que vende esse produto, soma ao total daquele mercado
                // Se um mercado NÃO tem o produto, ele ficará com a contagem defasada
                const mercadosDesteItem = [...new Set(data.resultados.map(r => r.mercado))];
                
                mercadosDesteItem.forEach(mercado => {
                    // Pega o melhor preço desse item NESTE mercado
                    const ofertaMercado = data.resultados.find(r => r.mercado === mercado);
                    if (ofertaMercado) {
                        precosPorMercado[mercado] = (precosPorMercado[mercado] || 0) + ofertaMercado.preco;
                        contagemMercado[mercado] = (contagemMercado[mercado] || 0) + 1;
                    }
                });
            }
        }

        // Renderiza Resultados
        totalOtimizadoEl.innerText = `R$ ${totalOtimizado.toFixed(2).replace('.', ',')}`;
        
        // Renderiza Ranking
        rankingDiv.innerHTML = '';
        const ranking = Object.keys(precosPorMercado).map(mercado => ({
            nome: mercado,
            total: precosPorMercado[mercado],
            itens: contagemMercado[mercado]
        }));

        // Ordena: Quem tem TODOS os itens primeiro, depois pelo preço
        ranking.sort((a, b) => {
            if (b.itens !== a.itens) return b.itens - a.itens;
            return a.total - b.total;
        });

        ranking.forEach(m => {
            const faltam = carrinho.length - m.itens;
            const corPreco = faltam > 0 ? 'text-slate-400' : 'text-white';
            const badge = faltam === 0 ? '<span class="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 rounded">Completo</span>' : `<span class="bg-red-500/20 text-red-400 text-[10px] px-2 rounded">Faltam ${faltam}</span>`;
            
            const div = document.createElement('div');
            div.className = "bg-slate-800 p-4 rounded-xl flex justify-between items-center";
            div.innerHTML = `
                <div>
                    <h4 class="font-bold text-sm text-slate-200">${m.nome}</h4>
                    <div class="flex gap-2 mt-1">${badge}</div>
                </div>
                <div class="text-right">
                    <span class="block text-xl font-black ${corPreco}">R$ ${m.total.toFixed(2).replace('.', ',')}</span>
                </div>
            `;
            rankingDiv.appendChild(div);
        });

        resultadoDiv.classList.remove('hidden');
        
    } catch (e) {
        mostrarNotificacao("Erro ao calcular: " + e, "erro");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}


// --- SCANNER E CONSULTA ---
async function iniciarCamera(modo) {
    if (scannerIsRunning) return;
    if (modo === 'pesquisar') { await trocarAba('registrar'); document.getElementById('start-scan-btn').classList.add('hidden'); }

    const msg = document.getElementById('scan-message');
    msg.classList.remove('hidden');
    msg.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Iniciando...`;
    
    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        scannerIsRunning = true;
        await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (t) => onScanSuccess(t, modo));
    } catch (err) {
        scannerIsRunning = false;
        mostrarNotificacao("Erro câmera.", "erro");
        msg.classList.add('hidden');
        document.getElementById('start-scan-btn').classList.remove('hidden');
    }
}

async function onScanSuccess(decodedText, modo) {
    if (html5QrCode) { await html5QrCode.stop(); scannerIsRunning = false; document.getElementById('reader').innerHTML = ''; }

    if (modo === 'pesquisar') {
        await trocarAba('consultar');
        document.getElementById('ean-busca').value = decodedText;
        pesquisarPrecos();
        document.getElementById('start-scan-btn').classList.remove('hidden');
        return;
    }

    // Modo Registrar
    document.getElementById('scanner-section').classList.add('hidden');
    document.getElementById('price-form-section').classList.remove('hidden');
    document.getElementById('ean-field').value = decodedText;
    document.getElementById('product-name').value = "Buscando...";
    document.getElementById('product-name').disabled = true;
    document.getElementById('preview-imagem').classList.add('hidden');

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?ean=${decodedText}`, { redirect: 'follow' });
        const data = await res.json();
        document.getElementById('product-name').value = data.nome || "";
        if (data.imagem && data.imagem.startsWith('http')) {
            document.getElementById('preview-imagem').src = data.imagem;
            document.getElementById('preview-imagem').classList.remove('hidden');
            document.getElementById('image-url-field').value = data.imagem;
        }
    } catch (e) { document.getElementById('product-name').value = ""; } 
    finally { document.getElementById('product-name').disabled = false; }
}

// --- PESQUISAR COM BOTÃO ADICIONAR ---
async function pesquisarPrecos() {
    const eanBusca = document.getElementById('ean-busca').value;
    const container = document.getElementById('resultados-consulta');
    const btn = document.getElementById('btn-pesquisar');
    
    if (!eanBusca) return mostrarNotificacao("Digite um código!", "erro");
    
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<div class="loader w-4 h-4 border-slate-900"></div>';
    container.innerHTML = ''; 

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?acao=consultarPrecos&ean=${eanBusca}`, { redirect: 'follow' });
        const data = await res.json();
        btn.innerHTML = originalIcon;

        if (!data.resultados || data.resultados.length === 0) {
            container.innerHTML = `<div class="text-center py-8 opacity-50 bg-slate-900 rounded-xl"><p>Nenhum preço encontrado.</p></div>`;
            return;
        }

        const lista = data.resultados.sort((a, b) => a.preco - b.preco);

        // Pega o nome do produto do primeiro resultado para salvar no carrinho
        const nomeProdutoGeral = lista[0].produto;

        // Cabeçalho com botão de Adicionar à Lista
        const headerDiv = document.createElement('div');
        headerDiv.className = "flex justify-between items-center mb-4 bg-purple-500/10 p-4 rounded-xl border border-purple-500/20";
        headerDiv.innerHTML = `
            <div>
                <h3 class="text-sm font-bold text-white line-clamp-1">${nomeProdutoGeral}</h3>
                <p class="text-[10px] text-slate-400">EAN: ${eanBusca}</p>
            </div>
            <button onclick="adicionarAoCarrinho('${eanBusca}', '${nomeProdutoGeral}')" class="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg shadow-lg active:scale-95 transition-all">
                <i class="fas fa-plus"></i> Lista
            </button>
        `;
        container.appendChild(headerDiv);

        lista.forEach((item, index) => {
            const eMaisBarato = index === 0;
            const imgUrl = (item.imagem && item.imagem.length > 10) ? item.imagem : "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";

            const card = document.createElement('div');
            card.className = `p-4 rounded-2xl mb-4 relative overflow-hidden flex gap-4 ${eMaisBarato ? 'bg-gradient-to-br from-yellow-500 to-orange-600 shadow-xl border border-yellow-300 transform scale-[1.02]' : 'bg-slate-800 border border-slate-700'}`;

            card.innerHTML = `
                ${eMaisBarato ? '<div class="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>' : ''}
                <div class="w-16 h-16 bg-white/10 rounded-xl p-1 flex-shrink-0 flex items-center justify-center border border-white/10"><img src="${imgUrl}" class="max-w-full max-h-full object-contain"></div>
                <div class="flex-1 relative z-10 flex flex-col justify-between">
                    <div>
                        ${eMaisBarato ? `<div class="absolute -top-1 -right-1"><span class="bg-white text-orange-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm"><i class="fas fa-crown"></i> Campeão</span></div>` : ''}
                        <h3 class="text-2xl font-black ${eMaisBarato ? 'text-white' : 'text-emerald-400'}">R$ ${item.preco.toFixed(2).replace('.', ',')}</h3>
                        <p class="font-bold text-xs uppercase ${eMaisBarato ? 'text-white' : 'text-slate-300'} line-clamp-1 mt-0.5"><i class="fas fa-store mr-1 opacity-70"></i> ${item.mercado}</p>
                    </div>
                    <div class="flex justify-between items-end border-t ${eMaisBarato ? 'border-white/20' : 'border-slate-700'} pt-2 mt-2"><div class="flex items-center gap-1.5"><i class="fas fa-user text-[10px]"></i><span class="text-[10px] font-bold">${item.usuario || 'Anônimo'}</span></div><span class="text-[9px] opacity-60">${new Date(item.data).toLocaleDateString('pt-BR').slice(0,5)}</span></div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        mostrarNotificacao("Erro pesquisa", "erro");
        btn.innerHTML = originalIcon;
    }
}

async function salvarPreco(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="loader w-5 h-5 border-white"></div>'; btn.disabled = true;

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
        mostrarNotificacao("Preço registrado!");
        setTimeout(() => location.reload(), 2000);
    } catch (err) {
        mostrarNotificacao("Erro ao salvar.", "erro");
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadMarkets();
    atualizarContadorCarrinho();
    
    document.getElementById('nav-registrar').addEventListener('click', () => trocarAba('registrar'));
    document.getElementById('nav-consultar').addEventListener('click', () => trocarAba('consultar'));
    document.getElementById('nav-carrinho').addEventListener('click', () => trocarAba('carrinho'));
    
    document.getElementById('start-scan-btn').addEventListener('click', () => iniciarCamera('registrar'));
    document.getElementById('btn-calcular-carrinho').addEventListener('click', calcularComparacao);
    
    const btnScanSearch = document.getElementById('btn-scan-pesquisa');
    if (btnScanSearch) btnScanSearch.addEventListener('click', (e) => { e.preventDefault(); iniciarCamera('pesquisar'); });

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
            data.mercados.forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; select.appendChild(opt); });
        }
    } catch (e) { select.innerHTML = '<option value="Geral">Mercado Geral</option>'; }
}
