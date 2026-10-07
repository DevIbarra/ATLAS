import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { login } from "./api/auth";
import { DashboardPage } from "./DashboardLayout";
import Home from "./Home";
import Users from "./Users";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ) : (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m4 4 16 16M10.6 7.13A9.9 9.9 0 0 1 12 7c5.5 0 8.5 5 8.5 5a11.8 11.8 0 0 1-2.25 2.67M7.1 8.35A12.4 12.4 0 0 0 3.5 12s3 5 8.5 5c1.07 0 2.04-.19 2.9-.5M10.45 10.45a2.2 2.2 0 0 0 3.1 3.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const emailId = useId();
  const passwordId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const hasSession = sessionStorage.getItem("atlas:authenticated") === "true";
  const [page, setPage] = useState<"login" | DashboardPage>(() => {
    if (!hasSession) return "login";
    if (window.location.pathname === "/usuarios") return "users";
    return window.location.pathname === "/home" ? "home" : "login";
  });
  const [sessionEmail, setSessionEmail] = useState(sessionStorage.getItem("atlas:email") ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const isProtectedPath = ["/home", "/usuarios"].includes(window.location.pathname);
    if (isProtectedPath && !hasSession) {
      window.history.replaceState({}, "", "/");
    }

    const syncPage = () => {
      const sessionActive = sessionStorage.getItem("atlas:authenticated") === "true";
      if (!sessionActive) {
        setPage("login");
      } else if (window.location.pathname === "/usuarios") {
        setPage("users");
      } else {
        setPage(window.location.pathname === "/home" ? "home" : "login");
      }
    };

    window.addEventListener("popstate", syncPage);
    return () => window.removeEventListener("popstate", syncPage);
  }, [hasSession]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!emailRef.current?.validity.valid) {
      setStatus("error");
      setMessage("Informe um e-mail válido.");
      emailRef.current?.focus();
      return;
    }

    if (!password) {
      setStatus("error");
      setMessage("Informe sua senha.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await login({ gmail: email.trim(), senha: password });
      const normalizedEmail = email.trim();
      sessionStorage.setItem("atlas:authenticated", "true");
      sessionStorage.setItem("atlas:email", normalizedEmail);
      if (response.usuario?.nome_guerra) {
        sessionStorage.setItem("atlas:nome-guerra", response.usuario.nome_guerra);
      }
      setSessionEmail(normalizedEmail);
      setPassword("");
      setStatus("idle");
      window.history.pushState({}, "", "/home");
      setPage("home");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    }
  }

  function logout() {
    sessionStorage.removeItem("atlas:authenticated");
    sessionStorage.removeItem("atlas:email");
    sessionStorage.removeItem("atlas:nome-guerra");
    setSessionEmail("");
    setPassword("");
    setStatus("idle");
    setMessage("");
    window.history.replaceState({}, "", "/");
    setPage("login");
    requestAnimationFrame(() => emailRef.current?.focus());
  }

  function navigate(page: DashboardPage) {
    const path = page === "users" ? "/usuarios" : "/home";
    window.history.pushState({}, "", path);
    setPage(page);
  }

  if (page === "home") {
    return <Home email={sessionEmail} onNavigate={navigate} onLogout={logout} />;
  }

  if (page === "users") {
    return <Users email={sessionEmail} onNavigate={navigate} onLogout={logout} />;
  }

  return (
    <main className="page">
      <section className="login" aria-labelledby="atlas-title">
        <header className="login-header">
          <span id="atlas-title" className="brand">ATLAS</span>
        </header>

        <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor={emailId}>E-mail</label>
              <input
                ref={emailRef}
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={status === "loading"}
                required
              />
            </div>

            <div className="field">
              <label htmlFor={passwordId}>Senha</label>
              <div className="password-field">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={status === "loading"}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {status === "error" && <p className="error" role="alert">{message}</p>}

            <button
              className="submit-button"
              type="submit"
              disabled={status === "loading"}
            >
              {status === "loading" ? <span className="spinner" /> : "Entrar"}
            </button>
        </form>
      </section>
    </main>
  );
}
