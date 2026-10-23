import type { MissionSituation } from "../missionStatus";

export type Mission = {
  id_missao: number;
  numero_ordem_servico: string;
  finalidade: string;
  situacao?: MissionSituation;
  diarias: string | null;
  militar_civil: string | null;
  numero_pcdp: string | null;
  atenas_tarjada: string | null;
  valor: number | null;
  siloms: string | null;
  zimbra: string | null;
  facdp: string | null;
  oficio_sigadaer: string | null;
  ob: string | null;
  data_ob: string | null;
  numero_adt_bol_publicacao: string | null;
  matricula: string | null;
  data_missao: string;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

export type SaveMissionInput = Omit<Mission, "id_missao" | "criado_em" | "atualizado_em">;

type ApiError = {
  detail?: string | Array<{ msg?: string }>;
};

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const MISSIONS_URL = API_URL ? `${API_URL}/missoes` : "/api/missoes";

function errorMessage(payload: ApiError | null, status: number) {
  if (typeof payload?.detail === "string") return payload.detail;
  if (Array.isArray(payload?.detail)) return payload.detail[0]?.msg ?? "Confira os dados informados.";
  if (status >= 500) return "O serviço de missões está temporariamente indisponível.";
  return "Não foi possível concluir a operação.";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & ApiError) | null;
  if (!response.ok) throw new Error(errorMessage(payload, response.status));
  return payload as T;
}

export async function listMissions(): Promise<Mission[]> {
  try {
    return parseResponse<Mission[]>(await fetch(`${MISSIONS_URL}/listar`));
  } catch (error) {
    if (error instanceof TypeError) throw new Error("Não foi possível conectar ao serviço de missões.");
    throw error;
  }
}

export async function createMission(data: SaveMissionInput): Promise<{ mensagem: string; missao: Mission }> {
  try {
    const response = await fetch(`${MISSIONS_URL}/criar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseResponse<{ mensagem: string; missao: Mission }>(response);
  } catch (error) {
    if (error instanceof TypeError) throw new Error("Não foi possível conectar ao serviço de missões.");
    throw error;
  }
}

export async function updateMission(id: number, data: SaveMissionInput): Promise<{ mensagem: string; missao: Mission }> {
  try {
    const response = await fetch(`${MISSIONS_URL}/atualizar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseResponse<{ mensagem: string; missao: Mission }>(response);
  } catch (error) {
    if (error instanceof TypeError) throw new Error("Não foi possível conectar ao serviço de missões.");
    throw error;
  }
}

export async function deleteMission(id: number): Promise<{ mensagem: string }> {
  try {
    const response = await fetch(`${MISSIONS_URL}/deletar/${id}`, { method: "DELETE" });
    return parseResponse<{ mensagem: string }>(response);
  } catch (error) {
    if (error instanceof TypeError) throw new Error("Não foi possível conectar ao serviço de missões.");
    throw error;
  }
}
