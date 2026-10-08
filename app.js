/* =========================================================
   CENTRALIZAR — app.js (versão Supabase)
   ========================================================= */

const SUPABASE_URL = 'https://esrmrlycbkeiydfjosun.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzcm1ybHljYmtlaXlkZmpvc3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTc4MjcsImV4cCI6MjEwNjc5MzgyN30.sJwwjSMI4jyT4rgfj0yIGUkL_qf03qQQEFm5lmoYSqc';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const State = {
  user: { id: '', name: '', role: 'analista', email: '' },
  users: [],
  protocols: []
};

document.addEventListener('DOMContentLoaded', async () => {
  [initCinematicIntro, initModal, initUpdateModal, initLogin, initRegister, initNavigation, initForms, initFilters, initUsers]
    .forEach(fn => {
      try { fn(); } catch (e) { console.error('Erro em ' + fn.name + ':', e); }
    });
  const { data } = await sb.auth.getSession();
  if (data.session) await entrar(data.session.user);
});

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
  renderApp();
}

function initNavigation() {
  document.querySelectorAll('.navlink').forEach(link =>
    link.addEventListener('click', () => showView(link.dataset.target))
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
  const exp = document.getElementById('rep-export');
  if (exp) exp.addEventListener('click', () => exportarCSV(getRelatorio()));
}

/* ---------- Atualização das informações na tela ---------- */
// Quando os dados mudam, atualizamos tabelas, indicadores e relatórios.
function renderApp() {
  renderStats();
  renderRecentTable();
  renderProtocolsTable();
  renderReports();
  renderProfile();
  renderUsers();
}

function formatarData(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

// Contamos os registros, funcionários, setores e atividades urgentes.
function renderStats() {
  const unicos = campo => new Set(State.protocols.map(p => p[campo]).filter(Boolean)).size;
  document.getElementById('stat-total').textContent = State.protocols.length;
  document.getElementById('stat-func').textContent = unicos('funcionario');
  document.getElementById('stat-setores').textContent = unicos('setor');
  document.getElementById('stat-urgentes').textContent = State.protocols.filter(p => p.priority === 'Urgente').length;
}

function renderRecentTable() {
  const tbody = document.querySelector('#recent-table tbody');
  tbody.innerHTML = '';
  const recent = State.protocols.slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Nenhum registro encontrado.</td></tr>`;
    return;
  }
  recent.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="protocolo">${escapeHTML(p.id)}</span></td>
      <td><strong>${escapeHTML(p.title)}</strong></td>
      <td>${escapeHTML(p.funcionario || p.author)}</td>
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
  document.getElementById('rep-total').textContent = State.protocols.length;
  document.getElementById('rep-urgent-count').textContent = State.protocols.filter(p => p.priority === 'Urgente').length;
  const tb = document.querySelector('#rep-table tbody');
  const dados = getRelatorio();
  tb.innerHTML = dados.length
    ? dados.map(r => `<tr><td>${escapeHTML(r.funcionario)}</td><td>${escapeHTML(r.setor)}</td><td>${r.qtd}</td><td>${r.horas}</td></tr>`).join('')
    : '<tr><td colspan="4" class="empty">Nenhuma atividade no período.</td></tr>';
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
  const de = document.getElementById('rep-inicio').value;
  const ate = document.getElementById('rep-fim').value;
  const mapa = {};
  State.protocols.forEach(p => {
    if (!p.funcionario || !p.data) return;
    if (de && p.data < de) return;
    if (ate && p.data > ate) return;
    const chave = p.funcionario + '|' + p.setor;
    if (!mapa[chave]) mapa[chave] = { funcionario: p.funcionario, setor: p.setor || '—', qtd: 0, min: 0 };
    mapa[chave].qtd++;
    // Só somamos a duração quando os horários estão preenchidos.
    if (p.inicio && p.fim && minutos(p.fim) > minutos(p.inicio)) {
      mapa[chave].min += minutos(p.fim) - minutos(p.inicio);
    }
  });
  return Object.values(mapa).map(r => ({ ...r, horas: (r.min / 60).toFixed(1) }));
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
