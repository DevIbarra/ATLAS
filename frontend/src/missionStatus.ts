export type MissionSituation = "normal" | "custo_zero" | "cancelada";
export type MissionStatusFilter = "all" | "payable" | "accountability" | "custo_zero" | "cancelada";

type MissionStatusFields = {
  situacao?: MissionSituation | null;
  numero_pcdp?: string | null;
  ob?: string | null;
};

export const missionSituationLabels: Record<MissionSituation, string> = {
  normal: "Normal",
  custo_zero: "Custo zero",
  cancelada: "Cancelada",
};

const zeroCostFormValues = {
  valor: "0",
  diarias: "0",
  numero_pcdp: "",
  zimbra: "",
  facdp: "",
  oficio_sigadaer: "",
  ob: "",
  data_ob: "",
  numero_adt_bol_publicacao: "",
} as const;

export const missionSituationFormValues = {
  custo_zero: zeroCostFormValues,
  cancelada: {
    ...zeroCostFormValues,
    atenas_tarjada: "",
    siloms: "",
    matricula: "",
  },
} as const;

export function normalizeMissionForm<T extends { situacao: MissionSituation }>(form: T): T {
  return form.situacao === "normal" ? form : { ...form, ...missionSituationFormValues[form.situacao] };
}

export function isMissionCancelled(mission: Pick<MissionStatusFields, "situacao">) {
  return mission.situacao === "cancelada";
}

export function missionHasCost(mission: Pick<MissionStatusFields, "situacao">) {
  return !mission.situacao || mission.situacao === "normal";
}

export function getMissionExpense(mission: Pick<MissionStatusFields, "situacao"> & { valor: number | null }) {
  return missionHasCost(mission) ? Number(mission.valor ?? 0) : 0;
}

export function matchesMissionStatusFilter(mission: MissionStatusFields, filter: MissionStatusFilter) {
  if (filter === "all") return true;
  if (filter === "custo_zero" || filter === "cancelada") return mission.situacao === filter;
  if (!missionHasCost(mission)) return false;

  const hasPcdp = Boolean(mission.numero_pcdp?.trim());
  return filter === "payable" ? !hasPcdp : hasPcdp && !mission.ob?.trim();
}
