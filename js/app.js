/**
 * App - Controlador Central da Interface, Assinatura e Regras MEI
 */
let signaturePadInstance = null;
let fluxoChartInstance = null;

// Classe para gerenciar a assinatura na tela
class SignaturePad {
  constructor(canvasId, clearBtnId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.clearBtn = document.getElementById(clearBtnId);
    this.isDrawing = false;
    this.hasData = false;

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';

    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.start(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    window.addEventListener('mouseup', () => this.stop());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.start(e.touches[0]);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0]);
    }, { passive: false });

    window.addEventListener('touchend', () => this.stop());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  start(e) {
    this.isDrawing = true;
    const pos = this.getPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(e) {
    if (!this.isDrawing) return;
    const pos = this.getPos(e);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.hasData = true;
  }

  stop() { this.isDrawing = false; }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasData = false;
  }

  getDataURL() {
    return this.hasData ? this.canvas.toDataURL('image/png') : null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();

  signaturePadInstance = new SignaturePad('signature-pad', 'btn-clear-sig');
  const isCloud = DataService.init();

  // Verificar se há sessão ativa
  const logged = await DataService.checkSession();
  if (logged) {
    mostrarAppPrincipal(true);
  } else if (!isCloud) {
    mostrarAppPrincipal(false);
  }

  inicializarGrafico();
  configurarEventosUI();
});

function mostrarAppPrincipal(isCloud) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  atualizarIndicadorConexao(isCloud);
  carregarTudo();
}

function atualizarIndicadorConexao(isCloud) {
  const dot = document.getElementById('sync-indicator');
  const text = document.getElementById('sync-status-text');
  if (isCloud) {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
    text.textContent = 'Nuvem Conectada';
  } else {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
    text.textContent = 'LocalStorage';
  }
}

function configurarEventosUI() {
  // Login
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-senha').value;
    const res = await DataService.login(email, pass);
    if (res.success) {
      mostrarAppPrincipal(DataService.isCloud);
    } else {
      alert('Falha na autenticação: ' + res.message);
    }
  });

  // Modo offline
  document.getElementById('btn-offline-mode').addEventListener('click', () => {
    mostrarAppPrincipal(false);
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await DataService.logout();
    window.location.reload();
  });

  // Abas
  const tabs = [
    { btn: 'tab-btn-dashboard', view: 'view-dashboard' },
    { btn: 'tab-btn-os', view: 'view-os' },
    { btn: 'tab-btn-caixa', view: 'view-caixa' }
  ];
  tabs.forEach(t => {
    document.getElementById(t.btn).addEventListener('click', () => {
      tabs.forEach(o => {
        document.getElementById(o.btn).classList.remove('active-tab');
        document.getElementById(o.btn).classList.add('text-slate-400');
        document.getElementById(o.view).classList.add('hidden');
      });
      document.getElementById(t.btn).classList.add('active-tab');
      document.getElementById(t.btn).classList.remove('text-slate-400');
      document.getElementById(t.view).classList.remove('hidden');
    });
  });

  // Modais
  document.getElementById('btn-nova-os').addEventListener('click', () => {
    document.getElementById('form-os').reset();
    signaturePadInstance.clear();
    document.getElementById('os-custo-peca').value = '0.00';
    document.getElementById('os-mao-obra').value = '0.00';
    document.getElementById('os-valor-total').value = '0.00';
    document.getElementById('modal-os').classList.remove('hidden');
  });

  document.getElementById('btn-novo-lancamento').addEventListener('click', () => {
    document.getElementById('form-caixa').reset();
    document.getElementById('caixa-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-caixa').classList.remove('hidden');
  });

  const abrirModalSync = () => {
    const cfg = DataService.getConfig();
    document.getElementById('supabase-url').value = cfg.url;
    document.getElementById('supabase-key').value = cfg.key;
    document.getElementById('modal-sync').classList.remove('hidden');
  };
  document.getElementById('btn-sync-settings').addEventListener('click', abrirModalSync);
  document.getElementById('btn-open-sync-login').addEventListener('click', abrirModalSync);

  document.querySelectorAll('.btn-close-modal').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    });
  });

  // Totalizador da OS
  const calcTotal = () => {
    const p = parseFloat(document.getElementById('os-custo-peca').value) || 0;
    const m = parseFloat(document.getElementById('os-mao-obra').value) || 0;
    document.getElementById('os-valor-total').value = (p + m).toFixed(2);
  };
  document.getElementById('os-custo-peca').addEventListener('input', calcTotal);
  document.getElementById('os-mao-obra').addEventListener('input', calcTotal);

  // Submissão OS
  document.getElementById('form-os').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p = parseFloat(document.getElementById('os-custo-peca').value) || 0;
    const m = parseFloat(document.getElementById('os-mao-obra').value) || 0;

    const osData = {
      cliente: document.getElementById('os-cliente').value,
      telefone: document.getElementById('os-telefone').value.replace(/\D/g, ''),
      aparelho: document.getElementById('os-aparelho').value,
      status: document.getElementById('os-status').value,
      defeito: document.getElementById('os-defeito').value,
      laudo: document.getElementById('os-laudo').value,
      custo_peca: p,
      mao_obra: m,
      total: p + m,
      assinatura: signaturePadInstance.getDataURL()
    };

    await DataService.saveOS(osData);
    document.getElementById('modal-os').classList.add('hidden');
    await carregarTudo();
  });

  // Submissão Caixa
  document.getElementById('form-caixa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tx = {
      tipo: document.getElementById('caixa-tipo').value,
      categoria: document.getElementById('caixa-categoria').value,
      descricao: document.getElementById('caixa-descricao').value,
      data: document.getElementById('caixa-data').value,
      valor: parseFloat(document.getElementById('caixa-valor').value) || 0
    };
    await DataService.saveLancamento(tx);
    document.getElementById('modal-caixa').classList.add('hidden');
    await carregarTudo();
  });

  // Salvar Config Nuvem
  document.getElementById('form-supabase-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    DataService.saveConfig(
      document.getElementById('supabase-url').value,
      document.getElementById('supabase-key').value
    );
    document.getElementById('modal-sync').classList.add('hidden');
    window.location.reload();
  });

  // Limpar Nuvem
  document.getElementById('btn-clear-supabase').addEventListener('click', () => {
    DataService.clearConfig();
    document.getElementById('modal-sync').classList.add('hidden');
    window.location.reload();
  });

  // Exportar CSV
  document.getElementById('btn-exportar-csv').addEventListener('click', exportarCSV);
}

async function carregarTudo() {
  const [ordens, caixa] = await Promise.all([DataService.getOS(), DataService.getCaixa()]);
  renderizarTabelaOS(ordens);
  renderizarTabelaCaixa(caixa);
  processarPainelMEI(caixa, ordens);
}

function processarPainelMEI(caixa, ordens) {
  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  let fatMes = 0;
  let despMes = 0;
  let fatAno = 0;

  caixa.forEach(tx => {
    const d = new Date(tx.data);
    const v = parseFloat(tx.valor) || 0;
    if (d.getFullYear() === anoAtual) {
      if (tx.tipo === 'entrada') fatAno += v;
      if (d.getMonth() === mesAtual) {
        if (tx.tipo === 'entrada') fatMes += v;
        else despMes += v;
      }
    }
  });

  const lucroReal = fatMes - despMes;
  const isencao32 = fatMes * 0.32;

  document.getElementById('dash-faturamento').textContent = formatarMoeda(fatMes);
  document.getElementById('dash-despesas').textContent = formatarMoeda(despMes);
  document.getElementById('dash-lucro').textContent = formatarMoeda(lucroReal);
  document.getElementById('dash-isencao').textContent = formatarMoeda(isencao32);

  const percTeto = Math.min((fatAno / 81000) * 100, 100).toFixed(1);
  document.getElementById('mei-accumulated-text').textContent = `${formatarMoeda(fatAno)} / R$ 81.000,00 (${percTeto}%)`;
  document.getElementById('mei-progress-bar').style.width = `${percTeto}%`;

  document.getElementById('stat-em-analise').textContent = ordens.filter(o => o.status === 'Em Análise').length;
  document.getElementById('stat-aguardando').textContent = ordens.filter(o => o.status === 'Aguardando Peça').length;
  document.getElementById('stat-pronto').textContent = ordens.filter(o => o.status === 'Pronto para Retirada').length;
  document.getElementById('stat-finalizados').textContent = ordens.filter(o => o.status === 'Entregue / Concluído').length;

  atualizarGrafico(fatMes, despMes);
}

function renderizarTabelaOS(ordens) {
  const tbody = document.getElementById('tabela-os-body');
  tbody.innerHTML = '';
  if (ordens.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500">Nenhuma OS em bancada.</td></tr>`;
    return;
  }

  ordens.forEach((os, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition';
    const total = (parseFloat(os.custo_peca || 0) + parseFloat(os.mao_obra || 0)).toFixed(2);
    tr.innerHTML = `
      <td class="p-3.5 font-mono text-cyan-400">#${String(ordens.length - idx).padStart(3, '0')}</td>
      <td class="p-3.5 font-medium text-slate-200">${os.cliente}</td>
      <td class="p-3.5">${os.aparelho}</td>
      <td class="p-3.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold ${obterBadgeStatus(os.status)}">${os.status}</span></td>
      <td class="p-3.5 font-mono font-semibold">${formatarMoeda(total)}</td>
      <td class="p-3.5 text-right space-x-1">
        <button onclick="abrirWhatsAppOS('${encodeURIComponent(JSON.stringify(os))}')" class="p-1 hover:text-emerald-400"><i data-lucide="message-circle" class="w-4 h-4 inline"></i></button>
        <button onclick="imprimirOS('${encodeURIComponent(JSON.stringify(os))}', ${ordens.length - idx})" class="p-1 hover:text-cyan-400"><i data-lucide="printer" class="w-4 h-4 inline"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

function renderizarTabelaCaixa(caixa) {
  const tbody = document.getElementById('tabela-caixa-body');
  tbody.innerHTML = '';
  if (caixa.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500">Nenhum lançamento no caixa.</td></tr>`;
    return;
  }

  caixa.forEach(tx => {
    const tr = document.createElement('tr');
    const isEntrada = tx.tipo === 'entrada';
    tr.innerHTML = `
      <td class="p-3.5 font-mono text-slate-400">${formatarData(tx.data)}</td>
      <td class="p-3.5 font-semibold ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}">${isEntrada ? 'ENTRADA' : 'SAÍDA'}</td>
      <td class="p-3.5 text-slate-400">${tx.categoria}</td>
      <td class="p-3.5 text-slate-200">${tx.descricao}</td>
      <td class="p-3.5 text-right font-mono font-semibold ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}">
        ${isEntrada ? '+' : '-'} ${formatarMoeda(tx.valor)}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.abrirWhatsAppOS = function(json) {
  const os = JSON.parse(decodeURIComponent(json));
  const fone = os.telefone.startsWith('55') ? os.telefone : `55${os.telefone}`;
  const total = (parseFloat(os.custo_peca || 0) + parseFloat(os.mao_obra || 0)).toFixed(2);
  const msg = 
    `*CODE & FIX - Assistência Técnica*\n\n` +
    `Olá, *${os.cliente}*!\n` +
    `Status do seu aparelho (*${os.aparelho}*): *${os.status}*\n\n` +
    `*Diagnóstico:* ${os.laudo || 'Em análise'}\n` +
    `*Valor Total:* R$ ${total}\n\n` +
    `Garantia legal de 90 dias após a retirada. Qualquer dúvida estamos à disposição!`;
  window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`, '_blank');
};

window.imprimirOS = function(json, numero) {
  const os = JSON.parse(decodeURIComponent(json));
  document.getElementById('rec-id').textContent = String(numero).padStart(3, '0');
  document.getElementById('rec-cliente').textContent = os.cliente;
  document.getElementById('rec-telefone').textContent = os.telefone;
  document.getElementById('rec-aparelho').textContent = os.aparelho;
  document.getElementById('rec-defeito').textContent = os.defeito;
  document.getElementById('rec-laudo').textContent = os.laudo || 'Em análise técnica';
  document.getElementById('rec-pecas').textContent = parseFloat(os.custo_peca || 0).toFixed(2);
  document.getElementById('rec-mao-obra').textContent = parseFloat(os.mao_obra || 0).toFixed(2);
  document.getElementById('rec-total').textContent = (parseFloat(os.custo_peca || 0) + parseFloat(os.mao_obra || 0)).toFixed(2);

  const sigImg = document.getElementById('rec-signature-img');
  const sigBlank = document.getElementById('rec-signature-blank');
  if (os.assinatura) {
    sigImg.src = os.assinatura;
    sigImg.style.display = 'block';
    sigBlank.style.display = 'none';
  } else {
    sigImg.style.display = 'none';
    sigBlank.style.display = 'block';
  }

  window.print();
};

async function exportarCSV() {
  const caixa = await DataService.getCaixa();
  if (caixa.length === 0) return alert('Sem dados para exportar.');
  let csv = 'data:text/csv;charset=utf-8,Data;Tipo;Categoria;Descricao;Valor\n';
  caixa.forEach(r => { csv += `${r.data};${r.tipo};${r.categoria};"${r.descricao}";${r.valor}\n`; });
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csv));
  link.setAttribute('download', `code_and_fix_livro_caixa.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function inicializarGrafico() {
  const ctx = document.getElementById('chart-fluxo').getContext('2d');
  fluxoChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Mês Atual'],
      datasets: [
        { label: 'Entradas', data: [0], backgroundColor: '#34d399' },
        { label: 'Saídas', data: [0], backgroundColor: '#f87171' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { grid: { color: 'rgba(51, 65, 85, 0.3)' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { labels: { color: '#cbd5e1' } } }
    }
  });
}

function atualizarGrafico(e, s) {
  if (!fluxoChartInstance) return;
  fluxoChartInstance.data.datasets[0].data = [e];
  fluxoChartInstance.data.datasets[1].data = [s];
  fluxoChartInstance.update();
}

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(d) {
  if (!d) return '--/--/----';
  const [ano, mes, dia] = d.split('-');
  return `${dia}/${mes}/${ano}`;
}

function obterBadgeStatus(s) {
  switch (s) {
    case 'Em Análise': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    case 'Aguardando Peça': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
    case 'Pronto para Retirada': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    case 'Entregue / Concluído': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
    default: return 'bg-slate-700 text-slate-300';
  }
}