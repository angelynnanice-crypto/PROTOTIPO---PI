/* =========================================================
   CENTRALIZAR — app.js (versão Supabase)
   ========================================================= */

const SUPABASE_URL = 'https://esrmrlycbkeiydfjosun.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzcm1ybHljYmtlaXlkZmpvc3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTc4MjcsImV4cCI6MjEwNjc5MzgyN30.sJwwjSMI4jyT4rgfj0yIGUkL_qf03qQQEFm5lmoYSqc';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const State = {
  user: { id: '', name: '', role: 'analista', email: '' },
  users: [],
  protocols: [],
  dashboardPeriod: '30',
  dashboardSector: 'all',
  dashboardPriority: 'all'
};

document.addEventListener('DOMContentLoaded', async () => {
  [initCinematicIntro, initTheme, initMobileMenu, initModal, initUpdateModal, initLogin, initRegister, initNavigation, initForms, initFilters, initUsers]
    .forEach(fn => {
      try { fn(); } catch (e) { console.error('Erro em ' + fn.name + ':', e); }
    });
  const { data } = await sb.auth.getSession();
  if (data.session) await entrar(data.session.user);
});

/* ---------- Tema e navegação no celular ---------- */
// A preferência fica salva neste navegador para manter a escolha no próximo acesso.
function initTheme() {
  const buttons = document.querySelectorAll('[data-theme-toggle]');
  const app = document.getElementById('app');
  if (!buttons.length || !app) return;

  const savedTheme = localStorage.getItem('centralizar-theme');
  const theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';

  const applyTheme = (nextTheme) => {
    app.dataset.theme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
    const lightIsActive = nextTheme === 'light';
    buttons.forEach(button => {
      button.setAttribute('aria-label', lightIsActive ? 'Alternar para o tema escuro' : 'Alternar para o tema claro');
      const text = button.querySelector('.theme-toggle__text');
      if (text) text.textContent = lightIsActive ? 'Tema escuro' : 'Tema claro';
    });
  };

  applyTheme(theme);
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const nextTheme = app.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('centralizar-theme', nextTheme);
      applyTheme(nextTheme);
    });
  });
}
// Em telas pequenas o menu funciona como uma gaveta e não ocupa o conteúdo.
function initMobileMenu() {
  const app = document.getElementById('app');
  const toggle = document.getElementById('mobile-menu-toggle');
  const close = document.getElementById('mobile-menu-close');
  const backdrop = document.getElementById('mobile-menu-backdrop');
  if (!app || !toggle || !close || !backdrop) return;

  const setMenu = (open) => {
    app.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('mobile-menu-active', open);
  };

  toggle.addEventListener('click', () => setMenu(!app.classList.contains('menu-open')));
  close.addEventListener('click', () => setMenu(false));
  backdrop.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenu(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 800) setMenu(false);
  });
}

/* ---------- Abertura de apresentação ---------- */
// A animação resume o problema do projeto: informações espalhadas passam a ter um ponto central.
function initCinematicIntro() {
  const intro = document.getElementById('cinematic-intro');
  const skip = document.getElementById('intro-skip');
  if (!intro || !skip) return;

  let finalizada = false;
  const encerrar = () => {
    if (finalizada) return;
    finalizada = true;
    intro.classList.add('is-leaving');
    setTimeout(() => intro.remove(), 850);
  };

  skip.addEventListener('click', encerrar);

  // Mantemos a abertura curta para não atrapalhar o uso cotidiano do sistema.
  const tempo = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 4700;
  setTimeout(encerrar, tempo);
}

/* ---------- Dados do sistema ---------- */
// O Supabase guarda os registros e usuários para que os dados não fiquem só neste computador.
// As regras de acesso também precisam ser configuradas no banco, não apenas nesta tela.
function codigoProtocolo(numero, criadoEm) {
  return `SIG-${new Date(criadoEm).getFullYear()}-${String(numero).padStart(3, '0')}`;
}

// Depois do login, buscamos o perfil e verificamos se a conta está ativa.
async function entrar(authUser) {
  const { data: perfil, error } = await sb.from('perfis').select('*').eq('id', authUser.id).single();
  if (error || !perfil || !perfil.ativo) {
    await sb.auth.signOut();
    showToast('Acesso indisponível para este usuário.');
    return false;
  }
  State.user = {
    id: perfil.id,
    name: perfil.nome,
    email: perfil.email,
    role: perfil.papel,
    createdAt: new Date(perfil.criado_em).toLocaleDateString('pt-BR')
  };
  await carregarDados();
  await garantirDadosDemonstrativos();
  updateUserSession();
  return true;
}

// Carregamos os registros do banco para mostrar as informações atualizadas nas telas.
async function carregarDados() {
  const { data: prots, error } = await sb.from('registros').select('*').order('numero', { ascending: false });
  if (error) { console.error(error); showToast('Erro ao carregar os registros.'); return; }

  const hist = {};
  State.users = [];
  if (State.user.role === 'gestor') {
    const { data: hs } = await sb.from('historico_alteracoes').select('*').order('criado_em');
    (hs || []).forEach(h => {
      (hist[h.registro_numero] = hist[h.registro_numero] || []).push({
        user: h.usuario_nome || '—',
        date: new Date(h.criado_em).toLocaleString('pt-BR'),
        changes: h.alteracoes || [],
        reason: h.motivo || ''
      });
    });
    const { data: us } = await sb.from('perfis').select('*').order('nome');
    State.users = (us || []).map(u => ({
      id: u.id, name: u.nome, email: u.email, role: u.papel, ativo: u.ativo,
      createdAt: new Date(u.criado_em).toLocaleDateString('pt-BR')
    }));
  }

  State.protocols = (prots || []).map(r => ({
    numero: r.numero,
    id: codigoProtocolo(r.numero, r.criado_em),
    title: r.titulo,
    funcionario: r.funcionario,
    setor: r.setor,
    tipo: r.tipo,
    data: r.data,
    inicio: (r.hora_inicio || '').slice(0, 5),
    fim: (r.hora_fim || '').slice(0, 5),
    priority: r.prioridade,
    desc: r.descricao || '',
    substituto: r.substituto_nome || '',
    substitutoTurno: r.substituto_turno || '',
    substituido: r.substituido_nome || '',
    substituidoTurno: r.substituido_turno || '',
    author: r.autor_nome || '—',
    date: new Date(r.criado_em).toLocaleString('pt-BR'),
    history: hist[r.numero] || []
  }));
}

/* ---------- Janelas de cadastro e edição ---------- */
// Modal é uma janela que aparece por cima da tela principal.
function initModal() {
  const modal = document.getElementById('register-modal');
  document.getElementById('open-register-modal').addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('active');
  });
  document.getElementById('close-register-modal').addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
}

/* ---------- Modal de atualização de protocolo ---------- */
// Preenchemos a janela de edição com os dados do registro escolhido.
function openUpdateModal(id) {
  if (State.user.role !== 'gestor') return;
  const p = State.protocols.find(x => x.id === id);
  if (!p) return;

  document.getElementById('upd-id').value = p.id;
  document.getElementById('upd-proto-id').textContent = `${p.id} • registrado por ${p.author} em ${p.date}`;
  document.getElementById('upd-title').value = p.title || '';
  document.getElementById('upd-funcionario').value = p.funcionario || '';
  document.getElementById('upd-setor').value = p.setor || '';
  document.getElementById('upd-tipo').value = p.tipo || 'Apoio operacional';
  document.getElementById('upd-data').value = p.data || '';
  document.getElementById('upd-inicio').value = p.inicio || '';
  document.getElementById('upd-fim').value = p.fim || '';
  document.getElementById('upd-priority').value = p.priority || 'Normal';
  document.getElementById('upd-desc').value = p.desc || '';
  document.getElementById('upd-reason').value = '';
  document.getElementById('upd-substituto').value = p.substituto || '';
  document.getElementById('upd-substituto-turno').value = p.substitutoTurno || '';
  document.getElementById('upd-substituido').value = p.substituido || '';
  document.getElementById('upd-substituido-turno').value = p.substituidoTurno || '';
  mostrarCobertura('upd');

  const hist = p.history || [];
  document.getElementById('upd-history').innerHTML = hist.length
    ? hist.slice().reverse().map(h => `
        <div class="hist-item">
          ${h.changes.map(escapeHTML).join('<br>')}
          ${h.reason ? `<br><em>Motivo: ${escapeHTML(h.reason)}</em>` : ''}
          <small>${escapeHTML(h.user)} • ${h.date}</small>
        </div>`).join('')
    : '<div class="hist-item">Nenhuma alteração registrada.</div>';

  document.getElementById('update-modal').classList.add('active');
}

// Aqui cuidamos do botão de salvar e do fechamento da janela de edição.
function initUpdateModal() {
  const modal = document.getElementById('update-modal');
  const close = () => modal.classList.remove('active');
  document.getElementById('close-update-modal').addEventListener('click', close);
  document.getElementById('cancel-update').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.getElementById('upd-tipo').addEventListener('change', () => mostrarCobertura('upd'));

  document.getElementById('update-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (State.user.role !== 'gestor') { showToast('Acesso negado: apenas gestores podem atualizar registros.'); return; }
    const p = State.protocols.find(x => x.id === document.getElementById('upd-id').value);
    if (!p) return;

    const tipo = document.getElementById('upd-tipo').value;
    const novo = {
      title: document.getElementById('upd-title').value.trim(),
      funcionario: document.getElementById('upd-funcionario').value.trim(),
      setor: document.getElementById('upd-setor').value.trim(),
      tipo,
      data: document.getElementById('upd-data').value,
      inicio: document.getElementById('upd-inicio').value,
      fim: document.getElementById('upd-fim').value,
      priority: document.getElementById('upd-priority').value,
      desc: document.getElementById('upd-desc').value.trim(),
      ...lerCobertura('upd', tipo)
    };
    // Conferimos os campos e o horário antes de atualizar.
    if (!novo.title || !novo.funcionario || !novo.setor || !novo.data || !novo.inicio || !novo.fim) {
      showToast('Preencha os campos principais da atividade.'); return;
    }
    if (novo.fim <= novo.inicio) {
      showToast('A hora final precisa ser depois da inicial.'); return;
    }
    if (TIPOS_COBERTURA.includes(tipo) && (!novo.substituto || !novo.substituido)) {
      showToast('Informe quem substitui e quem será substituído.'); return;
    }
    const reason = document.getElementById('upd-reason').value.trim();
        const labels = {
      title: 'Título', funcionario: 'Funcionário', setor: 'Setor', tipo: 'Tipo', data: 'Data',
      inicio: 'Início', fim: 'Fim', priority: 'Prioridade', desc: 'Descrição',
      substituto: 'Substituto', substitutoTurno: 'Turno do substituto',
      substituido: 'Substituído', substituidoTurno: 'Turno do substituído'
    };

    const changes = [];
    Object.keys(labels).forEach(k => {
      const antigo = p[k] || '';
      if (antigo !== novo[k]) {
        changes.push(k === 'desc' ? 'Descrição alterada' : `${labels[k]}: "${antigo || '—'}" → "${novo[k] || '—'}"`);
      }
    });
    if (changes.length === 0) { showToast('Nenhuma alteração foi feita.'); return; }

       const { error } = await sb.from('registros').update({
      titulo: novo.title, funcionario: novo.funcionario, setor: novo.setor, tipo: novo.tipo,
      data: novo.data, hora_inicio: novo.inicio, hora_fim: novo.fim,
      prioridade: novo.priority, descricao: novo.desc,
      substituto_nome: novo.substituto || null,
      substituto_turno: novo.substitutoTurno || null,
      substituido_nome: novo.substituido || null,
      substituido_turno: novo.substituidoTurno || null
    }).eq('numero', p.numero);

    if (error) {
      console.error('Falha na atualização:', error);
      showToast('Não foi possível atualizar o registro.'); return;
    }
    // O histórico deixa registrado o que foi alterado e por quem.
    const { error: erroHistorico } = await sb.from('historico_alteracoes').insert({
      registro_numero: p.numero,
      usuario_id: State.user.id,
      usuario_nome: State.user.name,
      alteracoes: changes,
      motivo: reason || null
    });

    await carregarDados();
    renderApp();
    close();
    if (erroHistorico) {
      console.error('Falha no histórico:', erroHistorico);
      showToast('Registro atualizado, mas o histórico não foi salvo.');
    } else {
      showToast(`Registro ${p.id} atualizado com sucesso.`);
    }
  });
}

/* ---------- Entrada e criação de conta ---------- */
// O Supabase confere a senha. Não guardamos senhas dentro deste arquivo.
function initLogin() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-pass').value;

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { showToast('E-mail ou senha incorretos.'); return; }
    if (await entrar(data.user)) showToast(`Bem-vindo de volta, ${State.user.name}!`);
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await sb.auth.signOut();
    State.user = { id: '', name: '', role: 'analista', email: '' };
    State.protocols = [];
    State.users = [];
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    showToast('Sessão encerrada.');
  });
}

function initRegister() {
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value;

    if (pass.length < 6) { showToast('A senha precisa ter no mínimo 6 caracteres.'); return; }

    const { error } = await sb.auth.signUp({ email, password: pass, options: { data: { nome: name } } });
    if (error) {
      showToast(/already|registered/i.test(error.message)
        ? 'Este e-mail já está cadastrado no sistema.'
        : 'Erro ao criar conta: ' + error.message);
      return;
    }
    await sb.auth.signOut(); // o usuário entra pela tela de login

    document.getElementById('register-modal').classList.remove('active');
    document.getElementById('register-form').reset();
    document.getElementById('login-email').value = email;
    showToast('Conta criada com sucesso! Faça seu login.');
  });
}

// Ajustamos a interface de acordo com o perfil de quem entrou.
function updateUserSession() {
  document.getElementById('sidebar-user-name').textContent = State.user.name;
  document.getElementById('sidebar-role-label').textContent = `Perfil: ${State.user.role.toUpperCase()}`;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.querySelectorAll('.gestor-only').forEach(el => {
    el.style.display = State.user.role === 'gestor' ? 'flex' : 'none';
  });
  showView('view-dashboard');
}

/* ---------- Telas, novo registro e filtros ---------- */
// Mostramos a tela escolhida no menu e escondemos as outras.
function showView(id) {
  if (id === 'view-usuarios' && State.user.role !== 'gestor') return;
  document.querySelectorAll('.navlink').forEach(l => l.classList.toggle('active', l.dataset.target === id));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
  // Ao escolher uma tela no celular, liberamos novamente toda a área de leitura.
  document.getElementById('app')?.classList.remove('menu-open');
  document.getElementById('mobile-menu-toggle')?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('mobile-menu-active');
  renderApp();
}

function initNavigation() {
  document.querySelectorAll('.navlink').forEach(link =>
    link.addEventListener('click', () => showView(link.dataset.target))
  );
  // Os atalhos do painel usam a mesma navegação do menu lateral.
  document.querySelectorAll('[data-open-view]').forEach(button =>
    button.addEventListener('click', () => showView(button.dataset.openView))
  );
}

// Lemos o formulário, conferimos o horário e enviamos o novo registro ao banco.
function initForms() {
  document.getElementById('proto-tipo').addEventListener('change', () => mostrarCobertura('proto'));
  document.getElementById('new-protocol-form').addEventListener('reset', () => setTimeout(() => mostrarCobertura('proto')));
  mostrarCobertura('proto');
  document.getElementById('new-protocol-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inicio = document.getElementById('proto-inicio').value;
    const fim = document.getElementById('proto-fim').value;
    const tipo = document.getElementById('proto-tipo').value;
    const cob = lerCobertura('proto', tipo);
    // Não aceitamos um horário final anterior ou igual ao inicial.
    if (fim <= inicio) { showToast('A hora de fim precisa ser depois da hora de início.'); return; }
    if (TIPOS_COBERTURA.includes(tipo) && (!cob.substituto || !cob.substituido)) {
      showToast('Informe o substituto e o funcionário substituído.'); return;
    }

    const { data, error } = await sb.from('registros').insert({
      titulo: document.getElementById('proto-title').value.trim(),
      funcionario: document.getElementById('proto-funcionario').value.trim(),
      setor: document.getElementById('proto-setor').value.trim(),
      tipo,
      data: document.getElementById('proto-data').value,
      hora_inicio: inicio,
      hora_fim: fim,
      prioridade: document.getElementById('proto-priority').value,
      descricao: document.getElementById('proto-desc').value.trim(),
      autor_id: State.user.id,
      autor_nome: State.user.name,
      substituto_nome: cob.substituto || null,
      substituto_turno: cob.substitutoTurno || null,
      substituido_nome: cob.substituido || null,
      substituido_turno: cob.substituidoTurno || null
    }).select().single();

    if (error) { console.error(error); showToast('Erro ao salvar o registro.'); return; }

    await carregarDados();
    document.getElementById('new-protocol-form').reset();
    showToast(`Registro ${codigoProtocolo(data.numero, data.criado_em)} gerado com sucesso.`);
    showView('view-protocolos');
  });
}

// Os filtros ajudam a encontrar uma atividade sem procurar linha por linha.
function initFilters() {
  ['filter-search', 'filter-func', 'filter-setor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderProtocolsTable);
  });
  ['filter-tipo', 'filter-inicio', 'filter-fim'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderProtocolsTable);
  });
  ['rep-inicio', 'rep-fim'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderReports);
  });
  const expCSV = document.getElementById('rep-export-csv');
  if (expCSV) expCSV.addEventListener('click', () => exportarCSV(getRelatorio()));
  const expPDF = document.getElementById('rep-export-pdf');
  if (expPDF) expPDF.addEventListener('click', exportarPDFExecutivo);
  const seedButton = document.getElementById('seed-demo-data');
  if (seedButton) seedButton.addEventListener('click', carregarDadosDemonstrativos);
  const dashboardExp = document.getElementById('dashboard-export');
  if (dashboardExp) dashboardExp.addEventListener('click', () => exportarCSV(getDashboardRecords()));
  const dashboardPeriod = document.getElementById('dashboard-period');
  if (dashboardPeriod) dashboardPeriod.addEventListener('change', () => {
    State.dashboardPeriod = dashboardPeriod.value;
    renderDashboard();
  });
  const dashboardSector = document.getElementById('dashboard-sector');
  if (dashboardSector) dashboardSector.addEventListener('change', () => {
    State.dashboardSector = dashboardSector.value;
    renderDashboard();
  });
  const dashboardPriority = document.getElementById('dashboard-priority');
  if (dashboardPriority) dashboardPriority.addEventListener('change', () => {
    State.dashboardPriority = dashboardPriority.value;
    renderDashboard();
  });
}

/* ---------- Atualização das informações na tela ---------- */
// Quando os dados mudam, atualizamos tabelas, indicadores e relatórios.
function renderApp() {
  renderDashboard();
  renderProtocolsTable();
  renderReports();
  renderProfile();
  renderUsers();
}

// Um único recorte alimenta todos os elementos do painel para evitar números divergentes.
function getDashboardRecords(previous = false) {
  return getDashboardProtocols(previous).filter(protocol => {
    const sectorMatches = State.dashboardSector === 'all' || protocol.setor === State.dashboardSector;
    const priority = protocol.priority || 'Normal';
    const priorityMatches = State.dashboardPriority === 'all' || priority === State.dashboardPriority;
    return sectorMatches && priorityMatches;
  });
}

// Mantemos os filtros e todas as visualizações sincronizados.
function renderDashboard() {
  syncDashboardFilters();
  const protocols = getDashboardRecords();
  renderStats(protocols);
  renderOperationalPanels(protocols);
  renderCommandCenter(protocols);
  renderRecentTable(protocols);
}

function syncDashboardFilters() {
  const select = document.getElementById('dashboard-sector');
  if (!select) return;
  const sectors = [...new Set(State.protocols.map(protocol => protocol.setor).filter(Boolean))].sort();
  const current = sectors.includes(State.dashboardSector) ? State.dashboardSector : 'all';
  select.innerHTML = '<option value="all">Todos os setores</option>' + sectors.map(sector => `<option value="${escapeHTML(sector)}">${escapeHTML(sector)}</option>`).join('');
  select.value = current;
  State.dashboardSector = current;
}

// Separamos o período atual e o anterior para que os indicadores tragam contexto.
function getDashboardProtocols(previous = false) {
  if (State.dashboardPeriod === 'all') return previous ? [] : State.protocols;
  const days = Number(State.dashboardPeriod) || 30;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const currentStart = new Date(end);
  currentStart.setDate(currentStart.getDate() - days + 1);
  currentStart.setHours(0, 0, 0, 0);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);
  const start = previous ? previousStart : currentStart;
  const finish = previous ? new Date(currentStart.getTime() - 1) : end;
  return State.protocols.filter(protocol => {
    if (!protocol.data) return false;
    const date = new Date(`${protocol.data}T00:00:00`);
    return date >= start && date <= finish;
  });
}

function trendText(current, previous) {
  if (!previous) return current ? '+100%' : '—';
  const value = Math.round(((current - previous) / previous) * 100);
  return `${value > 0 ? '+' : ''}${value}%`;
}

// Os dois painéis adicionais mostram prioridade e distribuição da carga da equipe.
function renderCommandCenter(protocols = getDashboardRecords()) {
  const priority = document.getElementById('priority-chart');
  const people = document.getElementById('people-workload');
  const updated = document.getElementById('dashboard-updated');
  if (!priority || !people || !updated) return;
  const priorities = [
    { name: 'Urgente', color: '#ff6b6b' },
    { name: 'Alta', color: '#ffb454' },
    { name: 'Normal', color: '#58a9ee' },
    { name: 'Baixa', color: '#55d6a0' }
  ].map(item => ({ ...item, count: protocols.filter(p => (p.priority || 'Normal') === item.name).length }));
  const priorityMax = Math.max(1, ...priorities.map(item => item.count));
  priority.innerHTML = priorities.map(item => `<div class="priority-row"><div><i style="background:${item.color}"></i><span>${item.name}</span><strong>${item.count}</strong></div><b><span style="width:${Math.round((item.count / priorityMax) * 100)}%;background:${item.color}"></span></b></div>`).join('');

  const workload = {};
  protocols.forEach(protocol => {
    const name = safeText(protocol.funcionario || protocol.author, 'Sem responsável');
    workload[name] = (workload[name] || 0) + 1;
  });
  const ranking = Object.entries(workload).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const peopleMax = Math.max(1, ...ranking.map(item => item[1]));
  people.innerHTML = ranking.length ? ranking.map(([name, count], index) => `<div class="person-row"><span class="person-avatar">${escapeHTML(name).charAt(0).toUpperCase()}</span><div><strong>${escapeHTML(name)}</strong><b><i style="width:${Math.round((count / peopleMax) * 100)}%"></i></b></div><em>${count}</em></div>`).join('') : estadoVazio('Ainda não há colaboradores neste período.');
  updated.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Transformamos os registros em um resumo visual sem criar dados fictícios.
function renderOperationalPanels(protocols = getDashboardRecords()) {
  const weekly = document.getElementById('weekly-chart');
  const donut = document.getElementById('type-donut');
  const legend = document.getElementById('donut-legend');
  const sectors = document.getElementById('sector-hours');
  const attention = document.getElementById('attention-list');
  if (!weekly || !donut || !legend || !sectors || !attention) return;

  // O gráfico combina volume e horas reais dos últimos sete dias.
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dias = Array.from({ length: 7 }, (_, indice) => {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() - (6 - indice));
    const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    const registros = protocols.filter(p => p.data === iso);
    const horas = registros.reduce((total, p) => {
      if (!p.inicio || !p.fim || minutos(p.fim) <= minutos(p.inicio)) return total;
      return total + (minutos(p.fim) - minutos(p.inicio)) / 60;
    }, 0);
    return { iso, rotulo: data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), quantidade: registros.length, horas };
  });
  const largura = 760;
  const altura = 230;
  const margem = { x: 42, topo: 20, base: 38 };
  const areaLargura = largura - margem.x * 2;
  const areaAltura = altura - margem.topo - margem.base;
  const maiorAtividade = Math.max(1, ...dias.map(d => d.quantidade));
  const maiorHora = Math.max(1, ...dias.map(d => d.horas));
  const pontos = (campo, maximo) => dias.map((d, indice) => ({
    x: margem.x + (areaLargura / (dias.length - 1)) * indice,
    y: margem.topo + areaAltura - (d[campo] / maximo) * areaAltura
  }));
  const atividadePontos = pontos('quantidade', maiorAtividade);
  const horaPontos = pontos('horas', maiorHora);
  const caminho = lista => lista.map((p, indice) => `${indice ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${caminho(atividadePontos)} L ${atividadePontos.at(-1).x.toFixed(1)} ${(margem.topo + areaAltura).toFixed(1)} L ${atividadePontos[0].x.toFixed(1)} ${(margem.topo + areaAltura).toFixed(1)} Z`;
  const linhas = [0, .25, .5, .75, 1].map(fracao => {
    const y = margem.topo + areaAltura * fracao;
    return `<line class="trend-grid-line" x1="${margem.x}" y1="${y}" x2="${largura - margem.x}" y2="${y}"/>`;
  }).join('');
  weekly.innerHTML = `<svg class="trend-svg" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Atividades e horas registradas por dia"><defs><linearGradient id="trend-area-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f97f5" stop-opacity=".38"/><stop offset="1" stop-color="#4f97f5" stop-opacity="0"/></linearGradient></defs>${linhas}<path class="trend-area" d="${area}"/><path class="trend-line trend-line--activities" d="${caminho(atividadePontos)}"/><path class="trend-line trend-line--hours" d="${caminho(horaPontos)}"/>${atividadePontos.map((p, i) => `<g class="trend-point"><circle cx="${p.x}" cy="${p.y}" r="5"/><title>${dias[i].rotulo}: ${dias[i].quantidade} atividade(s)</title></g>`).join('')}${horaPontos.map((p, i) => `<g class="trend-point trend-point--hours"><circle cx="${p.x}" cy="${p.y}" r="4"/><title>${dias[i].rotulo}: ${dias[i].horas.toFixed(1).replace('.', ',')} h</title></g>`).join('')}${dias.map((d, i) => `<text class="trend-label" x="${atividadePontos[i].x}" y="${altura - 10}" text-anchor="middle">${escapeHTML(d.rotulo)}</text>`).join('')}</svg>`;

  // O gráfico de rosca usa uma cor para cada tipo de atividade.
  const tipos = [
    { nome: 'Substituição', valor: 'Substituição temporária', cor: '#245f9f' },
    { nome: 'Cobertura', valor: 'Cobertura de horário', cor: '#45a0d8' },
    { nome: 'Apoio', valor: 'Apoio operacional', cor: '#39a675' },
    { nome: 'Extraordinária', valor: 'Atividade extraordinária', cor: '#d08a32' }
  ].map(item => ({ ...item, quantidade: protocols.filter(p => p.tipo === item.valor).length }));
  const total = Math.max(1, protocols.length);
  let acumulado = 0;
  const partes = tipos.map(item => {
    const inicio = acumulado;
    acumulado += (item.quantidade / total) * 100;
    return `${item.cor} ${inicio}% ${acumulado}%`;
  });
  donut.style.setProperty('--donut', protocols.length ? `conic-gradient(${partes.join(',')})` : 'conic-gradient(#dfe5ec 0 100%)');
  document.getElementById('donut-total').textContent = protocols.length;
  legend.innerHTML = tipos.map(item => `<div><i style="background:${item.cor}"></i><span>${item.nome}</span><strong>${item.quantidade}</strong></div>`).join('');

  // Somamos as horas válidas e mostramos os cinco setores com maior carga.
  const mapaSetores = {};
  protocols.forEach(p => {
    if (!p.setor || !p.inicio || !p.fim || minutos(p.fim) <= minutos(p.inicio)) return;
    mapaSetores[p.setor] = (mapaSetores[p.setor] || 0) + minutos(p.fim) - minutos(p.inicio);
  });
  const listaSetores = Object.entries(mapaSetores).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maiorSetor = Math.max(1, ...listaSetores.map(item => item[1]));
  sectors.innerHTML = listaSetores.length ? listaSetores.map(([nome, min]) => `<div class="sector-bar"><div><span>${escapeHTML(nome)}</span><strong>${(min / 60).toFixed(1).replace('.', ',')} h</strong></div><i><b style="width:${Math.round((min / maiorSetor) * 100)}%"></b></i></div>`).join('') : estadoVazio('Ainda não há horas válidas para comparar os setores.');

  const criticos = protocols.filter(p => p.priority === 'Urgente' || p.priority === 'Alta').slice(0, 4);
  attention.innerHTML = criticos.length ? criticos.map(p => `<article><span class="attention-dot ${p.priority === 'Urgente' ? 'urgent' : 'high'}"></span><div><strong>${escapeHTML(safeText(p.title, 'Atividade sem título'))}</strong><small>${escapeHTML(safeText(p.funcionario, 'Sem responsável'))} • ${formatarData(p.data)}</small></div><em>${escapeHTML(p.priority)}</em></article>`).join('') : estadoVazio('Nenhuma atividade urgente ou de alta prioridade.');
}

function safeText(value, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function estadoVazio(mensagem) {
  return `<div class="chart-empty"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg><span>${mensagem}</span></div>`;
}

function formatarData(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

// Contamos os registros, funcionários, setores e atividades urgentes.
function renderStats(protocols = getDashboardRecords()) {
  const current = protocols;
  const previous = getDashboardRecords(true);
  const totalMinutes = list => list.reduce((total, protocol) => {
    if (!protocol.inicio || !protocol.fim || minutos(protocol.fim) <= minutos(protocol.inicio)) return total;
    return total + minutos(protocol.fim) - minutos(protocol.inicio);
  }, 0);
  const unique = (list, field) => new Set(list.map(p => p[field]).filter(Boolean)).size;
  const values = {
    total: [current.length, previous.length],
    hours: [totalMinutes(current), totalMinutes(previous)],
    func: [unique(current, 'funcionario'), unique(previous, 'funcionario')],
    setores: [unique(current, 'setor'), unique(previous, 'setor')],
    urgentes: [current.filter(p => p.priority === 'Urgente').length, previous.filter(p => p.priority === 'Urgente').length]
  };
  Object.entries(values).forEach(([key, [now, before]]) => {
    document.getElementById(`stat-${key}`).textContent = key === 'hours' ? `${(now / 60).toFixed(1).replace('.', ',')}h` : now;
    const trend = document.getElementById(`trend-${key}`);
    trend.textContent = State.dashboardPeriod === 'all' ? 'TOTAL' : trendText(now, before);
    trend.classList.toggle('negative', now < before);
  });
}

function renderRecentTable(protocols = getDashboardRecords()) {
  const tbody = document.querySelector('#recent-table tbody');
  tbody.innerHTML = '';
  const recent = protocols.slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Nenhum registro encontrado.</td></tr>`;
    return;
  }
  recent.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="protocolo">${escapeHTML(safeText(p.id))}</span></td>
      <td><strong>${escapeHTML(safeText(p.title, 'Atividade sem título'))}</strong><br><small>${escapeHTML(safeText(p.tipo))}</small></td>
      <td>${escapeHTML(safeText(p.funcionario || p.author, 'Sem responsável'))}<br><small>${escapeHTML(safeText(p.setor, 'Sem setor'))}</small></td>
      <td>${formatarData(p.data)}<br><small>${escapeHTML(p.inicio || '—')}${p.fim ? '–' + escapeHTML(p.fim) : ''}</small></td>
      <td><span class="priority-badge priority-${String(p.priority || '').toLowerCase()}">${escapeHTML(p.priority || 'Normal')}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Montamos a tabela usando apenas os registros que passaram pelos filtros.
function renderProtocolsTable() {
  const tbody = document.querySelector('#protocols-table tbody');
  tbody.innerHTML = '';

  const val = id => (document.getElementById(id) || {}).value || '';
  const searchTerm = val('filter-search').toLowerCase();
  const func = val('filter-func').toLowerCase();
  const setor = val('filter-setor').toLowerCase();
  const tipo = val('filter-tipo');
  const de = val('filter-inicio');
  const ate = val('filter-fim');

  const filtered = State.protocols.filter(p =>
    (p.title.toLowerCase().includes(searchTerm) || p.id.toLowerCase().includes(searchTerm)) &&
    (func === '' || (p.funcionario || '').toLowerCase().includes(func)) &&
    (setor === '' || (p.setor || '').toLowerCase().includes(setor)) &&
    (tipo === '' || p.tipo === tipo) &&
    (!de || (p.data && p.data >= de)) &&
    (!ate || (p.data && p.data <= ate))
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Nenhum registro corresponde aos filtros aplicados.</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const tr = document.createElement('tr');
    let actionsHTML = `<span style="font-size:12px;color:var(--ink-soft)">Somente Leitura</span>`;

    if (State.user.role === 'gestor') {
      actionsHTML = `
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn-secondary btn-sm" onclick="openUpdateModal('${p.id}')">Atualizar</button>
          <button class="btn-secondary btn-sm" style="color:#d9534f; border-color:#d9534f;" onclick="deleteProtocol('${p.id}')">Apagar</button>
        </div>
      `;
    }

       tr.innerHTML = `
      <td><span class="protocolo">${escapeHTML(p.id)}</span></td>
      <td><strong>${escapeHTML(p.title)}</strong><br><small style="color:var(--ink-soft);">${escapeHTML(p.tipo || '—')} • ${escapeHTML(p.priority || '—')}</small></td>
      <td>${escapeHTML(p.funcionario || '—')}<br><small style="color:var(--ink-soft);">${escapeHTML(p.setor || '—')}</small>${detalheCobertura(p)}</td>
      <td>${formatarData(p.data)}<br><small style="color:var(--ink-soft);">${p.inicio ? p.inicio + ' às ' + p.fim : '—'}</small></td>
      <td>${escapeHTML(p.author)}<br><small style="color:var(--ink-soft);">${p.date}</small></td>
      <td>${actionsHTML}</td>
    `;
    
    tbody.appendChild(tr);
  });
}

// Antes de apagar, pedimos confirmação para evitar exclusões sem querer.
async function deleteProtocol(id) {
  if (State.user.role !== 'gestor') { showToast('Acesso negado: Apenas gestores podem apagar registros.'); return; }
  const p = State.protocols.find(x => x.id === id);
  if (!p || !confirm(`Apagar o registro ${id}? Essa ação não pode ser desfeita.`)) return;
  const { error } = await sb.from('registros').delete().eq('numero', p.numero);
  if (error) { showToast('Erro ao apagar o registro.'); return; }
  await carregarDados();
  renderApp();
  showToast(`Registro ${id} apagado.`);
}

// Mostramos o resumo das atividades para apoiar a consulta e prestação de contas.
function renderReports() {
  const protocolos = getProtocolosRelatorio();
  const minutosTotais = protocolos.reduce((total, p) => total + duracaoRegistro(p), 0);
  document.getElementById('rep-total').textContent = protocolos.length;
  document.getElementById('rep-hours').textContent = `${(minutosTotais / 60).toFixed(1).replace('.', ',')}h`;
  document.getElementById('rep-people').textContent = new Set(protocolos.map(p => p.funcionario).filter(Boolean)).size;
  document.getElementById('rep-sectors').textContent = new Set(protocolos.map(p => p.setor).filter(Boolean)).size;
  document.getElementById('rep-urgent-count').textContent = protocolos.filter(p => p.priority === 'Urgente').length;
  const tb = document.querySelector('#rep-table tbody');
  const dados = getRelatorio();
  tb.innerHTML = dados.length
    ? dados.map(r => `<tr><td>${escapeHTML(r.funcionario)}</td><td>${escapeHTML(r.setor)}</td><td>${r.qtd}</td><td>${r.horas}</td></tr>`).join('')
    : '<tr><td colspan="4" class="empty">Nenhuma atividade no período.</td></tr>';
  renderReportCharts(protocolos);
}

function duracaoRegistro(registro) {
  if (!registro.inicio || !registro.fim || minutos(registro.fim) <= minutos(registro.inicio)) return 0;
  return minutos(registro.fim) - minutos(registro.inicio);
}

function getProtocolosRelatorio() {
  const de = document.getElementById('rep-inicio')?.value || '';
  const ate = document.getElementById('rep-fim')?.value || '';
  return State.protocols.filter(p => p.data && (!de || p.data >= de) && (!ate || p.data <= ate));
}

function renderReportCharts(protocolos) {
  const setor = document.getElementById('rep-sector-chart');
  const tipo = document.getElementById('rep-type-chart');
  if (!setor || !tipo) return;
  const setores = agrupar(protocolos, p => p.setor || 'Sem setor', p => duracaoRegistro(p) / 60).slice(0, 6);
  const maiorSetor = Math.max(1, ...setores.map(item => item.valor));
  setor.innerHTML = setores.length ? setores.map(item => `<div class="report-bar-row"><div><span>${escapeHTML(item.nome)}</span><strong>${item.valor.toFixed(1).replace('.', ',')}h</strong></div><i><b style="width:${Math.round(item.valor / maiorSetor * 100)}%"></b></i></div>`).join('') : estadoVazio('Nenhuma hora registrada no período.');

  const cores = ['#4f97f5', '#35c2ca', '#43c592', '#f0a64b'];
  const tipos = agrupar(protocolos, p => p.tipo || 'Não informado');
  tipo.innerHTML = tipos.length ? tipos.map((item, indice) => `<div class="report-type-row"><i style="background:${cores[indice % cores.length]}"></i><span>${escapeHTML(item.nome)}</span><strong>${item.valor}</strong><em>${protocolos.length ? Math.round(item.valor / protocolos.length * 100) : 0}%</em></div>`).join('') : estadoVazio('Nenhum tipo de atividade no período.');
}

function agrupar(lista, obterNome, obterValor = () => 1) {
  const mapa = {};
  lista.forEach(item => {
    const nome = obterNome(item);
    mapa[nome] = (mapa[nome] || 0) + obterValor(item);
  });
  return Object.entries(mapa).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
}

/* ---------- Perfil ---------- */
function renderProfile() {
  const u = State.user;
  if (!u.email || !document.getElementById('prof-name')) return;
  const set = (id, v) => { document.getElementById(id).textContent = v; };
  const meus = State.protocols.filter(p => p.author === u.name);
  const iniciais = u.name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');

  set('prof-avatar', iniciais || '?');
  set('prof-name', u.name);
  set('prof-email', u.email);
  set('prof-name2', u.name);
  set('prof-email2', u.email);
  set('prof-role', u.role === 'gestor' ? 'Gestor' : 'Analista');
  set('prof-since', u.createdAt || '—');
  set('prof-count', meus.length);
  set('prof-last', meus.length ? meus[0].date : '—');

  const tb = document.querySelector('#prof-table tbody');
  tb.innerHTML = meus.length
    ? meus.slice(0, 5).map(p => `
        <tr>
          <td><span class="protocolo">${escapeHTML(p.id)}</span></td>
          <td><strong>${escapeHTML(p.title)}</strong></td>
          <td>${formatarData(p.data)}</td>
        </tr>`).join('')
    : '<tr><td colspan="3" class="empty">Você ainda não fez nenhum registro.</td></tr>';
}

/* ---------- Administração de usuários ---------- */
// Estas ações aparecem para o gestor, mas a permissão real depende das regras do banco.
function initUsers() {
  const search = document.getElementById('users-search');
  if (search) search.addEventListener('input', renderUsers);

  const tbody = document.querySelector('#users-table tbody');
  if (!tbody) return;
  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'role') changeUserRole(btn.dataset.email);
    if (btn.dataset.action === 'toggle') toggleUserActive(btn.dataset.email);
  });
}

function renderUsers() {
  const tbody = document.querySelector('#users-table tbody');
  if (!tbody) return;
  if (State.user.role !== 'gestor') { tbody.innerHTML = ''; return; }

  const termo = (document.getElementById('users-search').value || '').toLowerCase();
  const lista = State.users.filter(u =>
    u.name.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)
  );

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum usuário encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(u => {
    const qtd = State.protocols.filter(p => p.author === u.name).length;
    const eu = u.email === State.user.email;
    const email = escapeHTML(u.email);
    const acoes = eu
      ? '<span style="font-size:12px;color:var(--ink-soft)">Você</span>'
      : `<div style="display:flex; gap:6px; flex-wrap:wrap;">
           <button class="btn-secondary btn-sm" data-action="role" data-email="${email}">
             ${u.role === 'gestor' ? 'Tornar analista' : 'Tornar gestor'}
           </button>
           <button class="btn-secondary btn-sm" style="color:#d9534f; border-color:#d9534f;" data-action="toggle" data-email="${email}">
             ${u.ativo === false ? 'Reativar' : 'Desativar'}
           </button>
         </div>`;
    return `
      <tr>
        <td><strong>${escapeHTML(u.name)}</strong>${u.ativo === false ? ' <small style="color:#d9534f">(inativo)</small>' : ''}</td>
        <td>${email}</td>
        <td><span class="role-tag ${escapeHTML(u.role)}">${escapeHTML(u.role)}</span></td>
        <td>${escapeHTML(u.createdAt || '—')}</td>
        <td>${qtd}</td>
        <td>${acoes}</td>
      </tr>`;
  }).join('');
}

async function changeUserRole(email) {
  if (State.user.role !== 'gestor') { showToast('Acesso negado.'); return; }
  if (email === State.user.email) { showToast('Você não pode alterar o seu próprio perfil.'); return; }
  const u = State.users.find(x => x.email === email);
  if (!u) return;
  const novo = u.role === 'gestor' ? 'analista' : 'gestor';
  const { error } = await sb.from('perfis').update({ papel: novo }).eq('id', u.id);
  if (error) { showToast('Erro ao alterar o perfil.'); return; }
  await carregarDados();
  renderApp();
  showToast(`${u.name} agora é ${novo}.`);
}

async function toggleUserActive(email) {
  if (State.user.role !== 'gestor') { showToast('Acesso negado.'); return; }
  if (email === State.user.email) { showToast('Você não pode desativar a si mesmo.'); return; }
  const u = State.users.find(x => x.email === email);
  if (!u) return;
  const ativo = u.ativo === false;
  const { error } = await sb.from('perfis').update({ ativo }).eq('id', u.id);
  if (error) { showToast('Erro ao alterar o usuário.'); return; }
  await carregarDados();
  renderApp();
  showToast(ativo ? `${u.name} reativado.` : `${u.name} desativado.`);
}
/* ---------- Substituições e coberturas de horário ---------- */
const TIPOS_COBERTURA = ['Substituição temporária', 'Cobertura de horário'];

// Os campos extras só aparecem quando a atividade envolve uma substituição.
function mostrarCobertura(prefix) {
  const tipo = document.getElementById(`${prefix}-tipo`).value;
  document.getElementById(`${prefix}-cobertura`).style.display =
    TIPOS_COBERTURA.includes(tipo) ? 'block' : 'none';
}

function lerCobertura(prefix, tipo) {
  const v = id => TIPOS_COBERTURA.includes(tipo)
    ? document.getElementById(`${prefix}-${id}`).value.trim()
    : '';
  return {
    substituto: v('substituto'),
    substitutoTurno: v('substituto-turno'),
    substituido: v('substituido'),
    substituidoTurno: v('substituido-turno')
  };
}

function detalheCobertura(p) {
  if (!p.substituto && !p.substituido) return '';
  const linha = (rotulo, nome, turno) =>
    `${rotulo}: ${escapeHTML(nome || '—')}${turno ? ' (' + escapeHTML(turno) + ')' : ''}`;
  return `<br><small style="color:var(--ink-soft);">${linha('Substituto', p.substituto, p.substitutoTurno)}<br>${linha('Substituído', p.substituido, p.substituidoTurno)}</small>`;
}

/* ---------- Pequenas funções usadas em várias partes ---------- */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Evitamos que textos digitados sejam interpretados como código HTML.
function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function minutos(hhmm) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm || '')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Reunimos as atividades por funcionário e setor dentro do período escolhido.
function getRelatorio() {
  const mapa = {};
  getProtocolosRelatorio().forEach(p => {
    if (!p.funcionario || !p.data) return;
    const chave = p.funcionario + '|' + p.setor;
    if (!mapa[chave]) mapa[chave] = { funcionario: p.funcionario, setor: p.setor || '—', qtd: 0, min: 0 };
    mapa[chave].qtd++;
    mapa[chave].min += duracaoRegistro(p);
  });
  return Object.values(mapa).map(r => ({ ...r, horas: (r.min / 60).toFixed(1) })).sort((a, b) => b.min - a.min);
}

// Criamos uma planilha CSV, que pode ser aberta no Excel ou LibreOffice.
function exportarCSV(lista) {
  const linhas = [['Funcionário', 'Setor', 'Atividades', 'Horas']];
  lista.forEach(r => linhas.push([r.funcionario, r.setor, r.qtd, String(r.horas).replace('.', ',')]));
  const csv = linhas.map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'relatorio.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Dados para a apresentação ---------- */
// Os registros abaixo usam a mesma tabela e os mesmos campos do formulário comum.
function criarRegistrosDemonstrativos() {
  const marcador = '[DEMO CENTRALIZAR]';
  const pessoas = ['Amanda Souza', 'Bruno Martins', 'Carla Ribeiro', 'Diego Alves', 'Fernanda Lima', 'Gustavo Rocha'];
  const setores = ['Operações', 'Manutenção', 'Logística', 'Qualidade', 'Administrativo'];
  const atividades = [
    ['Inspeção preventiva de equipamentos', 'Apoio operacional'],
    ['Cobertura do turno operacional', 'Cobertura de horário'],
    ['Acompanhamento de ordem de serviço', 'Apoio operacional'],
    ['Organização de documentação técnica', 'Atividade extraordinária'],
    ['Substituição em atividade programada', 'Substituição temporária'],
    ['Conferência de materiais recebidos', 'Apoio operacional'],
    ['Atualização de controle interno', 'Atividade extraordinária']
  ];
  const prioridades = ['Normal', 'Normal', 'Baixa', 'Alta', 'Normal', 'Urgente'];
  const turnos = [['07:30', '11:30'], ['08:00', '12:00'], ['09:00', '13:30'], ['13:00', '17:00'], ['14:00', '18:30']];
  const hoje = new Date();

  return Array.from({ length: 45 }, (_, indice) => {
    const [titulo, tipo] = atividades[indice % atividades.length];
    const [inicio, fim] = turnos[indice % turnos.length];
    const data = new Date(hoje);
    data.setDate(hoje.getDate() - ((indice * 2 + indice % 5) % 89));
    const funcionario = pessoas[indice % pessoas.length];
    const cobertura = TIPOS_COBERTURA.includes(tipo);
    return {
      titulo,
      funcionario,
      setor: setores[(indice * 2) % setores.length],
      tipo,
      data: data.toISOString().slice(0, 10),
      hora_inicio: inicio,
      hora_fim: fim,
      prioridade: prioridades[(indice * 5 + 1) % prioridades.length],
      descricao: `${marcador} Registro demonstrativo criado para apresentação dos indicadores e relatórios.`,
      autor_id: State.user.id,
      autor_nome: State.user.name,
      substituto_nome: cobertura ? funcionario : null,
      substituto_turno: cobertura ? (indice % 2 ? 'Tarde' : 'Manhã') : null,
      substituido_nome: cobertura ? pessoas[(indice + 2) % pessoas.length] : null,
      substituido_turno: cobertura ? (indice % 2 ? 'Manhã' : 'Tarde') : null
    };
  });
}

function demoJaCarregada() {
  return State.protocols.some(p => String(p.desc || '').includes('[DEMO CENTRALIZAR]'));
}

async function carregarDadosDemonstrativos() {
  if (demoJaCarregada()) { showToast('Os dados de apresentação já foram carregados.'); return; }
  const botao = document.getElementById('seed-demo-data');
  if (botao) { botao.disabled = true; botao.textContent = 'Carregando 45 registros...'; }
  const registros = criarRegistrosDemonstrativos();
  const { error } = await sb.from('registros').insert(registros);
  if (botao) { botao.disabled = false; botao.textContent = 'Carregar dados de apresentação'; }
  if (error) { console.error(error); showToast('Não foi possível carregar os dados de apresentação.'); return; }
  await carregarDados();
  renderApp();
  showToast('45 registros de apresentação foram adicionados ao sistema.');
}

// Quando o projeto ainda não possui registros, preparamos automaticamente a apresentação.
// Se a política do banco impedir a gravação, os mesmos dados continuam disponíveis nesta sessão.
async function garantirDadosDemonstrativos() {
  if (demoJaCarregada()) return;
  const registros = criarRegistrosDemonstrativos();
  const { error } = await sb.from('registros').insert(registros);
  if (error) {
    console.warn('O banco recusou a carga demonstrativa; usando prévia local.', error);
    usarDadosDemonstrativosLocais(registros);
    return;
  }
  await carregarDados();
}

function usarDadosDemonstrativosLocais(registros) {
  const demonstrativos = registros.map((r, indice) => ({
    numero: indice + 1,
    id: `SIG-DEMO-${String(indice + 1).padStart(3, '0')}`,
    title: r.titulo,
    funcionario: r.funcionario,
    setor: r.setor,
    tipo: r.tipo,
    data: r.data,
    inicio: r.hora_inicio,
    fim: r.hora_fim,
    priority: r.prioridade,
    desc: r.descricao,
    substituto: r.substituto_nome || '',
    substitutoTurno: r.substituto_turno || '',
    substituido: r.substituido_nome || '',
    substituidoTurno: r.substituido_turno || '',
    author: r.autor_nome,
    date: 'Dados de apresentação',
    history: []
  }));
  State.protocols = [...State.protocols, ...demonstrativos];
}

/* ---------- Relatório executivo em PDF ---------- */
// O PDF é desenhado em vetores para continuar nítido na tela e na impressão.
function exportarPDFExecutivo() {
  if (!window.jspdf?.jsPDF) { showToast('O gerador de PDF ainda não foi carregado.'); return; }
  const protocolos = getProtocolosRelatorio();
  if (!protocolos.length) { showToast('Não há atividades no período selecionado.'); return; }
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const cores = { navy: [13, 34, 55], blue: [62, 137, 219], cyan: [53, 194, 202], green: [67, 197, 146], violet: [143, 117, 229], orange: [240, 166, 75], red: [237, 98, 116], ink: [36, 55, 72], muted: [103, 123, 141], line: [222, 230, 237], pale: [245, 248, 251] };
  const periodoInicio = document.getElementById('rep-inicio').value;
  const periodoFim = document.getElementById('rep-fim').value;
  const periodo = periodoInicio || periodoFim ? `${periodoInicio ? formatarData(periodoInicio) : 'Início'} a ${periodoFim ? formatarData(periodoFim) : 'Hoje'}` : 'Todo o histórico';
  const horas = protocolos.reduce((total, p) => total + duracaoRegistro(p), 0) / 60;
  const pessoas = new Set(protocolos.map(p => p.funcionario).filter(Boolean)).size;
  const setoresTotal = new Set(protocolos.map(p => p.setor).filter(Boolean)).size;
  const urgentes = protocolos.filter(p => p.priority === 'Urgente').length;

  const cabecalho = (pagina) => {
    doc.setFillColor(...cores.navy); doc.rect(0, 0, largura, 25, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text('CENTRALIZAR', 15, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(159, 190, 216); doc.text('GESTÃO E REGISTRO DE ATIVIDADES FUNCIONAIS', 15, 18);
    doc.setTextColor(220, 233, 244); doc.text(`RELATÓRIO EXECUTIVO  •  ${periodo}`, largura - 15, 15, { align: 'right' });
    doc.setDrawColor(...cores.line); doc.line(15, altura - 13, largura - 15, altura - 13);
    doc.setTextColor(...cores.muted); doc.setFontSize(8); doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, 15, altura - 7); doc.text(`Página ${pagina}`, largura - 15, altura - 7, { align: 'right' });
  };

  cabecalho(1);
  doc.setTextColor(...cores.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(23); doc.text('Visão executiva da operação', 15, 39);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...cores.muted); doc.text('Síntese dos registros, carga de trabalho e prioridades do período selecionado.', 15, 46);

  const indicadores = [
    ['ATIVIDADES', String(protocolos.length), cores.blue], ['HORAS', `${horas.toFixed(1).replace('.', ',')}h`, cores.cyan],
    ['COLABORADORES', String(pessoas), cores.violet], ['SETORES', String(setoresTotal), cores.green], ['URGENTES', String(urgentes), cores.red]
  ];
  indicadores.forEach(([rotulo, valor, cor], indice) => {
    const x = 15 + indice * 36;
    doc.setFillColor(...cores.pale); doc.setDrawColor(...cores.line); doc.roundedRect(x, 55, 32, 27, 3, 3, 'FD');
    doc.setFillColor(...cor); doc.roundedRect(x, 55, 32, 2, 1, 1, 'F');
    doc.setTextColor(...cores.muted); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(rotulo, x + 3, 64);
    doc.setTextColor(...cores.ink); doc.setFontSize(16); doc.text(valor, x + 3, 76);
  });

  const setores = agrupar(protocolos, p => p.setor || 'Sem setor', p => duracaoRegistro(p) / 60).slice(0, 6);
  const maiorSetor = Math.max(1, ...setores.map(item => item.valor));
  doc.setFontSize(13); doc.setTextColor(...cores.ink); doc.text('Horas por setor', 15, 96);
  setores.forEach((item, indice) => {
    const y = 105 + indice * 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...cores.muted); doc.text(item.nome.slice(0, 25), 15, y);
    doc.setFillColor(229, 236, 242); doc.roundedRect(58, y - 4, 75, 4, 2, 2, 'F');
    doc.setFillColor(...cores.blue); doc.roundedRect(58, y - 4, Math.max(2, item.valor / maiorSetor * 75), 4, 2, 2, 'F');
    doc.setTextColor(...cores.ink); doc.setFont('helvetica', 'bold'); doc.text(`${item.valor.toFixed(1).replace('.', ',')}h`, 138, y);
  });

  const tipos = agrupar(protocolos, p => p.tipo || 'Não informado');
  doc.setFontSize(13); doc.setTextColor(...cores.ink); doc.text('Tipos de atividade', 15, 177);
  tipos.forEach((item, indice) => {
    const y = 187 + indice * 10;
    const cor = [cores.blue, cores.cyan, cores.green, cores.orange][indice % 4];
    doc.setFillColor(...cor); doc.circle(17, y - 1.5, 1.8, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...cores.ink); doc.text(item.nome, 22, y);
    doc.setFont('helvetica', 'bold'); doc.text(`${item.valor}  (${Math.round(item.valor / protocolos.length * 100)}%)`, 105, y, { align: 'right' });
  });

  const prioridades = ['Urgente', 'Alta', 'Normal', 'Baixa'].map((nome, indice) => ({ nome, valor: protocolos.filter(p => (p.priority || 'Normal') === nome).length, cor: [cores.red, cores.orange, cores.blue, cores.green][indice] }));
  doc.setFontSize(13); doc.text('Prioridades', 125, 96);
  prioridades.forEach((item, indice) => {
    const y = 108 + indice * 17;
    doc.setFillColor(...item.cor); doc.circle(129, y - 2, 2.2, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...cores.muted); doc.text(item.nome, 135, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...cores.ink); doc.text(String(item.valor), 190, y, { align: 'right' });
  });

  const linhas = protocolos.map(p => [p.id, p.title, p.funcionario || '—', p.setor || '—', formatarData(p.data), p.priority || 'Normal', `${(duracaoRegistro(p) / 60).toFixed(1).replace('.', ',')}h`]);
  doc.addPage(); cabecalho(2);
  doc.setTextColor(...cores.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text('Detalhamento das atividades', 15, 38);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...cores.muted); doc.text(`${protocolos.length} registros encontrados no período ${periodo}.`, 15, 45);
  doc.autoTable({
    startY: 52,
    head: [['Registro', 'Atividade', 'Responsável', 'Setor', 'Data', 'Prioridade', 'Horas']],
    body: linhas,
    margin: { left: 15, right: 15, bottom: 19 },
    styles: { font: 'helvetica', fontSize: 7.3, cellPadding: 2.5, textColor: cores.ink, lineColor: cores.line, lineWidth: .1 },
    headStyles: { fillColor: cores.navy, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: cores.pale },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 42 }, 2: { cellWidth: 30 }, 3: { cellWidth: 24 }, 4: { cellWidth: 19 }, 5: { cellWidth: 19 }, 6: { cellWidth: 14, halign: 'right' } },
    didDrawPage: dados => { if (dados.pageNumber > 1) cabecalho(dados.pageNumber + 1); }
  });
  doc.save('centralizar-relatorio-executivo.pdf');
  showToast('Relatório PDF gerado com sucesso.');
}
