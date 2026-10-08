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
  assert.match(html, /src="app\.js\?v=14"/);
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

teste('organiza o dashboard como uma central de comando', () => {
  assert.match(html, /class="command-header"/);
  assert.match(html, /id="dashboard-period"/);
  assert.match(html, /id="dashboard-updated"/);
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
  assert.match(js, /getDashboardProtocols/);
  assert.match(js, /renderCommandCenter/);
});

teste('possui acabamento específico do command center', () => {
  assert.match(css, /\.command-header/);
  assert.match(css, /\.kpi-trend/);
  assert.match(css, /\.priority-chart/);
  assert.match(css, /\.people-workload/);
});

console.log('Todos os testes de tema e navegação passaram.');
