export type User = {
  id_user: number;
  nome_completo: string;
  nome_guerra: string;
  posto: string;
  especialidade: string | null;
  unidade: string;
  cpf: string;
  saram: string;
  tipo_user: string;
  ativo: boolean;
  creation_dt?: string | null;
};

export type CreateUserInput = Omit<User, "id_user" | "creation_dt">;

type ApiError = {
  detail?: string | Array<{ msg?: string }>;
};

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const USERS_URL = API_URL ? `${API_URL}/usuarios` : "/api/usuarios";

function errorMessage(payload: ApiError | null, status: number) {
  if (typeof payload?.detail === "string") return payload.detail;
  if (Array.isArray(payload?.detail)) return payload.detail[0]?.msg ?? "Confira os dados informados.";
  if (status >= 500) return "O serviço de usuários está temporariamente indisponível.";
  return "Não foi possível concluir a operação.";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & ApiError) | null;
  if (!response.ok) throw new Error(errorMessage(payload, response.status));
  return payload as T;
}

export async function listUsers(): Promise<User[]> {
  let response: Response;

  try {
    response = await fetch(`${USERS_URL}/listar`);
  } catch {
    throw new Error("Não foi possível conectar ao serviço de usuários.");
  }

  return parseResponse<User[]>(response);
}

export async function createUser(data: CreateUserInput): Promise<{ mensagem: string }> {
  let response: Response;

  try {
    response = await fetch(`${USERS_URL}/criar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Não foi possível conectar ao serviço de usuários.");
  }

  return parseResponse<{ mensagem: string }>(response);
}
