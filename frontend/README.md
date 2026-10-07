# Atlas Frontend

Tela de acesso do Atlas integrada ao endpoint `POST /login` do FastAPI.

## Executar

Com a API disponível em `http://127.0.0.1:8000`:

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`. Durante o desenvolvimento, o Vite encaminha
automaticamente as chamadas de `/login` para o backend.

## Produção

Copie `.env.example` para `.env` e defina `VITE_API_URL` quando o backend
estiver em outro domínio. Nesse cenário, o backend também deve liberar a origem
do frontend via CORS.
