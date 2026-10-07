import { FormEvent, useEffect, useMemo, useState } from "react";
import DashboardLayout, { DashboardPage } from "./DashboardLayout";
import { createUserLogin } from "./api/auth";
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

function FieldMessage({ message }: { message?: string }) {
  return message ? <small className="field-validation">{message}</small> : null;
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [accessEmail, setAccessEmail] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [notice, setNotice] = useState<{ message: string; type: "success" | "warning" } | null>(null);

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

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateField<K extends keyof CreateUserInput>(field: K, value: CreateUserInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    clearFieldError(String(field));
  }

  function openModal() {
    setForm(emptyForm);
    setFormError("");
    setFieldErrors({});
    setAccessEmail("");
    setAccessPassword("");
    setModalOpen(true);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setFieldErrors({});

    const errors: Record<string, string> = {};
    const cleanCpf = form.cpf.replace(/\D/g, "");

    if (!form.nome_completo.trim()) errors.nome_completo = "Informe o nome completo.";
    if (!form.nome_guerra.trim()) errors.nome_guerra = "Informe o nome de guerra.";
    if (!form.posto.trim()) errors.posto = "Informe o posto ou graduação.";
    if (!form.unidade.trim()) errors.unidade = "Informe a unidade.";
    if (cleanCpf.length !== 11) errors.cpf = "O CPF deve conter 11 números.";
    if (!form.saram.trim()) errors.saram = "Informe o SARAM.";

    if (form.tipo_user === "administrador") {
      if (!/^\S+@\S+\.\S+$/.test(accessEmail.trim())) errors.accessEmail = "Informe um e-mail válido.";
      if (accessPassword.length < 6) errors.accessPassword = "A senha deve ter pelo menos 6 caracteres.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revise os campos destacados antes de continuar.");
      return;
    }

    setSaving(true);
    let userCreated = false;
    const shouldCreateAccess = form.tipo_user === "administrador";

    try {
      const response = await createUser({
        ...form,
        nome_completo: form.nome_completo.trim(),
        nome_guerra: form.nome_guerra.trim(),
        posto: form.posto.trim(),
        especialidade: form.especialidade?.trim() || null,
        unidade: form.unidade.trim(),
        cpf: cleanCpf,
        saram: form.saram.trim(),
        tipo_user: form.tipo_user.trim(),
      });
      userCreated = true;

      if (shouldCreateAccess) {
        await createUserLogin({
          nome_guerra: form.nome_guerra.trim(),
          gmail: accessEmail.trim(),
          senha: accessPassword,
        });
      }

      setModalOpen(false);
      setNotice({
        message: shouldCreateAccess ? "Administrador e login cadastrados com sucesso!" : response.mensagem,
        type: "success",
      });
      await loadUsers();
      window.setTimeout(() => setNotice(null), 5000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível cadastrar o usuário.";

      if (userCreated) {
        setModalOpen(false);
        setNotice({ message: `Usuário cadastrado, mas o login não foi criado: ${errorMessage}`, type: "warning" });
        await loadUsers();
        window.setTimeout(() => setNotice(null), 7000);
      } else {
        setFormError(errorMessage);
      }
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
                    <th className="war-name-column">Nome de guerra</th>
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
                          <div><strong>{user.nome_completo}</strong><small>SARAM {user.saram}</small></div>
                        </div>
                      </td>
                      <td className="war-name war-name-column">{user.nome_guerra}</td>
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

        {notice && <div className={`toast toast-${notice.type}`} role="status">{notice.message}</div>}

        {modalOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
            <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="new-user-title">
              <header className="modal-header">
                <div><h2 id="new-user-title">Novo usuário</h2><p>Preencha os dados institucionais.</p></div>
                <button type="button" onClick={() => setModalOpen(false)} aria-label="Fechar"><CloseIcon /></button>
              </header>

              <form className="user-form" onSubmit={handleCreate} noValidate>
                <label className={`form-field form-field-wide ${fieldErrors.nome_completo ? "has-error" : ""}`}>
                  Nome completo
                  <input value={form.nome_completo} onChange={(e) => updateField("nome_completo", e.target.value)} aria-invalid={Boolean(fieldErrors.nome_completo)} />
                  <FieldMessage message={fieldErrors.nome_completo} />
                </label>
                <label className={`form-field ${fieldErrors.nome_guerra ? "has-error" : ""}`}>
                  Nome de guerra
                  <input value={form.nome_guerra} onChange={(e) => updateField("nome_guerra", e.target.value)} aria-invalid={Boolean(fieldErrors.nome_guerra)} />
                  <FieldMessage message={fieldErrors.nome_guerra} />
                </label>
                <label className={`form-field ${fieldErrors.posto ? "has-error" : ""}`}>
                  Posto/graduação
                  <input value={form.posto} onChange={(e) => updateField("posto", e.target.value)} aria-invalid={Boolean(fieldErrors.posto)} />
                  <FieldMessage message={fieldErrors.posto} />
                </label>
                <label className="form-field">Especialidade<input value={form.especialidade ?? ""} onChange={(e) => updateField("especialidade", e.target.value)} /></label>
                <label className={`form-field ${fieldErrors.unidade ? "has-error" : ""}`}>
                  Unidade
                  <input value={form.unidade} onChange={(e) => updateField("unidade", e.target.value)} aria-invalid={Boolean(fieldErrors.unidade)} />
                  <FieldMessage message={fieldErrors.unidade} />
                </label>
                <label className={`form-field ${fieldErrors.cpf ? "has-error" : ""}`}>
                  CPF
                  <input inputMode="numeric" maxLength={11} value={form.cpf} onChange={(e) => updateField("cpf", e.target.value.replace(/\D/g, ""))} aria-invalid={Boolean(fieldErrors.cpf)} />
                  <FieldMessage message={fieldErrors.cpf} />
                </label>
                <label className={`form-field ${fieldErrors.saram ? "has-error" : ""}`}>
                  SARAM
                  <input maxLength={10} value={form.saram} onChange={(e) => updateField("saram", e.target.value)} aria-invalid={Boolean(fieldErrors.saram)} />
                  <FieldMessage message={fieldErrors.saram} />
                </label>
                <label className="form-field">Perfil<select value={form.tipo_user} onChange={(e) => {
                  updateField("tipo_user", e.target.value);
                  if (e.target.value !== "administrador") {
                    setAccessEmail("");
                    setAccessPassword("");
                  }
                }}><option value="usuario">Usuário</option><option value="administrador">Administrador</option></select></label>
                <label className="active-field"><input type="checkbox" checked={form.ativo} onChange={(e) => updateField("ativo", e.target.checked)} /><span />Usuário ativo</label>

                {form.tipo_user === "administrador" && (
                  <div className="login-credentials form-field-wide">
                    <div className="login-credentials-heading">
                      <strong>Login de acesso</strong>
                      <small>Defina as credenciais que o administrador usará no Atlas.</small>
                    </div>
                    <label className={`form-field ${fieldErrors.accessEmail ? "has-error" : ""}`}>
                      E-mail de acesso
                      <input type="email" autoComplete="off" value={accessEmail} onChange={(e) => { setAccessEmail(e.target.value); clearFieldError("accessEmail"); }} aria-invalid={Boolean(fieldErrors.accessEmail)} />
                      <FieldMessage message={fieldErrors.accessEmail} />
                    </label>
                    <label className={`form-field ${fieldErrors.accessPassword ? "has-error" : ""}`}>
                      Senha inicial
                      <input type="password" autoComplete="new-password" value={accessPassword} onChange={(e) => { setAccessPassword(e.target.value); clearFieldError("accessPassword"); }} aria-invalid={Boolean(fieldErrors.accessPassword)} />
                      <FieldMessage message={fieldErrors.accessPassword} />
                    </label>
                  </div>
                )}

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
