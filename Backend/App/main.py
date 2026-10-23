from fastapi import FastAPI

from App.Data.connection import engine
from App.Data.migrations import ensure_missions_schema
from App.Routers.login import router as login_router
from App.Routers.missoes import router as missoes_router
from App.Routers.orcamento import router as orcamento_router
from App.Routers.usuarios import router as usuario_router


app = FastAPI()

app.include_router(login_router)
app.include_router(usuario_router)
app.include_router(orcamento_router)
app.include_router(missoes_router)


@app.on_event("startup")
def startup():
    ensure_missions_schema(engine)
    print("\n🚀 API iniciada com sucesso!")
    print("🌐 API:  http://127.0.0.1:8000")
    print("📚 Docs: http://127.0.0.1:8000/docs\n")
