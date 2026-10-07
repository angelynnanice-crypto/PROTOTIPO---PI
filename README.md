# CENTRALIZAR — Projeto Integrador SENAI

Protótipo acadêmico de **registro e gestão de atividades funcionais**, pensado para o desafio apresentado pela WK Soluções Industriais.

## Qual problema queremos resolver?

Hoje, atividades como substituições, coberturas de horário e apoios operacionais podem ficar espalhadas em mensagens, e-mails e anotações. O CENTRALIZAR reúne esses registros para facilitar a consulta por funcionário, setor e período.

## Como o projeto está organizado?

| Arquivo | Para que serve |
| --- | --- |
| `index.html` | Monta as telas, campos, botões e tabelas. |
| `style.css` | Contém os estilos originais da equipe. |
| `visual-2026.css` | Acrescenta a identidade visual da nova apresentação, sem apagar os estilos anteriores. |
| `app.js` | Controla login, registros, filtros, relatórios e acesso ao Supabase. |
| `CENTRALIZAR_ guia de apoio ao projeto.md` | Guarda a demanda e as anotações da equipe. |

## Funcionalidades que estamos desenvolvendo

- Entrada com e-mail e senha;
- Cadastro e consulta de atividades funcionais;
- Dados de funcionário, setor, tipo de atividade, data e horário;
- Registro de substituto e substituído quando necessário;
- Filtros, indicadores e relatório exportável em CSV;
- Perfis de analista e gestor.

> **Importante:** estas funcionalidades aparecem no código, mas precisam ser testadas com o banco configurado. Uma tela visível não significa, sozinha, que a permissão está segura.

## Como executar para estudar

1. Abra a pasta do projeto no VS Code.
2. Use uma extensão de servidor local, como Live Server, para abrir o `index.html`.
3. Para entrar e gravar informações, o projeto precisa do Supabase configurado com suas tabelas e políticas de acesso.
4. Faça testes apenas com dados fictícios, nunca com dados pessoais reais.

## O caminho de um registro

1. A pessoa entra com sua conta.
2. Abre a tela **Novo Registro de Atividade**.
3. Preenche funcionário, setor, tipo, data, horários e descrição.
4. O sistema confere se o horário final é posterior ao inicial.
5. O registro é enviado ao banco e aparece na lista.
6. Os dados podem ser filtrados e resumidos no relatório.

## O que verificar antes da apresentação

- [ ] Login, cadastro e saída funcionando;
- [ ] Um novo registro aparece após salvar;
- [ ] Edição, histórico e exclusão verificados como gestor;
- [ ] Analista não consegue executar ações reservadas ao gestor;
- [ ] Filtros encontram a atividade correta;
- [ ] Arquivo CSV abre corretamente como planilha;
- [ ] Layout legível no computador e no celular;
- [ ] Políticas de segurança (RLS) conferidas no Supabase.

## Observações para a banca

Este é um **protótipo acadêmico**, não um software oficial ou homologado pela WK. A identidade visual foi inspirada no contexto industrial do desafio e pode ser refinada após a validação da proposta.

Os comentários no código explicam o que cada trecho importante faz. A ideia é que a equipe consiga estudar o projeto, alterar pequenas partes e explicar suas decisões.
