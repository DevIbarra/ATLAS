export type LoginCredentials = {
  gmail: string;
  senha: string;
};

type LoginResponse = {
  mensagem: string;
};

type ApiError = {
  detail?: string | Array<{ msg?: string }>;
};

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function getErrorMessage(payload: ApiError | null, status: number): string {
  if (typeof payload?.detail === "string") {
    return payload.detail;
  }

  if (Array.isArray(payload?.detail)) {
    return payload.detail[0]?.msg ?? "Confira os dados informados.";
  }

  if (status >= 500) {
    return "O serviço está temporariamente indisponível. Tente novamente.";
  }

  return "Não foi possível entrar. Confira seus dados e tente novamente.";
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao Atlas. Verifique se a API está em execução.",
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | (LoginResponse & ApiError)
    | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload ?? { mensagem: "Login realizado com sucesso" };
}
