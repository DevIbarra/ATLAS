from fastapi import FastAPI

from App.Routers.login import router as login_router
from App.Routers.usuarios import router as usuario_router


app = FastAPI()

app.include_router(login_router)
app.include_router(usuario_router)


@app.on_event("startup")
def startup():
    print("\n🚀 API iniciada com sucesso!")
    print("🌐 API:  http://127.0.0.1:8000")
    print("📚 Docs: http://127.0.0.1:8000/docs\n")