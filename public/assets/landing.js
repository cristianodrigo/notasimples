// NotaSimples — demo Abitech-style + checkout Abitech (nfse_*).
(() => {
  'use strict';

  const BILLING = 'https://abitech.com.br';
  const PRODUTO_NFSE = 'marca_tbd_nfse';

  let PLANOS = {
    nfse_prestador: {
      id: 'nfse_prestador', nome: 'Prestador', mensal: 39, anualPorMes: 33,
      maxEmpresas: 2, maxUsuarios: 3, trialDias: 15,
    },
    nfse_escritorio: {
      id: 'nfse_escritorio', nome: 'Escritório', mensal: 129, anualPorMes: 109,
      maxEmpresas: 20, maxUsuarios: 10, trialDias: 15,
    },
  };
  let ciclo = 'mensal';
  let planoEscolhido = null;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const brl = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const CHAVE_PARCEIRO = 'notasimples.parceiro';
  const SESSENTA_DIAS = 60 * 24 * 3600 * 1000;

  function guardarParceiro() {
    const codigo = new URLSearchParams(location.search).get('parceiro');
    if (!codigo || !/^ABT-[A-Z0-9]{4,8}$/i.test(codigo)) return;
    try {
      localStorage.setItem(CHAVE_PARCEIRO, JSON.stringify({
        codigo: codigo.toUpperCase(),
        ate: Date.now() + SESSENTA_DIAS,
      }));
    } catch { /* privado */ }
  }

  function lerParceiro() {
    const daUrl = new URLSearchParams(location.search).get('parceiro');
    if (daUrl && /^ABT-[A-Z0-9]{4,8}$/i.test(daUrl)) return daUrl.toUpperCase();
    try {
      const d = JSON.parse(localStorage.getItem(CHAVE_PARCEIRO) || 'null');
      if (d && d.ate > Date.now()) return d.codigo;
      localStorage.removeItem(CHAVE_PARCEIRO);
    } catch { /* ignora */ }
    return '';
  }

  function demonstrar() {
    const demo = $('#demo');
    if (!demo) return;
    const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const alvo = $('#demo-texto');
    if (!alvo) return;
    const frase = alvo.textContent;
    if (reduzir) {
      demo.classList.remove('animar');
      return;
    }
    alvo.textContent = '';
    let i = 0;
    const digitar = () => {
      i += 1;
      alvo.textContent = frase.slice(0, i);
      if (i < frase.length) {
        setTimeout(digitar, 28 + Math.random() * 30);
      } else {
        setTimeout(() => demo.classList.add('fase-2'), 350);
        setTimeout(() => demo.classList.add('fase-3'), 850);
        setTimeout(() => demo.classList.add('fase-4'), 1450);
      }
    };
    setTimeout(digitar, 400);
  }

  function precoDe(id) {
    const p = PLANOS[id];
    if (!p) return { porMes: 0 };
    return { porMes: ciclo === 'mensal' ? p.mensal : p.anualPorMes };
  }

  function renderizarPrecos() {
    for (const id of Object.keys(PLANOS)) {
      const alvo = $(`[data-preco="${id}"]`);
      const cobranca = $(`[data-cobranca="${id}"]`);
      if (!alvo) continue;
      const { porMes } = precoDe(id);
      alvo.innerHTML = '';
      alvo.append(`R$ ${brl(porMes)} `);
      const s = document.createElement('small');
      s.textContent = '/mês';
      alvo.append(s);
      if (cobranca) {
        cobranca.textContent = ciclo === 'mensal'
          ? 'cobrado todo mês'
          : `R$ ${brl(porMes * 12)} cobrado por ano`;
      }
    }
    $$('.ciclo button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.ciclo === ciclo));
    });
  }

  function renderizarLimites() {
    for (const id of Object.keys(PLANOS)) {
      const p = PLANOS[id];
      if (!p) continue;
      const emp = $(`[data-limite="${id}-empresas"]`);
      const usr = $(`[data-limite="${id}-usuarios"]`);
      if (emp && Number.isFinite(Number(p.maxEmpresas))) {
        emp.textContent = `até ${Number(p.maxEmpresas)}`;
      }
      if (usr && Number.isFinite(Number(p.maxUsuarios))) {
        usr.textContent = `até ${Number(p.maxUsuarios)}`;
      }
      const texto = $(`[data-limite-texto="${id}"]`);
      if (texto && Number.isFinite(Number(p.maxEmpresas)) && Number.isFinite(Number(p.maxUsuarios))) {
        texto.textContent = `Até ${Number(p.maxEmpresas)} empresas · ${Number(p.maxUsuarios)} usuários`;
      }
    }
  }

  async function carregarPlanos() {
    try {
      const r = await fetch(`${BILLING}/api/planos?produto=${encodeURIComponent(PRODUTO_NFSE)}`, {
        headers: { accept: 'application/json' },
      });
      if (!r.ok) return;
      const d = await r.json();
      const novo = {};
      for (const p of d.planos || []) {
        if (p.id === 'nfse_prestador' || p.id === 'nfse_escritorio') {
          novo[p.id] = {
            id: p.id,
            nome: p.id === 'nfse_prestador' ? 'Prestador' : 'Escritório',
            mensal: p.mensal,
            anualPorMes: p.anualPorMes,
            maxEmpresas: p.maxEmpresas,
            maxUsuarios: p.maxUsuarios,
            trialDias: p.trialDias,
          };
        }
      }
      if (Object.keys(novo).length) {
        PLANOS = novo;
        renderizarPrecos();
        renderizarLimites();
      }
    } catch { /* fallback local */ }
  }

  const dialogo = $('#assinar');
  const form = $('#form-assinar');

  function abrirCheckout(id) {
    if (!PLANOS[id] || !dialogo || !form) return;
    planoEscolhido = id;
    const { porMes } = precoDe(id);
    const nome = PLANOS[id].nome;
    const texto = ciclo === 'mensal'
      ? `Plano ${nome}, R$ ${brl(porMes)} por mês · 15 dias de teste após a ativação.`
      : `Plano ${nome}, R$ ${brl(porMes * 12)} por ano · 15 dias de teste após a ativação.`;
    $('#assinar-titulo').textContent = `Assinar ${nome}`;
    $('#assinar-resumo').textContent = texto;
    const parceiro = $('#f-parceiro');
    if (parceiro) parceiro.value = lerParceiro();
    limparErros();
    dialogo.showModal();
    $('#f-nome')?.focus();
  }

  function limparErros() {
    if (!form) return;
    $$('[data-erro]', form).forEach((e) => { e.textContent = ''; });
    $$('input', form).forEach((i) => i.removeAttribute('aria-invalid'));
    const aviso = $('#assinar-aviso');
    if (aviso) aviso.textContent = '';
  }

  function mostrarErros(detalhes) {
    let primeiro = null;
    for (const d of detalhes || []) {
      const alvo = $(`[data-erro="${d.campo}"]`, form);
      if (alvo) alvo.textContent = d.mensagem;
      const input = form.elements[d.campo];
      if (input && input.setAttribute) {
        input.setAttribute('aria-invalid', 'true');
        primeiro = primeiro || input;
      }
    }
    if (primeiro) primeiro.focus();
  }

  async function enviarCheckout(ev) {
    ev.preventDefault();
    limparErros();
    const botao = $('#assinar-enviar');
    if (!botao || !form || !planoEscolhido) return;

    const corpo = {
      nome: form.elements.nome.value,
      email: form.elements.email.value,
      celular: form.elements.celular.value,
      documentoPagador: form.elements.documentoPagador.value,
      empresa: form.elements.empresa.value,
      cnpjEmissor: form.elements.cnpjEmissor.value,
      codigoParceiro: form.elements.codigoParceiro?.value || '',
      aceite: form.elements.aceite.checked,
      plano: planoEscolhido,
      ciclo,
      fundador: false,
      produto: PRODUTO_NFSE,
    };

    botao.disabled = true;
    botao.textContent = 'Gerando a cobrança…';
    try {
      const r = await fetch(`${BILLING}/api/checkout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(corpo),
      });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.urlFatura) {
        botao.textContent = 'Abrindo o pagamento…';
        location.assign(d.urlFatura);
        return;
      }
      if (d?.erro?.detalhes?.length) mostrarErros(d.erro.detalhes);
      const aviso = $('#assinar-aviso');
      if (aviso) {
        aviso.textContent = d?.erro?.mensagem || 'Não conseguimos gerar a cobrança. Tente de novo.';
      }
    } catch {
      const aviso = $('#assinar-aviso');
      if (aviso) {
        aviso.textContent = 'Sem conexão com o billing Abitech. Confira a internet e tente de novo.';
      }
    }
    botao.disabled = false;
    botao.textContent = 'Ir para o pagamento';
  }

  document.addEventListener('DOMContentLoaded', () => {
    guardarParceiro();
    demonstrar();
    renderizarPrecos();
    renderizarLimites();
    carregarPlanos();

    $$('.ciclo button').forEach((b) => b.addEventListener('click', () => {
      ciclo = b.dataset.ciclo;
      renderizarPrecos();
    }));
    $$('[data-assinar]').forEach((b) => b.addEventListener('click', () => abrirCheckout(b.dataset.assinar)));
    $$('dialog').forEach((d) => {
      d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    });
    $('#assinar-fechar')?.addEventListener('click', () => dialogo?.close());
    form?.addEventListener('submit', enviarCheckout);
  });
})();
