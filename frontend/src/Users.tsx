import { FormEvent, useEffect, useMemo, useState } from "react";
import DashboardLayout, { DashboardPage } from "./DashboardLayout";
import { createUser, CreateUserInput, listUsers, User } from "./api/users";

type UsersProps = {
  email: string;
  onNavigate: (page: DashboardPage) => void;
  onLogout: () => void;
};

const emptyForm: CreateUserInput = {
  nome_completo: "",
  nome_guerra: "",
  posto: "",
  especialidade: "",
  unidade: "",
  cpf: "",
  saram: "",
  tipo_user: "usuario",
  ativo: true,
};

function SearchIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" /><path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function PlusIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function userInitials(user: User) {
  const names = user.nome_completo.trim().split(/\s+/);
  return `${names[0]?.[0] ?? "U"}${names[1]?.[0] ?? names[0]?.[1] ?? ""}`.toUpperCase();
}

export default function Users({ email, onNavigate, onLogout }: UsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateUserInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadUsers() {
    setLoading(true);
    setLoadError("");
    try {
      setUsers(await listUsers());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível listar os usuários.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return users;

    return users.filter((user) =>
      [user.nome_completo, user.nome_guerra, user.posto, user.unidade, user.saram, user.tipo_user]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [query, users]);

  const activeUsers = users.filter((user) => user.ativo).length;

  function updateField<K extends keyof CreateUserInput>(field: K, value: CreateUserInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openModal() {
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      const response = await createUser({
        ...form,
        nome_completo: form.nome_completo.trim(),
        nome_guerra: form.nome_guerra.trim(),
        posto: form.posto.trim(),
        especialidade: form.especialidade?.trim() || null,
        unidade: form.unidade.trim(),
        cpf: form.cpf.replace(/\D/g, ""),
        saram: form.saram.trim(),
        tipo_user: form.tipo_user.trim(),
      });
      setModalOpen(false);
      setNotice(response.mensagem);
      await loadUsers();
      window.setTimeout(() => setNotice(""), 4000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível cadastrar o usuário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout activePage="users" email={email} onNavigate={onNavigate} onLogout={onLogout}>
      <main className="dashboard-main users-main">
        <header className="users-header">
          <div>
            <h1>Usuários</h1>
            <p>Gerencie as pessoas com acesso ao Atlas.</p>
          </div>
          <button className="primary-action" type="button" onClick={openModal}>
            <PlusIcon />
            Novo usuário
          </button>
        </header>

        <section className="users-summary" aria-label="Resumo dos usuários">
          <div><strong>{users.length}</strong><span>Total</span></div>
          <div><strong>{activeUsers}</strong><span>Ativos</span></div>
          <div><strong>{users.length - activeUsers}</strong><span>Inativos</span></div>
        </section>

        <section className="users-panel" aria-labelledby="users-list-title">
          <div className="users-toolbar">
            <div>
              <h2 id="users-list-title">Usuários cadastrados</h2>
              <span>{filteredUsers.length} resultado{filteredUsers.length === 1 ? "" : "s"}</span>
            </div>
            <label className="search-field">
              <SearchIcon />
              <span className="sr-only">Buscar usuários</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar usuário"
              />
            </label>
          </div>

          {loadError && (
            <div className="users-feedback error-feedback" role="alert">
              <span>{loadError}</span>
              <button type="button" onClick={() => void loadUsers()}>Tentar novamente</button>
            </div>
          )}

          {loading ? (
            <div className="users-loading"><span className="spinner" />Carregando usuários...</div>
          ) : !loadError && filteredUsers.length === 0 ? (
            <div className="users-empty">
              <strong>{query ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}</strong>
              <p>{query ? "Tente buscar por outro nome, posto ou unidade." : "Cadastre o primeiro usuário para começar."}</p>
            </div>
          ) : !loadError ? (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Posto</th>
                    <th>Unidade</th>
                    <th>Perfil</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id_user}>
                      <td>
                        <div className="table-user">
                          <span className="table-avatar">{userInitials(user)}</span>
                          <div><strong>{user.nome_completo}</strong><small>{user.nome_guerra} · SARAM {user.saram}</small></div>
                        </div>
                      </td>
                      <td>{user.posto}</td>
                      <td>{user.unidade}</td>
                      <td><span className="profile-tag">{user.tipo_user}</span></td>
                      <td><span className={`user-status ${user.ativo ? "is-active" : "is-inactive"}`}><i />{user.ativo ? "Ativo" : "Inativo"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {notice && <div className="toast" role="status">{notice}</div>}

        {modalOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
            <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="new-user-title">
              <header className="modal-header">
                <div><h2 id="new-user-title">Novo usuário</h2><p>Preencha os dados institucionais.</p></div>
                <button type="button" onClick={() => setModalOpen(false)} aria-label="Fechar"><CloseIcon /></button>
              </header>

              <form className="user-form" onSubmit={handleCreate}>
                <label className="form-field form-field-wide">Nome completo<input value={form.nome_completo} onChange={(e) => updateField("nome_completo", e.target.value)} required /></label>
                <label className="form-field">Nome de guerra<input value={form.nome_guerra} onChange={(e) => updateField("nome_guerra", e.target.value)} required /></label>
                <label className="form-field">Posto/graduação<input value={form.posto} onChange={(e) => updateField("posto", e.target.value)} required /></label>
                <label className="form-field">Especialidade<input value={form.especialidade ?? ""} onChange={(e) => updateField("especialidade", e.target.value)} /></label>
                <label className="form-field">Unidade<input value={form.unidade} onChange={(e) => updateField("unidade", e.target.value)} required /></label>
                <label className="form-field">CPF<input inputMode="numeric" maxLength={11} value={form.cpf} onChange={(e) => updateField("cpf", e.target.value.replace(/\D/g, ""))} required /></label>
                <label className="form-field">SARAM<input maxLength={10} value={form.saram} onChange={(e) => updateField("saram", e.target.value)} required /></label>
                <label className="form-field">Perfil<select value={form.tipo_user} onChange={(e) => updateField("tipo_user", e.target.value)}><option value="usuario">Usuário</option><option value="administrador">Administrador</option></select></label>
                <label className="active-field"><input type="checkbox" checked={form.ativo} onChange={(e) => updateField("ativo", e.target.checked)} /><span />Usuário ativo</label>

                {formError && <p className="form-error" role="alert">{formError}</p>}

                <footer className="modal-actions">
                  <button className="cancel-action" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
                  <button className="primary-action" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : "Cadastrar usuário"}</button>
                </footer>
              </form>
            </section>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
