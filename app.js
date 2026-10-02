const State = {
  user: { name: '', role: 'analista', email: '' },
  users: [
    { name: 'Ana Souza', email: 'ana@orgao.gov.br', pass: '123456', role: 'analista' },
    { name: 'Carlos Lima', email: 'carlos@orgao.gov.br', pass: '123456', role: 'gestor' }
  ],
  protocols: [
    { id: 'SIG-2026-001', title: 'Revisão de Contratos de TI', category: 'Infraestrutura', priority: 'Urgente', desc: 'Análise de conformidade e aditivos contratuais vigentes.', author: 'Ana Souza', date: '26/09/2026', status: 'Pendente' },
    { id: 'SIG-2026-002', title: 'Auditoria de Processos de Compras', category: 'Auditoria', priority: 'Normal', desc: 'Verificação de licitações presenciais e eletrônicas.', author: 'Carlos Lima', date: '25/09/2026', status: 'Aprovado' },
    { id: 'SIG-2026-003', title: 'Atualização de Normas de Compliance', category: 'Compliance', priority: 'Normal', desc: 'Adequação às diretrizes federais recentes.', author: 'Ana Souza', date: '24/09/2026', status: 'Recusado' }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  loadDataFromStorage();
  initModal();
  initUpdateModal();
  initLogin();
  initRegister();
  initNavigation();
  initForms();
  initFilters();
});

/* ---------- Modal de cadastro ---------- */
function initModal() {
  const modal = document.getElementById('register-modal');
  document.getElementById('open-register-modal').addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('active');
  });
  document.getElementById('close-register-modal').addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  const chips = document.querySelectorAll('#register-form .role-chip');
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  }));
}

/* ---------- Modal de atualização de protocolo ---------- */
function openUpdateModal(id) {
  if (State.user.role !== 'gestor') return;
  const p = State.protocols.find(x => x.id === id);
  if (!p) return;

  document.getElementById('upd-id').value = p.id;
  document.getElementById('upd-proto-id').textContent = `${p.id} • criado por ${p.author} em ${p.date}`;
  document.getElementById('upd-title').value = p.title;
  document.getElementById('upd-category').value = p.category;
  document.getElementById('upd-priority').value = p.priority;
  document.getElementById('upd-status').value = p.status;
  document.getElementById('upd-desc').value = p.desc || '';
  document.getElementById('upd-reason').value = '';
  document.getElementById('upd-review-date').value = p.reviewDate || '';

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

function initUpdateModal() {
  const modal = document.getElementById('update-modal');
  const close = () => modal.classList.remove('active');
  document.getElementById('close-update-modal').addEventListener('click', close);
  document.getElementById('cancel-update').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('update-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (State.user.role !== 'gestor') {
      showToast('Acesso negado: Apenas gestores podem atualizar protocolos.');
      return;
    }
    const p = State.protocols.find(x => x.id === document.getElementById('upd-id').value);
    if (!p) return;

    const novo = {
      title: document.getElementById('upd-title').value.trim(),
      category: document.getElementById('upd-category').value,
      priority: document.getElementById('upd-priority').value,
      status: document.getElementById('upd-status').value,
      desc: document.getElementById('upd-desc').value.trim(),
      reviewDate: document.getElementById('upd-review-date').value
    };
    const reason = document.getElementById('upd-reason').value.trim();
    const labels = { title: 'Título', category: 'Categoria', priority: 'Prioridade', status: 'Status', desc: 'Descrição', reviewDate: 'Data de revisão' };

    const changes = [];
    Object.keys(labels).forEach(k => {
      const antigo = p[k] || '';
      if (antigo !== novo[k]) {
        changes.push(k === 'desc' ? 'Descrição alterada' : `${labels[k]}: "${antigo || '—'}" → "${novo[k] || '—'}"`);
      }
    });

    if (changes.length === 0) {
      showToast('Nenhuma alteração foi feita.');
      return;
    }

    if (p.status !== novo.status && document.getElementById('upd-require-reason').checked && !reason) {
      showToast('Informe a justificativa para alterar o status.');
      document.getElementById('upd-reason').focus();
      return;
    }

    Object.assign(p, novo);

    if (document.getElementById('upd-log-history').checked) {
      p.history = p.history || [];
      p.history.push({ user: State.user.name, date: new Date().toLocaleString('pt-BR'), changes, reason });
    }

    saveDataToStorage();
    renderApp();
    close();

    showToast(document.getElementById('upd-notify').checked
      ? `Protocolo ${p.id} atualizado. ${p.author} foi notificado(a).`
      : `Protocolo ${p.id} atualizado com sucesso.`);
  });
}

/* ---------- Login / Cadastro ---------- */
function initLogin() {
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value.trim();

    const foundUser = State.users.find(u => u.email === email && u.pass === pass);
    if (!foundUser) {
      showToast('E-mail não cadastrado ou senha incorreta.');
      return;
    }
    State.user = { ...foundUser };
    updateUserSession();
    showToast(`Bem-vindo de volta, ${State.user.name}!`);
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('login-form').reset();
    showToast('Sessão encerrada.');
  });
}

function initRegister() {
  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value.trim();
    const activeChip = document.querySelector('#register-form .role-chip.active');
    const role = activeChip ? activeChip.dataset.role : 'analista';

    if (pass.length < 6) {
      showToast('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    if (State.users.some(u => u.email === email)) {
      showToast('Este e-mail já está cadastrado no sistema.');
      return;
    }

    State.users.push({ name, email, pass, role });
    saveUsersToStorage();

    document.getElementById('register-modal').classList.remove('active');
    document.getElementById('register-form').reset();
    document.getElementById('login-email').value = email;
    showToast('Conta criada com sucesso! Faça seu login.');
  });
}

function updateUserSession() {
  document.getElementById('sidebar-user-name').textContent = State.user.name;
  document.getElementById('sidebar-role-label').textContent = `Perfil: ${State.user.role.toUpperCase()}`;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  renderApp();
}

/* ---------- Navegação / Formulários / Filtros ---------- */
function initNavigation() {
  const navLinks = document.querySelectorAll('.navlink');
  navLinks.forEach(link => link.addEventListener('click', () => {
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(link.dataset.target).classList.add('active');
    renderApp();
  }));
}

function initForms() {
  document.getElementById('new-protocol-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newProtocol = {
      id: `SIG-2026-${String(State.protocols.length + 1).padStart(3, '0')}`,
      title: document.getElementById('proto-title').value,
      category: document.getElementById('proto-category').value,
      priority: document.getElementById('proto-priority').value,
      desc: document.getElementById('proto-desc').value,
      author: State.user.name,
      date: new Date().toLocaleDateString('pt-BR'),
      status: 'Pendente'
    };

    State.protocols.unshift(newProtocol);
    saveDataToStorage();
    document.getElementById('new-protocol-form').reset();
    showToast(`Protocolo ${newProtocol.id} gerado com sucesso.`);
    document.querySelector('[data-target="view-protocolos"]').click();
  });
}

function initFilters() {
  document.getElementById('filter-search').addEventListener('input', renderProtocolsTable);
  document.getElementById('filter-status').addEventListener('change', renderProtocolsTable);
}

/* ---------- Renderização ---------- */
function renderApp() {
  renderStats();
  renderRecentTable();
  renderProtocolsTable();
  renderReports();
}

function renderStats() {
  const count = s => State.protocols.filter(p => p.status === s).length;
  document.getElementById('stat-total').textContent = State.protocols.length;
  document.getElementById('stat-pendentes').textContent = count('Pendente');
  document.getElementById('stat-aprovados').textContent = count('Aprovado');
  document.getElementById('stat-recusados').textContent = count('Recusado');
}

function renderRecentTable() {
  const tbody = document.querySelector('#recent-table tbody');
  tbody.innerHTML = '';
  const recent = State.protocols.slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Nenhum registro encontrado.</td></tr>`;
    return;
  }
  recent.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="protocolo">${p.id}</span></td>
      <td><strong>${escapeHTML(p.title)}</strong></td>
      <td>${escapeHTML(p.author)}</td>
      <td><span class="status-pill status-${p.status.toLowerCase()}">${p.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderProtocolsTable() {
  const tbody = document.querySelector('#protocols-table tbody');
  tbody.innerHTML = '';

  const searchTerm = document.getElementById('filter-search').value.toLowerCase();
  const statusTerm = document.getElementById('filter-status').value;

  const filtered = State.protocols.filter(p =>
    (p.title.toLowerCase().includes(searchTerm) || p.id.toLowerCase().includes(searchTerm)) &&
    (statusTerm === '' || p.status === statusTerm)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Nenhum protocolo corresponde aos filtros aplicados.</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const tr = document.createElement('tr');
    let actionsHTML = `<span style="font-size:12px;color:var(--ink-soft)">Somente Leitura</span>`;

    if (State.user.role === 'gestor') {
      actionsHTML = `
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn-primary btn-sm" onclick="updateStatus('${p.id}', 'Aprovado')">Aprovar</button>
          <button class="btn-secondary btn-sm" style="color:#d9534f; border-color:#d9534f;" onclick="updateStatus('${p.id}', 'Recusado')">Recusar</button>
          <button class="btn-secondary btn-sm" onclick="openUpdateModal('${p.id}')">Atualizar</button>
        </div>
      `;
    }

    tr.innerHTML = `
      <td><span class="protocolo">${p.id}</span></td>
      <td><strong>${escapeHTML(p.title)}</strong><br><small style="color:var(--ink-soft);">${escapeHTML(p.category)} • ${p.priority}</small></td>
      <td>${escapeHTML(p.author)}</td>
      <td>${p.date}</td>
      <td><span class="status-pill status-${p.status.toLowerCase()}">${p.status}</span></td>
      <td>${actionsHTML}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateStatus(id, newStatus) {
  if (State.user.role !== 'gestor') {
    showToast('Acesso negado: Apenas gestores podem alterar status.');
    return;
  }
  const proto = State.protocols.find(p => p.id === id);
  if (proto) {
    proto.status = newStatus;
    saveDataToStorage();
    renderApp();
    showToast(`Protocolo ${id} alterado para: ${newStatus}.`);
  }
}

function renderReports() {
  const total = State.protocols.length;
  const aprovados = State.protocols.filter(p => p.status === 'Aprovado').length;
  const urgentes = State.protocols.filter(p => p.priority === 'Urgente').length;
  document.getElementById('rep-approval-rate').textContent = `${total > 0 ? Math.round((aprovados / total) * 100) : 0}%`;
  document.getElementById('rep-urgent-count').textContent = urgentes;
}

/* ---------- Utilitários ---------- */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function saveDataToStorage() {
  localStorage.setItem('sigraf_protocols', JSON.stringify(State.protocols));
}

function saveUsersToStorage() {
  localStorage.setItem('sigraf_users', JSON.stringify(State.users));
}

function loadDataFromStorage() {
  const pData = localStorage.getItem('sigraf_protocols');
  if (pData) { try { State.protocols = JSON.parse(pData); } catch (e) {} }
  const uData = localStorage.getItem('sigraf_users');
  if (uData) { try { State.users = JSON.parse(uData); } catch (e) {} }
}

function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}