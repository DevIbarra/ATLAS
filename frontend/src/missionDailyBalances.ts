import { missionHasCost, MissionSituation } from "./missionStatus";

export type MissionDailyRecord = {
  id_missao: number;
  data_missao: string;
  militar_civil: string | null;
  diarias: string | null;
  situacao?: MissionSituation | null;
};

export type MissionDailyBalance = {
  previous: number | null;
  current: number | null;
  total: number | null;
};

function personKey(name: string | null) {
  return (name ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

export function parseDailyAmount(value: string | null) {
  const normalized = (value ?? "").trim().replace(",", ".");
  if (!normalized) return 0;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function addDailyAmounts(previous: number | null, current: number | null) {
  return previous === null || current === null ? null : Number((previous + current).toFixed(10));
}

function compareMissions(left: MissionDailyRecord, right: MissionDailyRecord) {
  return left.data_missao.localeCompare(right.data_missao) || left.id_missao - right.id_missao;
}

export function getMissionDailyBalances(missions: readonly MissionDailyRecord[]) {
  const balances = new Map<number, MissionDailyBalance>();
  const totalsByPerson = new Map<string, number | null>();

  for (const mission of [...missions].sort(compareMissions)) {
    const person = personKey(mission.militar_civil);
    if (!person) continue;

    const previous = totalsByPerson.has(person) ? totalsByPerson.get(person)! : 0;
    const current = missionHasCost(mission) ? parseDailyAmount(mission.diarias) : 0;
    const total = addDailyAmounts(previous, current);
    balances.set(mission.id_missao, { previous, current, total });
    totalsByPerson.set(person, total);
  }

  return balances;
}

