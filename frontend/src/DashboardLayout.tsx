import { MouseEvent, ReactNode } from "react";

export type DashboardPage = "home" | "users";

type DashboardLayoutProps = {
  activePage: DashboardPage;
  email: string;
  children: ReactNode;
  onNavigate: (page: DashboardPage) => void;
  onLogout: () => void;
};

type IconName = "home" | "users" | "logout";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") {
    return <svg {...common}><path d="m3.5 10.5 8.5-7 8.5 7" /><path d="M5.5 9.2v10.3h13V9.2M9.5 19.5v-6h5v6" /></svg>;
  }

  if (name === "users") {
    return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3.3 2.3-5 5.5-5s5 1.7 5.5 5M15.5 5.5a3 3 0 0 1 0 5.8M16.5 14.2c2.3.5 3.6 2.1 4 4.8" /></svg>;
  }

  return <svg {...common}><path d="M14 8V5.5A2.5 2.5 0 0 0 11.5 3h-6A2.5 2.5 0 0 0 3 5.5v13A2.5 2.5 0 0 0 5.5 21h6a2.5 2.5 0 0 0 2.5-2.5V16M10 12h11M18 9l3 3-3 3" /></svg>;
}

function initials(email: string) {
  const value = email.split("@")[0].replace(/[^a-zA-ZÀ-ÿ]/g, " ").trim();
  if (!value) return "AT";

  const parts = value.split(/\s+/);
  return `${parts[0]?.[0] ?? "A"}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`.toUpperCase();
}

export default function DashboardLayout({
  activePage,
  email,
  children,
  onNavigate,
  onLogout,
}: DashboardLayoutProps) {
  const warName = sessionStorage.getItem("atlas:nome-guerra") ?? "Usuário";

  function navigate(event: MouseEvent<HTMLAnchorElement>, page: DashboardPage) {
    event.preventDefault();
    onNavigate(page);
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">ATLAS</div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          <span className="nav-label">Menu</span>
          <a
            className={`nav-item ${activePage === "home" ? "active" : ""}`}
            href="/home"
            aria-current={activePage === "home" ? "page" : undefined}
            onClick={(event) => navigate(event, "home")}
          >
            <Icon name="home" />
            <span>Início</span>
          </a>
          <a
            className={`nav-item ${activePage === "users" ? "active" : ""}`}
            href="/usuarios"
            aria-current={activePage === "users" ? "page" : undefined}
            onClick={(event) => navigate(event, "users")}
          >
            <Icon name="users" />
            <span>Usuários</span>
          </a>
        </nav>

        <div className="sidebar-account">
          <div className="avatar" aria-hidden="true">{initials(warName)}</div>
          <div className="account-copy">
            <strong>{warName}</strong>
            <span>{email || "Sessão ativa"}</span>
          </div>
          <button className="logout-button" type="button" onClick={onLogout} aria-label="Sair do Atlas" title="Sair">
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      {children}
    </div>
  );
}
