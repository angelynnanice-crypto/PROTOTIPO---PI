const State = {
  user: { name: 'Servidor Público', role: 'analista' },
  protocols: [
    { id: 'SIG-2026-001', title: 'Revisão de Contratos de TI', category: 'Infraestrutura', priority: 'Urgente', desc: 'Análise de conformidade e aditivos contratuais vigentes.', author: 'Ana Souza', date: '26/09/2026', status: 'Pendente' },
    { id: 'SIG-2026-002', title: 'Auditoria de Processos de Compras', category: 'Auditoria', priority: 'Normal', desc: 'Verificação de licitações presenciais e eletrônicas.', author: 'Carlos Lima', date: '25/09/2026', status: 'Aprovado' },
    { id: 'SIG-2026-003', title: 'Atualização de Normas de Compliance', category: 'Compliance', priority: 'Normal', desc: 'Adequação às diretrizes federais recentes.', author: 'Servidor Público', date: '24/09/2026', status: 'Recusado' }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  loadDataFromStorage();
  initAuthTabs();
  initLogin();
  initRegister();
  initNavigation();
  initForms();
  initFilters();
});

function initAuthTabs() {
  const tabLogin = document.getElementById('tab-login-btn');
  const tabRegister = document.getElementById('tab-register-btn');
  const formLogin = document.getElementById('login-form');
  const formRegister = document.getElementById('register-form');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.add('active');
    formRegister.classList.remove('active');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.add('active');
    formLogin.classList.remove('active');
  });

  // Chips de seleção de perfil no cadastro
  const chips = document.querySelectorAll('#register-form .role-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
}

function initLogin() {
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    
    State.user.name = email.split('@')[0] || 'Servidor Público';
    State.user.name = State.user.name.charAt(0).toUpperCase() + State.user.name.slice(1);
    State.user.role = 'analista';

    updateUserSession();
    showToast('Sessão iniciada com sucesso.');
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
    showToast('Sessão encerrada.');
  });
}

function initRegister() {
  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const activeChip = document.querySelector('#register-form .role-chip.active');

    State.user.name = name || 'Novo Usuário';
    State.user.role = activeChip ? activeChip.dataset.role : 'analista';

    updateUserSession();
    showToast('Cadastro realizado e sessão iniciada!');
  });
}

function updateUserSession() {
  document.getElementById('sidebar-user-name').textContent = State.user.name;
  document.getElementById('sidebar-role-label').textContent = `Perfil: ${State.user.role}`;

  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  renderApp();
}

function initNavigation() {
  const navLinks = document.querySelectorAll('.navlink');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const targetId = link.dataset.target;
      document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
      });
      document.getElementById(targetId).classList.add('active');
      renderApp();
    });
  });
}

function initForms() {
  document.getElementById('new-protocol-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('proto-title').value;
    const category = document.getElementById('proto-category').value;
    const priority = document.getElementById('proto-priority').value;
    const desc = document.getElementById('proto-desc').value;

    const newIdNum = State.protocols.length + 1;
    const newProtocol = {
      id: `SIG-2026-${String(newIdNum).padStart(3, '0')}`,
      title,
      category,
      priority,
      desc,
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

function renderApp() {
  renderStats();
  renderRecentTable();
  renderProtocolsTable();
  renderReports();
}

function renderStats() {
  const total = State.protocols.length;
  const pendentes = State.protocols.filter(p => p.status === 'Pendente').length;
  const aprovados = State.protocols.filter(p => p.status === 'Aprovado').length;
  const recusados = State.protocols.filter(p => p.status === 'Recusado').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pendentes').textContent = pendentes;
  document.getElementById('stat-aprovados').textContent = aprovados;
  document.getElementById('stat-recusados').textContent = recusados;
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

  const filtered = State.protocols.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm) || p.id.toLowerCase().includes(searchTerm);
    const matchStatus = statusTerm === '' || p.status === statusTerm;
    return matchSearch && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Nenhum protocolo corresponde aos filtros aplicados.</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const tr = document.createElement('tr');
    
    let actionsHTML = `<span style="font-size:12px;color:var(--ink-soft)">Visualização</span>`;
    if (State.user.role === 'gestor' && p.status === 'Pendente') {
      actionsHTML = `
        <button class="btn-primary btn-sm" onclick="updateStatus('${p.id}', 'Aprovado')">Aprovar</button>
        <button class="btn-secondary btn-sm" style="color:var(--red); border-color:var(--red);" onclick="updateStatus('${p.id}', 'Recusado')">Recusar</button>
      `;
    } else if (p.status !== 'Pendente') {
      actionsHTML = `<span style="font-size:12px;color:var(--ink-soft)">Finalizado</span>`;
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
    showToast(`Protocolo ${id} marcado como ${newStatus}.`);
  }
}

function renderReports() {
  const total = State.protocols.length;
  const aprovados = State.protocols.filter(p => p.status === 'Aprovado').length;
  const urgentes = State.protocols.filter(p => p.priority === 'Urgente').length;

  const approvalRate = total > 0 ? Math.round((aprovados / total) * 100) : 0;
  document.getElementById('rep-approval-rate').textContent = `${approvalRate}%`;
  document.getElementById('rep-urgent-count').textContent = urgentes;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function saveDataToStorage() {
  localStorage.setItem('sigraf_protocols', JSON.stringify(State.protocols));
}

function loadDataFromStorage() {
  const data = localStorage.getItem('sigraf_protocols');
  if (data) {
    try {
      State.protocols = JSON.parse(data);
    } catch(e) {
      console.error('Erro ao ler dados locais', e);
    }
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}