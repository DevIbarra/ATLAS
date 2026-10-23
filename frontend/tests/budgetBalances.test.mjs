import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const compiledDirectory = await mkdtemp(join(tmpdir(), "atlas-orcamento-test-"));
let budgetBalances;
try {
  execFileSync(process.execPath, [
    fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url)),
    fileURLToPath(new URL("../src/budgetBalances.ts", import.meta.url)),
    "--target", "ES2022", "--module", "commonjs", "--strict", "--skipLibCheck",
    "--outDir", compiledDirectory,
  ], { cwd: compiledDirectory, stdio: "pipe" });
  budgetBalances = createRequire(import.meta.url)(join(compiledDirectory, "budgetBalances.js"));
} finally {
  await rm(compiledDirectory, { recursive: true, force: true });
}
const { getBudgetBalances } = budgetBalances;

const initialBudget = { id: 1, nome: "AÇÃO INICIAL MILITAR", valor: 100000 };

test("desconta todas as missões da finalidade do valor cadastrado", () => {
  const [balance] = getBudgetBalances([initialBudget], [
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 1000, numero_pcdp: "123456", data_missao: "2026-10-09" },
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 100, numero_pcdp: null, data_missao: "2026-05-10" },
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 1500, numero_pcdp: null, data_missao: "2026-10-27" },
  ]);

  assert.equal(balance.remainingValue, 97400);
  assert.equal(balance.spentValue, 2600);
  assert.equal(balance.availablePercentage, 97);
  assert.equal(balance.valor, 100000);
  assert.equal(initialBudget.valor, 100000);
});

test("cada orçamento desconta somente as missões de sua finalidade", () => {
  const balances = getBudgetBalances([initialBudget, { id: 2, nome: "ADMINISTRATIVO", valor: 10000 }], [
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 1000 },
    { finalidade: "ADMINISTRATIVO", valor: 2500 },
    { finalidade: "EXTERIOR", valor: 8000 },
  ]);

  assert.equal(balances[0].remainingValue, 99000);
  assert.equal(balances[1].remainingValue, 7500);
  assert.equal(balances[1].availablePercentage, 75);
});

test("reconhece a finalidade com diferenças de acento, caixa e espaços", () => {
  const [balance] = getBudgetBalances([{ ...initialBudget, nome: "  Ação  inicial militar " }], [
    { finalidade: "acao inicial MILITAR", valor: 1500 },
  ]);

  assert.equal(balance.remainingValue, 98500);
});

test("mantém o saldo completo sem missões e ignora valores não informados", () => {
  const [balance] = getBudgetBalances([initialBudget], [
    { finalidade: "AÇÃO INICIAL MILITAR", valor: null },
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 0 },
  ]);

  assert.equal(balance.remainingValue, 100000);
  assert.equal(balance.availablePercentage, 100);
  assert.deepEqual(getBudgetBalances([], []), []);
});

test("recalcula o saldo após editar ou excluir uma missão", () => {
  const missions = [
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 1000 },
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 1500 },
  ];

  assert.equal(getBudgetBalances([initialBudget], missions)[0].remainingValue, 97500);
  assert.equal(getBudgetBalances([initialBudget], [{ ...missions[0], valor: 2000 }, missions[1]])[0].remainingValue, 96500);
  assert.equal(getBudgetBalances([initialBudget], [{ ...missions[0], finalidade: "ADMINISTRATIVO" }, missions[1]])[0].remainingValue, 98500);
  assert.equal(getBudgetBalances([initialBudget], missions.slice(1))[0].remainingValue, 98500);
  assert.equal(getBudgetBalances([{ ...initialBudget, valor: 120000 }], missions)[0].remainingValue, 117500);
});

test("preserva os centavos no cálculo do saldo", () => {
  const [balance] = getBudgetBalances([{ ...initialBudget, valor: 100 }], [
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 0.1 },
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 0.2 },
  ]);

  assert.equal(balance.spentValue, 0.3);
  assert.equal(balance.remainingValue, 99.7);
});

test("exibe o saldo negativo quando o orçamento acaba e limita a barra a zero", () => {
  const [balance] = getBudgetBalances([{ ...initialBudget, valor: 100 }], [
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 150 },
  ]);

  assert.equal(balance.remainingValue, -50);
  assert.equal(balance.availablePercentage, 0);
  assert.equal(getBudgetBalances([{ ...initialBudget, valor: 0 }], [])[0].availablePercentage, 0);
});

test("canceladas e custo zero não comprometem o saldo por finalidade", () => {
  const missions = [
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 1000, situacao: "normal" },
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 2000, situacao: "cancelada" },
    { finalidade: "AÇÃO INICIAL MILITAR", valor: 1500, situacao: "custo_zero" },
  ];
  const [balance] = getBudgetBalances([initialBudget], missions);
  assert.equal(balance.remainingValue, 99000);
  assert.equal(balance.spentValue, 1000);
  const reactivated = missions.map((mission) => ({ ...mission, situacao: "normal" }));
  assert.equal(getBudgetBalances([initialBudget], reactivated)[0].remainingValue, 95500);
});
