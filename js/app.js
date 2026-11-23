/**
 * App - Controlador Central com Gerador Oficial de QR Code Pix (BR Code / CRC16),
 * Envio Direto sem Bloqueio de Pop-up, Múltiplos Pagamentos e Checklist
 */
let signaturePadInstance = null;
let fluxoChartInstance = null;

let todasAsOrdens = [];
let ordensFiltradasAtual = [];
let pagamentosAtuaisOS = [];

let contextoPixAtual = {
  cliente: '',
  telefone: '',
  aparelho: '',
  numeroOS: '000'
};

// ==========================================================================
// GERADOR OFICIAL DE PAYLOAD PIX (EMV / BR CODE - BANCO CENTRAL)
// ==========================================================================
const PixGenerator = {
  getConfig() {
    return {
      chave: localStorage.getItem('codefix_pix_chave') || '',
      nome: localStorage.getItem('codefix_pix_nome') || 'CODE & FIX',
      cidade: localStorage.getItem('codefix_pix_cidade') || 'LIMEIRA'
    };
  },

  saveConfig(chave, nome, cidade) {
    localStorage.setItem('codefix_pix_chave', (chave || '').trim());
    localStorage.setItem('codefix_pix_nome', this.normalizarTexto(nome || 'CODE & FIX', 25));
    localStorage.setItem('codefix_pix_cidade', this.normalizarTexto(cidade || 'LIMEIRA', 15));
  },

  normalizarTexto(str, maxLen) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 &.-]/g, '')
        .toUpperCase()
        .trim()
        .slice(0, maxLen) || 'CODE FIX';
  },

  formatField(id, value) {
    const len = String(value.length).padStart(2, '0');
    return `${id}${len}${value}`;
  },

  crc16(payload) {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ polynomial) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  },

  gerarPayload(valor, txid = 'CODEFIX') {
    const cfg = this.getConfig();
    if (!cfg.chave) return null;

    const chaveLimpa = cfg.chave.trim();
    const nomeLimpo = this.normalizarTexto(cfg.nome, 25);
    const cidadeLimpa = this.normalizarTexto(cfg.cidade, 15);
    const txidLimpo = txid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 25) || '***';

    const gui = this.formatField('00', 'br.gov.bcb.pix');
    const keyField = this.formatField('01', chaveLimpa);
    const merchantAccount = this.formatField('26', gui + keyField);

    const mcc = this.formatField('52', '0000');
    const currency = this.formatField('53', '986');
    const valorNum = parseFloat(valor) || 0;
    const amount = valorNum > 0 ? this.formatField('54', valorNum.toFixed(2)) : '';
    const country = this.formatField('58', 'BR');
    const merchantName = this.formatField('59', nomeLimpo);
    const merchantCity = this.formatField('60', cidadeLimpa);
    const txidField = this.formatField('05', txidLimpo);
    const additionalData = this.formatField('62', txidField);

    const payloadSemCRC =
        this.formatField('00', '01') +
        merchantAccount +
        mcc +
        currency +
        amount +
        country +
        merchantName +
        merchantCity +
        additionalData +
        '6304';

    const crc = this.crc16(payloadSemCRC);
    return payloadSemCRC + crc;
  }
};

// ==========================================================================
// ASSINATURA DIGITAL
// ==========================================================================
class SignaturePad {
  constructor(canvasId, clearBtnId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.clearBtn = document.getElementById(clearBtnId);
    this.isDrawing = false;
    this.hasData = false;
    this.currentDataURL = null;

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

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

  stop() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.currentDataURL = this.canvas.toDataURL('image/png');
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasData = false;
    this.currentDataURL = null;
  }

  loadDataURL(dataUrl) {
    this.clear();
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      this.hasData = true;
      this.currentDataURL = dataUrl;
    };
    img.src = dataUrl;
  }

  getDataURL() {
    return this.hasData ? (this.currentDataURL || this.canvas.toDataURL('image/png')) : null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();

  configurarEventosUI();

  try {
    signaturePadInstance = new SignaturePad('signature-pad', 'btn-clear-sig');
    inicializarGrafico();
  } catch (err) {
    console.warn('Aviso ao iniciar componentes visuais:', err);
  }

  try {
    const isCloud = DataService.init();
    const logged = await DataService.checkSession();
    if (logged) {
      mostrarAppPrincipal(true);
    } else if (!isCloud) {
      mostrarAppPrincipal(false);
    }
  } catch (err) {
    console.error('Erro na verificação de sessão:', err);
  }
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

function obterDataHoraAtualInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
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

  // Filtros de OS
  document.getElementById('filtro-os-texto').addEventListener('input', aplicarFiltrosOS);
  document.getElementById('filtro-os-status').addEventListener('change', aplicarFiltrosOS);
  document.getElementById('filtro-os-data-inicio').addEventListener('change', aplicarFiltrosOS);
  document.getElementById('filtro-os-data-fim').addEventListener('change', aplicarFiltrosOS);

  document.getElementById('btn-limpar-filtros-os').addEventListener('click', () => {
    document.getElementById('filtro-os-texto').value = '';
    document.getElementById('filtro-os-status').value = '';
    document.getElementById('filtro-os-data-inicio').value = '';
    document.getElementById('filtro-os-data-fim').value = '';
    aplicarFiltrosOS();
  });

  // Relatórios OS
  document.getElementById('btn-exportar-os-csv').addEventListener('click', exportarRelatorioOSCSV);
  document.getElementById('btn-imprimir-relatorio-os').addEventListener('click', imprimirRelatorioOS);

  // Atalho Checklist Desligado
  document.getElementById('chk-aparelho-desligado').addEventListener('change', (e) => {
    const isDesligado = e.target.checked;
    const itens = ['chk-tela', 'chk-cameras', 'chk-botoes', 'chk-wifi', 'chk-carga', 'chk-audio', 'chk-biometria'];
    itens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = isDesligado ? 'Não Testado' : 'OK';
    });
  });

  // Modal Nova OS
  document.getElementById('btn-nova-os').addEventListener('click', () => {
    document.getElementById('form-os').reset();
    document.getElementById('os-id').value = '';
    if (signaturePadInstance) signaturePadInstance.clear();
    document.getElementById('os-custo-peca').value = '0.00';
    document.getElementById('os-mao-obra').value = '0.00';
    document.getElementById('os-valor-total').value = '0.00';

    pagamentosAtuaisOS = [];
    resetarFormParcela();
    renderizarListaPagamentosModal();
    calcularTotaisOS();

    resetarChecklistPadrao();
    document.getElementById('modal-os-title').textContent = 'Nova Ordem de Serviço';
    document.getElementById('modal-os').classList.remove('hidden');
  });

  // Botão "Cobrar via Pix" dentro do Modal da OS
  document.getElementById('btn-gerar-pix-modal').addEventListener('click', () => {
    const peca = parseFloat(document.getElementById('os-custo-peca').value) || 0;
    const mo = parseFloat(document.getElementById('os-mao-obra').value) || 0;
    const total = peca + mo;
    const pago = pagamentosAtuaisOS.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
    const falta = Math.max(total - pago, 0);

    abrirModalCobrancaPix({
      cliente: document.getElementById('os-cliente').value || 'Cliente',
      telefone: document.getElementById('os-telefone').value || '',
      aparelho: document.getElementById('os-aparelho').value || 'Serviço',
      numeroOS: 'OS',
      valorSugerido: falta > 0 ? falta : total
    });
  });

  // Eventos do Modal Pix
  document.getElementById('btn-fechar-modal-pix').addEventListener('click', () => {
    document.getElementById('modal-pix').classList.add('hidden');
  });

  document.getElementById('pix-modal-valor').addEventListener('input', (e) => {
    atualizarQRCodePixModal(parseFloat(e.target.value) || 0);
  });

  document.getElementById('btn-copiar-pix').addEventListener('click', () => {
    const input = document.getElementById('pix-copia-cola-texto');
    if (!input.value) return;
    navigator.clipboard.writeText(input.value);
    const btn = document.getElementById('btn-copiar-pix');
    btn.textContent = 'Copiado!';
    setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
  });

  // Botão 1 do Modal Pix: Envia apenas a mensagem explicativa (clique síncrono)
  document.getElementById('btn-enviar-pix-resumo').addEventListener('click', () => {
    const valorCobrado = parseFloat(document.getElementById('pix-modal-valor').value) || 0;
    const foneLimpo = contextoPixAtual.telefone.replace(/\D/g, '');
    const fone = foneLimpo.startsWith('55') ? foneLimpo : `55${foneLimpo}`;

    const msgIntro =
        `*CODE & FIX - Pagamento via Pix*\n\n` +
        `Olá, *${contextoPixAtual.cliente}*!\n` +
        `Segue o código *Pix Copia e Cola* referente ao serviço (*${contextoPixAtual.aparelho}* - ${contextoPixAtual.numeroOS}):\n\n` +
        `*Valor:* ${formatarMoeda(valorCobrado)}\n\n` +
        `Copie o código da mensagem seguinte e cole na área *Pix Copia e Cola* do aplicativo do seu banco:`;

    window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msgIntro)}`, '_blank');
  });

  // Botão 2 do Modal Pix: Envia apenas o código Pix isolado (clique síncrono, sem bloqueio)
  document.getElementById('btn-enviar-pix-whatsapp').addEventListener('click', () => {
    const codigoPix = document.getElementById('pix-copia-cola-texto').value;
    if (!codigoPix) return;

    const foneLimpo = contextoPixAtual.telefone.replace(/\D/g, '');
    const fone = foneLimpo.startsWith('55') ? foneLimpo : `55${foneLimpo}`;

    window.open(`https://wa.me/${fone}?text=${encodeURIComponent(codigoPix)}`, '_blank');
  });

  // Adicionar ou Salvar Edição de uma Parcela de Pagamento dentro da OS
  document.getElementById('btn-salvar-parcela').addEventListener('click', () => {
    const dataHora = document.getElementById('pagto-data-hora').value || obterDataHoraAtualInput();
    const forma = document.getElementById('pagto-forma').value;
    const valor = parseFloat(document.getElementById('pagto-valor').value) || 0;
    const editIdx = parseInt(document.getElementById('pagto-edit-index').value, 10);

    if (valor <= 0) {
      alert('Informe um valor válido maior que R$ 0,00.');
      return;
    }

    if (editIdx >= 0 && pagamentosAtuaisOS[editIdx]) {
      pagamentosAtuaisOS[editIdx] = {
        ...pagamentosAtuaisOS[editIdx],
        data_hora: dataHora,
        forma: forma,
        valor: valor
      };
    } else {
      pagamentosAtuaisOS.push({
        id: Date.now().toString(),
        data_hora: dataHora,
        forma: forma,
        valor: valor,
        lancado_caixa: false
      });
    }

    resetarFormParcela();
    renderizarListaPagamentosModal();
    calcularTotaisOS();
  });

  document.getElementById('btn-cancelar-edicao-parcela').addEventListener('click', () => {
    resetarFormParcela();
  });

  // Modal Novo Lançamento Caixa
  document.getElementById('btn-novo-lancamento').addEventListener('click', () => {
    document.getElementById('form-caixa').reset();
    document.getElementById('caixa-id').value = '';
    document.getElementById('caixa-data').value = new Date().toISOString().split('T')[0];
    const tituloCaixa = document.querySelector('#modal-caixa h3');
    if (tituloCaixa) tituloCaixa.textContent = 'Novo Lançamento Financeiro';
    document.getElementById('modal-caixa').classList.remove('hidden');
  });

  // Modais Configuração Nuvem & Pix
  const abrirModalSync = () => {
    const cfg = DataService.getConfig();
    document.getElementById('supabase-url').value = cfg.url;
    document.getElementById('supabase-key').value = cfg.key;

    const pixCfg = PixGenerator.getConfig();
    document.getElementById('config-pix-chave').value = pixCfg.chave;
    document.getElementById('config-pix-nome').value = pixCfg.nome;
    document.getElementById('config-pix-cidade').value = pixCfg.cidade;

    document.getElementById('modal-sync').classList.remove('hidden');
  };
  document.getElementById('btn-sync-settings').addEventListener('click', abrirModalSync);
  document.getElementById('btn-open-sync-login').addEventListener('click', abrirModalSync);

  document.querySelectorAll('.btn-close-modal').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    });
  });

  // Recalcular totais ao alterar peças ou mão de obra
  document.getElementById('os-custo-peca').addEventListener('input', calcularTotaisOS);
  document.getElementById('os-mao-obra').addEventListener('input', calcularTotaisOS);

  // Submissão OS
  document.getElementById('form-os').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p = parseFloat(document.getElementById('os-custo-peca').value) || 0;
    const m = parseFloat(document.getElementById('os-mao-obra').value) || 0;
    const total = p + m;

    const totalPago = pagamentosAtuaisOS.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
    const restante = Math.max(total - totalPago, 0);
    const formasResumo = pagamentosAtuaisOS.length > 0
        ? [...new Set(pagamentosAtuaisOS.map(item => item.forma))].join(' + ')
        : 'Pendente';

    const idExistente = document.getElementById('os-id').value;
    const assinaturaData = signaturePadInstance ? signaturePadInstance.getDataURL() : null;

    const osData = {
      cliente: document.getElementById('os-cliente').value,
      telefone: document.getElementById('os-telefone').value.replace(/\D/g, ''),
      aparelho: document.getElementById('os-aparelho').value,
      status: document.getElementById('os-status').value,
      defeito: document.getElementById('os-defeito').value,
      laudo: document.getElementById('os-laudo').value,
      custo_peca: p,
      mao_obra: m,
      total: total,
      valor_pago: totalPago,
      forma_pagamento: formasResumo,
      saldo_restante: restante,
      pagamentos: pagamentosAtuaisOS,
      checklist: capturarChecklist(),
      assinatura: assinaturaData
    };

    if (idExistente) {
      osData.id = idExistente;
    }

    await DataService.saveOS(osData);
    document.getElementById('modal-os').classList.add('hidden');
    await carregarTudo();
  });

  // Submissão Caixa
  document.getElementById('form-caixa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idExistente = document.getElementById('caixa-id').value;

    const tx = {
      tipo: document.getElementById('caixa-tipo').value,
      categoria: document.getElementById('caixa-categoria').value,
      descricao: document.getElementById('caixa-descricao').value,
      data: document.getElementById('caixa-data').value,
      valor: parseFloat(document.getElementById('caixa-valor').value) || 0
    };

    if (idExistente) {
      tx.id = idExistente;
    }

    await DataService.saveLancamento(tx);
    document.getElementById('modal-caixa').classList.add('hidden');
    await carregarTudo();
  });

  // Salvar Config Nuvem & Pix
  document.getElementById('form-supabase-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    PixGenerator.saveConfig(
        document.getElementById('config-pix-chave').value,
        document.getElementById('config-pix-nome').value,
        document.getElementById('config-pix-cidade').value
    );

    const url = document.getElementById('supabase-url').value;
    const key = document.getElementById('supabase-key').value;
    if (url && key) {
      DataService.saveConfig(url, key);
    }

    document.getElementById('modal-sync').classList.add('hidden');
    window.location.reload();
  });

  document.getElementById('btn-clear-supabase').addEventListener('click', () => {
    DataService.clearConfig();
    document.getElementById('modal-sync').classList.add('hidden');
    window.location.reload();
  });

  document.getElementById('btn-exportar-csv').addEventListener('click', exportarCSV);
}

// ==========================================================================
// CONTROLE DO MODAL DE COBRANÇA PIX
// ==========================================================================
function abrirModalCobrancaPix({ cliente, telefone, aparelho, numeroOS, valorSugerido }) {
  const pixCfg = PixGenerator.getConfig();
  if (!pixCfg.chave) {
    alert('Configure primeiro sua Chave Pix clicando no botão de status no topo da tela (Configurações da Nuvem & Recebimento Pix).');
    document.getElementById('btn-sync-settings').click();
    return;
  }

  contextoPixAtual = { cliente, telefone, aparelho, numeroOS };

  document.getElementById('pix-modal-cliente').textContent = cliente;
  document.getElementById('pix-modal-ref').textContent = `${numeroOS} (${aparelho})`;
  document.getElementById('pix-modal-valor').value = parseFloat(valorSugerido || 0).toFixed(2);

  atualizarQRCodePixModal(valorSugerido);
  document.getElementById('modal-pix').classList.remove('hidden');
}

function atualizarQRCodePixModal(valor) {
  const txid = contextoPixAtual.numeroOS.replace(/[^a-zA-Z0-9]/g, '') || 'CODEFIX';
  const payload = PixGenerator.gerarPayload(valor, txid);
  const container = document.getElementById('pix-qrcode-canvas');
  container.innerHTML = '';

  if (payload && window.QRCode) {
    new QRCode(container, {
      text: payload,
      width: 190,
      height: 190,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    document.getElementById('pix-copia-cola-texto').value = payload;
  }
}

window.cobrarPixDaTabela = function(json) {
  const os = JSON.parse(decodeURIComponent(json));
  const total = parseFloat(os.custo_peca || 0) + parseFloat(os.mao_obra || 0);
  const pgts = extrairPagamentosDaOS(os);
  const pago = pgts.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
  const falta = Math.max(total - pago, 0);

  abrirModalCobrancaPix({
    cliente: os.cliente,
    telefone: os.telefone,
    aparelho: os.aparelho,
    numeroOS: `OS${String(os.numero_sequencial).padStart(3, '0')}`,
    valorSugerido: falta > 0 ? falta : total
  });
};

// ==========================================================================
// GERENCIAMENTO DE MÚLTIPLOS PAGAMENTOS NA OS
// ==========================================================================
function resetarFormParcela() {
  document.getElementById('pagto-edit-index').value = '-1';
  document.getElementById('pagto-data-hora').value = obterDataHoraAtualInput();
  document.getElementById('pagto-forma').value = 'Pix';
  document.getElementById('pagto-valor').value = '';
  document.getElementById('btn-salvar-parcela').textContent = '+ Add';
  document.getElementById('btn-cancelar-edicao-parcela').classList.add('hidden');
}

function calcularTotaisOS() {
  const peca = parseFloat(document.getElementById('os-custo-peca').value) || 0;
  const mo = parseFloat(document.getElementById('os-mao-obra').value) || 0;
  const total = peca + mo;

  const totalPago = pagamentosAtuaisOS.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
  const restante = Math.max(total - totalPago, 0);

  document.getElementById('os-valor-total').value = total.toFixed(2);
  document.getElementById('os-resumo-pago').textContent = formatarMoeda(totalPago);
  document.getElementById('os-resumo-falta').textContent = formatarMoeda(restante);
}

function renderizarListaPagamentosModal() {
  const tbody = document.getElementById('lista-pagamentos-os-body');
  tbody.innerHTML = '';

  if (pagamentosAtuaisOS.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-3 text-center text-slate-500">Nenhum pagamento registrado nesta OS ainda.</td></tr>`;
    return;
  }

  pagamentosAtuaisOS.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40';

    const dataFormatada = formatarDataHoraCurta(p.data_hora);
    const statusCaixaHTML = p.lancado_caixa
        ? `<span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-semibold">✓ No Caixa</span>`
        : `<button type="button" onclick="enviarParcelaParaCaixa(${idx})" class="px-2 py-0.5 rounded bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 text-[9px] font-semibold transition">Lançar no Caixa</button>`;

    tr.innerHTML = `
      <td class="py-1.5 px-2 font-mono text-slate-300 text-[10px]">${dataFormatada}</td>
      <td class="py-1.5 px-2 font-medium text-slate-200">${p.forma}</td>
      <td class="py-1.5 px-2 font-mono text-emerald-400 font-semibold">${formatarMoeda(p.valor)}</td>
      <td class="py-1.5 px-2 text-center">${statusCaixaHTML}</td>
      <td class="py-1.5 px-2 text-right space-x-1">
        <button type="button" onclick="editarParcelaOS(${idx})" title="Editar Pagamento" class="p-0.5 text-slate-400 hover:text-cyan-400">
          <i data-lucide="edit-2" class="w-3.5 h-3.5 inline"></i>
        </button>
        <button type="button" onclick="removerParcelaOS(${idx})" title="Remover Pagamento" class="p-0.5 text-slate-400 hover:text-rose-400">
          <i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

window.editarParcelaOS = function(idx) {
  const p = pagamentosAtuaisOS[idx];
  if (!p) return;

  document.getElementById('pagto-edit-index').value = idx;
  document.getElementById('pagto-data-hora').value = p.data_hora || obterDataHoraAtualInput();
  document.getElementById('pagto-forma').value = p.forma;
  document.getElementById('pagto-valor').value = parseFloat(p.valor).toFixed(2);

  document.getElementById('btn-salvar-parcela').textContent = 'Salvar';
  document.getElementById('btn-cancelar-edicao-parcela').classList.remove('hidden');
};

window.removerParcelaOS = function(idx) {
  if (confirm('Deseja remover este registro de pagamento da OS?')) {
    pagamentosAtuaisOS.splice(idx, 1);
    resetarFormParcela();
    renderizarListaPagamentosModal();
    calcularTotaisOS();
  }
};

window.enviarParcelaParaCaixa = async function(idx) {
  const p = pagamentosAtuaisOS[idx];
  if (!p || p.lancado_caixa) return;

  const cliente = document.getElementById('os-cliente').value || 'Cliente';
  const aparelho = document.getElementById('os-aparelho').value || 'Aparelho';
  const dataApenas = (p.data_hora || new Date().toISOString()).split('T')[0];

  if (confirm(`Deseja lançar ${formatarMoeda(p.valor)} (${p.forma}) no Livro Caixa agora?`)) {
    const tx = {
      tipo: 'entrada',
      categoria: 'Serviço de Bancada',
      descricao: `Pagto OS (${p.forma}) - ${cliente} (${aparelho})`,
      data: dataApenas,
      valor: parseFloat(p.valor)
    };

    await DataService.saveLancamento(tx);
    pagamentosAtuaisOS[idx].lancado_caixa = true;

    const idOS = document.getElementById('os-id').value;
    if (idOS) {
      await DataService.saveOS({ id: idOS, pagamentos: pagamentosAtuaisOS });
    }

    renderizarListaPagamentosModal();
    await carregarTudo();
  }
};

function extrairPagamentosDaOS(os) {
  if (Array.isArray(os.pagamentos) && os.pagamentos.length > 0) {
    return JSON.parse(JSON.stringify(os.pagamentos));
  }
  const valorAntigo = parseFloat(os.valor_pago || 0);
  if (valorAntigo > 0) {
    return [{
      id: 'legacy-1',
      data_hora: os.created_at ? os.created_at.slice(0, 16) : obterDataHoraAtualInput(),
      forma: os.forma_pagamento || 'Pix',
      valor: valorAntigo,
      lancado_caixa: false
    }];
  }
  return [];
}

// ==========================================================================
// FUNÇÕES DO CHECKLIST DE ENTRADA
// ==========================================================================
function resetarChecklistPadrao() {
  document.getElementById('chk-aparelho-desligado').checked = false;
  document.getElementById('chk-tela').value = 'OK';
  document.getElementById('chk-cameras').value = 'OK';
  document.getElementById('chk-botoes').value = 'OK';
  document.getElementById('chk-wifi').value = 'OK';
  document.getElementById('chk-carga').value = 'OK';
  document.getElementById('chk-audio').value = 'OK';
  document.getElementById('chk-biometria').value = 'OK';
  document.getElementById('chk-carcaca').value = 'Intacta';
}

function capturarChecklist() {
  return {
    desligado: document.getElementById('chk-aparelho-desligado').checked,
    tela: document.getElementById('chk-tela').value,
    cameras: document.getElementById('chk-cameras').value,
    botoes: document.getElementById('chk-botoes').value,
    wifi: document.getElementById('chk-wifi').value,
    carga: document.getElementById('chk-carga').value,
    audio: document.getElementById('chk-audio').value,
    biometria: document.getElementById('chk-biometria').value,
    carcaca: document.getElementById('chk-carcaca').value
  };
}

function preencherChecklistNoModal(chk) {
  resetarChecklistPadrao();
  if (!chk) return;
  document.getElementById('chk-aparelho-desligado').checked = !!chk.desligado;
  if (chk.tela) document.getElementById('chk-tela').value = chk.tela;
  if (chk.cameras) document.getElementById('chk-cameras').value = chk.cameras;
  if (chk.botoes) document.getElementById('chk-botoes').value = chk.botoes;
  if (chk.wifi) document.getElementById('chk-wifi').value = chk.wifi;
  if (chk.carga) document.getElementById('chk-carga').value = chk.carga;
  if (chk.audio) document.getElementById('chk-audio').value = chk.audio;
  if (chk.biometria) document.getElementById('chk-biometria').value = chk.biometria;
  if (chk.carcaca) document.getElementById('chk-carcaca').value = chk.carcaca;
}

function formatarChecklistTexto(chk) {
  if (!chk || Object.keys(chk).length === 0) return 'Não preenchido';
  if (chk.desligado) {
    return `Aparelho entrou desligado/sem imagem (periféricos não testados). Carcaça: ${chk.carcaca || 'Intacta'}.`;
  }
  return `Tela: ${chk.tela} | Câmeras: ${chk.cameras} | Botões: ${chk.botoes} | Wi-Fi: ${chk.wifi} | Carga: ${chk.carga} | Áudio: ${chk.audio} | Biometria: ${chk.biometria} | Carcaça: ${chk.carcaca}`;
}

async function carregarTudo() {
  const [ordens, caixa] = await Promise.all([DataService.getOS(), DataService.getCaixa()]);

  todasAsOrdens = ordens.map((os, index) => ({
    ...os,
    numero_sequencial: ordens.length - index
  }));

  aplicarFiltrosOS();
  renderizarTabelaCaixa(caixa);
  processarPainelMEI(caixa, todasAsOrdens);
}

// ==========================================================================
// FILTROS E RELATÓRIOS DAS ORDENS DE SERVIÇO
// ==========================================================================
function aplicarFiltrosOS() {
  const termo = document.getElementById('filtro-os-texto').value.toLowerCase().trim();
  const statusFiltro = document.getElementById('filtro-os-status').value;
  const dataInicio = document.getElementById('filtro-os-data-inicio').value;
  const dataFim = document.getElementById('filtro-os-data-fim').value;

  ordensFiltradasAtual = todasAsOrdens.filter(os => {
    const matchTexto = !termo ||
        (os.cliente && os.cliente.toLowerCase().includes(termo)) ||
        (os.aparelho && os.aparelho.toLowerCase().includes(termo)) ||
        (os.telefone && os.telefone.includes(termo));

    const matchStatus = !statusFiltro || os.status === statusFiltro;

    let matchData = true;
    if (os.created_at) {
      const dataOS = os.created_at.split('T')[0];
      if (dataInicio && dataOS < dataInicio) matchData = false;
      if (dataFim && dataOS > dataFim) matchData = false;
    }

    return matchTexto && matchStatus && matchData;
  });

  renderizarTabelaOS(ordensFiltradasAtual);
  atualizarResumoFiltroOS(ordensFiltradasAtual);
}

function atualizarResumoFiltroOS(lista) {
  let somaTotal = 0;
  let somaPago = 0;
  let somaFalta = 0;

  lista.forEach(os => {
    const tot = parseFloat(os.custo_peca || 0) + parseFloat(os.mao_obra || 0);
    const pgts = extrairPagamentosDaOS(os);
    const pg = pgts.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
    const flt = Math.max(tot - pg, 0);

    somaTotal += tot;
    somaPago += pg;
    somaFalta += flt;
  });

  document.getElementById('os-filtro-qtd').textContent = lista.length;
  document.getElementById('os-filtro-total').textContent = formatarMoeda(somaTotal);
  document.getElementById('os-filtro-pago').textContent = formatarMoeda(somaPago);
  document.getElementById('os-filtro-falta').textContent = formatarMoeda(somaFalta);
}

function exportarRelatorioOSCSV() {
  if (ordensFiltradasAtual.length === 0) {
    alert('Nenhuma Ordem de Serviço filtrada para gerar relatório.');
    return;
  }

  let csv = 'data:text/csv;charset=utf-8,OS;Data;Cliente;Telefone;Aparelho;Status;Detalhe_Pagamentos;Total;Valor_Pago;Saldo_Restante\n';
  ordensFiltradasAtual.forEach(os => {
    const dataFmt = formatarDataHoraISO(os.created_at);
    const total = (parseFloat(os.custo_peca || 0) + parseFloat(os.mao_obra || 0)).toFixed(2);
    const pgts = extrairPagamentosDaOS(os);
    const pago = pgts.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0).toFixed(2);
    const falta = Math.max(total - pago, 0).toFixed(2);

    const detalhePg = pgts.length > 0
        ? pgts.map(p => `${formatarDataHoraCurta(p.data_hora)} - ${p.forma}: R$${parseFloat(p.valor).toFixed(2)}`).join(' | ')
        : 'Pendente';

    csv += `#${String(os.numero_sequencial).padStart(3, '0')};${dataFmt};"${os.cliente}";${os.telefone};"${os.aparelho}";"${os.status}";"${detalhePg}";${total};${pago};${falta}\n`;
  });

  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csv));
  link.setAttribute('download', `relatorio_os_code_and_fix_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function imprimirRelatorioOS() {
  if (ordensFiltradasAtual.length === 0) {
    alert('Nenhuma Ordem de Serviço na lista para imprimir relatório.');
    return;
  }

  const tbody = document.getElementById('rep-tabela-body');
  tbody.innerHTML = '';

  let somaGeral = 0;
  let somaPago = 0;
  let somaFalta = 0;

  ordensFiltradasAtual.forEach(os => {
    const tot = parseFloat(os.custo_peca || 0) + parseFloat(os.mao_obra || 0);
    const pgts = extrairPagamentosDaOS(os);
    const pg = pgts.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
    const flt = Math.max(tot - pg, 0);

    const formasResumo = pgts.length > 0
        ? pgts.map(p => `${p.forma} (${formatarMoeda(p.valor)})`).join(', ')
        : 'Pendente';

    somaGeral += tot;
    somaPago += pg;
    somaFalta += flt;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${String(os.numero_sequencial).padStart(3, '0')}</td>
      <td>${formatarDataHoraISO(os.created_at)}</td>
      <td>${os.cliente}</td>
      <td>${os.aparelho}</td>
      <td>${os.status}</td>
      <td>${formasResumo}</td>
      <td style="text-align: right;">${formatarMoeda(tot)}</td>
      <td style="text-align: right;">${formatarMoeda(pg)}</td>
      <td style="text-align: right;"><strong>${formatarMoeda(flt)}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  const dIni = document.getElementById('filtro-os-data-inicio').value;
  const dFim = document.getElementById('filtro-os-data-fim').value;
  const st = document.getElementById('filtro-os-status').value;

  let textoPeriodo = 'Período: Todos os registros';
  if (dIni || dFim) {
    textoPeriodo = `Período: ${dIni ? formatarData(dIni) : 'Início'} até ${dFim ? formatarData(dFim) : 'Hoje'}`;
  }
  if (st) textoPeriodo += ` | Status: ${st}`;

  document.getElementById('rep-periodo').textContent = textoPeriodo;
  document.getElementById('rep-gerado-em').textContent = new Date().toLocaleString('pt-BR');
  document.getElementById('rep-total-qtd').textContent = ordensFiltradasAtual.length;
  document.getElementById('rep-total-geral').textContent = formatarMoeda(somaGeral);
  document.getElementById('rep-total-pago').textContent = formatarMoeda(somaPago);
  document.getElementById('rep-total-falta').textContent = formatarMoeda(somaFalta);

  document.body.classList.remove('printing-receipt');
  document.body.classList.add('printing-report');
  window.print();
}

// ==========================================================================
// DASHBOARD & TABELAS
// ==========================================================================
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
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-500">Nenhuma OS encontrada com os filtros aplicados.</td></tr>`;
    return;
  }

  ordens.forEach(os => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition';
    const total = parseFloat(os.custo_peca || 0) + parseFloat(os.mao_obra || 0);
    const pgts = extrairPagamentosDaOS(os);
    const pago = pgts.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
    const falta = Math.max(total - pago, 0);
    const dataAbertura = formatarDataHoraISO(os.created_at);

    let detalheParcelas = '';
    if (pgts.length > 0) {
      detalheParcelas = `<div class="text-[10px] text-slate-400 mt-1 space-y-0.5">` +
          pgts.map(p => `<div>• ${p.forma}: ${formatarMoeda(p.valor)} <span class="text-slate-500">(${formatarDataHoraCurta(p.data_hora)})</span></div>`).join('') +
          `</div>`;
    }

    let badgeFinanceiro = '';
    if (total === 0) {
      badgeFinanceiro = `<span class="text-[10px] text-slate-500">Orçamento R$ 0,00</span>`;
    } else if (falta <= 0) {
      badgeFinanceiro = `<span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">Quitado</span>`;
    } else if (pago > 0) {
      badgeFinanceiro = `<span class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">Falta ${formatarMoeda(falta)}</span>`;
    } else {
      badgeFinanceiro = `<span class="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">Pendente</span>`;
    }

    tr.innerHTML = `
      <td class="p-3.5 font-mono text-cyan-400">#${String(os.numero_sequencial).padStart(3, '0')}</td>
      <td class="p-3.5 font-mono text-slate-400 text-[11px]">${dataAbertura}</td>
      <td class="p-3.5 font-medium text-slate-200">${os.cliente}</td>
      <td class="p-3.5">${os.aparelho}</td>
      <td class="p-3.5">
        <select onchange="atualizarStatusRapido('${os.id}', this.value)" class="bg-slate-900 border border-slate-700 text-[11px] font-semibold rounded px-2 py-1 outline-none cursor-pointer ${obterCorTextoStatus(os.status)}">
          <option value="Em Análise" ${os.status === 'Em Análise' ? 'selected' : ''}>Em Análise</option>
          <option value="Aguardando Aprovação" ${os.status === 'Aguardando Aprovação' ? 'selected' : ''}>Aguardando Aprovação</option>
          <option value="Aguardando Peça" ${os.status === 'Aguardando Peça' ? 'selected' : ''}>Aguardando Peça</option>
          <option value="Pronto para Retirada" ${os.status === 'Pronto para Retirada' ? 'selected' : ''}>Pronto para Retirada</option>
          <option value="Entregue / Concluído" ${os.status === 'Entregue / Concluído' ? 'selected' : ''}>Entregue / Concluído</option>
        </select>
      </td>
      <td class="p-3.5">
        <div class="flex items-center gap-2">
          <span class="font-mono font-semibold text-slate-100">${formatarMoeda(total)}</span>
          ${badgeFinanceiro}
        </div>
        ${detalheParcelas}
      </td>
      <td class="p-3.5 text-right space-x-1">
        <button onclick="cobrarPixDaTabela('${encodeURIComponent(JSON.stringify(os))}')" title="Gerar QR Code Pix" class="p-1 text-teal-400 hover:text-teal-300"><i data-lucide="qr-code" class="w-4 h-4 inline"></i></button>
        <button onclick="editarOS('${encodeURIComponent(JSON.stringify(os))}')" title="Editar OS / Lançar Pagamentos" class="p-1 hover:text-cyan-400"><i data-lucide="edit-3" class="w-4 h-4 inline"></i></button>
        <button onclick="abrirWhatsAppOS('${encodeURIComponent(JSON.stringify(os))}')" title="Notificar WhatsApp" class="p-1 hover:text-emerald-400"><i data-lucide="message-circle" class="w-4 h-4 inline"></i></button>
        <button onclick="imprimirOS('${encodeURIComponent(JSON.stringify(os))}', ${os.numero_sequencial})" title="Imprimir Recibo" class="p-1 hover:text-slate-300"><i data-lucide="printer" class="w-4 h-4 inline"></i></button>
        <button onclick="excluirOS('${os.id}')" title="Excluir OS" class="p-1 hover:text-rose-400"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

window.editarOS = function(json) {
  const os = JSON.parse(decodeURIComponent(json));
  const peca = parseFloat(os.custo_peca || 0);
  const mo = parseFloat(os.mao_obra || 0);

  document.getElementById('os-id').value = os.id || '';
  document.getElementById('os-cliente').value = os.cliente || '';
  document.getElementById('os-telefone').value = os.telefone || '';
  document.getElementById('os-aparelho').value = os.aparelho || '';
  document.getElementById('os-status').value = os.status || 'Em Análise';
  document.getElementById('os-defeito').value = os.defeito || '';
  document.getElementById('os-laudo').value = os.laudo || '';
  document.getElementById('os-custo-peca').value = peca.toFixed(2);
  document.getElementById('os-mao-obra').value = mo.toFixed(2);

  pagamentosAtuaisOS = extrairPagamentosDaOS(os);
  resetarFormParcela();
  renderizarListaPagamentosModal();
  calcularTotaisOS();

  preencherChecklistNoModal(os.checklist);

  if (signaturePadInstance) {
    if (os.assinatura) {
      signaturePadInstance.loadDataURL(os.assinatura);
    } else {
      signaturePadInstance.clear();
    }
  }

  document.getElementById('modal-os-title').textContent = 'Editar Ordem de Serviço';
  document.getElementById('modal-os').classList.remove('hidden');
};

window.excluirOS = async function(id) {
  if (confirm('Tem certeza de que deseja apagar permanentemente esta Ordem de Serviço?')) {
    await DataService.deleteOS(id);
    await carregarTudo();
  }
};

window.atualizarStatusRapido = async function(id, novoStatus) {
  await DataService.saveOS({ id: id, status: novoStatus });
  await carregarTudo();
};

function renderizarTabelaCaixa(caixa) {
  const tbody = document.getElementById('tabela-caixa-body');
  tbody.innerHTML = '';
  if (caixa.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500">Nenhum lançamento no caixa.</td></tr>`;
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
      <td class="p-3.5 text-right space-x-1">
        <button onclick="editarCaixa('${encodeURIComponent(JSON.stringify(tx))}')" title="Editar Lançamento" class="p-1 hover:text-cyan-400"><i data-lucide="edit-3" class="w-4 h-4 inline"></i></button>
        <button onclick="excluirCaixa('${tx.id}')" title="Excluir Lançamento" class="p-1 hover:text-rose-400"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

window.editarCaixa = function(json) {
  const tx = JSON.parse(decodeURIComponent(json));
  document.getElementById('caixa-id').value = tx.id || '';
  document.getElementById('caixa-tipo').value = tx.tipo || 'entrada';
  document.getElementById('caixa-categoria').value = tx.categoria || 'Serviço de Bancada';
  document.getElementById('caixa-descricao').value = tx.descricao || '';
  document.getElementById('caixa-data').value = tx.data || '';
  document.getElementById('caixa-valor').value = parseFloat(tx.valor || 0).toFixed(2);

  const tituloCaixa = document.querySelector('#modal-caixa h3');
  if (tituloCaixa) tituloCaixa.textContent = 'Editar Lançamento Financeiro';

  document.getElementById('modal-caixa').classList.remove('hidden');
};

window.excluirCaixa = async function(id) {
  if (confirm('Tem certeza de que deseja apagar este lançamento financeiro?')) {
    await DataService.deleteLancamento(id);
    await carregarTudo();
  }
};

// Notificação geral da OS via WhatsApp (clique único, sem bloqueio de pop-up)
window.abrirWhatsAppOS = function(json) {
  const os = JSON.parse(decodeURIComponent(json));
  const foneLimpo = os.telefone.replace(/\D/g, '');
  const fone = foneLimpo.startsWith('55') ? foneLimpo : `55${foneLimpo}`;
  const total = parseFloat(os.custo_peca || 0) + parseFloat(os.mao_obra || 0);
  const pgts = extrairPagamentosDaOS(os);
  const pago = pgts.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
  const falta = Math.max(total - pago, 0);

  let resumoPagto = `*Valor Total:* ${formatarMoeda(total)}`;
  if (pgts.length > 0) {
    const listaStr = pgts.map(p => `  - ${p.forma}: ${formatarMoeda(p.valor)} (${formatarDataHoraCurta(p.data_hora)})`).join('\n');
    resumoPagto += `\n*Pagamentos Registrados:*\n${listaStr}\n*Saldo Restante:* ${formatarMoeda(falta)}`;
  }

  let blocoPix = '';
  if (falta > 0) {
    const payloadPix = PixGenerator.gerarPayload(falta, `OS${String(os.numero_sequencial).padStart(3, '0')}`);
    if (payloadPix) {
      blocoPix = `\n\n*Pix Copia e Cola (${formatarMoeda(falta)}):*\n\n${payloadPix}`;
    }
  }

  const msgResumo =
      `*CODE & FIX - Assistência Técnica*\n\n` +
      `Olá, *${os.cliente}*!\n` +
      `Status do seu aparelho (*${os.aparelho}*): *${os.status}*\n\n` +
      `*Diagnóstico:* ${os.laudo || 'Em análise'}\n` +
      `${resumoPagto}${blocoPix}\n\n` +
      `Garantia legal de 90 dias após a retirada. Qualquer dúvida estamos à disposição!`;

  window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msgResumo)}`, '_blank');
};

window.imprimirOS = function(json, numero) {
  const os = JSON.parse(decodeURIComponent(json));
  const pecas = parseFloat(os.custo_peca || 0);
  const mo = parseFloat(os.mao_obra || 0);
  const total = pecas + mo;
  const pgts = extrairPagamentosDaOS(os);
  const pago = pgts.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
  const restante = Math.max(total - pago, 0);

  document.getElementById('rec-id').textContent = String(numero).padStart(3, '0');
  document.getElementById('rec-data').textContent = formatarDataHoraISO(os.created_at);
  document.getElementById('rec-cliente').textContent = os.cliente;
  document.getElementById('rec-telefone').textContent = os.telefone;
  document.getElementById('rec-aparelho').textContent = os.aparelho;
  document.getElementById('rec-defeito').textContent = os.defeito;
  document.getElementById('rec-laudo').textContent = os.laudo || 'Em análise técnica';
  document.getElementById('rec-checklist').textContent = formatarChecklistTexto(os.checklist);

  document.getElementById('rec-pecas').textContent = pecas.toFixed(2);
  document.getElementById('rec-mao-obra').textContent = mo.toFixed(2);
  document.getElementById('rec-total').textContent = total.toFixed(2);

  const divListaPg = document.getElementById('rec-lista-pagamentos');
  if (pgts.length > 0) {
    divListaPg.innerHTML = '<strong>Histórico de Pagamentos:</strong><br>' +
        pgts.map(p => `• ${formatarDataHoraCurta(p.data_hora)} — ${p.forma}: R$ ${parseFloat(p.valor).toFixed(2)}`).join('<br>');
  } else {
    divListaPg.innerHTML = '<strong>Pagamentos:</strong> Pendente';
  }

  document.getElementById('rec-valor-pago').textContent = pago.toFixed(2);
  document.getElementById('rec-saldo-restante').textContent = restante.toFixed(2);

  const pixBox = document.getElementById('rec-pix-box');
  const pixQrDiv = document.getElementById('rec-pix-qrcode');
  pixQrDiv.innerHTML = '';

  if (restante > 0 && window.QRCode) {
    const payload = PixGenerator.gerarPayload(restante, `OS${String(numero).padStart(3, '0')}`);
    if (payload) {
      new QRCode(pixQrDiv, {
        text: payload,
        width: 85,
        height: 85,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
      });
      pixBox.style.display = 'block';
    } else {
      pixBox.style.display = 'none';
    }
  } else {
    pixBox.style.display = 'none';
  }

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

  document.body.classList.remove('printing-report');
  document.body.classList.add('printing-receipt');
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

function formatarDataHoraISO(isoStr) {
  if (!isoStr) return '--/--/----';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '--/--/----';
  return d.toLocaleDateString('pt-BR');
}

function formatarDataHoraCurta(dtStr) {
  if (!dtStr) return '--/-- --:--';
  const partes = dtStr.split('T');
  if (partes.length < 2) return formatarData(dtStr);
  const [ano, mes, dia] = partes[0].split('-');
  const hora = partes[1].slice(0, 5);
  return `${dia}/${mes}/${ano} ${hora}`;
}

function obterCorTextoStatus(status) {
  switch (status) {
    case 'Em Análise': return 'text-amber-400 border-amber-500/30';
    case 'Aguardando Aprovação': return 'text-blue-400 border-blue-500/30';
    case 'Aguardando Peça': return 'text-orange-400 border-orange-500/30';
    case 'Pronto para Retirada': return 'text-emerald-400 border-emerald-500/30';
    case 'Entregue / Concluído': return 'text-cyan-400 border-cyan-500/30';
    default: return 'text-slate-300';
  }
}