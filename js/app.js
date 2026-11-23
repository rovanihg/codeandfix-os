<!DOCTYPE html>
<html lang="pt-BR">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code & Fix - Gestão de OS & Controle MEI</title>

<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>
<!-- Lucide Icons -->
<script src="https://unpkg.com/lucide@latest"></script>
<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<!-- QRCode.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<!-- Supabase JS -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<link rel="stylesheet" href="css/styles.css">
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col font-sans">

<!-- TELA DE LOGIN -->
<div id="auth-screen" class="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-50">
  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full space-y-6 shadow-2xl">
    <div class="text-center space-y-2">
      <div class="inline-flex p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
        <i data-lucide="cpu" class="w-8 h-8"></i>
      </div>
      <h2 class="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Code & Fix</h2>
      <p class="text-xs text-slate-400">Acesso Restrito da Oficina</p>
    </div>

    <form id="form-login" class="space-y-4 text-xs">
      <div>
        <label class="block text-slate-400 mb-1">E-mail</label>
        <input type="email" id="login-email" required class="form-input" placeholder="seu@email.com">
      </div>
      <div>
        <label class="block text-slate-400 mb-1">Senha</label>
        <input type="password" id="login-senha" required class="form-input" placeholder="••••••••">
      </div>
      <button type="submit" id="btn-login-submit" class="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-semibold transition">
        Entrar na Bancada
      </button>
    </form>

    <div class="pt-4 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
      <button id="btn-offline-mode" class="hover:text-slate-300 underline">Modo Local (Offline)</button>
      <button id="btn-open-sync-login" class="hover:text-slate-300">Configurar Nuvem / Pix</button>
    </div>
  </div>
</div>

<!-- APLICAÇÃO PRINCIPAL -->
<div id="app-container" class="hidden flex-1 flex flex-col">
  <!-- Header -->
  <header class="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-4">
      <div class="flex items-center space-x-3">
        <div class="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/30 text-cyan-400">
          <i data-lucide="cpu" class="w-5 h-5"></i>
        </div>
        <div>
          <h1 class="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Code & Fix</h1>
          <p class="text-[10px] text-slate-400">Bancada & Gestão MEI</p>
        </div>
      </div>

      <div class="flex items-center space-x-3">
        <button id="btn-sync-settings" title="Configurar Nuvem e Chave Pix" class="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800 hover:bg-slate-700 transition">
          <span id="sync-indicator" class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span id="sync-status-text" class="text-slate-300 font-medium">LocalStorage</span>
        </button>

        <nav class="flex space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/60">
          <button id="tab-btn-dashboard" class="nav-tab active-tab px-3 py-1.5 text-xs font-medium rounded-lg">Dashboard</button>
          <button id="tab-btn-os" class="nav-tab px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg">OS Bancada</button>
          <button id="tab-btn-caixa" class="nav-tab px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg">Livro Caixa</button>
        </nav>

        <button id="btn-logout" title="Sair da Conta" class="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition">
          <i data-lucide="log-out" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- Conteúdo Principal -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
    <!-- DASHBOARD -->
    <section id="view-dashboard" class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-slate-800/60 border border-slate-700 p-4 rounded-xl">
          <span class="text-xs text-slate-400">Faturamento Bruto (Mês)</span>
          <p id="dash-faturamento" class="text-2xl font-bold text-emerald-400 mt-1">R$ 0,00</p>
          <p class="text-[10px] text-slate-500 mt-1">Base da DASN-SIMEI</p>
        </div>
        <div class="bg-slate-800/60 border border-slate-700 p-4 rounded-xl">
          <span class="text-xs text-slate-400">Despesas / Peças (Mês)</span>
          <p id="dash-despesas" class="text-2xl font-bold text-rose-400 mt-1">R$ 0,00</p>
          <p class="text-[10px] text-slate-500 mt-1">Insumos e impostos</p>
        </div>
        <div class="bg-slate-800/60 border border-slate-700 p-4 rounded-xl">
          <span class="text-xs text-slate-400">Lucro Líquido Real</span>
          <p id="dash-lucro" class="text-2xl font-bold text-cyan-400 mt-1">R$ 0,00</p>
          <p class="text-[10px] text-slate-500 mt-1">Saldo gerado no caixa</p>
        </div>
        <div class="bg-slate-800/60 border border-slate-700 p-4 rounded-xl">
          <span class="text-xs text-slate-400">Parcela Isenta PF (32%)</span>
          <p id="dash-isencao" class="text-2xl font-bold text-indigo-400 mt-1">R$ 0,00</p>
          <p class="text-[10px] text-slate-500 mt-1">Retirada isenta de IRPF</p>
        </div>
      </div>

      <div class="bg-slate-800/60 border border-slate-700 p-4 rounded-xl space-y-2">
        <div class="flex justify-between text-xs">
          <span class="text-slate-300 font-medium">Teto Anual MEI (R$ 81.000,00)</span>
          <span id="mei-accumulated-text" class="text-slate-400 font-mono">R$ 0,00 (0%)</span>
        </div>
        <div class="w-full bg-slate-700/50 h-2.5 rounded-full overflow-hidden">
          <div id="mei-progress-bar" class="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full w-0 transition-all duration-500"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
          <h3 class="text-sm font-semibold text-slate-200 mb-4">Fluxo Financeiro (Entradas vs Saídas)</h3>
          <div class="h-64"><canvas id="chart-fluxo"></canvas></div>
        </div>
        <div class="bg-slate-800/60 border border-slate-700 p-5 rounded-xl space-y-3">
          <h3 class="text-sm font-semibold text-slate-200">Resumo da Bancada</h3>
          <div class="flex justify-between py-2 border-b border-slate-700/60 text-xs">
            <span class="text-slate-400">Em Análise</span>
            <span id="stat-em-analise" class="font-semibold text-amber-400">0</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-700/60 text-xs">
            <span class="text-slate-400">Aguardando Peça</span>
            <span id="stat-aguardando" class="font-semibold text-orange-400">0</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-700/60 text-xs">
            <span class="text-slate-400">Pronto p/ Retirada</span>
            <span id="stat-pronto" class="font-semibold text-emerald-400">0</span>
          </div>
          <div class="flex justify-between py-2 text-xs">
            <span class="text-slate-400">Finalizados no Mês</span>
            <span id="stat-finalizados" class="font-semibold text-cyan-400">0</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ORDENS DE SERVIÇO -->
    <section id="view-os" class="hidden space-y-4">
      <div class="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-100">Ordens de Serviço</h2>
          <p class="text-xs text-slate-400">Controle de bancada, checklist de entrada, cobrança Pix e relatórios</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button id="btn-exportar-os-csv" class="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 transition">
            <i data-lucide="file-spreadsheet" class="w-4 h-4"></i><span>Relatório CSV</span>
          </button>
          <button id="btn-imprimir-relatorio-os" class="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 transition">
            <i data-lucide="printer" class="w-4 h-4"></i><span>Imprimir Relatório</span>
          </button>
          <button id="btn-nova-os" class="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition">
            <i data-lucide="plus" class="w-4 h-4"></i><span>Nova OS</span>
          </button>
        </div>
      </div>

      <!-- BARRA DE FILTROS E BUSCA -->
      <div class="bg-slate-800/60 border border-slate-700 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs items-end">
        <div class="lg:col-span-4">
          <label class="block text-slate-400 mb-1">Buscar Cliente ou Aparelho</label>
          <div class="relative">
            <input type="text" id="filtro-os-texto" placeholder="Nome, telefone ou modelo..." class="form-input pl-8">
              <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
          </div>
        </div>

        <div class="lg:col-span-3">
          <label class="block text-slate-400 mb-1">Filtrar por Status</label>
          <select id="filtro-os-status" class="form-input">
            <option value="">Todos os Status</option>
            <option value="Em Análise">Em Análise</option>
            <option value="Aguardando Aprovação">Aguardando Aprovação</option>
            <option value="Aguardando Peça">Aguardando Peça</option>
            <option value="Pronto para Retirada">Pronto para Retirada</option>
            <option value="Entregue / Concluído">Entregue / Concluído</option>
          </select>
        </div>

        <div class="lg:col-span-2">
          <label class="block text-slate-400 mb-1">Data Inicial</label>
          <input type="date" id="filtro-os-data-inicio" class="form-input">
        </div>

        <div class="lg:col-span-2">
          <label class="block text-slate-400 mb-1">Data Final</label>
          <input type="date" id="filtro-os-data-fim" class="form-input">
        </div>

        <div class="lg:col-span-1">
          <button id="btn-limpar-filtros-os" title="Limpar Filtros" class="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg flex items-center justify-center transition">
            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- RESUMO DOS RESULTADOS FILTRADOS -->
      <div class="flex flex-wrap justify-between items-center bg-slate-800/40 border border-slate-700/60 px-4 py-2.5 rounded-xl text-xs gap-2">
        <span class="text-slate-400">Exibindo <strong id="os-filtro-qtd" class="text-slate-200">0</strong> ordem(ns)</span>
        <div class="flex flex-wrap gap-4 font-mono">
          <span class="text-slate-400">Total OS: <strong id="os-filtro-total" class="text-cyan-400">R$ 0,00</strong></span>
          <span class="text-slate-400">Recebido: <strong id="os-filtro-pago" class="text-emerald-400">R$ 0,00</strong></span>
          <span class="text-slate-400">A Receber: <strong id="os-filtro-falta" class="text-amber-400">R$ 0,00</strong></span>
        </div>
      </div>

      <!-- TABELA DE OS -->
      <div class="bg-slate-800/60 border border-slate-700 rounded-xl overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-800 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
          <tr>
            <th class="p-3.5">OS #</th>
            <th class="p-3.5">Data</th>
            <th class="p-3.5">Cliente</th>
            <th class="p-3.5">Aparelho</th>
            <th class="p-3.5">Status</th>
            <th class="p-3.5">Financeiro / Pagamentos</th>
            <th class="p-3.5 text-right">Ações</th>
          </tr>
          </thead>
          <tbody id="tabela-os-body" class="divide-y divide-slate-700/60"></tbody>
        </table>
      </div>
    </section>

    <!-- LIVRO CAIXA -->
    <section id="view-caixa" class="hidden space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-semibold text-slate-100">Livro Caixa da Conta PJ</h2>
          <p class="text-xs text-slate-400">Separado rigorosamente da pessoa física</p>
        </div>
        <div class="flex space-x-2">
          <button id="btn-exportar-csv" class="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-xs flex items-center space-x-1 transition">
            <i data-lucide="download" class="w-4 h-4"></i><span>Exportar CSV</span>
          </button>
          <button id="btn-novo-lancamento" class="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition">
            <i data-lucide="plus" class="w-4 h-4"></i><span>Novo Lançamento</span>
          </button>
        </div>
      </div>
      <div class="bg-slate-800/60 border border-slate-700 rounded-xl overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-800 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
          <tr>
            <th class="p-3.5">Data</th>
            <th class="p-3.5">Tipo</th>
            <th class="p-3.5">Categoria</th>
            <th class="p-3.5">Descrição</th>
            <th class="p-3.5 text-right">Valor</th>
            <th class="p-3.5 text-right">Ações</th>
          </tr>
          </thead>
          <tbody id="tabela-caixa-body" class="divide-y divide-slate-700/60"></tbody>
        </table>
      </div>
    </section>
  </main>
</div>

<!-- MODAL: NOVA / EDITAR OS COM CHECKLIST, MÚLTIPLOS PAGAMENTOS, PIX E ASSINATURA -->
<div id="modal-os" class="modal-backdrop hidden">
  <div class="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h3 id="modal-os-title" class="text-sm font-semibold text-slate-100">Nova Ordem de Serviço</h3>
      <button class="btn-close-modal text-slate-400 hover:text-slate-200"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>

    <form id="form-os" class="space-y-3.5 text-xs">
      <input type="hidden" id="os-id">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-400 mb-1">Cliente</label>
            <input type="text" id="os-cliente" required class="form-input">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">WhatsApp (com DDD)</label>
            <input type="text" id="os-telefone" placeholder="19999998888" required class="form-input">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-400 mb-1">Aparelho</label>
            <input type="text" id="os-aparelho" placeholder="Ex: Moto G84 / Notebook Dell" required class="form-input">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Status</label>
            <select id="os-status" class="form-input">
              <option value="Em Análise">Em Análise</option>
              <option value="Aguardando Aprovação">Aguardando Aprovação</option>
              <option value="Aguardando Peça">Aguardando Peça</option>
              <option value="Pronto para Retirada">Pronto para Retirada</option>
              <option value="Entregue / Concluído">Entregue / Concluído</option>
            </select>
          </div>
        </div>

        <!-- CHECKLIST DE ENTRADA DO APARELHO -->
        <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80 space-y-2.5">
          <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-700/60 pb-2">
            <span class="text-[11px] font-semibold text-cyan-400 flex items-center gap-1.5">
              <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i>
              Checklist de Entrada (Condições na Recepção)
            </span>
            <label class="flex items-center space-x-1.5 text-[11px] text-amber-400 cursor-pointer">
              <input type="checkbox" id="chk-aparelho-desligado" class="rounded bg-slate-800 border-slate-600 text-amber-500 focus:ring-0">
                <span>Aparelho entrou desligado / sem imagem (Não testado)</span>
            </label>
          </div>

          <div id="checklist-items-grid" class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <label class="block text-slate-400 mb-0.5">Tela / Touch</label>
              <select id="chk-tela" class="form-input py-1 text-[11px]">
                <option value="OK">OK / Funcionando</option>
                <option value="Trincada / Riscada">Trincada / Riscada</option>
                <option value="Sem Imagem / Falha">Sem Imagem / Falha</option>
                <option value="Não Testado">Não Testado</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-0.5">Câmeras (F/T)</label>
              <select id="chk-cameras" class="form-input py-1 text-[11px]">
                <option value="OK">OK / Funcionando</option>
                <option value="Com Defeito">Com Defeito / Embaçada</option>
                <option value="Não Testado">Não Testado</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-0.5">Botões Físicos</label>
              <select id="chk-botoes" class="form-input py-1 text-[11px]">
                <option value="OK">OK / Funcionando</option>
                <option value="Com Defeito">Afundado / Falhando</option>
                <option value="Não Testado">Não Testado</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-0.5">Wi-Fi / Rede</label>
              <select id="chk-wifi" class="form-input py-1 text-[11px]">
                <option value="OK">OK / Conectando</option>
                <option value="Sem Sinal">Sem Sinal / Falha</option>
                <option value="Não Testado">Não Testado</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-0.5">Conector Carga</label>
              <select id="chk-carga" class="form-input py-1 text-[11px]">
                <option value="OK">OK / Carregando</option>
                <option value="Com Folga / Não Carrega">Folga / Não Carrega</option>
                <option value="Não Testado">Não Testado</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-0.5">Áudio / Mic</label>
              <select id="chk-audio" class="form-input py-1 text-[11px]">
                <option value="OK">OK / Funcionando</option>
                <option value="Sem Som / Chiado">Sem Som / Chiado</option>
                <option value="Não Testado">Não Testado</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-0.5">Biometria / FaceID</label>
              <select id="chk-biometria" class="form-input py-1 text-[11px]">
                <option value="OK">OK / Funcionando</option>
                <option value="Indisponível">Indisponível / Falha</option>
                <option value="Não Testado">Não Testado</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 mb-0.5">Carcaça / Tampa</label>
              <select id="chk-carcaca" class="form-input py-1 text-[11px]">
                <option value="Intacta">Intacta / Marcas uso</option>
                <option value="Quebrada / Empenada">Quebrada / Empenada</option>
              </select>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-400 mb-1">Defeito Relatado</label>
            <textarea id="os-defeito" rows="2" required class="form-input"></textarea>
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Diagnóstico Técnico / Solução</label>
            <textarea id="os-laudo" rows="2" placeholder="Ex: Troca de conector e restauração de trilha" class="form-input"></textarea>
          </div>
        </div>

        <!-- VALORES DO SERVIÇO -->
        <div class="grid grid-cols-3 gap-3 pt-2 border-t border-slate-700/60">
          <div>
            <label class="block text-slate-400 mb-1">Custo Peça (R$)</label>
            <input type="number" step="0.01" id="os-custo-peca" value="0.00" class="form-input">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Mão de Obra (R$)</label>
            <input type="number" step="0.01" id="os-mao-obra" value="0.00" class="form-input">
          </div>
          <div>
            <label class="block text-slate-400 mb-1 font-semibold text-cyan-400">Total OS (R$)</label>
            <input type="text" id="os-valor-total" readonly class="form-input bg-slate-900/50 font-bold text-cyan-400">
          </div>
        </div>

        <!-- CONTROLE DE MÚLTIPLOS PAGAMENTOS COM DATA E HORA -->
        <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80 space-y-3">
          <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-700/60 pb-2">
            <span class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <i data-lucide="wallet" class="w-3.5 h-3.5"></i>
              Recebimentos & Parcelas da OS
            </span>
            <div class="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              <span class="text-slate-400">Pago: <strong id="os-resumo-pago" class="text-emerald-400">R$ 0,00</strong></span>
              <span class="text-slate-400">Falta: <strong id="os-resumo-falta" class="text-amber-400">R$ 0,00</strong></span>
              <button type="button" id="btn-gerar-pix-modal" class="px-2 py-0.5 bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 rounded font-sans font-semibold flex items-center gap-1 transition">
                <i data-lucide="qr-code" class="w-3 h-3"></i> Cobrar via Pix
              </button>
            </div>
          </div>

          <!-- Formulário para Adicionar/Editar um Recebimento -->
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <input type="hidden" id="pagto-edit-index" value="-1">
              <div class="sm:col-span-4">
                <label class="block text-slate-400 mb-0.5 text-[10px]">Data e Hora</label>
                <input type="datetime-local" id="pagto-data-hora" class="form-input py-1 text-[11px]">
              </div>
              <div class="sm:col-span-4">
                <label class="block text-slate-400 mb-0.5 text-[10px]">Forma de Pagamento</label>
                <select id="pagto-forma" class="form-input py-1 text-[11px]">
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão Débito">Cartão Débito</option>
                  <option value="Cartão Crédito">Cartão Crédito</option>
                  <option value="Transferência / TED">Transferência / TED</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="block text-slate-400 mb-0.5 text-[10px]">Valor (R$)</label>
                <input type="number" step="0.01" id="pagto-valor" placeholder="0.00" class="form-input py-1 text-[11px] text-emerald-400 font-semibold">
              </div>
              <div class="sm:col-span-2 flex gap-1">
                <button type="button" id="btn-salvar-parcela" class="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] transition">
                  + Add
                </button>
                <button type="button" id="btn-cancelar-edicao-parcela" title="Cancelar edição" class="hidden px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[11px]">
                  ✕
                </button>
              </div>
          </div>

          <!-- Lista de Recebimentos Registrados nesta OS -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[11px]">
              <thead class="text-slate-400 border-b border-slate-800 text-[10px] uppercase">
              <tr>
                <th class="py-1.5 px-2">Data / Hora</th>
                <th class="py-1.5 px-2">Forma</th>
                <th class="py-1.5 px-2">Valor</th>
                <th class="py-1.5 px-2 text-center">Livro Caixa</th>
                <th class="py-1.5 px-2 text-right">Ações</th>
              </tr>
              </thead>
              <tbody id="lista-pagamentos-os-body" class="divide-y divide-slate-800/80"></tbody>
            </table>
          </div>
        </div>

        <!-- Assinatura Digital -->
        <div class="space-y-1 pt-1">
          <div class="flex justify-between items-center">
            <label class="text-slate-400">Assinatura do Cliente (Concordância Checklist / Retirada)</label>
            <button type="button" id="btn-clear-sig" class="text-[10px] text-rose-400 hover:underline">Limpar Traço</button>
          </div>
          <div class="border border-slate-700 rounded-lg bg-slate-950 overflow-hidden">
            <canvas id="signature-pad" width="550" height="100" class="w-full touch-none cursor-crosshair"></canvas>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-700 flex justify-end space-x-2">
          <button type="button" class="btn-close-modal px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200">Cancelar</button>
          <button type="submit" class="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-semibold">Salvar OS</button>
        </div>
    </form>
  </div>
</div>

<!-- MODAL: COBRANÇA PIX (QR CODE + COPIA E COLA) -->
<div id="modal-pix" class="modal-backdrop hidden">
  <div class="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl p-6 space-y-4 text-xs">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h3 class="text-sm font-semibold text-teal-400 flex items-center gap-2">
        <i data-lucide="qr-code" class="w-4 h-4"></i>
        <span>Cobrança Instantânea via Pix</span>
      </h3>
      <button type="button" id="btn-fechar-modal-pix" class="text-slate-400 hover:text-slate-200"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>

    <div class="space-y-3">
      <div class="bg-slate-900/70 p-2.5 rounded-lg border border-slate-700/70">
        <p class="text-slate-400 text-[11px]">Cliente: <strong id="pix-modal-cliente" class="text-slate-200"></strong></p>
        <p class="text-slate-400 text-[11px]">Referência: <strong id="pix-modal-ref" class="text-cyan-400"></strong></p>
      </div>

      <div>
        <label class="block text-slate-400 mb-1">Valor a Cobrar no QR Code (R$)</label>
        <input type="number" step="0.01" id="pix-modal-valor" class="form-input text-base font-bold text-emerald-400">
      </div>

      <!-- Container onde o QR Code será desenhado -->
      <div class="flex flex-col items-center justify-center bg-white p-4 rounded-xl mx-auto w-fit shadow-inner">
        <div id="pix-qrcode-canvas"></div>
      </div>

      <div>
        <label class="block text-slate-400 mb-1">Código Pix Copia e Cola</label>
        <div class="flex gap-1.5">
          <input type="text" id="pix-copia-cola-texto" readonly class="form-input font-mono text-[10px] bg-slate-950 text-slate-300">
            <button type="button" id="btn-copiar-pix" class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold whitespace-nowrap transition">
              Copiar
            </button>
        </div>
      </div>

      <button type="button" id="btn-enviar-pix-whatsapp" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition">
        <i data-lucide="message-circle" class="w-4 h-4"></i>
        <span>Enviar Código Pix Isolado no WhatsApp</span>
      </button>
    </div>
  </div>
</div>

<!-- MODAL: LANÇAMENTO CAIXA -->
<div id="modal-caixa" class="modal-backdrop hidden">
  <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 space-y-4 text-xs">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h3 class="text-sm font-semibold text-slate-100">Novo Lançamento Financeiro</h3>
      <button class="btn-close-modal text-slate-400 hover:text-slate-200"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>

    <form id="form-caixa" class="space-y-3.5">
      <input type="hidden" id="caixa-id">
        <div>
          <label class="block text-slate-400 mb-1">Tipo</label>
          <select id="caixa-tipo" class="form-input">
            <option value="entrada">Entrada (Serviço / Venda)</option>
            <option value="saida">Saída (Despesa / Peça / DAS)</option>
          </select>
        </div>
        <div>
          <label class="block text-slate-400 mb-1">Categoria Fiscal</label>
          <select id="caixa-categoria" class="form-input">
            <option value="Serviço de Bancada">Serviço de Bancada</option>
            <option value="Compra de Peças / Telas">Compra de Peças / Telas</option>
            <option value="Insumos (Estanho/Fluxo/Fita)">Insumos (Estanho/Fluxo/Fita)</option>
            <option value="Ferramental de Bancada">Ferramental de Bancada</option>
            <option value="Guia DAS-MEI">Guia DAS-MEI</option>
            <option value="Retirada Pró-Labore / Lucro">Retirada Pró-Labore / Lucro</option>
          </select>
        </div>
        <div>
          <label class="block text-slate-400 mb-1">Descrição</label>
          <input type="text" id="caixa-descricao" required placeholder="Ex: Tela Original Fornecedor" class="form-input">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-400 mb-1">Data</label>
            <input type="date" id="caixa-data" required class="form-input">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Valor (R$)</label>
            <input type="number" step="0.01" id="caixa-valor" required placeholder="0.00" class="form-input">
          </div>
        </div>
        <div class="pt-3 border-t border-slate-700 flex justify-end space-x-2">
          <button type="button" class="btn-close-modal px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200">Cancelar</button>
          <button type="submit" class="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-semibold">Salvar</button>
        </div>
    </form>
  </div>
</div>

<!-- MODAL: CONFIGURAÇÃO SUPABASE & CHAVE PIX -->
<div id="modal-sync" class="modal-backdrop hidden">
  <div class="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h3 class="text-sm font-semibold text-slate-100 flex items-center space-x-2">
        <i data-lucide="settings" class="w-4 h-4 text-cyan-400"></i>
        <span>Configurações da Nuvem & Recebimento Pix</span>
      </h3>
      <button class="btn-close-modal text-slate-400 hover:text-slate-200"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    <form id="form-supabase-config" class="space-y-4">
      <div class="space-y-2.5">
        <h4 class="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">1. Banco de Dados (Supabase)</h4>
        <div>
          <label class="block text-slate-400 mb-1">Project URL</label>
          <input type="text" id="supabase-url" placeholder="https://xyz.supabase.co" class="form-input">
        </div>
        <div>
          <label class="block text-slate-400 mb-1">Anon Public Key</label>
          <input type="password" id="supabase-key" placeholder="eyJhbGciOi..." class="form-input">
        </div>
      </div>

      <div class="space-y-2.5 pt-3 border-t border-slate-700">
        <h4 class="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">2. Dados para Gerador de QR Code Pix</h4>
        <div>
          <label class="block text-slate-400 mb-1">Sua Chave Pix (CNPJ, E-mail, Celular c/ +55 ou Chave Aleatória)</label>
          <input type="text" id="config-pix-chave" placeholder="Ex: 00000000000199 ou +5519981586973" class="form-input">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-400 mb-1">Nome do Recebedor (sem acentos)</label>
            <input type="text" id="config-pix-nome" value="CODE & FIX" maxlength="25" class="form-input">
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Cidade (sem acentos)</label>
            <input type="text" id="config-pix-cidade" value="LIMEIRA" maxlength="15" class="form-input">
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-700 flex justify-between items-center">
        <button type="button" id="btn-clear-supabase" class="text-rose-400 hover:underline">Limpar Nuvem e Usar Local</button>
        <button type="submit" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-semibold">Salvar Configurações</button>
      </div>
    </form>
  </div>
</div>

<!-- RECIBO INDIVIDUAL PARA IMPRESSÃO -->
<div id="receipt-print-area" class="hidden">
  <div class="receipt-container">
    <div class="receipt-header">
      <h2>CODE & FIX - ASSISTÊNCIA TÉCNICA</h2>
      <p>Smartphones, Informática e Microeletrônica</p>
      <p class="receipt-id">ORDEM DE SERVIÇO Nº <span id="rec-id">000</span> — Data: <span id="rec-data">--/--/----</span></p>
    </div>
    <hr>
      <div class="receipt-section">
        <p><strong>Cliente:</strong> <span id="rec-cliente"></span> | <strong>Tel:</strong> <span id="rec-telefone"></span></p>
        <p><strong>Aparelho:</strong> <span id="rec-aparelho"></span></p>
        <p><strong>Defeito Declarado:</strong> <span id="rec-defeito"></span></p>
        <p><strong>Solução Técnica:</strong> <span id="rec-laudo"></span></p>
      </div>
      <hr>
        <div class="receipt-section" style="font-size: 11px;">
          <p><strong>CHECKLIST DE ENTRADA:</strong> <span id="rec-checklist"></span></p>
        </div>
        <hr>
          <div class="receipt-section" style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div>
              <p><strong>Custo Peças:</strong> R$ <span id="rec-pecas">0,00</span> | <strong>Mão de Obra:</strong> R$ <span id="rec-mao-obra">0,00</span></p>
              <p class="receipt-total"><strong>VALOR TOTAL: R$ <span id="rec-total">0,00</span></strong></p>
              <div id="rec-lista-pagamentos" style="margin-top: 6px; font-size: 11px;"></div>
              <p style="margin-top: 4px;"><strong>Total Pago:</strong> R$ <span id="rec-valor-pago">0,00</span> | <strong>Saldo Restante:</strong> R$ <span id="rec-saldo-restante">0,00</span></p>
            </div>
            <!-- QR Code Pix no Recibo caso haja saldo restante -->
            <div id="rec-pix-box" style="display: none; text-align: center; border: 1px solid #ccc; padding: 6px;">
              <div id="rec-pix-qrcode"></div>
              <span style="font-size: 9px; display: block; margin-top: 3px;">Pague via Pix</span>
            </div>
          </div>
          <hr>
            <div class="receipt-warranty">
              <h4>TERMO DE GARANTIA LEGAL (90 DIAS)</h4>
              <p>Conforme o Art. 26 da Lei nº 8.078/1990 (CDC), este estabelecimento assegura garantia de 90 dias sobre as peças e serviços discriminados. Aparelhos entregues desligados não permitem testes prévios de periféricos na recepção. Danos por contato com líquidos, quedas ou intervenção de terceiros invalidam este termo.</p>
            </div>
            <div class="receipt-signatures">
              <div class="signature-line">Code & Fix - Técnico</div>
              <div class="signature-line">
                <img id="rec-signature-img" src="" alt="Assinatura Cliente" style="max-height: 45px; margin: 0 auto; display: none;">
                  <div id="rec-signature-blank" style="height: 45px;"></div>
                  <span>Assinatura do Cliente</span>
              </div>
            </div>
  </div>
</div>

<!-- RELATÓRIO GERAL DE OS PARA IMPRESSÃO -->
<div id="report-print-area" class="hidden">
  <div class="report-container">
    <div class="report-header">
      <h2>CODE & FIX - RELATÓRIO DE ORDENS DE SERVIÇO</h2>
      <p id="rep-periodo">Período: Todos os registros</p>
      <p style="font-size: 10px; margin-top: 4px;">Gerado em: <span id="rep-gerado-em"></span></p>
    </div>
    <table class="report-table">
      <thead>
      <tr>
        <th>OS</th>
        <th>Data</th>
        <th>Cliente</th>
        <th>Aparelho</th>
        <th>Status</th>
        <th>Pagamentos</th>
        <th style="text-align: right;">Total</th>
        <th style="text-align: right;">Pago</th>
        <th style="text-align: right;">Falta</th>
      </tr>
      </thead>
      <tbody id="rep-tabela-body"></tbody>
    </table>
    <div class="report-totals">
      <p>Qtd OS: <strong id="rep-total-qtd">0</strong></p>
      <p>Total Geral: <strong id="rep-total-geral">R$ 0,00</strong></p>
      <p>Total Recebido: <strong id="rep-total-pago">R$ 0,00</strong></p>
      <p>Saldo a Receber: <strong id="rep-total-falta">R$ 0,00</strong></p>
    </div>
  </div>
</div>

<script src="js/supabase-client.js"></script>
<script src="js/app.js"></script>
</body>
</html>