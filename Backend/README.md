# Atlas Backend

API do Atlas para autenticação de credenciais e gerenciamento de usuários, orçamentos e missões. A aplicação utiliza FastAPI, SQLAlchemy e PostgreSQL.

## Requisitos

- Python 3.12 recomendado.
- PostgreSQL disponível e um banco de dados criado.
- Acesso ao banco com permissões adequadas para criar e alterar as tabelas necessárias.

Execute os comandos abaixo a partir do diretório `Backend/`.

## Instalação e configuração

Crie e ative um ambiente virtual e instale as dependências:

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
```

No Windows, a ativação no PowerShell é feita com `venv\Scripts\Activate.ps1`.

Crie um arquivo `.env` em `Backend/` com os dados do PostgreSQL:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=atlas
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

Substitua os valores pelos dados do seu ambiente. A porta padrão é `5432` caso `DB_PORT` não seja informada. O arquivo `.env` contém credenciais e não deve ser compartilhado ou versionado.

## Banco de dados

Na inicialização, a API cria a tabela `missoes` se ela não existir, adiciona a coluna `situacao` quando necessário e normaliza dados de missões canceladas ou de custo zero. Se a tabela `usuarios` existir, também adiciona a coluna `diarias_possuidas` quando necessário, com valor inicial zero e sem aceitar valores nulos. No PostgreSQL, valores nulos preexistentes nessa coluna são convertidos para zero antes de aplicar a restrição. Esse processo não cria as tabelas `usuarios`, `login` e `orcamento` nem realiza outras atualizações gerais de esquema.

Para um **banco novo e vazio**, após configurar o `.env`, é possível criar as tabelas a partir dos modelos atuais:

```bash
python - <<'PY'
from App.Data.connection import Base, engine
from App.Models import usuarios, login, orcamento, missoes

Base.metadata.create_all(bind=engine)
PY
```

Esse comando cria tabelas ausentes, mas não migra tabelas existentes. Em um banco com dados, avalie o esquema e faça backup antes de aplicar alterações; não há um fluxo geral de migrações para todas as tabelas no projeto.

Para o primeiro acesso, cadastre um usuário com `POST /usuarios/criar` e, em seguida, uma credencial com `POST /login/criar`, usando o `nome_guerra` do usuário criado. Os campos e exemplos de requisição estão disponíveis na documentação interativa da API.

## Execução

```bash
uvicorn App.main:app --reload
```

- API: `http://127.0.0.1:8000`
- Documentação interativa: `http://127.0.0.1:8000/docs`
- Documentação alternativa: `http://127.0.0.1:8000/redoc`

A API precisa conseguir conectar ao banco durante a inicialização para preparar a tabela de missões.

## Rotas principais

| Método | Rota | Operação |
| --- | --- | --- |
| POST | `/login` | Validar e-mail e senha |
| POST | `/login/criar` | Criar credencial para um usuário |
| POST | `/usuarios/criar` | Cadastrar usuário |
| GET | `/usuarios/listar` | Listar usuários |
| PUT | `/usuarios/atualizar/{id_usuario}` | Atualizar usuário |
| POST | `/orcamento/criar` | Cadastrar orçamento |
| GET | `/orcamento/listar` | Listar orçamentos |
| PUT | `/orcamento/atualizar/{id_orcamento}` | Atualizar orçamento |
| POST | `/missoes/criar` | Cadastrar missão |
| GET | `/missoes/listar` | Listar missões |
| PUT | `/missoes/atualizar/{id_missao}` | Atualizar missão |
| DELETE | `/missoes/deletar/{id_missao}` | Excluir missão |

A validação de login existente não emite um token nem protege as demais rotas. A aplicação também não configura CORS; uma publicação em origens diferentes requer configuração adicional no backend.

## Testes

Com as dependências instaladas:

```bash
python -m unittest discover -s tests -v
```

Os testes atuais de missões utilizam SQLite em memória para exercitar regras e alterações do esquema de missões.

## Organização

`App/Routers` define as rotas; `Schemas` contém os contratos de entrada; `Models` representa as tabelas; `Service` e `Core` concentram regras; e `Data` cuida da conexão e dos ajustes do esquema.

[Voltar à documentação do projeto](../README.md)
