# CENTRALIZAR: guia de apoio ao projeto

Este documento é para leitura. Serve para a equipe tirar dúvidas e para qualquer pessoa ou IA que for ajudar a equipe ter o contexto completo do projeto.

Baseado na parte visível da demanda (a página 2 do PDF não veio). Se ela trouxer outros requisitos, este guia deve ser revisado.

---

## 1. Para quem for ajudar (pessoa ou IA)

- Explique **por que** algo está errado antes de entregar a correção. A equipe está aprendendo.
- Mantenha tudo **simples**. O projeto não precisa ser robusto.
- **Não proponha mudanças de estrutura** (back-end, banco de dados, API, autenticação no servidor). Isso fica para quando o professor técnico voltar e orientar. Veja a seção 7.
- Quando a dúvida for sobre código, peça o trecho exato e o erro que aparece no console do navegador (F12, aba Console).
- Seja honesto sobre limitações. Por exemplo, enquanto os dados ficarem no `localStorage`, o sistema não consegue centralizar registros entre computadores.
- Compare sempre com a demanda (seção 2) antes de sugerir algo novo.

---

## 2. A demanda

**Projeto Integrador 2026/01 6.02 20: Sistema de Registro e Gestão de Atividades Funcionais** (plataforma SAGA SENAI de Inovação).

**Problema:** o registro das atividades dos colaboradores (substituições temporárias, coberturas de horário, apoios operacionais, atividades extraordinárias) é feito por mensagens, e-mails e anotações informais. Isso dificulta a rastreabilidade, o acompanhamento, a organização e a consolidação de dados.

**Benefícios esperados:**

1. Centralizar o registro das atividades funcionais em um único ambiente.
2. Melhorar a rastreabilidade das informações administrativas.
3. Reduzir falhas de comunicação e perda de registros.
4. Facilitar o acompanhamento de **horários**, atividades e **responsáveis**.
5. Apoiar gestores na organização das **alocações de funcionários**.
6. Permitir **relatórios** para consulta, acompanhamento e prestação de contas.
7. Padronizar o processo de registro.
8. Possibilitar integração futura com outras ferramentas e sistemas.

---

## 3. Como o protótipo está hoje

É um front-end feito só com HTML, CSS e JavaScript. Não há servidor nem banco de dados.

### Arquivos

| Arquivo | O que tem |
| --- | --- |
| `index.html` | Telas: login, modal de cadastro, modal de atualizar protocolo, painel, protocolos, novo registro, relatórios |
| `app.js` | Toda a lógica (dados, login, formulários, tabelas, filtros) |
| `style.css` | Visual (tema roxo). Não precisa de mudança para as correções |

### Dados

Ficam em um objeto `State` dentro do `app.js`, com três partes: `user` (usuário logado), `users` (lista de usuários) e `protocols` (lista de protocolos). Os dados são salvos no `localStorage` do navegador, nas chaves `sigraf_protocols` e `sigraf_users`. O nome "sigraf" é resto de uma versão antiga; hoje o sistema se chama CENTRALIZAR.

Cada protocolo tem: `id`, `title`, `category`, `priority`, `desc`, `author`, `date`, `status` e, depois de uma atualização, `history` e `reviewDate`.

### Usuários de teste

| E-mail | Senha | Perfil |
| --- | --- | --- |
| [ana@orgao.gov.br](mailto:ana@orgao.gov.br) | 123456 | analista |
| [carlos@orgao.gov.br](mailto:carlos@orgao.gov.br) | 123456 | gestor |

### Perfis

- **Analista:** vê tudo e registra novas atividades. Na tabela vê "Somente Leitura".
- **Gestor:** além disso, vê os botões Aprovar, Recusar e Atualizar.

### Funções principais do `app.js`

| Função | O que faz |
| --- | --- |
| `loadDataFromStorage` / `saveDataToStorage` / `saveUsersToStorage` | Lê e grava no `localStorage` |
| `initLogin` / `initRegister` / `updateUserSession` | Login, cadastro e início da sessão |
| `initNavigation` | Troca entre as telas (`view-dashboard`, `view-protocolos`, `view-novo`, `view-relatorios`) |
| `initForms` | Formulário de novo registro |
| `initFilters` | Busca por título/ID e filtro de status |
| `openUpdateModal` / `initUpdateModal` | Modal de atualização (só gestor) |
| `updateStatus` | Aprovar ou recusar |
| `renderApp` | Redesenha tudo: chama `renderStats`, `renderRecentTable`, `renderProtocolsTable` e `renderReports` |
| `escapeHTML` | Protege textos antes de colocar no HTML |
| `showToast` | Mensagem temporária no canto da tela |

---

## 4. Bugs conhecidos e por que acontecem

### Bug 1: id do relatório diferente entre HTML e JS AJEITADO

O JS procura `rep-urgent-count`, mas o HTML tem `rep-urgente-count`. `getElementById` devolve `null`, e `null.textContent = ...` gera um `TypeError`.

**Por que quebra tanto:** `renderReports()` é a última chamada de `renderApp()`. O erro interrompe a função, e tudo que vinha depois (fechar o modal, mostrar o aviso na tela) não executa. Os dados chegam a ser salvos, por isso o problema parece aleatório. Efeitos: o modal de atualização não fecha, os avisos de aprovado/recusado não aparecem, e o aviso de boas-vindas no login também não.

**Correção:** deixar o mesmo id nos dois arquivos.

```html
<!-- index.html -->
<strong id="rep-urgent-count">0</strong>
```

### Bug 2: checkbox que não existe no modal de atualizar

No `submit` do `update-form`:

```js
if (p.status !== novo.status && document.getElementById('upd-require-reason').checked && !reason) {
```

O elemento `upd-require-reason` não existe no HTML. Como a condição usa `&&`, ele só é lido quando o status mudou. Aí `null.checked` gera `TypeError`. Resultado: **mudar o status pelo modal nunca funciona**.

**Correção:** remover a parte que lê o checkbox.

```js
if (p.status !== novo.status && !reason) {
```

### Bug 3: listas de prioridade diferentes

O formulário "Novo Registro" tem `Normal` e `Urgente`. O modal de atualizar tem `Baixo`, `Médio`, `Alto` e `Urgente`. Ao abrir um protocolo com prioridade "Normal" no modal, `select.value = 'Normal'` não acha opção, o campo fica vazio, e ao salvar a prioridade vira texto vazio (e o histórico registra "Normal → —").

**Correção:** usar as mesmas opções nos dois lugares.

```html
<option>Baixa</option>
<option>Normal</option>
<option>Alta</option>
<option>Urgente</option>
```

### Limpeza do HTML

- Há um `SS` solto depois de `</html>`. Apagar.
- O bloco `edit-modal` inteiro não tem JS ligado a ele, e seus status ("Em Aberto", "Em Andamento"...) contradizem o resto do sistema. Apagar.
- O relatório mostra "Tempo Médio Simulado: 1.4 dias" escrito direto no HTML. É dado inventado. Remover.

---

## 5. O que falta para atender a demanda

O protótipo atual é um fluxo de aprovação de protocolos. A demanda pede registro de atividades de funcionários. Situação por requisito:

| Requisito | Situação | O que falta |
| --- | --- | --- |
| Centralizar o registro | Parcial | Há uma tela única, mas os dados ficam no navegador de cada pessoa (seção 7) |
| Rastreabilidade | Parcial | Há autor, data e histórico, mas o histórico só grava com o checkbox marcado e a data não tem hora |
| Reduzir perda de registros | Não atende | Limpar o cache apaga tudo (seção 7) |
| Acompanhar horários e responsáveis | Não atende | Não há data/hora da atividade. "Responsável" mostra quem digitou, não quem executou |
| Alocação de funcionários | Não atende | Não há funcionário nem setor |
| Relatórios | Não atende | Só 2 números, sem filtros e sem exportação |
| Padronizar o registro | Parcial | As categorias não refletem os tipos de atividade da demanda |
| Integração futura | Não atende ainda | Depende de API (seção 7) |

### Campos novos sugeridos para "Novo Registro"

| Campo | Para quê |
| --- | --- |
| Funcionário | Quem assumiu a atividade |
| Setor | Apoiar a alocação |
| Tipo | Substituição, cobertura de horário, apoio operacional ou atividade extraordinária (no lugar das categorias atuais) |
| Data, hora de início, hora de fim | Acompanhar horários |
| Registrado por | Preenchido sozinho com o usuário logado |

### Outros ajustes

- Mostrar funcionário, setor, tipo e horário na tabela de protocolos.
- Filtros por funcionário, setor, tipo e período (hoje só há busca por título/ID e status).
- Relatório com total de atividades por funcionário e por setor num período, com exportação CSV ou impressão.
- Gravar o histórico sempre, com data e hora.
- O fluxo Pendente/Aprovado/Recusado não aparece na demanda visível. Pode ficar como extra.

---

## 6. Perguntas frequentes

**O modal de atualizar salva, mas não fecha. Por quê?** É o Bug 1. O `renderApp()` dá erro antes de chegar em `close()`. Corrija o id do relatório.

**Como adiciono um campo novo (por exemplo, "setor")?** São cinco pontos, nesta ordem:

1. Criar o `<input>` ou `<select>` no formulário do `index.html`, com um id (`proto-setor`).
2. No `initForms`, ler o valor ao montar o `newProtocol`: `setor: document.getElementById('proto-setor').value`.
3. Criar uma coluna `<th>` na tabela e mostrar o campo no `renderProtocolsTable`: `<td>${escapeHTML(p.setor || '—')}</td>`.
4. Se for usar em filtro, incluir no `renderProtocolsTable` (função `filter`).
5. Se for editável, incluir também no modal de atualizar e no `openUpdateModal`.

**Adicionei um campo e os protocolos antigos aparecem com "undefined". O que fazer?** Os registros antigos salvos no `localStorage` não têm o campo novo. Use um valor padrão na hora de mostrar (`p.setor || '—'`). Para testar do zero, apague os dados salvos: F12, aba Application (ou Armazenamento), Local Storage, apagar `sigraf_protocols` e `sigraf_users`, e recarregar a página.

**Como faço um filtro por período?** Guarde a data em formato `AAAA-MM-DD` (o campo `<input type="date">` já entrega assim). Strings nesse formato podem ser comparadas diretamente:

```js
const filtrados = State.protocols.filter(p =>
  (!inicio || p.data >= inicio) && (!fim || p.data <= fim)
);
```

Evite guardar a data como `'26/09/2026'`, porque esse formato não ordena nem compara bem.

**Como exporto um relatório em CSV só com JavaScript?**

```js
function exportarCSV(lista) {
  const linhas = [['Funcionário', 'Setor', 'Tipo', 'Data', 'Início', 'Fim']];
  lista.forEach(p => linhas.push([p.funcionario, p.setor, p.tipo, p.data, p.inicio, p.fim]));
  const csv = linhas.map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'relatorio.csv';
  a.click();
}
```

O `\ufeff` no começo faz o Excel reconhecer os acentos, e o `;` como separador funciona no Excel em português.

**Por que o ID do protocolo pode se repetir?** O `initForms` gera `SIG-2026-${State.protocols.length + 1}`. Se um protocolo for apagado, o próximo número já existe. Enquanto não houver exclusão no sistema, não acontece. Se adicionarem exclusão, gerem o número a partir do maior id existente.

**Qualquer pessoa consegue se cadastrar como gestor?** Sim. O perfil é escolhido no cadastro, e a verificação de perfil só existe no JavaScript do navegador, onde pode ser contornada. Isso só tem solução de verdade com validação no servidor (seção 7). Por enquanto, a equipe pode reduzir o problema removendo a opção "Gestor" do cadastro público e deixando o gestor só entre os usuários fixos.

**As senhas estão no código. É um problema?** É, em um sistema real. Para o protótipo escolar, o importante é nunca usar senhas reais nos testes. A proteção de verdade (guardar só o hash da senha) pertence ao back-end e será tratada depois.

**O nome "sigraf" aparece no código. Preciso mudar?** Não é obrigatório. É o nome das chaves do `localStorage`. Se mudar, os dados salvos antes deixam de ser lidos.

**Como testar o sistema como gestor e como analista?** Use os usuários de teste da seção 3 e saia (botão Sair) para trocar de conta.

---

## 7. Fica para depois: aguardar orientação do professor técnico

Estas mudanças de estrutura **não** devem ser feitas agora:

- Back-end e banco de dados compartilhado
- Trocar o `localStorage` por uma API
- Login, perfis e senhas validados no servidor

**Impacto enquanto isso não for feito:** cada navegador guarda seus próprios dados. Um registro feito em um computador não aparece em outro, e limpar o cache apaga tudo. Isso limita os requisitos "centralizar o registro", "reduzir perda de registros" e "integração futura". A equipe deve saber disso e pode explicar na apresentação como limitação conhecida, com a proposta de evolução (back-end com banco compartilhado) já pensada.

**Direção provável, só para referência:** uma API em Python (FastAPI) com banco de dados (SQLite ou MySQL), com o front passando a buscar e gravar os dados pela API em vez de usar `localStorage`. Os detalhes devem ser definidos com o professor.

---

## 8. Como saber se está pronto

Com o que dá para fazer agora:

- Dá para ver **quem** cobriu, em **qual setor** e em **que horário**?
- O gestor filtra por funcionário e período e exporta o relatório?
- O registro mostra quem digitou e quando?
- Mudar o status pelo modal de atualização funciona e o modal fecha?

Dependem do back-end (ficam para a orientação):

- Um registro feito no computador A aparece no computador B?
- Limpar o cache do navegador preserva os registros?