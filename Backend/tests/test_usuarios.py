import unittest

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from App.Data.migrations import ensure_users_schema
from App.Models.login import Login
from App.Models.usuarios import usuarios
from App.Routers.usuarios import deletar_usuario
from App.Schemas.usuarios import CreateUsuarioRequest, UpdateUsuarioRequest
from App.Service.usuarios import atualizar_usuario, cadastrar_usuario


class DeletarUsuarioTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

        usuarios.__table__.create(self.engine)
        Login.__table__.create(self.engine)
        with Session(self.engine) as db:
            db.add_all([
                usuarios(id_user=1, nome_completo="Usuário Um", nome_guerra="UM", posto="Civil", unidade="Unidade", cpf="12345678901", saram="111", tipo_user="usuario", ativo=True),
                usuarios(id_user=2, nome_completo="Usuário Dois", nome_guerra="DOIS", posto="Civil", unidade="Unidade", cpf="12345678902", saram="222", tipo_user="usuario", ativo=True),
            ])
            db.commit()
            db.add(Login(id_user=1, gmail="um@example.com", senha_hash="hash"))
            db.commit()

    def tearDown(self):
        self.engine.dispose()

    def test_exclui_usuario_com_login_e_preserva_outros(self):
        with Session(self.engine) as db:
            self.assertEqual(deletar_usuario(1, db), {"mensagem": "Usuário deletado com sucesso!"})
        with Session(self.engine) as db:
            self.assertIsNone(db.get(usuarios, 1))
            self.assertIsNone(db.get(Login, 1))
            self.assertIsNotNone(db.get(usuarios, 2))

    def test_exclui_usuario_sem_login(self):
        with Session(self.engine) as db:
            deletar_usuario(2, db)
        with Session(self.engine) as db:
            self.assertIsNone(db.get(usuarios, 2))
            self.assertIsNotNone(db.get(Login, 1))

    def test_usuario_inexistente_retorna_404(self):
        with Session(self.engine) as db:
            with self.assertRaises(HTTPException) as raised:
                deletar_usuario(999, db)
            self.assertEqual(raised.exception.status_code, 404)
            self.assertIsNotNone(db.get(usuarios, 1))

    def test_outro_vinculo_impede_exclusao_e_preserva_login(self):
        with self.engine.begin() as connection:
            connection.execute(text("CREATE TABLE vinculo (id INTEGER PRIMARY KEY, id_user INTEGER REFERENCES usuarios(id_user))"))
            connection.execute(text("INSERT INTO vinculo (id, id_user) VALUES (1, 1)"))

        with Session(self.engine) as db:
            with self.assertRaises(HTTPException) as raised:
                deletar_usuario(1, db)
            self.assertEqual(raised.exception.status_code, 409)
            self.assertIsNotNone(db.get(usuarios, 1))
            self.assertIsNotNone(db.get(Login, 1))


class DiariasUsuarioTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        usuarios.__table__.create(self.engine)

    def tearDown(self):
        self.engine.dispose()

    def test_cadastra_e_atualiza_diarias_possuidas(self):
        dados = CreateUsuarioRequest(
            nome_completo="Usuário Exemplo", nome_guerra="EXEMPLO", posto="Civil",
            unidade="Unidade", cpf="12345678901", saram="111", tipo_user="usuario",
            diarias_possuidas=20,
        )
        with Session(self.engine) as db:
            usuario = cadastrar_usuario(dados, db)
            self.assertEqual(usuario.diarias_possuidas, 20)
            atualizar_usuario(usuario.id_user, UpdateUsuarioRequest(diarias_possuidas=25), db)
            user_id = usuario.id_user
        with Session(self.engine) as db:
            self.assertEqual(db.get(usuarios, user_id).diarias_possuidas, 25)

    def test_valor_padrao_e_validacao(self):
        self.assertEqual(UpdateUsuarioRequest().model_dump(exclude_unset=True), {})
        for valor in (None, -1, 1.5, 2147483648):
            with self.subTest(valor=valor), self.assertRaises(ValidationError):
                UpdateUsuarioRequest(diarias_possuidas=valor)

    def test_banco_nao_aceita_diarias_nulas(self):
        dados = CreateUsuarioRequest(
            nome_completo="Usuário Exemplo", nome_guerra="EXEMPLO", posto="Civil",
            unidade="Unidade", cpf="12345678901", saram="111", tipo_user="usuario",
        )
        with Session(self.engine) as db:
            usuario = cadastrar_usuario(dados, db)
            self.assertEqual(usuario.diarias_possuidas, 0)
            with self.assertRaises(IntegrityError):
                db.execute(text("UPDATE usuarios SET diarias_possuidas = NULL WHERE id_user = :id"), {"id": usuario.id_user})
                db.commit()
            db.rollback()

    def test_migracao_adiciona_coluna_sem_perder_dados_e_preserva_valores(self):
        engine = create_engine("sqlite:///:memory:")
        try:
            with engine.begin() as connection:
                connection.execute(text("CREATE TABLE usuarios (id_user INTEGER PRIMARY KEY, nome_completo TEXT)"))
                connection.execute(text("INSERT INTO usuarios VALUES (1, 'Nome existente')"))
            ensure_users_schema(engine)
            with engine.begin() as connection:
                self.assertIn("diarias_possuidas", {col["name"] for col in inspect(connection).get_columns("usuarios")})
                coluna = next(col for col in inspect(connection).get_columns("usuarios") if col["name"] == "diarias_possuidas")
                self.assertFalse(coluna["nullable"])
                self.assertEqual(connection.execute(text("SELECT nome_completo, diarias_possuidas FROM usuarios")).one(), ("Nome existente", 0))
                connection.execute(text("UPDATE usuarios SET diarias_possuidas = 20"))
            ensure_users_schema(engine)
            with engine.connect() as connection:
                self.assertEqual(connection.execute(text("SELECT diarias_possuidas FROM usuarios")).scalar_one(), 20)
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
