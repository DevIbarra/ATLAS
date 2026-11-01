# Atlas

O Atlas é uma aplicação web para acompanhar missões, usuários e orçamentos. Reúne uma interface em React e uma API em FastAPI, com persistência em PostgreSQL.

## Funcionalidades

- Acesso com e-mail e senha e cadastro de credenciais vinculadas a usuários.
- Cadastro e atualização de usuários e orçamentos.
- Cadastro, consulta, atualização e exclusão de missões, incluindo situações como cancelada e custo zero.
- Painel e calendário de missões, com acompanhamento de valores e diárias.

## Tecnologias

| Componente | Tecnologias principais |
| --- | --- |
| Backend | Python, FastAPI, SQLAlchemy e PostgreSQL |
| Frontend | React, TypeScript e Vite |

## Estrutura do projeto

```text
Atlas/
├── Backend/     # API, modelos, regras de negócio e testes
└── frontend/    # Interface web, integração com a API e testes
```

## Execução local

Para executar o projeto, tenha Python, Node.js, npm e PostgreSQL disponíveis. Consulte os READMEs específicos para versões, configuração do banco e instruções completas.

1. Configure o PostgreSQL e as variáveis de ambiente do backend; prepare as tabelas e inicie a API conforme o [README do backend](Backend/README.md).
2. Em outro terminal, instale as dependências e inicie a interface conforme o [README do frontend](frontend/README.md).
3. Acesse a interface em `http://localhost:5173` e a documentação da API em `http://127.0.0.1:8000/docs`.

No desenvolvimento, o servidor Vite encaminha as requisições para a API local. Para entrar na aplicação, é necessário ter um usuário e uma credencial cadastrados; veja as instruções do backend.

## Documentação

- [Backend: configuração, banco de dados, API e testes](Backend/README.md)
- [Frontend: configuração, desenvolvimento e build](frontend/README.md)
