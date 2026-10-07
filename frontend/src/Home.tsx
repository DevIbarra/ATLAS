import DashboardLayout, { DashboardPage } from "./DashboardLayout";

type HomeProps = {
  email: string;
  onNavigate: (page: DashboardPage) => void;
  onLogout: () => void;
};

// Valores demonstrativos até a API disponibilizar missões e orçamento.
const budgetCategories = [
  { name: "Ação inicial / investigação", total: 320_000, available: 210_000 },
  { name: "Capacitação ATV", total: 260_000, available: 175_000 },
  { name: "Capacitação suporte", total: 220_000, available: 140_000 },
  { name: "Representação", total: 180_000, available: 95_000 },
  { name: "Exterior", total: 360_000, available: 200_000 },
  { name: "Análise civil", total: 160_000, available: 100_000 },
];

const dashboardSummary = {
  completedMissions: 24,
  scheduledMissions: 8,
  totalBudget: budgetCategories.reduce((sum, category) => sum + category.total, 0),
  availableBudget: budgetCategories.reduce((sum, category) => sum + category.available, 0),
};

export default function Home({ email, onNavigate, onLogout }: HomeProps) {
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
  const date = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  const usedBudget = dashboardSummary.totalBudget - dashboardSummary.availableBudget;
  const availablePercentage = Math.round(
    (dashboardSummary.availableBudget / dashboardSummary.totalBudget) * 100,
  );
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

  return (
    <DashboardLayout activePage="home" email={email} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Início</h1>
            <p>Acompanhe o resumo operacional.</p>
          </div>
          <div className="header-meta">
            <span className="session-state"><i /> Sessão ativa</span>
            <time dateTime={new Date().toISOString()}>{date}</time>
          </div>
        </header>

        <section className="overview-section" aria-labelledby="overview-title">
          <div className="minimal-section-header">
            <h2 id="overview-title">Resumo operacional</h2>
            <span>Dados demonstrativos</span>
          </div>

          <div className="overview-grid">
            <article className="mission-metric">
              <span className="metric-label"><i className="metric-dot completed-dot" />Realizadas</span>
              <strong>{dashboardSummary.completedMissions}</strong>
              <small>missões concluídas</small>
            </article>

            <article className="mission-metric">
              <span className="metric-label"><i className="metric-dot scheduled-dot" />Programadas</span>
              <strong>{dashboardSummary.scheduledMissions}</strong>
              <small>próximas missões</small>
            </article>

            <article className="budget-summary">
              <div className="budget-chart" aria-label={`${availablePercentage}% do orçamento disponível`}>
                <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
                  <circle className="budget-track" cx="60" cy="60" r="48" pathLength="100" />
                  <circle
                    className="budget-progress"
                    cx="60"
                    cy="60"
                    r="48"
                    pathLength="100"
                    strokeDasharray={`${availablePercentage} ${100 - availablePercentage}`}
                  />
                </svg>
                <strong>{availablePercentage}%</strong>
              </div>

              <div className="budget-copy">
                <span>Orçamento disponível</span>
                <strong>{currency.format(dashboardSummary.availableBudget)}</strong>
                <small>de {currency.format(dashboardSummary.totalBudget)}</small>
                <div className="budget-legend">
                  <span><i className="available-color" />Disponível</span>
                  <span><i className="used-color" />Utilizado: {currency.format(usedBudget)}</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="budget-section" aria-labelledby="budget-title">
          <div className="minimal-section-header">
            <h2 id="budget-title">Orçamento por categoria</h2>
            <span>{budgetCategories.length} categorias</span>
          </div>

          <div className="budget-category-grid">
            {budgetCategories.map((category) => {
              const percentage = Math.round((category.available / category.total) * 100);

              return (
                <article className="budget-category" key={category.name}>
                  <div className="budget-category-header">
                    <h3>{category.name}</h3>
                    <span>{percentage}% disponível</span>
                  </div>
                  <strong>{currency.format(category.available)}</strong>
                  <small>de {currency.format(category.total)}</small>
                  <div
                    className="category-chart"
                    role="progressbar"
                    aria-label={`Orçamento disponível para ${category.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                  >
                    <i style={{ width: `${percentage}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

      </main>
    </DashboardLayout>
  );
}
