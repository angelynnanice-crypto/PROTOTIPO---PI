import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const js = readFileSync('app.js', 'utf8');
const css = readFileSync('visual-2026.css', 'utf8');

function teste(nome, verificacao) {
  try {
    verificacao();
    console.log(`✓ ${nome}`);
  } catch (erro) {
    console.error(`✗ ${nome}`);
    throw erro;
  }
}

teste('oferece botão acessível para trocar o tema', () => {
  assert.match(html, /id="theme-toggle"/);
  assert.match(html, /aria-label="Alternar para o tema claro"/);
});

teste('mantém o seletor de tema no rodapé da barra lateral', () => {
  assert.match(html, /class="sidebar-foot"[\s\S]*id="theme-toggle"[\s\S]*id="sidebar-role-label"/);
  assert.doesNotMatch(css, /\.theme-toggle\{position:fixed/);
});

teste('oferece menu móvel com botão, painel e fundo de apoio', () => {
  assert.match(html, /id="mobile-menu-toggle"/);
  assert.match(html, /id="mobile-menu-backdrop"/);
  assert.match(html, /id="mobile-topbar"/);
});

teste('inicializa e salva a preferência de tema', () => {
  assert.match(js, /initTheme/);
  assert.match(js, /centralizar-theme/);
  assert.match(js, /dataset\.theme/);
});

teste('impede que o navegador reutilize o JavaScript antigo', () => {
  assert.match(html, /href="visual-2026\.css\?v=20"/);
  assert.match(html, /src="app\.js\?v=20"/);
});

teste('controla abertura e fechamento do menu móvel', () => {
  assert.match(js, /initMobileMenu/);
  assert.match(js, /menu-open/);
  assert.match(js, /aria-expanded/);
});

teste('possui estilos completos para tema claro', () => {
  assert.match(css, /#app\[data-theme="light"\]/);
  assert.match(css, /#app\[data-theme="light"\] \.panel/);
  assert.match(css, /#app\[data-theme="light"\] table/);
});

teste('aplica os dois temas também ao login e aos modais', () => {
  assert.match(css, /html\[data-theme="light"\] #auth-screen/);
  assert.match(css, /html\[data-theme="dark"\] \.modal-card/);
});

teste('transforma a barra lateral em gaveta no celular', () => {
  assert.match(css, /\.mobile-topbar/);
  assert.match(css, /\.mobile-menu-toggle/);
  assert.match(css, /@media\(max-width:800px\)[\s\S]*\.sidebar[\s\S]*translateX/);
});

teste('organiza o dashboard V2 com cabeçalho compacto', () => {
  assert.doesNotMatch(html, /class="command-header"/);
  assert.match(html, /class="dashboard-toolbar"/);
  assert.match(html, /id="dashboard-updated"/);
  assert.match(html, /data-open-view="view-novo"/);
  assert.match(html, /id="dashboard-export"/);
  assert.match(html, /id="dashboard-export"[\s\S]*Exportar PDF/);
});

teste('exporta o recorte atual do dashboard diretamente em PDF', () => {
  assert.match(js, /dashboardExp\.addEventListener\('click', \(\) => exportarPDFExecutivo\(getDashboardRecords\(\), 'dashboard'\)\)/);
  assert.match(js, /expPDF\.addEventListener\('click', \(\) => exportarPDFExecutivo\(\)\)/);
  assert.doesNotMatch(js, /dashboardExp\.addEventListener\('click', \(\) => exportarCSV/);
  assert.match(js, /function exportarPDFExecutivo\(protocolosRecebidos = null, origem = 'relatorio'\)/);
});

teste('oferece os três filtros executivos', () => {
  ['dashboard-period', 'dashboard-sector', 'dashboard-priority'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

teste('exibe cinco indicadores principais', () => {
  ['stat-total', 'stat-hours', 'stat-func', 'stat-setores', 'stat-urgentes'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

teste('mantém os painéis analíticos e a tabela recente', () => {
  ['weekly-chart', 'type-donut', 'sector-hours', 'priority-chart', 'people-workload', 'recent-table'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

teste('mostra comparação nos quatro indicadores principais', () => {
  ['trend-total', 'trend-func', 'trend-setores', 'trend-urgentes'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

teste('inclui gráficos de prioridade e carga por colaborador', () => {
  assert.match(html, /id="priority-chart"/);
  assert.match(html, /id="people-workload"/);
});

teste('filtra os indicadores pelo período escolhido', () => {
  assert.match(js, /dashboardPeriod/);
  assert.match(js, /getDashboardRecords/);
  assert.match(js, /renderCommandCenter/);
});

teste('aplica setor e prioridade ao mesmo conjunto do dashboard', () => {
  assert.match(js, /dashboard-sector/);
  assert.match(js, /dashboard-priority/);
  assert.match(js, /function getDashboardRecords/);
  assert.match(js, /renderDashboard/);
});

teste('protege os painéis contra campos ausentes e listas vazias', () => {
  assert.match(js, /safeText/);
  assert.match(js, /protocols\.length \?/);
  assert.match(js, /estadoVazio/);
});

teste('usa o mesmo recorte filtrado nos KPIs, gráficos e tabela recente', () => {
  assert.match(js, /function renderStats\(protocols = getDashboardRecords\(\)\)/);
  assert.match(js, /function renderOperationalPanels\(protocols = getDashboardRecords\(\)\)/);
  assert.match(js, /function renderCommandCenter\(protocols = getDashboardRecords\(\)\)/);
  assert.match(js, /function renderRecentTable\(protocols = getDashboardRecords\(\)\)/);
});

teste('possui acabamento específico do dashboard V2', () => {
  assert.match(css, /\.dashboard-toolbar/);
  assert.match(css, /\.dashboard-filters/);
  assert.match(css, /\.kpi-trend/);
  assert.match(css, /\.priority-chart/);
  assert.match(css, /\.people-workload/);
});

teste('mantém tipografia funcional legível', () => {
  assert.match(css, /\.dashboard-toolbar\{[\s\S]*font-size:14px/);
  assert.match(css, /\.dashboard-filters label\{[\s\S]*font-size:12px/);
  assert.match(css, /\.kpi-grid[\s\S]*\.stat-card \.num\{[\s\S]*font-size:clamp\(32px/);
});

teste('inclui estados de foco nos controles do dashboard', () => {
  assert.match(css, /\.dashboard-btn:focus-visible/);
  assert.match(css, /\.dashboard-filters select:focus-visible/);
});

teste('adapta o dashboard em notebook, tablet e celular', () => {
  assert.match(css, /@media\(max-width:1024px\)/);
  assert.match(css, /@media\(max-width:768px\)/);
  assert.match(css, /@media\(max-width:480px\)/);
});

teste('diferencia visualmente os cinco indicadores com cores funcionais', () => {
  ['kpi--blue', 'kpi--cyan', 'kpi--violet', 'kpi--green', 'kpi--red'].forEach(classe => {
    assert.match(html, new RegExp(classe));
  });
  assert.match(css, /\.kpi--blue/);
  assert.match(css, /\.kpi--cyan/);
  assert.match(css, /\.kpi--violet/);
  assert.match(css, /\.kpi--green/);
  assert.match(css, /\.kpi--red/);
});

teste('renderiza o gráfico principal como linha e área com volume e horas reais', () => {
  assert.match(html, /class="trend-legend"/);
  assert.match(html, /Atividades[\s\S]*Horas/);
  assert.match(js, /class="trend-svg"/);
  assert.match(js, /linearGradient/);
  assert.match(js, /trend-area/);
  assert.match(js, /trend-line--hours/);
  assert.doesNotMatch(js, /class="week-column"/);
});

teste('usa composição executiva rica sem voltar ao visual monocromático', () => {
  assert.match(html, /dashboard-section-grid dashboard-section-grid--hero/);
  assert.match(html, /dashboard-section-grid dashboard-section-grid--details/);
  assert.match(css, /--dash-violet/);
  assert.match(css, /--dash-orange/);
  assert.match(css, /--dash-green/);
  assert.match(css, /\.donut-chart\{[\s\S]*width:188px/);
});

teste('oferece carga demonstrativa persistente e protegida contra duplicação', () => {
  assert.match(html, /id="seed-demo-data"/);
  assert.match(html, /Carregar dados de apresentação/);
  assert.match(js, /function criarRegistrosDemonstrativos/);
  assert.match(js, /\[DEMO CENTRALIZAR\]/);
  assert.match(js, /demoJaCarregada/);
  assert.match(js, /\.from\('registros'\)\.insert\(registros\)/);
});

teste('carrega automaticamente a apresentação quando o pacote demonstrativo não existe', () => {
  assert.match(js, /await carregarDados\(\);\s*await garantirDadosDemonstrativos\(\);/);
  assert.match(js, /async function garantirDadosDemonstrativos\(\)/);
  assert.match(js, /if \(demoJaCarregada\(\)\) return;/);
  assert.doesNotMatch(js, /function garantirDadosDemonstrativos\(\) \{\s*if \(State\.protocols\.length\) return;/);
});

teste('mantém os gráficos preenchidos mesmo se o banco recusar a carga', () => {
  assert.match(js, /function usarDadosDemonstrativosLocais\(registros\)/);
  assert.match(js, /if \(error\) \{[\s\S]*usarDadosDemonstrativosLocais\(registros\)/);
  assert.match(js, /State\.protocols = \[\.\.\.State\.protocols, \.\.\.demonstrativos\]/);
});

teste('permite carregar a apresentação sem esconder a ação do analista', () => {
  assert.match(html, /id="seed-demo-data"/);
  assert.doesNotMatch(html, /class="btn-secondary gestor-only" id="seed-demo-data"/);
  assert.doesNotMatch(js, /Apenas gestores podem carregar os dados de apresentação/);
});

teste('distribui os dados de apresentação por todas as prioridades', () => {
  assert.match(js, /prioridades\[\(indice \* 5 \+ 1\) % prioridades\.length\]/);
});

teste('transforma a área de relatórios em um resumo executivo', () => {
  ['rep-total', 'rep-hours', 'rep-people', 'rep-sectors', 'rep-urgent-count'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
  assert.match(html, /class="report-kpi-grid"/);
  assert.match(html, /id="rep-sector-chart"/);
  assert.match(html, /id="rep-type-chart"/);
});

teste('gera PDF executivo vetorial sem oferecer CSV na interface', () => {
  assert.match(html, /jspdf\.umd\.min\.js/);
  assert.match(html, /jspdf\.plugin\.autotable/);
  assert.match(html, /id="rep-export-pdf"/);
  assert.doesNotMatch(html, /id="rep-export-csv"/);
  assert.match(js, /function exportarPDFExecutivo/);
  assert.match(js, /new window\.jspdf\.jsPDF/);
  assert.match(js, /doc\.roundedRect/);
  assert.match(js, /doc\.autoTable/);
  assert.match(js, /doc\.save\(origem === 'dashboard' \? 'centralizar-dashboard-executivo\.pdf' : 'centralizar-relatorio-executivo\.pdf'\)/);
});

console.log('Todos os testes de tema e navegação passaram.');
