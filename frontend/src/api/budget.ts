export type Budget = {
  id: number;
  nome: string;
  valor: number;
  data_alteracao?: string | null;
};

export type CreateBudgetInput = {
  nome: string;
  valor: number;
};

type ApiError = {
  detail?: string | Array<{ msg?: string }>;
};

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const BUDGET_URL = API_URL ? `${API_URL}/orcamento` : "/api/orcamento";

function errorMessage(payload: ApiError | null, status: number) {
  if (typeof payload?.detail === "string") return payload.detail;
  if (Array.isArray(payload?.detail)) return payload.detail[0]?.msg ?? "Confira os dados informados.";
  if (status >= 500) return "O serviço de orçamento está temporariamente indisponível.";
  return "Não foi possível concluir a operação.";
}

export async function createBudget(data: CreateBudgetInput): Promise<{ mensagem: string; orcamento: Budget }> {
  let response: Response;

  try {
    response = await fetch(`${BUDGET_URL}/criar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Não foi possível conectar ao serviço de orçamento.");
  }

  const payload = (await response.json().catch(() => null)) as ({ mensagem: string; orcamento: Budget } & ApiError) | null;
  if (!response.ok) throw new Error(errorMessage(payload, response.status));
  return payload as { mensagem: string; orcamento: Budget };
}

export async function listBudgets(): Promise<Budget[]> {
  let response: Response;

  try {
    response = await fetch(`${BUDGET_URL}/listar`);
  } catch {
    throw new Error("Não foi possível conectar ao serviço de orçamento.");
  }

  const payload = (await response.json().catch(() => null)) as ({ orcamentos: Budget[] } & ApiError) | null;
  if (!response.ok) throw new Error(errorMessage(payload, response.status));
  return payload?.orcamentos ?? [];
}

export async function updateBudget(id: number, data: CreateBudgetInput): Promise<{ mensagem: string; orcamento: Budget }> {
  let response: Response;

  try {
    response = await fetch(`${BUDGET_URL}/atualizar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Não foi possível conectar ao serviço de orçamento.");
  }

  const payload = (await response.json().catch(() => null)) as ({ mensagem: string; orcamento: Budget } & ApiError) | null;
  if (!response.ok) throw new Error(errorMessage(payload, response.status));
  return payload as { mensagem: string; orcamento: Budget };
}
