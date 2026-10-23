import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const compiledDirectory = await mkdtemp(join(tmpdir(), "atlas-situacao-test-"));
let missionStatus;
try {
  execFileSync(process.execPath, [
    fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url)),
    fileURLToPath(new URL("../src/missionStatus.ts", import.meta.url)),
    "--target", "ES2022", "--module", "commonjs", "--strict", "--skipLibCheck",
    "--outDir", compiledDirectory,
  ], { cwd: compiledDirectory, stdio: "pipe" });
  missionStatus = createRequire(import.meta.url)(join(compiledDirectory, "missionStatus.js"));
} finally {
  await rm(compiledDirectory, { recursive: true, force: true });
}
const { getMissionExpense, isMissionCancelled, matchesMissionStatusFilter, normalizeMissionForm } = missionStatus;

test("missões normais e antigas mantêm seu custo", () => {
  assert.equal(getMissionExpense({ situacao: "normal", valor: 1500 }), 1500);
  assert.equal(getMissionExpense({ valor: 1000 }), 1000);
  assert.equal(getMissionExpense({ valor: null }), 0);
});

test("custo zero e canceladas não geram despesas mesmo que guardem valor anterior", () => {
  assert.equal(getMissionExpense({ situacao: "custo_zero", valor: 1500 }), 0);
  assert.equal(getMissionExpense({ situacao: "cancelada", valor: 2000 }), 0);
  assert.equal(isMissionCancelled({ situacao: "cancelada" }), true);
  assert.equal(isMissionCancelled({ situacao: "custo_zero" }), false);
  assert.equal(isMissionCancelled({}), false);
});

test("a pagar e prestar conta respeitam PCDP e OB", () => {
  assert.equal(matchesMissionStatusFilter({ numero_pcdp: null }, "payable"), true);
  assert.equal(matchesMissionStatusFilter({ numero_pcdp: "  " }, "payable"), true);
  assert.equal(matchesMissionStatusFilter({ numero_pcdp: "123456" }, "payable"), false);
  assert.equal(matchesMissionStatusFilter({ numero_pcdp: "123456", ob: " " }, "accountability"), true);
  assert.equal(matchesMissionStatusFilter({ numero_pcdp: "123456", ob: "OB-123" }, "accountability"), false);
  assert.equal(matchesMissionStatusFilter({ numero_pcdp: "", ob: null }, "accountability"), false);
});

test("canceladas e custo zero têm filtros próprios e não aparecem nas pendências", () => {
  for (const situacao of ["custo_zero", "cancelada"]) {
    assert.equal(matchesMissionStatusFilter({ situacao }, "payable"), false);
    assert.equal(matchesMissionStatusFilter({ situacao, numero_pcdp: "123456" }, "accountability"), false);
    assert.equal(matchesMissionStatusFilter({ situacao }, situacao), true);
    assert.equal(matchesMissionStatusFilter({ situacao }, "all"), true);
  }
  assert.equal(matchesMissionStatusFilter({ situacao: "normal" }, "cancelada"), false);
  assert.equal(matchesMissionStatusFilter({ situacao: "normal" }, "custo_zero"), false);
});

test("custo zero limpa os campos financeiros e de publicação, preservando os demais dados", () => {
  const form = {
    situacao: "custo_zero", valor: "2.000", diarias: "4", numero_pcdp: "123456",
    zimbra: "Feito", facdp: "Feito", oficio_sigadaer: "Feito", ob: "OB-004",
    data_ob: "23/10/2026", numero_adt_bol_publicacao: "BOL-004",
    numero_ordem_servico: "004", finalidade: "AÇÃO INICIAL MILITAR", militar_civil: "IBARRA",
    matricula: "PP-TCH", siloms: "2948", atenas_tarjada: "Sem", data_missao: "30/10/2026",
  };
  const result = normalizeMissionForm(form);
  assert.deepEqual(result, {
    ...form, valor: "0", diarias: "0", numero_pcdp: "", zimbra: "", facdp: "",
    oficio_sigadaer: "", ob: "", data_ob: "", numero_adt_bol_publicacao: "",
  });
  assert.equal(form.diarias, "4");
  assert.equal(form.ob, "OB-004");
  assert.deepEqual(normalizeMissionForm({ ...result, numero_pcdp: "novo", diarias: "9" }), result);
});

test("normal mantém os campos preenchidos e permite edição após mudar a situação", () => {
  const form = { situacao: "normal", diarias: "4", numero_pcdp: "123456", ob: "OB-004" };
  assert.deepEqual(normalizeMissionForm(form), form);
  const zeroCost = normalizeMissionForm({ situacao: "custo_zero", diarias: "4" });
  assert.equal(normalizeMissionForm({ ...zeroCost, situacao: "normal", diarias: "3" }).diarias, "3");
});

test("cancelada fica sem dados financeiros e operacionais, mantendo a identificação", () => {
  const form = {
    situacao: "cancelada", numero_ordem_servico: "004", finalidade: "AÇÃO INICIAL MILITAR",
    militar_civil: "IBARRA", data_missao: "30/10/2026", valor: "2.000", diarias: "4",
    numero_pcdp: "123456", zimbra: "Feito", facdp: "Feito", oficio_sigadaer: "Feito",
    ob: "OB-004", data_ob: "23/10/2026", numero_adt_bol_publicacao: "BOL-004",
    atenas_tarjada: "Atenas", siloms: "2948", matricula: "PP-TCH",
  };
  const result = normalizeMissionForm(form);
  assert.deepEqual(result, {
    ...form, valor: "0", diarias: "0", numero_pcdp: "", zimbra: "", facdp: "",
    oficio_sigadaer: "", ob: "", data_ob: "", numero_adt_bol_publicacao: "",
    atenas_tarjada: "", siloms: "", matricula: "",
  });
  assert.equal(form.valor, "2.000");
  assert.deepEqual(normalizeMissionForm({ ...result, siloms: "novo", numero_pcdp: "novo" }), result);
  assert.equal(normalizeMissionForm({ ...result, situacao: "normal", siloms: "novo" }).siloms, "novo");
});
