import { useEffect, useState } from "react";
import DashboardLayout, { DashboardPage } from "./DashboardLayout";
import { Budget, listBudgets } from "./api/budget";
import { listMissions, Mission } from "./api/missions";
import { getBudgetBalances } from "./budgetBalances";
import { getMissionExpense, isMissionCancelled } from "./missionStatus";

type HomeProps = {
  email: string;
  onNavigate: (page: DashboardPage) => void;
  onLogout: () => void;
};

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Home({ email, onNavigate, onLogout }: HomeProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [today, setToday] = useState(() => localDateValue());

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${today}T00:00:00`));
  const date = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

  const activeMissions = missions.filter((mission) => !isMissionCancelled(mission));
  const completedMissions = activeMissions.filter((mission) => mission.data_missao <= today).length;
  const scheduledMissions = activeMissions.filter((mission) => mission.data_missao > today).length;
  const totalBudget = budgets.reduce((total, budget) => total + Number(budget.valor), 0);
  const paidBalance = missions
    .filter((mission) => Boolean(mission.numero_pcdp?.trim()))
    .reduce((total, mission) => total + getMissionExpense(mission), 0);
  const payableBalance = missions
    .filter((mission) => !mission.numero_pcdp?.trim())
    .reduce((total, mission) => total + getMissionExpense(mission), 0);
  const totalMissionValue = paidBalance + payableBalance;
  const availableBudget = totalBudget - totalMissionValue;
  const availablePercentage = totalBudget > 0
    ? Math.min(100, Math.max(0, Math.round((availableBudget / totalBudget) * 100)))
    : 0;
  const budgetSummaries = getBudgetBalances(budgets, missions);
  const weekStart = new Date(`${today}T00:00:00`);
  const weekAgendaDays = Array.from({ length: 7 }, (_, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    const iso = localDateValue(dayDate);
    return {
      iso,
      number: dayDate.getDate(),
      weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(dayDate).replace(".", ""),
      missions: activeMissions.filter((mission) => mission.data_missao === iso),
    };
  });
  const weekMissionCount = weekAgendaDays.reduce((total, day) => total + day.missions.length, 0);

  async function loadDashboardData() {
    setLoading(true);
    setLoadError("");
    try {
      const [budgetRecords, missionRecords] = await Promise.all([listBudgets(), listMissions()]);
      setBudgets(budgetRecords);
      setMissions(missionRecords);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar o resumo operacional.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboardData();
  }, []);

  useEffect(() => {
    const refreshToday = () => setToday(localDateValue());
    const nextDay = new Date();
    nextDay.setHours(24, 0, 0, 0);
    const timeout = window.setTimeout(refreshToday, nextDay.getTime() - Date.now());
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", refreshToday);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", refreshToday);
    };
  }, [today]);

  return (
    <DashboardLayout activePage="home" email={email} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><h1>Início</h1></div>
          <div className="header-meta">
            <span className="session-state"><i /> Sessão ativa</span>
            <time dateTime={today}>{date}</time>
          </div>
        </header>

        {loading ? (
          <div className="users-loading"><span className="spinner" />Carregando resumo operacional...</div>
        ) : loadError ? (
          <div className="users-feedback error-feedback" role="alert">
            <span>{loadError}</span>
            <button type="button" onClick={() => void loadDashboardData()}>Tentar novamente</button>
          </div>
        ) : (
          <>
            <section className="week-agenda-section week-agenda-section-top" aria-labelledby="week-agenda-title">
              <div className="minimal-section-header">
                <h2 id="week-agenda-title">Próximos 7 dias</h2>
                <span>{weekMissionCount} missão{weekMissionCount === 1 ? "" : "ões"}</span>
              </div>

              <div className="week-agenda-wrap">
                <div className="week-agenda-grid">
                  {weekAgendaDays.map((day) => (
                    <article className={`week-agenda-day ${day.iso === today ? "is-today" : ""}`} key={day.iso}>
                      <header>
                        <span>{day.weekday}</span>
                        <strong>{day.number}</strong>
                      </header>
                      <div className="week-agenda-events">
                        {day.missions.length === 0 ? (
                          <small>Sem missão</small>
                        ) : (
                          day.missions.slice(0, 2).map((mission) => (
                            <button type="button" key={mission.id_missao} onClick={() => onNavigate("missions")} title={mission.finalidade}>
                              <strong>OS {mission.numero_ordem_servico}</strong>
                              <span>{mission.militar_civil || mission.finalidade}</span>
                            </button>
                          ))
                        )}
                        {day.missions.length > 2 && <small>+{day.missions.length - 2} missões</small>}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="overview-section" aria-labelledby="overview-title">
              <div className="minimal-section-header">
                <h2 id="overview-title">Resumo operacional</h2>
                <span>Dados atualizados</span>
              </div>

              <div className="overview-grid">
                <article className="mission-metric">
                  <span className="metric-label"><i className="metric-dot completed-dot" />Realizadas</span>
                  <strong>{completedMissions}</strong>
                  <small>missões até hoje</small>
                </article>

                <article className="mission-metric">
                  <span className="metric-label"><i className="metric-dot scheduled-dot" />Programadas</span>
                  <strong>{scheduledMissions}</strong>
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
                    <span>Saldo disponível</span>
                    <strong>{currency.format(availableBudget)}</strong>
                    <small>de {currency.format(totalBudget)}</small>
                    <div className="budget-legend">
                      <span><i className="available-color" />Pago: {currency.format(paidBalance)}</span>
                      <span><i className="used-color" />A pagar: {currency.format(payableBalance)}</span>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section className="budget-section" aria-labelledby="registered-budgets-title">
              <div className="minimal-section-header">
                <h2 id="registered-budgets-title">Orçamentos cadastrados</h2>
                <span>{budgets.length} orçamento{budgets.length === 1 ? "" : "s"}</span>
              </div>

              {budgetSummaries.length === 0 ? (
                <div className="users-empty">
                  <strong>Nenhum orçamento cadastrado</strong>
                  <p>Os orçamentos criados aparecerão aqui.</p>
                </div>
              ) : (
                <div className="budget-category-grid">
                  {budgetSummaries.map((budget) => (
                    <article className="budget-category" key={budget.id}>
                      <div className="budget-category-header">
                        <h3>{budget.nome}</h3>
                        <span>{budget.availablePercentage}% disponível</span>
                      </div>
                      <strong>{currency.format(budget.remainingValue)}</strong>
                      <small>saldo disponível</small>
                      <div
                        className="category-chart"
                        role="progressbar"
                        aria-label={`Percentual disponível do orçamento ${budget.nome}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={budget.availablePercentage}
                      >
                        <i style={{ width: `${budget.availablePercentage}%` }} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
