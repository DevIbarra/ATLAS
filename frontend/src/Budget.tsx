import { FormEvent, useEffect, useMemo, useState } from "react";
import DashboardLayout, { DashboardPage } from "./DashboardLayout";
import { Budget as BudgetRecord, createBudget, listBudgets, updateBudget } from "./api/budget";
import { listMissions, Mission } from "./api/missions";
import { getMissionExpense } from "./missionStatus";

type BudgetProps = {
  email: string;
  onNavigate: (page: DashboardPage) => void;
  onLogout: () => void;
};

function PlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 20 4.2-1 10.4-10.4a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="m13.8 7.4 3 3" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

function SearchIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" /><path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function parseCurrencyValue(rawValue: string) {
  return Number(rawValue.replace(/\D/g, ""));
}

function formatCurrencyValue(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "");
  if (!digits) return "";

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Number(digits));
}

function formatStoredCurrencyValue(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function Budget({ email, onNavigate, onLogout }: BudgetProps) {
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
  const filteredBudgets = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return budgets;
    return budgets.filter((budget) => budget.nome.toLocaleLowerCase("pt-BR").includes(term));
  }, [budgets, query]);
  const totalValue = budgets.reduce((total, budget) => total + Number(budget.valor), 0);
  const paidBalance = missions
    .filter((mission) => Boolean(mission.numero_pcdp?.trim()))
    .reduce((total, mission) => total + getMissionExpense(mission), 0);
  const payableBalance = missions
    .filter((mission) => !mission.numero_pcdp?.trim())
    .reduce((total, mission) => total + getMissionExpense(mission), 0);
  const remainingBalance = totalValue - paidBalance - payableBalance;

  async function loadBudgets() {
    setLoading(true);
    setLoadError("");

    try {
      const [records, missionRecords] = await Promise.all([listBudgets(), listMissions()]);
      setBudgets([...records].sort((first, second) => second.id - first.id));
      setMissions(missionRecords);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados financeiros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBudgets();
  }, []);

  function resetForm() {
    setName("");
    setValue("");
    setFormError("");
    setFieldErrors({});
  }

  function openCreateModal() {
    resetForm();
    setEditingBudget(null);
    setModalOpen(true);
  }

  function openEditModal(budget: BudgetRecord) {
    setEditingBudget(budget);
    setName(budget.nome);
    setValue(formatStoredCurrencyValue(budget.valor));
    setFormError("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const errors: Record<string, string> = {};
    const numericValue = parseCurrencyValue(value.trim());
    if (!name.trim()) errors.name = "Informe o nome do orçamento.";
    if (!value || !Number.isFinite(numericValue) || numericValue <= 0) errors.value = "Informe um valor maior que zero.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revise os campos destacados antes de continuar.");
      return;
    }

    setSaving(true);
    try {
      const payload = { nome: name.trim(), valor: numericValue };
      const response = editingBudget
        ? await updateBudget(editingBudget.id, payload)
        : await createBudget(payload);

      setBudgets((current) => editingBudget
        ? current.map((budget) => budget.id === response.orcamento.id ? response.orcamento : budget)
        : [response.orcamento, ...current.filter((budget) => budget.id !== response.orcamento.id)]);
      setModalOpen(false);
      setNotice(response.mensagem);
      window.setTimeout(() => setNotice(""), 5000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar o orçamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout activePage="budget" email={email} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="dashboard-main users-main budget-main">
        <header className="users-header budget-page-header">
          <div>
            <h1>Orçamento</h1>
          </div>
          <div className="budget-header-actions">
            <button className="primary-action" type="button" onClick={openCreateModal}>
              <PlusIcon />
              Criar orçamento
            </button>
          </div>
        </header>

        <section className="users-summary budget-summary-cards" aria-label="Resumo financeiro das missões">
          <div><strong>{currency.format(paidBalance)}</strong><span>Saldo pago</span></div>
          <div><strong>{currency.format(payableBalance)}</strong><span>Saldo a pagar</span></div>
          <div><strong>{currency.format(remainingBalance)}</strong><span>Saldo</span></div>
        </section>

        <section className="users-panel" aria-labelledby="budget-list-title">
          <div className="users-toolbar">
            <div>
              <h2 id="budget-list-title">Orçamentos cadastrados</h2>
              <span>{filteredBudgets.length} resultado{filteredBudgets.length === 1 ? "" : "s"}</span>
            </div>
            <label className="search-field">
              <SearchIcon />
              <span className="sr-only">Buscar orçamentos</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar orçamento"
              />
            </label>
          </div>

          {loading ? (
            <div className="users-loading"><span className="spinner" />Carregando orçamentos...</div>
          ) : loadError ? (
            <div className="users-feedback error-feedback" role="alert">
              <span>{loadError}</span>
              <button type="button" onClick={() => void loadBudgets()}>Tentar novamente</button>
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="users-empty">
              <strong>{query ? "Nenhum orçamento encontrado" : "Nenhum orçamento cadastrado"}</strong>
              <p>{query ? "Tente buscar por outro nome." : "Crie o primeiro orçamento para começar."}</p>
            </div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table budget-table">
                <thead>
                  <tr>
                    <th>Orçamento</th>
                    <th>Valor</th>
                    <th className="table-actions-column">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBudgets.map((budget) => (
                    <tr key={budget.id}>
                      <td>
                        <div className="table-user">
                          <span className="table-avatar budget-table-avatar">R$</span>
                          <div><strong>{budget.nome}</strong><small>Orçamento operacional</small></div>
                        </div>
                      </td>
                      <td className="budget-table-value">{currency.format(Number(budget.valor))}</td>
                      <td className="table-actions-column">
                        <button
                          className="edit-user-button"
                          type="button"
                          onClick={() => openEditModal(budget)}
                          aria-label={`Editar ${budget.nome}`}
                          title="Editar orçamento"
                        >
                          <EditIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {notice && <div className="toast" role="status">{notice}</div>}

        {modalOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setModalOpen(false)}>
            <section className="user-modal budget-modal" role="dialog" aria-modal="true" aria-labelledby="budget-modal-title">
              <header className="modal-header">
                <div>
                  <h2 id="budget-modal-title">{editingBudget ? "Editar orçamento" : "Criar orçamento"}</h2>
                  <p>{editingBudget ? "Atualize o nome e o valor disponível." : "Informe o nome e o valor disponível."}</p>
                </div>
                <button type="button" onClick={() => setModalOpen(false)} aria-label="Fechar" disabled={saving}><CloseIcon /></button>
              </header>

              <form className="user-form budget-form" onSubmit={handleSave} noValidate>
                <label className={`form-field ${fieldErrors.name ? "has-error" : ""}`}>
                  Nome do orçamento
                  <input
                    type="text"
                    maxLength={255}
                    placeholder="Digite o nome do orçamento"
                    value={name}
                    onChange={(event) => { setName(event.target.value); clearFieldError("name"); }}
                    aria-invalid={Boolean(fieldErrors.name)}
                  />
                  {fieldErrors.name && <small className="field-validation">{fieldErrors.name}</small>}
                </label>

                <label className={`form-field ${fieldErrors.value ? "has-error" : ""}`}>
                  Valor do orçamento
                  <div className="currency-input">
                    <span>R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={value}
                      onChange={(event) => { setValue(formatCurrencyValue(event.target.value)); clearFieldError("value"); }}
                      aria-invalid={Boolean(fieldErrors.value)}
                    />
                  </div>
                  {fieldErrors.value && <small className="field-validation">{fieldErrors.value}</small>}
                </label>

                {formError && <p className="form-error" role="alert">{formError}</p>}

                <footer className="modal-actions">
                  <button className="cancel-action" type="button" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                  <button className="primary-action" type="submit" disabled={saving}>
                    {saving ? <span className="spinner" /> : editingBudget ? "Salvar alterações" : "Criar orçamento"}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
