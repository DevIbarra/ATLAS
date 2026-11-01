# Atlas Frontend

Interface web do Atlas, desenvolvida com React, TypeScript e Vite. A aplicação oferece acesso por credenciais, painel, usuários, orçamentos, missões e calendário, integrados à API do projeto.

## Requisitos

- Node.js `20.19.0` ou superior na linha 20, ou `22.12.0` ou superior, conforme as dependências atuais.
- npm.
- Backend configurado e disponível para as funcionalidades que acessam a API. Consulte o [README do backend](../Backend/README.md).

Execute os comandos abaixo a partir do diretório `frontend/`.

## Instalação e desenvolvimento

```bash
npm ci
npm run dev
```

Acesse `http://localhost:5173`. Com `VITE_API_URL` vazia ou não definida, o Vite encaminha `/login` para `http://127.0.0.1:8000/login` e os caminhos iniciados por `/api` para o backend, removendo o prefixo `/api`.

## Configuração da API

O arquivo `.env.example` apresenta a variável disponível. Para configurá-la, copie-o para `.env` e informe a URL base da API, sem barra final:

```dotenv
VITE_API_URL=https://api.exemplo.com
```

Em desenvolvimento local com o proxy do Vite, deixe o valor vazio. Após alterar variáveis, reinicie o servidor de desenvolvimento ou gere o build novamente. Para acesso direto à API em outra origem, é necessário configurar CORS no backend: a aplicação atual ainda não fornece essa configuração.

O proxy descrito acima pertence ao servidor de desenvolvimento do Vite. Uma publicação com `VITE_API_URL` vazia precisa de um proxy equivalente no servidor que hospeda o frontend, incluindo as rotas `/login` e `/api`.

## Comandos

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento. |
| `npm test` | Executa os testes com o runner nativo do Node.js. |
| `npm run build` | Verifica o TypeScript e gera a aplicação em `dist/`. |
| `npm run preview` | Pré-visualiza localmente o build gerado. |

## Organização

Os componentes de páginas e as regras de cálculo ficam em `src/`; os módulos de comunicação com o backend ficam em `src/api/`. Os testes atuais cobrem cálculos de orçamento, diárias e situações de missão.

[Voltar à documentação do projeto](../README.md)
