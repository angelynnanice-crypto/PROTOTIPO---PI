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
  assert.match(html, /src="app\.js\?v=11"/);
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

console.log('Todos os testes de tema e navegação passaram.');
