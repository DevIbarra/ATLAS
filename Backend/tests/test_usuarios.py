import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session

from App.Models.login import Login
from App.Models.usuarios import usuarios
from App.Routers.usuarios import deletar_usuario


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


if __name__ == "__main__":
    unittest.main()
