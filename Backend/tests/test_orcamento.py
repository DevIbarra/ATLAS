import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from App.Models.orcamento import orcamento
from App.Routers.orcamento import deletar_orcamento


class DeletarOrcamentoTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        orcamento.__table__.create(self.engine)
        with Session(self.engine) as db:
            db.add_all([
                orcamento(id=1, nome="Administrativo", valor=1000),
                orcamento(id=2, nome="Operacional", valor=2000),
            ])
            db.commit()

    def tearDown(self):
        self.engine.dispose()

    def test_exclui_apenas_o_orcamento_selecionado(self):
        with Session(self.engine) as db:
            self.assertEqual(deletar_orcamento(1, db), {"mensagem": "Orçamento deletado com sucesso!"})
        with Session(self.engine) as db:
            self.assertIsNone(db.get(orcamento, 1))
            self.assertEqual(db.get(orcamento, 2).nome, "Operacional")

    def test_orcamento_inexistente_retorna_404(self):
        with Session(self.engine) as db:
            with self.assertRaises(HTTPException) as raised:
                deletar_orcamento(99, db)
            self.assertEqual(raised.exception.status_code, 404)
            self.assertIsNotNone(db.get(orcamento, 1))


if __name__ == "__main__":
    unittest.main()
