import { getMissionExpense, MissionSituation } from "./missionStatus";

type BudgetRecord = {
  nome: string;
  valor: number;
};

type MissionExpense = {
  finalidade: string;
  valor: number | null;
  situacao?: MissionSituation | null;
};

function purposeKey(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

export function getBudgetBalances<T extends BudgetRecord>(budgets: readonly T[], missions: readonly MissionExpense[]) {
  const expensesByPurpose = new Map<string, number>();

  for (const mission of missions) {
    const purpose = purposeKey(mission.finalidade);
    if (!purpose) continue;

    const expenseCents = Math.round(getMissionExpense(mission) * 100);
    expensesByPurpose.set(purpose, (expensesByPurpose.get(purpose) ?? 0) + expenseCents);
  }

  return budgets.map((budget) => {
    const initialCents = Math.round(Number(budget.valor) * 100);
    const spentCents = expensesByPurpose.get(purposeKey(budget.nome)) ?? 0;
    const remainingCents = initialCents - spentCents;

    return {
      ...budget,
      spentValue: spentCents / 100,
      remainingValue: remainingCents / 100,
      availablePercentage: initialCents > 0
        ? Math.min(100, Math.max(0, Math.round((remainingCents / initialCents) * 100)))
        : 0,
    };
  });
}
