const State = {
  user: { name: '', role: 'analista', email: '' },
  users: [
    { name: 'Ana Souza', email: 'ana@orgao.gov.br', pass: '123456', role: 'analista' },
    { name: 'Carlos Lima', email: 'carlos@orgao.gov.br', pass: '123456', role: 'gestor' }
  ],
  protocols: []
};

document.addEventListener('DOMContentLoaded', () => {
  loadDataFromStorage();
  [initModal, initUpdateModal, initLogin, initRegister, initNavigation, initForms, initFilters]
    .forEach(fn => {
      try { fn(); } catch (e) { console.error('Erro em ' + fn.name + ':', e); }
    });
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
      showToast('Acesso negado: apenas gestores podem atualizar registros.');
      return;
    }
    const p = State.protocols.find(x => x.id === document.getElementById('upd-id').value);
    if (!p) return;

    const novo = {
      title: document.getElementById('upd-title').value.trim(),
      funcionario: document.getElementById('upd-funcionario').value.trim(),
      setor: document.getElementById('upd-setor').value.trim(),
      tipo: document.getElementById('upd-tipo').value,
      data: document.getElementById('upd-data').value,
      inicio: document.getElementById('upd-inicio').value,
      fim: document.getElementById('upd-fim').value,
      priority: document.getElementById('upd-priority').value,
      desc: document.getElementById('upd-desc').value.trim()
    };
    const reason = document.getElementById('upd-reason').value.trim();
    const labels = { title: 'Título', funcionario: 'Funcionário', setor: 'Setor', tipo: 'Tipo', data: 'Data', inicio: 'Início', fim: 'Fim', priority: 'Prioridade', desc: 'Descrição' };

    if (novo.inicio && novo.fim && novo.fim <= novo.inicio) {
      showToast('A hora de fim precisa ser depois da hora de início.');
      return;
    }

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

    Object.assign(p, novo);
    p.history = p.history || [];
    p.history.push({ user: State.user.name, date: new Date().toLocaleString('pt-BR'), changes, reason });

    saveDataToStorage();
    renderApp();
    close();
    showToast(`Registro ${p.id} atualizado com sucesso.`);
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

    const inicio = document.getElementById('proto-inicio').value;
    const fim = document.getElementById('proto-fim').value;
    if (fim <= inicio) {
      showToast('A hora de fim precisa ser depois da hora de início.');
      return;
    }

    const newProtocol = {
      id: gerarId(),
      title: document.getElementById('proto-title').value,
      funcionario: document.getElementById('proto-funcionario').value.trim(),
      setor: document.getElementById('proto-setor').value.trim(),
      tipo: document.getElementById('proto-tipo').value,
      data: document.getElementById('proto-data').value,
      inicio,
      fim,
      priority: document.getElementById('proto-priority').value,
      desc: document.getElementById('proto-desc').value,
      author: State.user.name,
      date: new Date().toLocaleString('pt-BR')
    
    };

    State.protocols.unshift(newProtocol);
    saveDataToStorage();
    document.getElementById('new-protocol-form').reset();
    showToast(`Protocolo ${newProtocol.id} gerado com sucesso.`);
    document.querySelector('[data-target="view-protocolos"]').click();
  });
}
function gerarId() {
  const nums = State.protocols.map(p => parseInt(p.id.split('-').pop(), 10) || 0);
  const prox = (nums.length ? Math.max(...nums) : 0) + 1;
  return `SIG-2026-${String(prox).padStart(3, '0')}`;
}

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
      <td>${escapeHTML(p.funcionario || p.author)}</td>
      <td><span class="status-pill status-${p.status.toLowerCase()}">${p.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderProtocolsTable() {
  const tbody = document.querySelector('#protocols-table tbody');
  tbody.innerHTML = '';

  // lê o campo; se ele não existir no HTML, devolve texto vazio (não quebra)
  const val = id => (document.getElementById(id) || {}).value || '';

  const searchTerm = val('filter-search').toLowerCase();
  const statusTerm = val('filter-status');
  const func = val('filter-func').toLowerCase();
  const setor = val('filter-setor').toLowerCase();
  const tipo = val('filter-tipo');
  const de = val('filter-inicio');
  const ate = val('filter-fim');

  const filtered = State.protocols.filter(p =>
    (p.title.toLowerCase().includes(searchTerm) || p.id.toLowerCase().includes(searchTerm)) &&
    (statusTerm === '' || p.status === statusTerm) &&
    (func === '' || (p.funcionario || '').toLowerCase().includes(func)) &&
    (setor === '' || (p.setor || '').toLowerCase().includes(setor)) &&
    (tipo === '' || p.tipo === tipo) &&
    (!de || (p.data && p.data >= de)) &&
    (!ate || (p.data && p.data <= ate))
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Nenhum registro corresponde aos filtros aplicados.</td></tr>`;
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
          <button class="btn-secondary btn-sm" onclick="openUpdateModal('${p.id}')">Atualizar</button>
<button class="btn-secondary btn-sm" style="color:#d9534f; border-color:#d9534f;" onclick="deleteProtocol('${p.id}')">Apagar</button>
        </div>
      `;
     
    }
     

    tr.innerHTML = `
      <td><span class="registro">${p.id}</span></td>
      <td><strong>${escapeHTML(p.title)}</strong><br><small style="color:var(--ink-soft);">${escapeHTML(p.tipo || p.category || '—')} • ${escapeHTML(p.priority)}</small></td>
      <td>${escapeHTML(p.funcionario || '—')}<br><small style="color:var(--ink-soft);">${escapeHTML(p.setor || '—')}</small></td>
      <td>${formatarData(p.data)}<br><small style="color:var(--ink-soft);">${p.inicio ? p.inicio + ' às ' + p.fim : '—'}</small></td>
      <td>${escapeHTML(p.author)}<br><small style="color:var(--ink-soft);">${p.date}</small></td>
      <td><span class="status-pill status-${p.status.toLowerCase()}">${p.status}</span></td>
      <td>${actionsHTML}</td>
    `;
    tbody.appendChild(tr);
  });
}
function formatarData(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
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
      <td><span class="protocolo">${p.id}</span></td>
      <td><strong>${escapeHTML(p.title)}</strong></td>
      <td>${escapeHTML(p.funcionario || p.author)}</td>
    `;
    tbody.appendChild(tr);
  });
}
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
      <td><span class="protocolo">${p.id}</span></td>
      <td><strong>${escapeHTML(p.title)}</strong><br><small style="color:var(--ink-soft);">${escapeHTML(p.tipo || '—')} • ${escapeHTML(p.priority || '—')}</small></td>
      <td>${escapeHTML(p.funcionario || '—')}<br><small style="color:var(--ink-soft);">${escapeHTML(p.setor || '—')}</small></td>
      <td>${formatarData(p.data)}<br><small style="color:var(--ink-soft);">${p.inicio ? p.inicio + ' às ' + p.fim : '—'}</small></td>
      <td>${escapeHTML(p.author)}<br><small style="color:var(--ink-soft);">${p.date}</small></td>
      <td>${actionsHTML}</td>
    `;
    tbody.appendChild(tr);
  });
}
function deleteProtocol(id) {
  if (State.user.role !== 'gestor') {
    showToast('Acesso negado: Apenas gestores podem apagar protocolos.');
    return;
  }
  if (!confirm(`Apagar o protocolo ${id}? Essa ação não pode ser desfeita.`)) return;
  State.protocols = State.protocols.filter(p => p.id !== id);
  saveDataToStorage();
  renderApp();
  showToast(`Protocolo ${id} apagado.`);
}

function renderReports() {
  document.getElementById('rep-total').textContent = State.protocols.length;
  document.getElementById('rep-urgent-count').textContent = State.protocols.filter(p => p.priority === 'Urgente').length;
  const tb = document.querySelector('#rep-table tbody');
  const dados = getRelatorio();
  tb.innerHTML = dados.length
    ? dados.map(r => `<tr><td>${escapeHTML(r.funcionario)}</td><td>${escapeHTML(r.setor)}</td><td>${r.qtd}</td><td>${r.horas}</td></tr>`).join('')
    : '<tr><td colspan="4" class="empty">Nenhuma atividade no período.</td></tr>';
}

/* ---------- Utilitários ---------- */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function saveDataToStorage() {
 
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
function minutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

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
    mapa[chave].min += minutos(p.fim) - minutos(p.inicio);
  });
  return Object.values(mapa).map(r => ({ ...r, horas: (r.min / 60).toFixed(1) }));
}

function exportarCSV(lista) {
  const linhas = [['Funcionário', 'Setor', 'Atividades', 'Horas']];
  lista.forEach(r => linhas.push([r.funcionario, r.setor, r.qtd, String(r.horas).replace('.', ',')]));
  const csv = linhas.map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'relatorio.csv';
  a.click();
}