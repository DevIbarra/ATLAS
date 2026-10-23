import { FormEvent, useEffect, useMemo, useState } from "react";
import DashboardLayout, { DashboardPage } from "./DashboardLayout";
import { createMission, deleteMission, listMissions, Mission, SaveMissionInput, updateMission } from "./api/missions";
import { listUsers, User } from "./api/users";
import { getMissionDailyBalances, parseDailyAmount } from "./missionDailyBalances";
import { getMissionExpense, isMissionCancelled, matchesMissionStatusFilter, missionSituationLabels, missionSituationFormValues, MissionSituation, MissionStatusFilter, normalizeMissionForm } from "./missionStatus";

type MissionsProps = {
  email: string;
  onNavigate: (page: DashboardPage) => void;
  onLogout: () => void;
};

type MissionForm = {
  numero_ordem_servico: string;
  finalidade: string;
  situacao: MissionSituation;
  diarias: string;
  militar_civil: string;
  numero_pcdp: string;
  atenas_tarjada: string;
  valor: string;
  siloms: string;
  zimbra: string;
  facdp: string;
  oficio_sigadaer: string;
  ob: string;
  data_ob: string;
  numero_adt_bol_publicacao: string;
  matricula: string;
  data_missao: string;
};

const emptyForm: MissionForm = {
  numero_ordem_servico: "",
  finalidade: "",
  situacao: "normal",
  diarias: "",
  militar_civil: "",
  numero_pcdp: "",
  atenas_tarjada: "",
  valor: "",
  siloms: "",
  zimbra: "",
  facdp: "",
  oficio_sigadaer: "",
  ob: "",
  data_ob: "",
  numero_adt_bol_publicacao: "",
  matricula: "",
  data_missao: "",
};

const purposeOptions = [
  "REPRESENTAÇÃO",
  "EXTERIOR",
  "ADMINISTRATIVO",
  "AÇÃO INICIAL MILITAR",
  "ANÁLISE MILITAR",
  "ENTREVISTAS MILITAR",
  "PLANO DE CAPACITAÇÃO ATV",
  "PLANO DE CAPACITAÇÃO SUP",
  "APOIO A PREVENÇÃO MIL",
  "APOIO A PREVENÇÃO CIVIL",
  "ANÁLISE CIVIL",
  "EXERCÍCIOS ANTERIORES",
];

const atenasTarjadaOptions = ["Atenas", "Tarjada", "Sem"];
const zimbraOptions = ["Feito", "Não"];
const statusOptions = ["Feito", "Não", "Sem"];

function PlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function SearchIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" /><path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 20 4.2-1 10.4-10.4a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="m13.8 7.4 3 3" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

function DeleteIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function FieldMessage({ message }: { message?: string }) {
  return message ? <small className="field-validation">{message}</small> : null;
}

function formatCurrencyInput(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(digits));
}

function parseCurrencyInput(rawValue: string) {
  return Number(rawValue.replace(/\D/g, ""));
}

function formatDateInput(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function apiDateToInput(value: string | null) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : formatDateInput(value);
}

function inputDateToApi(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return `${match[3]}-${match[2]}-${match[1]}`;
}

function currentApiDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
}

const dailyAmountFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 10 });

function formatDailyAmount(value: number | null | undefined) {
  return value == null ? "—" : dailyAmountFormatter.format(value);
}

function normalizeMissionSearch(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export default function Missions({ email, onNavigate, onLogout }: MissionsProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MissionStatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [form, setForm] = useState<MissionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [deletingMissionId, setDeletingMissionId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const financialFieldsDisabled = form.situacao !== "normal";
  const isCancelled = form.situacao === "cancelada";

  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const dailyBalances = useMemo(() => getMissionDailyBalances(missions), [missions]);
  const filteredMissions = useMemo(() => {
    const term = normalizeMissionSearch(query);
    return missions.filter((mission) => {
      if (!matchesMissionStatusFilter(mission, statusFilter)) return false;

      return !term || [
        mission.numero_ordem_servico,
        mission.finalidade,
        mission.militar_civil,
        mission.numero_pcdp,
        mission.matricula,
        missionSituationLabels[mission.situacao ?? "normal"],
      ].some((value) => normalizeMissionSearch(value).includes(term));
    });
  }, [missions, query, statusFilter]);
  const hasActiveFilters = Boolean(query.trim()) || statusFilter !== "all";
  const today = currentApiDate();
  const completedMissions = missions.filter((mission) => !isMissionCancelled(mission) && Boolean(mission.ob?.trim())).length;
  const futureMissions = missions.filter((mission) => !isMissionCancelled(mission) && mission.data_missao > today).length;

  async function loadMissionRecords() {
    setLoading(true);
    setLoadError("");
    try {
      setMissions(await listMissions());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível listar as missões.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableUsers() {
    setUsersLoading(true);
    setUsersError("");
    try {
      setAvailableUsers((await listUsers()).filter((user) => user.ativo));
    } catch {
      setUsersError("Não foi possível carregar os usuários.");
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    void loadMissionRecords();
    void loadAvailableUsers();
  }, []);

  function updateField(field: keyof MissionForm, value: string) {
    setForm((current) => normalizeMissionForm({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === "situacao" && (value === "custo_zero" || value === "cancelada")) {
        for (const clearedField of Object.keys(missionSituationFormValues[value])) delete next[clearedField];
      }
      return next;
    });
  }

  function openCreateModal() {
    setEditingMission(null);
    setForm(emptyForm);
    setFormError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEditModal(mission: Mission) {
    setEditingMission(mission);
    setForm(normalizeMissionForm({
      numero_ordem_servico: mission.numero_ordem_servico,
      finalidade: mission.finalidade,
      situacao: mission.situacao ?? "normal",
      diarias: mission.diarias ?? "",
      militar_civil: mission.militar_civil ?? "",
      numero_pcdp: mission.numero_pcdp ?? "",
      atenas_tarjada: mission.atenas_tarjada ?? "",
      valor: mission.valor == null ? "" : formatCurrencyInput(String(Math.round(Number(mission.valor)))),
      siloms: mission.siloms ?? "",
      zimbra: mission.zimbra ?? "",
      facdp: mission.facdp ?? "",
      oficio_sigadaer: mission.oficio_sigadaer ?? "",
      ob: mission.ob ?? "",
      data_ob: apiDateToInput(mission.data_ob),
      numero_adt_bol_publicacao: mission.numero_adt_bol_publicacao ?? "",
      matricula: mission.matricula ?? "",
      data_missao: apiDateToInput(mission.data_missao),
    }));
    setFormError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const errors: Record<string, string> = {};
    const missionDate = inputDateToApi(form.data_missao);
    const obDate = form.data_ob ? inputDateToApi(form.data_ob) : null;
    if (!form.numero_ordem_servico.trim()) errors.numero_ordem_servico = "Informe o número da ordem de serviço.";
    if (!form.finalidade.trim()) errors.finalidade = "Informe a finalidade.";
    if (parseDailyAmount(form.diarias) === null) errors.diarias = "Informe uma quantidade válida, como 5 ou 2,5.";
    if (!missionDate) errors.data_missao = "Informe uma data válida no formato dd/mm/aaaa.";
    if (form.data_ob && !obDate) errors.data_ob = "Informe uma data válida no formato dd/mm/aaaa.";
    if (form.valor && parseCurrencyInput(form.valor) < 0) errors.valor = "Informe um valor válido.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revise os campos destacados antes de continuar.");
      return;
    }

    const optional = (value: string) => value.trim() || null;
    const payload: SaveMissionInput = {
      numero_ordem_servico: form.numero_ordem_servico.trim(),
      finalidade: form.finalidade.trim(),
      situacao: form.situacao,
      diarias: optional(form.diarias),
      militar_civil: optional(form.militar_civil),
      numero_pcdp: optional(form.numero_pcdp),
      atenas_tarjada: optional(form.atenas_tarjada),
      valor: financialFieldsDisabled ? 0 : form.valor ? parseCurrencyInput(form.valor) : null,
      siloms: optional(form.siloms),
      zimbra: optional(form.zimbra),
      facdp: optional(form.facdp),
      oficio_sigadaer: optional(form.oficio_sigadaer),
      ob: optional(form.ob),
      data_ob: obDate,
      numero_adt_bol_publicacao: optional(form.numero_adt_bol_publicacao),
      matricula: optional(form.matricula),
      data_missao: missionDate!,
    };

    setSaving(true);
    try {
      const response = editingMission
        ? await updateMission(editingMission.id_missao, payload)
        : await createMission(payload);
      setMissions((current) => editingMission
        ? current.map((mission) => mission.id_missao === response.missao.id_missao ? response.missao : mission)
        : [response.missao, ...current]);
      setModalOpen(false);
      setNotice(response.mensagem);
      window.setTimeout(() => setNotice(""), 5000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar a missão.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(mission: Mission) {
    if (deletingMissionId !== null) return;
    if (!window.confirm(`Excluir a missão ${mission.numero_ordem_servico}? As diárias desta missão serão removidas do total acumulado.`)) return;

    setDeletingMissionId(mission.id_missao);
    setDeleteError("");
    try {
      const response = await deleteMission(mission.id_missao);
      setMissions((current) => current.filter((record) => record.id_missao !== mission.id_missao));
      setNotice(response.mensagem);
      window.setTimeout(() => setNotice(""), 5000);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Não foi possível excluir a missão.");
    } finally {
      setDeletingMissionId(null);
    }
  }

  return (
    <DashboardLayout activePage="missions" email={email} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="dashboard-main users-main missions-main">
        <header className="users-header">
          <div><h1>Missões</h1></div>
          <button className="primary-action" type="button" onClick={openCreateModal}><PlusIcon />Nova missão</button>
        </header>

        <section className="users-summary missions-summary" aria-label="Resumo das missões">
          <div><strong>{missions.length}</strong><span>Total de missões</span></div>
          <div><strong>{completedMissions}</strong><span>Missões finalizadas</span></div>
          <div><strong>{futureMissions}</strong><span>Missões futuras</span></div>
        </section>

        <section className="users-panel" aria-labelledby="missions-list-title">
          <div className="users-toolbar">
            <div><h2 id="missions-list-title">Missões cadastradas</h2><span>{filteredMissions.length} resultado{filteredMissions.length === 1 ? "" : "s"}</span></div>
            <div className="missions-list-controls">
              <label className="mission-status-filter">
                <span className="sr-only">Filtrar missões por situação</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as MissionStatusFilter)}>
                  <option value="all">Todas as missões</option>
                  <option value="payable">A pagar</option>
                  <option value="accountability">Prestar conta</option>
                  <option value="custo_zero">Custo zero</option>
                  <option value="cancelada">Canceladas</option>
                </select>
              </label>
              <label className="search-field"><SearchIcon /><span className="sr-only">Buscar missão ou nome de guerra</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar missão ou nome de guerra" /></label>
            </div>
          </div>

          {deleteError && <div className="users-feedback error-feedback" role="alert"><span>{deleteError}</span><button type="button" onClick={() => setDeleteError("")}>Fechar</button></div>}

          {loading ? (
            <div className="users-loading"><span className="spinner" />Carregando missões...</div>
          ) : loadError ? (
            <div className="users-feedback error-feedback" role="alert"><span>{loadError}</span><button type="button" onClick={() => void loadMissionRecords()}>Tentar novamente</button></div>
          ) : filteredMissions.length === 0 ? (
            <div className="users-empty"><strong>{hasActiveFilters ? "Nenhuma missão encontrada" : "Nenhuma missão cadastrada"}</strong><p>{hasActiveFilters ? "Ajuste a busca ou o filtro de situação." : "Cadastre a primeira missão para começar."}</p></div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table missions-table">
                <thead><tr><th>Nº OS</th><th>Nome de guerra</th><th>Nº PCDP</th><th>Diária da missão</th><th title="Diárias da pessoa nas missões anteriores, somadas às desta missão.">Diárias anual</th><th>Valor</th><th>Data da missão</th><th className="table-actions-column">Ações</th></tr></thead>
                <tbody>{filteredMissions.map((mission) => {
                  const balance = dailyBalances.get(mission.id_missao);
                  return (
                    <tr key={mission.id_missao}>
                      <td><div className="table-user"><span className="table-avatar mission-table-avatar">OS</span><div><div className="mission-number"><strong>{mission.numero_ordem_servico}</strong>{mission.situacao && mission.situacao !== "normal" && <span className={`mission-situation-tag is-${mission.situacao}`}>{missionSituationLabels[mission.situacao]}</span>}</div><small>{mission.matricula ? `Matrícula ${mission.matricula}` : "Sem matrícula"}</small></div></div></td>
                      <td>{mission.militar_civil || "—"}</td>
                      <td>{mission.numero_pcdp || "—"}</td>
                      <td>{mission.diarias || "—"}</td>
                      <td>{formatDailyAmount(balance?.total)}</td>
                      <td className="mission-value">{mission.situacao === "cancelada" ? "—" : mission.valor == null && mission.situacao !== "custo_zero" ? "—" : currency.format(getMissionExpense(mission))}</td>
                      <td>{formatDate(mission.data_missao)}</td>
                      <td className="table-actions-column">
                        <div className="mission-table-actions">
                          <button className="edit-user-button" type="button" onClick={() => openEditModal(mission)} disabled={deletingMissionId === mission.id_missao} aria-label={`Editar missão ${mission.numero_ordem_servico}`} title="Editar missão"><EditIcon /></button>
                          <button className="edit-user-button delete-mission-button" type="button" onClick={() => void handleDelete(mission)} disabled={deletingMissionId !== null} aria-label={`${deletingMissionId === mission.id_missao ? "Excluindo" : "Excluir"} missão ${mission.numero_ordem_servico}`} title="Excluir missão">{deletingMissionId === mission.id_missao ? <span className="spinner" /> : <DeleteIcon />}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </section>

        {notice && <div className="toast" role="status">{notice}</div>}

        {modalOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setModalOpen(false)}>
            <section className="user-modal mission-modal" role="dialog" aria-modal="true" aria-labelledby="mission-modal-title">
              <header className="modal-header"><div><h2 id="mission-modal-title">{editingMission ? "Editar missão" : "Nova missão"}</h2><p>Preencha os dados da missão.</p></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Fechar" disabled={saving}><CloseIcon /></button></header>

              <form className="user-form mission-form" onSubmit={handleSave} noValidate>
                <label className={`form-field ${fieldErrors.numero_ordem_servico ? "has-error" : ""}`}>Nº ordem de serviço<input value={form.numero_ordem_servico} onChange={(event) => updateField("numero_ordem_servico", event.target.value)} aria-invalid={Boolean(fieldErrors.numero_ordem_servico)} /><FieldMessage message={fieldErrors.numero_ordem_servico} /></label>
                <label className={`form-field mission-field-span-2 ${fieldErrors.finalidade ? "has-error" : ""}`}>Finalidade<select value={form.finalidade} onChange={(event) => updateField("finalidade", event.target.value)} aria-invalid={Boolean(fieldErrors.finalidade)}><option value="">Selecione a finalidade</option>{form.finalidade && !purposeOptions.includes(form.finalidade) && <option value={form.finalidade}>{form.finalidade} (valor atual)</option>}{purposeOptions.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}</select><FieldMessage message={fieldErrors.finalidade} /></label>
                <label className="form-field">Situação<select value={form.situacao} onChange={(event) => updateField("situacao", event.target.value)}>{(Object.keys(missionSituationLabels) as MissionSituation[]).map((situation) => <option key={situation} value={situation}>{missionSituationLabels[situation]}</option>)}</select></label>
                <label className={`form-field ${fieldErrors.diarias ? "has-error" : ""}`}>Diárias<input inputMode="decimal" value={form.diarias} onChange={(event) => updateField("diarias", event.target.value)} disabled={financialFieldsDisabled} aria-invalid={Boolean(fieldErrors.diarias)} /><FieldMessage message={fieldErrors.diarias} /></label>
                <label className="form-field">Militar/Civil
                  <select value={form.militar_civil} onChange={(event) => updateField("militar_civil", event.target.value)} disabled={usersLoading}>
                    <option value="">{usersLoading ? "Carregando usuários..." : usersError || (availableUsers.length ? "Selecione um usuário" : "Nenhum usuário ativo disponível")}</option>
                    {form.militar_civil && !availableUsers.some((user) => user.nome_guerra === form.militar_civil) && <option value={form.militar_civil} disabled hidden>{form.militar_civil} (valor atual)</option>}
                    {availableUsers.map((user) => <option key={user.id_user} value={user.nome_guerra}>{user.nome_guerra} — {user.nome_completo}</option>)}
                  </select>
                </label>
                <label className="form-field">Nº PCDP<input value={form.numero_pcdp} onChange={(event) => updateField("numero_pcdp", event.target.value)} disabled={financialFieldsDisabled} placeholder={financialFieldsDisabled ? "Sem" : ""} /></label>
                <label className="form-field">Atenas/Tarjada<select value={form.atenas_tarjada} onChange={(event) => updateField("atenas_tarjada", event.target.value)} disabled={isCancelled}><option value="">{isCancelled ? "Sem" : "Selecione"}</option>{form.atenas_tarjada && !atenasTarjadaOptions.includes(form.atenas_tarjada) && <option value={form.atenas_tarjada}>{form.atenas_tarjada} (valor atual)</option>}{atenasTarjadaOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <label className={`form-field ${fieldErrors.valor ? "has-error" : ""}`}>Valor<div className="currency-input"><span>R$</span><input type="text" inputMode="numeric" placeholder="0" value={form.valor} onChange={(event) => updateField("valor", formatCurrencyInput(event.target.value))} disabled={financialFieldsDisabled} aria-invalid={Boolean(fieldErrors.valor)} /></div><FieldMessage message={fieldErrors.valor} /></label>
                <label className="form-field">Matrícula<input value={form.matricula} onChange={(event) => updateField("matricula", event.target.value)} disabled={isCancelled} placeholder={isCancelled ? "Sem" : ""} /></label>
                <label className="form-field">SILOMS<input value={form.siloms} onChange={(event) => updateField("siloms", event.target.value)} disabled={isCancelled} placeholder={isCancelled ? "Sem" : ""} /></label>
                <label className="form-field">Zimbra<select value={form.zimbra} onChange={(event) => updateField("zimbra", event.target.value)} disabled={financialFieldsDisabled}><option value="">{financialFieldsDisabled ? "Sem" : "Selecione"}</option>{form.zimbra && !zimbraOptions.includes(form.zimbra) && <option value={form.zimbra}>{form.zimbra} (valor atual)</option>}{zimbraOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <label className="form-field">FACDP<select value={form.facdp} onChange={(event) => updateField("facdp", event.target.value)} disabled={financialFieldsDisabled}><option value="">{financialFieldsDisabled ? "Sem" : "Selecione"}</option>{form.facdp && !statusOptions.includes(form.facdp) && <option value={form.facdp}>{form.facdp} (valor atual)</option>}{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <label className="form-field">Ofício SIGADAER<select value={form.oficio_sigadaer} onChange={(event) => updateField("oficio_sigadaer", event.target.value)} disabled={financialFieldsDisabled}><option value="">{financialFieldsDisabled ? "Sem" : "Selecione"}</option>{form.oficio_sigadaer && !statusOptions.includes(form.oficio_sigadaer) && <option value={form.oficio_sigadaer}>{form.oficio_sigadaer} (valor atual)</option>}{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <label className="form-field">OB<input value={form.ob} onChange={(event) => updateField("ob", event.target.value)} disabled={financialFieldsDisabled} placeholder={financialFieldsDisabled ? "Sem" : ""} /></label>
                <label className={`form-field ${fieldErrors.data_ob ? "has-error" : ""}`}>Data OB<input type="text" inputMode="numeric" maxLength={10} placeholder={financialFieldsDisabled ? "Sem" : "dd/mm/aaaa"} value={form.data_ob} onChange={(event) => updateField("data_ob", formatDateInput(event.target.value))} disabled={financialFieldsDisabled} aria-invalid={Boolean(fieldErrors.data_ob)} /><FieldMessage message={fieldErrors.data_ob} /></label>
                <label className="form-field">Nº ADT BOL publicação<input value={form.numero_adt_bol_publicacao} onChange={(event) => updateField("numero_adt_bol_publicacao", event.target.value)} disabled={financialFieldsDisabled} placeholder={financialFieldsDisabled ? "Sem" : ""} /></label>
                <label className={`form-field ${fieldErrors.data_missao ? "has-error" : ""}`}>Data da missão<input type="text" inputMode="numeric" maxLength={10} placeholder="dd/mm/aaaa" value={form.data_missao} onChange={(event) => updateField("data_missao", formatDateInput(event.target.value))} aria-invalid={Boolean(fieldErrors.data_missao)} /><FieldMessage message={fieldErrors.data_missao} /></label>

                {formError && <p className="form-error" role="alert">{formError}</p>}
                <footer className="modal-actions"><button className="cancel-action" type="button" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button><button className="primary-action" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : editingMission ? "Salvar alterações" : "Cadastrar missão"}</button></footer>
              </form>
            </section>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
