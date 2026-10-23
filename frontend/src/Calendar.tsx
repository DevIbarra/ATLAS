import { useEffect, useMemo, useState } from "react";
import DashboardLayout, { DashboardPage } from "./DashboardLayout";
import { listMissions, Mission } from "./api/missions";
import { isMissionCancelled } from "./missionStatus";

type CalendarProps = {
  email: string;
  onNavigate: (page: DashboardPage) => void;
  onLogout: () => void;
};

type VisibleMonth = {
  year: number;
  month: number;
};

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function apiDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayApiDate() {
  const today = new Date();
  return apiDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  const path = direction === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6";
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Calendar({ email, onNavigate, onLogout }: CalendarProps) {
  const now = new Date();
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>({ year: now.getFullYear(), month: now.getMonth() });
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const calendarDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1));
    const gridStart = new Date(firstDay);
    gridStart.setUTCDate(gridStart.getUTCDate() - firstDay.getUTCDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setUTCDate(gridStart.getUTCDate() + index);
      return {
        iso: apiDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
        day: date.getUTCDate(),
        currentMonth: date.getUTCMonth() === visibleMonth.month,
      };
    });
  }, [visibleMonth]);

  const calendarWeeks = useMemo(() => Array.from({ length: 6 }, (_, weekIndex) => {
    const days = calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7);
    const weekStart = days[0].iso;
    const weekEnd = days[6].iso;
    const laneEnds: string[] = [];
    const segments = missions
      .filter((mission) => !isMissionCancelled(mission) && mission.data_missao >= weekStart && mission.data_missao <= weekEnd)
      .map((mission) => ({ mission, start: mission.data_missao, end: mission.data_missao }))
      .filter((segment): segment is NonNullable<typeof segment> => segment !== null)
      .sort((first, second) => first.start.localeCompare(second.start) || second.end.localeCompare(first.end))
      .map((segment) => {
        let lane = laneEnds.findIndex((laneEnd) => laneEnd < segment.start);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(segment.end);
        } else {
          laneEnds[lane] = segment.end;
        }
        return {
          ...segment,
          lane,
          startColumn: days.findIndex((day) => day.iso === segment.start) + 1,
          endColumn: days.findIndex((day) => day.iso === segment.end) + 2,
        };
      });

    return { days, segments, laneCount: laneEnds.length };
  }), [calendarDays, missions]);

  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)));
  const formattedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const monthStart = apiDate(visibleMonth.year, visibleMonth.month + 1, 1);
  const monthEndDate = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + 1, 0));
  const monthEnd = apiDate(monthEndDate.getUTCFullYear(), monthEndDate.getUTCMonth() + 1, monthEndDate.getUTCDate());
  const missionsInMonth = missions.filter((mission) => (
    !isMissionCancelled(mission) && mission.data_missao >= monthStart && mission.data_missao <= monthEnd
  )).length;
  const today = todayApiDate();

  async function loadCalendarMissions() {
    setLoading(true);
    setLoadError("");
    try {
      setMissions(await listMissions());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar as missões.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCalendarMissions();
  }, []);

  function moveMonth(amount: number) {
    setVisibleMonth((current) => {
      const date = new Date(current.year, current.month + amount, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function goToToday() {
    const date = new Date();
    setVisibleMonth({ year: date.getFullYear(), month: date.getMonth() });
  }

  return (
    <DashboardLayout activePage="calendar" email={email} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="dashboard-main users-main calendar-main">
        <header className="users-header calendar-page-header">
          <div><h1>Calendário</h1></div>
          <div className="calendar-navigation" aria-label="Navegação do calendário">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Mês anterior"><ChevronIcon direction="left" /></button>
            <button className="calendar-today-button" type="button" onClick={goToToday}>Hoje</button>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Próximo mês"><ChevronIcon direction="right" /></button>
          </div>
        </header>

        {loading ? (
          <div className="users-loading"><span className="spinner" />Carregando calendário...</div>
        ) : loadError ? (
          <div className="users-feedback error-feedback" role="alert">
            <span>{loadError}</span>
            <button type="button" onClick={() => void loadCalendarMissions()}>Tentar novamente</button>
          </div>
        ) : (
          <section className="calendar-panel" aria-labelledby="calendar-month-title">
            <header className="calendar-toolbar">
              <h2 id="calendar-month-title">{formattedMonth}</h2>
              <span>{missionsInMonth} missão{missionsInMonth === 1 ? "" : "ões"} no mês</span>
            </header>

            <div className="calendar-grid-wrap">
              <div className="calendar-grid" role="grid" aria-label={`Calendário de ${formattedMonth}`}>
                <div className="calendar-weekdays" role="row">
                  {weekDays.map((weekDay) => <div className="calendar-weekday" role="columnheader" key={weekDay}>{weekDay}</div>)}
                </div>
                {calendarWeeks.map((week, weekIndex) => (
                  <div
                    className="calendar-week"
                    role="row"
                    key={week.days[0].iso}
                    style={{ minHeight: `${Math.max(118, 47 + week.laneCount * 30)}px` }}
                  >
                    {week.days.map((day, dayIndex) => (
                      <article
                        className={`calendar-day ${day.currentMonth ? "" : "is-outside"} ${day.iso === today ? "is-today" : ""}`}
                        role="gridcell"
                        key={day.iso}
                        style={{ gridColumn: dayIndex + 1 }}
                      >
                        <time className="calendar-day-number" dateTime={day.iso}>{day.day}</time>
                      </article>
                    ))}
                    {week.segments.map((segment) => (
                      <button
                        className="calendar-range-event"
                        type="button"
                        key={`${weekIndex}-${segment.mission.id_missao}`}
                        title={`${segment.mission.finalidade} — ${segment.mission.militar_civil || "Sem usuário"}`}
                        onClick={() => onNavigate("missions")}
                        style={{
                          gridColumn: `${segment.startColumn} / ${segment.endColumn}`,
                          marginTop: `${39 + segment.lane * 30}px`,
                        }}
                      >
                        <i aria-hidden="true" />
                        <strong>OS {segment.mission.numero_ordem_servico}</strong>
                        <span>{segment.mission.militar_civil || segment.mission.finalidade}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </DashboardLayout>
  );
}
