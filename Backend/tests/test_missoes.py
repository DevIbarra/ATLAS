from datetime import date
import unittest

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session

from App.Models.missoes import Missao
from App.Data.migrations import ensure_missions_schema
from App.Routers.missoes import atualizar_missao, criar_missao, deletar_missao
from App.Schemas.missoes import CreateMissaoRequest, UpdateMissaoRequest


class DeletarMissaoTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Missao.__table__.create(self.engine)
        with Session(self.engine) as db:
            db.add_all([
                Missao(
                    numero_ordem_servico="0001",
                    finalidade="ADMINISTRATIVO",
                    data_missao=date(2026, 10, 9),
                    militar_civil="IBARRA",
                    diarias="5",
                ),
                Missao(
                    numero_ordem_servico="0002",
                    finalidade="ADMINISTRATIVO",
                    data_missao=date(2026, 10, 20),
                    militar_civil="IBARRA",
                    diarias="2",
                ),
            ])
            db.commit()

    def tearDown(self):
        self.engine.dispose()

    def test_exclui_e_persiste_somente_a_missao_selecionada(self):
        with Session(self.engine) as db:
            response = deletar_missao(1, db)

        self.assertEqual(response, {"mensagem": "Missão excluída com sucesso!"})
        with Session(self.engine) as db:
            self.assertIsNone(db.get(Missao, 1))
            remaining = db.scalars(select(Missao)).all()
            self.assertEqual(len(remaining), 1)
            self.assertEqual(remaining[0].numero_ordem_servico, "0002")
            self.assertEqual(remaining[0].diarias, "2")

    def test_missao_inexistente_retorna_404_e_preserva_os_dados(self):
        with Session(self.engine) as db:
            with self.assertRaises(HTTPException) as raised:
                deletar_missao(999, db)

            self.assertEqual(raised.exception.status_code, 404)
            self.assertEqual(raised.exception.detail, "Missão não encontrada.")
            self.assertEqual(len(db.scalars(select(Missao)).all()), 2)

    def test_repetir_a_exclusao_retorna_404(self):
        with Session(self.engine) as db:
            deletar_missao(1, db)
            with self.assertRaises(HTTPException) as raised:
                deletar_missao(1, db)

            self.assertEqual(raised.exception.status_code, 404)
            self.assertIsNotNone(db.get(Missao, 2))


class SituacaoMissaoTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        ensure_missions_schema(self.engine)
        self.mission_data = {
            "numero_ordem_servico": "0003",
            "finalidade": "AÇÃO INICIAL MILITAR",
            "data_missao": date(2026, 10, 27),
            "valor": 1500,
        }
        self.financial_data = {
            "diarias": "4",
            "numero_pcdp": "123456",
            "zimbra": "Feito",
            "facdp": "Feito",
            "oficio_sigadaer": "Feito",
            "ob": "OB-004",
            "data_ob": date(2026, 10, 23),
            "numero_adt_bol_publicacao": "BOL-004",
        }

    def assert_zero_cost_fields(self, mission):
        self.assertEqual(mission.valor, 0)
        self.assertEqual(mission.diarias, "0")
        for field in ("numero_pcdp", "zimbra", "facdp", "oficio_sigadaer", "ob", "data_ob", "numero_adt_bol_publicacao"):
            with self.subTest(campo=field):
                self.assertIsNone(getattr(mission, field))

    def assert_cancelled_fields(self, mission):
        self.assert_zero_cost_fields(mission)
        for field in ("atenas_tarjada", "siloms", "matricula"):
            with self.subTest(campo=field):
                self.assertIsNone(getattr(mission, field))

    def tearDown(self):
        self.engine.dispose()

    def test_cria_e_persiste_cada_situacao(self):
        ids = {}
        with Session(self.engine) as db:
            for situation in ("normal", "custo_zero", "cancelada"):
                with self.subTest(situacao=situation):
                    request = CreateMissaoRequest(**self.mission_data, situacao=situation)
                    mission = criar_missao(request, db)["missao"]
                    ids[situation] = mission.id_missao

        with Session(self.engine) as db:
            for situation, mission_id in ids.items():
                with self.subTest(situacao=situation):
                    mission = db.get(Missao, mission_id)
                    self.assertEqual(mission.situacao, situation)
                    self.assertEqual(mission.valor, 1500 if situation == "normal" else 0)

    def test_cancela_zerando_valor_e_permite_novo_valor_ao_reativar(self):
        with Session(self.engine) as db:
            mission = criar_missao(CreateMissaoRequest(**self.mission_data), db)["missao"]
            for situation in ("cancelada", "normal"):
                with self.subTest(situacao=situation):
                    request = UpdateMissaoRequest(**self.mission_data, situacao=situation)
                    updated = atualizar_missao(mission.id_missao, request, db)["missao"]
                    self.assertEqual(updated.situacao, situation)
                    self.assertEqual(updated.valor, 1500 if situation == "normal" else 0)

    def test_custo_zero_zera_valor_na_edicao(self):
        with Session(self.engine) as db:
            mission = criar_missao(CreateMissaoRequest(**self.mission_data), db)["missao"]
            request = UpdateMissaoRequest(**self.mission_data, situacao="custo_zero")
            updated = atualizar_missao(mission.id_missao, request, db)["missao"]
            self.assertEqual(updated.situacao, "custo_zero")
            self.assertEqual(updated.valor, 0)

    def test_requisicao_antiga_adota_normal_e_preserva_situacao_ao_editar(self):
        with Session(self.engine) as db:
            mission = criar_missao(CreateMissaoRequest(**self.mission_data), db)["missao"]
            self.assertEqual(mission.situacao, "normal")
            mission.situacao = "cancelada"
            db.commit()

            updated = atualizar_missao(mission.id_missao, UpdateMissaoRequest(**self.mission_data), db)["missao"]
            self.assertEqual(updated.situacao, "cancelada")

    def test_rejeita_situacao_invalida(self):
        with self.assertRaises(ValidationError):
            CreateMissaoRequest(**self.mission_data, situacao="invalida")

    def test_requisicao_antiga_nao_reintroduz_valor_em_missao_custo_zero(self):
        with Session(self.engine) as db:
            mission = criar_missao(CreateMissaoRequest(**self.mission_data, situacao="custo_zero"), db)["missao"]
            updated = atualizar_missao(mission.id_missao, UpdateMissaoRequest(**self.mission_data), db)["missao"]
            self.assertEqual(updated.situacao, "custo_zero")
            self.assertEqual(updated.valor, 0)

    def test_criacao_custo_zero_zera_diarias_e_limpa_campos(self):
        data = {**self.mission_data, **self.financial_data, "situacao": "custo_zero", "siloms": "2948"}
        with Session(self.engine) as db:
            mission = criar_missao(CreateMissaoRequest(**data), db)["missao"]
            mission_id = mission.id_missao
        with Session(self.engine) as db:
            mission = db.get(Missao, mission_id)
            self.assert_zero_cost_fields(mission)
            self.assertEqual(mission.siloms, "2948")
            self.assertEqual(mission.data_missao, self.mission_data["data_missao"])

    def test_edicao_para_custo_zero_limpa_dados_anteriores(self):
        data = {**self.mission_data, **self.financial_data}
        with Session(self.engine) as db:
            mission = criar_missao(CreateMissaoRequest(**data), db)["missao"]
            request = UpdateMissaoRequest(**{**data, "situacao": "custo_zero"})
            updated = atualizar_missao(mission.id_missao, request, db)["missao"]
            self.assert_zero_cost_fields(updated)

    def test_cliente_antigo_nao_reintroduz_campos_em_custo_zero(self):
        with Session(self.engine) as db:
            mission = criar_missao(CreateMissaoRequest(**self.mission_data, situacao="custo_zero"), db)["missao"]
            request = UpdateMissaoRequest(**{**self.mission_data, **self.financial_data})
            self.assert_zero_cost_fields(atualizar_missao(mission.id_missao, request, db)["missao"])

    def test_campos_nao_aplicaveis_invalidos_nao_bloqueiam_custo_zero(self):
        data = {
            **self.mission_data, "situacao": "custo_zero", "valor": -1,
            "data_ob": "data inválida", "diarias": "inválida", "numero_pcdp": "x" * 200,
        }
        request = CreateMissaoRequest(**data)
        self.assert_zero_cost_fields(request)
        with self.assertRaises(ValidationError):
            CreateMissaoRequest(**{**data, "numero_ordem_servico": ""})

    def test_normal_preserva_campos_financeiros(self):
        with Session(self.engine) as db:
            data = {**self.mission_data, **self.financial_data, "situacao": "normal"}
            mission = criar_missao(CreateMissaoRequest(**data), db)["missao"]
            for field, value in self.financial_data.items():
                self.assertEqual(getattr(mission, field), value)

    def test_cancelada_limpa_dados_operacionais_preservando_identificacao(self):
        data = {
            **self.mission_data, **self.financial_data, "situacao": "cancelada",
            "atenas_tarjada": "Atenas", "siloms": "2948", "matricula": "PP-TCH", "militar_civil": "IBARRA",
        }
        with Session(self.engine) as db:
            mission_id = criar_missao(CreateMissaoRequest(**data), db)["missao"].id_missao
        with Session(self.engine) as db:
            mission = db.get(Missao, mission_id)
            self.assert_cancelled_fields(mission)
            self.assertEqual(mission.numero_ordem_servico, data["numero_ordem_servico"])
            self.assertEqual(mission.finalidade, data["finalidade"])
            self.assertEqual(mission.militar_civil, "IBARRA")
            self.assertEqual(mission.data_missao, data["data_missao"])

    def test_cancelamento_na_edicao_e_cliente_antigo_nao_reintroduzem_campos(self):
        data = {
            **self.mission_data, **self.financial_data,
            "atenas_tarjada": "Atenas", "siloms": "2948", "matricula": "PP-TCH",
        }
        with Session(self.engine) as db:
            mission = criar_missao(CreateMissaoRequest(**data), db)["missao"]
            cancel_request = UpdateMissaoRequest(**{**data, "situacao": "cancelada"})
            self.assert_cancelled_fields(atualizar_missao(mission.id_missao, cancel_request, db)["missao"])
            legacy_request = UpdateMissaoRequest(**data)
            updated = atualizar_missao(mission.id_missao, legacy_request, db)["missao"]
            self.assertEqual(updated.situacao, "cancelada")
            self.assert_cancelled_fields(updated)

    def test_cancelada_ignora_campos_nao_aplicaveis_invalidos(self):
        data = {
            **self.mission_data, "situacao": "cancelada", "data_ob": "inválida",
            "valor": -1, "diarias": "inválida", "siloms": "x" * 200,
        }
        self.assert_cancelled_fields(CreateMissaoRequest(**data))


class MigracaoSituacaoTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")

    def tearDown(self):
        self.engine.dispose()

    def test_cria_tabela_nova_e_pode_executar_novamente(self):
        ensure_missions_schema(self.engine)
        ensure_missions_schema(self.engine)
        self.assertIn("situacao", {column["name"] for column in inspect(self.engine).get_columns("missoes")})

    def test_adiciona_situacao_normal_sem_alterar_missoes_existentes(self):
        with self.engine.begin() as connection:
            connection.execute(text(
                "CREATE TABLE missoes (id_missao INTEGER PRIMARY KEY, "
                "numero_ordem_servico VARCHAR(80), valor NUMERIC(12, 2))"
            ))
            connection.execute(text("INSERT INTO missoes VALUES (1, '0001', 1000)"))

        ensure_missions_schema(self.engine)
        ensure_missions_schema(self.engine)

        with self.engine.connect() as connection:
            row = connection.execute(text("SELECT numero_ordem_servico, valor, situacao FROM missoes")).one()
            self.assertEqual(tuple(row), ("0001", 1000, "normal"))

    def test_corrige_canceladas_e_custo_zero_preservando_missoes_normais(self):
        ensure_missions_schema(self.engine)
        with Session(self.engine) as db:
            for situation in ("normal", "cancelada", "custo_zero"):
                db.add(Missao(
                    numero_ordem_servico=situation, finalidade="ADMINISTRATIVO",
                    data_missao=date(2026, 10, 30), situacao=situation, valor=2000,
                    diarias="4", numero_pcdp="123456", zimbra="Feito", facdp="Feito",
                    oficio_sigadaer="Feito", ob="OB-004", data_ob=date(2026, 10, 23),
                    numero_adt_bol_publicacao="BOL-004", siloms="2948", atenas_tarjada="Atenas", matricula="PP-TCH",
                ))
            db.commit()

        ensure_missions_schema(self.engine)
        ensure_missions_schema(self.engine)

        with Session(self.engine) as db:
            missions = {mission.situacao: mission for mission in db.scalars(select(Missao)).all()}
            zero_cost = missions["custo_zero"]
            self.assertEqual(zero_cost.diarias, "0")
            self.assertEqual(zero_cost.valor, 0)
            for field in ("numero_pcdp", "zimbra", "facdp", "oficio_sigadaer", "ob", "data_ob", "numero_adt_bol_publicacao"):
                self.assertIsNone(getattr(zero_cost, field))
            self.assertEqual(zero_cost.siloms, "2948")
            cancelled = missions["cancelada"]
            self.assertEqual(cancelled.diarias, "0")
            self.assertEqual(cancelled.valor, 0)
            for field in ("numero_pcdp", "zimbra", "facdp", "oficio_sigadaer", "ob", "data_ob", "numero_adt_bol_publicacao", "atenas_tarjada", "siloms", "matricula"):
                self.assertIsNone(getattr(cancelled, field))
            self.assertEqual(missions["normal"].diarias, "4")
            self.assertEqual(missions["normal"].valor, 2000)
            self.assertEqual(missions["normal"].ob, "OB-004")


if __name__ == "__main__":
    unittest.main()
