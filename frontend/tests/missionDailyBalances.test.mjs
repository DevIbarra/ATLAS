import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const compiledDirectory = await mkdtemp(join(tmpdir(), "atlas-diarias-test-"));
let dailyBalances;
try {
  execFileSync(process.execPath, [
    fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url)),
    fileURLToPath(new URL("../src/missionDailyBalances.ts", import.meta.url)),
    "--target", "ES2022", "--module", "commonjs", "--strict", "--skipLibCheck",
    "--outDir", compiledDirectory,
  ], { cwd: compiledDirectory, stdio: "pipe" });
  dailyBalances = createRequire(import.meta.url)(join(compiledDirectory, "missionDailyBalances.js"));
} finally {
  await rm(compiledDirectory, { recursive: true, force: true });
}
const { getMissionDailyBalances, parseDailyAmount } = dailyBalances;

function mission(id, date, amount, person = "IBARRA") {
  return { id_missao: id, data_missao: date, diarias: amount, militar_civil: person };
}

test("soma somente as missões anteriores da mesma pessoa, pela data da missão", () => {
  const missions = [
    mission(1, "2026-10-20", "3"),
    mission(2, "2026-10-09", "5"),
    mission(3, "2026-10-10", "12", "SILVA"),
    mission(4, "2026-11-01", "4"),
  ];
  const originalOrder = [...missions];
  const balances = getMissionDailyBalances(missions);

  assert.deepEqual(balances.get(2), { previous: 0, current: 5, total: 5 });
  assert.deepEqual(balances.get(1), { previous: 5, current: 3, total: 8 });
  assert.deepEqual(balances.get(3), { previous: 0, current: 12, total: 12 });
  assert.deepEqual(balances.get(4), { previous: 8, current: 4, total: 12 });
  assert.deepEqual(missions, originalOrder);
});

test("considera o histórico completo mesmo quando só uma missão é exibida pela busca", () => {
  const missions = [mission(1, "2026-10-09", "5"), mission(2, "2026-10-20", "3")];
  const balances = getMissionDailyBalances(missions);
  const searchResults = missions.filter((record) => record.id_missao === 2);

  assert.equal(balances.get(searchResults[0].id_missao).total, 8);
});

test("desempata missões no mesmo dia pela ordem de cadastro", () => {
  const missions = [mission(3, "2026-10-09", "1"), mission(1, "2026-10-09", "5"), mission(2, "2026-10-09", "2,5")];
  const balances = getMissionDailyBalances(missions);

  assert.equal(balances.get(1).total, 5);
  assert.equal(balances.get(2).total, 7.5);
  assert.equal(balances.get(3).total, 8.5);
});

test("reconhece o nome de guerra com diferenças de caixa e espaços", () => {
  const balances = getMissionDailyBalances([
    mission(1, "2026-01-01", "5", "  da  Silva "),
    mission(2, "2026-01-02", "2,5", "DA SILVA"),
  ]);

  assert.equal(balances.get(2).total, 7.5);
});

test("inclui anos anteriores e mantém missões sem pessoa fora do acumulado", () => {
  const balances = getMissionDailyBalances([
    mission(1, "2025-12-20", "5"),
    mission(2, "2026-01-02", "2"),
    mission(3, "2026-01-01", "10", null),
    mission(4, "2026-01-01", "20", " "),
  ]);

  assert.equal(balances.get(2).total, 7);
  assert.equal(balances.has(3), false);
  assert.equal(balances.has(4), false);
});

test("aceita diárias fracionadas com vírgula ou ponto e campos vazios", () => {
  assert.equal(parseDailyAmount(" 2,5 "), 2.5);
  assert.equal(parseDailyAmount("0.5"), 0.5);
  assert.equal(parseDailyAmount(".5"), 0.5);
  assert.equal(parseDailyAmount(null), 0);
  assert.equal(parseDailyAmount(""), 0);
  assert.equal(parseDailyAmount("0"), 0);
  const balances = getMissionDailyBalances([
    mission(1, "2026-01-01", "0,1"),
    mission(2, "2026-01-02", "0,2"),
    mission(3, "2026-01-03", null),
  ]);
  assert.equal(balances.get(3).total, 0.3);
});

test("não apresenta um acumulado incorreto quando há quantidades inválidas no histórico", () => {
  for (const value of ["-1", "texto", "1,2,3", "Infinity", "1e3", "0x10"]) {
    assert.equal(parseDailyAmount(value), null);
  }
  const balances = getMissionDailyBalances([
    mission(1, "2026-01-01", "inválido"),
    mission(2, "2026-01-02", "5"),
    mission(3, "2026-01-03", "3", "SILVA"),
  ]);

  assert.equal(balances.get(1).total, null);
  assert.deepEqual(balances.get(2), { previous: null, current: 5, total: null });
  assert.equal(balances.get(3).total, 3);
});

test("recalcula as missões seguintes depois de editar a quantidade, a pessoa ou a data", () => {
  const missions = [mission(1, "2026-10-09", "5"), mission(2, "2026-10-20", "3")];
  assert.equal(getMissionDailyBalances([{ ...missions[0], diarias: "7" }, missions[1]]).get(2).total, 10);
  assert.equal(getMissionDailyBalances([{ ...missions[0], militar_civil: "SILVA" }, missions[1]]).get(2).total, 3);
  assert.equal(getMissionDailyBalances([{ ...missions[0], data_missao: "2026-10-21" }, missions[1]]).get(2).total, 3);
});

test("remove as diárias da missão excluída dos acumulados seguintes", () => {
  const missions = [
    mission(1, "2026-10-09", "5"),
    mission(2, "2026-10-20", "2,5"),
    mission(3, "2026-10-21", "3", "SILVA"),
    mission(4, "2026-10-22", "1"),
  ];
  const remainingMissions = missions.filter((record) => record.id_missao !== 1);
  const balances = getMissionDailyBalances(remainingMissions);

  assert.equal(balances.has(1), false);
  assert.deepEqual(balances.get(2), { previous: 0, current: 2.5, total: 2.5 });
  assert.deepEqual(balances.get(4), { previous: 2.5, current: 1, total: 3.5 });
  assert.equal(balances.get(3).total, 3);
});

test("missões canceladas ou custo zero não somam diárias ao acumulado", () => {
  const missions = [
    mission(1, "2026-10-09", "5"),
    { ...mission(2, "2026-10-10", "4"), situacao: "cancelada" },
    { ...mission(3, "2026-10-11", "3"), situacao: "custo_zero" },
    mission(4, "2026-10-12", "2"),
  ];
  const balances = getMissionDailyBalances(missions);
  assert.deepEqual(balances.get(2), { previous: 5, current: 0, total: 5 });
  assert.deepEqual(balances.get(3), { previous: 5, current: 0, total: 5 });
  assert.equal(balances.get(4).total, 7);
  const reactivated = missions.map((record) => ({ ...record, situacao: "normal" }));
  assert.equal(getMissionDailyBalances(reactivated).get(4).total, 14);
});
