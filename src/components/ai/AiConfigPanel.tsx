"use client";

import { CheckCircle2, LoaderCircle, PlugZap, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AI_PROVIDER_PROFILES, LOCAL_ONLY_AI_PROVIDER } from "../../lib/ai/constants";
import { deleteAiConnection, getAiConfig, testAiConfig, updateAiConfig } from "./service";
import type { AiConfigView, AiConnection, AiProviderOption } from "./types";

const localProfile = AI_PROVIDER_PROFILES[LOCAL_ONLY_AI_PROVIDER];
const LOCAL_PROVIDER_OPTION: AiProviderOption = {
  id: "SELF_HOSTED_OPENAI",
  label: localProfile.label,
  description: localProfile.description,
  defaultModel: localProfile.defaultModel,
  defaultBaseUrl: localProfile.defaultBaseUrl,
  requiresApiKey: false,
  apiKeyLabel: "No aplica",
};
const FALLBACK_PROVIDER_OPTIONS: AiProviderOption[] = [LOCAL_PROVIDER_OPTION];

const EMPTY_CONFIG: AiConfigView = {
  provider: "SELF_HOSTED_OPENAI",
  model: LOCAL_PROVIDER_OPTION.defaultModel,
  baseUrl: LOCAL_PROVIDER_OPTION.defaultBaseUrl,
  preferredLanguage: "es",
  preferredName: "Usuario",
  isActive: true,
  requiresApiKey: false,
  hasApiKey: false,
  maskedApiKey: null,
  updatedAt: null,
  providerOptions: FALLBACK_PROVIDER_OPTIONS,
};

export default function AiConfigPanel({ onConfigSaved }: { onConfigSaved: (config: AiConfigView) => void }) {
  const [config, setConfig] = useState<AiConfigView>(EMPTY_CONFIG);
  const [model, setModel] = useState(EMPTY_CONFIG.model);
  const [baseUrl, setBaseUrl] = useState(EMPTY_CONFIG.baseUrl || "");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [connectionName, setConnectionName] = useState("Conexion local");
  const [preferredLanguage, setPreferredLanguage] = useState("es");
  const [preferredName, setPreferredName] = useState("Usuario");
  const [createNewConnection, setCreateNewConnection] = useState(false);
  const [makeDefault, setMakeDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const next = await getAiConfig();
        setConfig(next);
        const connections = next.connections || [];
        const initialConnectionId = next.defaultConnectionId || connections[0]?.id || "";
        setSelectedConnectionId(initialConnectionId);

        const selectedConnection = connections.find((item) => item.id === initialConnectionId);
        setPreferredLanguage(next.preferredLanguage || "es");
        setPreferredName(next.preferredName || "Usuario");
        if (selectedConnection) {
          setConnectionName(selectedConnection.name);
          setModel(selectedConnection.model);
          setBaseUrl(selectedConnection.baseUrl || LOCAL_PROVIDER_OPTION.defaultBaseUrl);
          setMakeDefault(selectedConnection.isDefault);
        } else {
          setConnectionName("Conexion local");
          setModel(next.model || LOCAL_PROVIDER_OPTION.defaultModel);
          setBaseUrl(next.baseUrl || LOCAL_PROVIDER_OPTION.defaultBaseUrl);
          setMakeDefault(true);
        }
      } catch (err) {
        console.error("AI_CONFIG_LOAD_ERROR", err);
        setError("Ha ocurrido un error");
      } finally {
        setLoading(false);
      }
    };

    void loadConfig();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateAiConfig({
        connectionId: createNewConnection ? undefined : selectedConnectionId || undefined,
        connectionName,
        createNew: createNewConnection,
        makeDefault,
        provider: "SELF_HOSTED_OPENAI",
        model,
        baseUrl,
        preferredLanguage,
        preferredName,
        isActive: true,
        requiresApiKey: false,
      });

      setConfig(updated);
      setPreferredLanguage(updated.preferredLanguage || "es");
      setPreferredName(updated.preferredName || "Usuario");
      const connections = updated.connections || [];
      const nextSelectedId =
        !createNewConnection && selectedConnectionId && connections.some((item) => item.id === selectedConnectionId)
          ? selectedConnectionId
          : (updated.lastSavedConnectionId || updated.defaultConnectionId || connections[0]?.id || "");
      setSelectedConnectionId(nextSelectedId);

      const savedConnection = connections.find((item) => item.id === nextSelectedId);
      if (savedConnection) {
        setConnectionName(savedConnection.name);
        setModel(savedConnection.model);
        setBaseUrl(savedConnection.baseUrl || LOCAL_PROVIDER_OPTION.defaultBaseUrl);
        setMakeDefault(savedConnection.isDefault);
      }

      setCreateNewConnection(false);
      setMessage(createNewConnection ? "Nueva conexion local guardada" : "Conexion local actualizada");
      onConfigSaved(updated);
    } catch (err) {
      console.error("AI_CONFIG_SAVE_ERROR", err);
      setError("Ha ocurrido un error");
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await testAiConfig({
        provider: "SELF_HOSTED_OPENAI",
        model,
        baseUrl,
        requiresApiKey: false,
      });
      setMessage(`Conexion local correcta: ${result.reply}`);
    } catch (err) {
      console.error("AI_CONFIG_TEST_ERROR", err);
      setError("Ha ocurrido un error");
    } finally {
      setTesting(false);
    }
  };

  const connections = config.connections || [];
  const selectedConnection: AiConnection | null =
    connections.find((item) => item.id === selectedConnectionId) ||
    connections.find((item) => item.isDefault) ||
    null;

  const onSelectConnection = (connectionId: string) => {
    setSelectedConnectionId(connectionId);
    setCreateNewConnection(false);
    const connection = connections.find((item) => item.id === connectionId);

    if (!connection) {
      return;
    }

    setConnectionName(connection.name);
    setModel(connection.model);
    setBaseUrl(connection.baseUrl || LOCAL_PROVIDER_OPTION.defaultBaseUrl);
    setMakeDefault(connection.isDefault);
  };

  const onStartCreateConnection = () => {
    setCreateNewConnection(true);
    setConnectionName(`Conexion local ${new Date().toLocaleDateString()}`);
    setModel(LOCAL_PROVIDER_OPTION.defaultModel);
    setBaseUrl(LOCAL_PROVIDER_OPTION.defaultBaseUrl);
    setMakeDefault(false);
  };

  const onCancelCreateConnection = () => {
    setCreateNewConnection(false);
    const connection = connections.find((item) => item.id === selectedConnectionId) || connections[0];

    if (!connection) {
      return;
    }

    setConnectionName(connection.name);
    setModel(connection.model);
    setBaseUrl(connection.baseUrl || LOCAL_PROVIDER_OPTION.defaultBaseUrl);
    setMakeDefault(connection.isDefault);
  };

  const onDeleteSelectedConnection = async () => {
    if (!selectedConnectionId || deleting) {
      return;
    }

    const confirmed = window.confirm("Se eliminara la conexion seleccionada. Quieres continuar?");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await deleteAiConnection(selectedConnectionId);
      setConfig(updated);
      setPreferredLanguage(updated.preferredLanguage || "es");
      setPreferredName(updated.preferredName || "Usuario");

      const nextConnections = updated.connections || [];
      const nextSelected = updated.defaultConnectionId || nextConnections[0]?.id || "";
      setSelectedConnectionId(nextSelected);
      setCreateNewConnection(false);

      const selected = nextConnections.find((item) => item.id === nextSelected);
      if (selected) {
        setConnectionName(selected.name);
        setModel(selected.model);
        setBaseUrl(selected.baseUrl || LOCAL_PROVIDER_OPTION.defaultBaseUrl);
        setMakeDefault(selected.isDefault);
      }

      setMessage("Conexion eliminada");
      onConfigSaved(updated);
    } catch (err) {
      console.error("AI_CONFIG_DELETE_CONNECTION_ERROR", err);
      setError("Ha ocurrido un error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="surface-panel h-fit self-start p-4 sm:p-5 lg:p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">Conexion IA local</h2>
        </div>
        <PlugZap size={18} className="text-orion-primary" />
      </header>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle size={14} className="animate-spin" />
          Cargando configuracion...
        </p>
      ) : (
        <div className="space-y-4">
          {connections.length > 0 && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Conexiones guardadas
              </span>
              <select
                className="select-orion"
                value={selectedConnectionId || (connections[0]?.id ?? "")}
                onChange={(event) => onSelectConnection(event.target.value)}
                disabled={createNewConnection}
              >
                {connections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.name} {connection.isDefault ? "(predeterminada)" : ""}
                  </option>
                ))}
              </select>
              {selectedConnection && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {selectedConnection.model} - ultima actualizacion {new Date(selectedConnection.updatedAt).toLocaleString()}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {!createNewConnection ? (
                  <button
                    type="button"
                    className="btn-secondary inline-flex h-10 items-center justify-center gap-2 text-xs"
                    onClick={onStartCreateConnection}
                    disabled={saving || testing}
                  >
                    Nueva conexion
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary inline-flex h-10 items-center justify-center gap-2 text-xs"
                    onClick={onCancelCreateConnection}
                    disabled={saving || testing}
                  >
                    Cancelar nueva
                  </button>
                )}
                {!createNewConnection && connections.length > 0 && (
                  <button
                    type="button"
                    className="btn-secondary inline-flex h-10 items-center justify-center gap-2 text-xs text-red-700"
                    onClick={() => void onDeleteSelectedConnection()}
                    disabled={saving || testing || deleting}
                  >
                    {deleting ? "Eliminando..." : "Eliminar conexion"}
                  </button>
                )}
              </div>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Nombre de conexion</span>
            <input
              className="input-orion text-sm"
              value={connectionName}
              onChange={(event) => setConnectionName(event.target.value)}
              placeholder="Conexion local"
              maxLength={80}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Idioma preferido</span>
            <input
              className="input-orion text-sm"
              value={preferredLanguage}
              onChange={(event) => setPreferredLanguage(event.target.value)}
              placeholder="es"
              maxLength={12}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Nombre para dirigirse a ti</span>
            <input
              className="input-orion text-sm"
              value={preferredName}
              onChange={(event) => setPreferredName(event.target.value)}
              placeholder="Usuario"
              maxLength={80}
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-orion-border bg-slate-50 px-3 py-2 dark:border-orion-dark-border dark:bg-slate-900">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">Usar como predeterminada</p>
              <p className="text-xs text-slate-500">Se aplicara por defecto en nuevas conversaciones.</p>
            </div>
            <button
              type="button"
              onClick={() => setMakeDefault((prev) => !prev)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
                makeDefault ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
              aria-pressed={makeDefault}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  makeDefault ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Modelo</span>
            <input
              className="input-orion text-sm"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="llama3.1:8b"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Base URL</span>
            <input
              className="input-orion text-sm"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="http://localhost:11434/v1"
            />
          </label>

          {message && (
            <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={14} />
              {message}
            </p>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              className="btn-secondary inline-flex h-10 w-full items-center justify-center gap-2 text-xs sm:w-auto"
              type="button"
              onClick={onTest}
              disabled={testing || saving}
            >
              {testing ? <LoaderCircle size={14} className="animate-spin" /> : <PlugZap size={14} />}
              {testing ? "Probando..." : "Probar"}
            </button>

            <button
              className="btn-primary inline-flex h-10 w-full items-center justify-center gap-2 text-xs sm:w-auto"
              type="button"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Guardando..." : "Guardar conexion"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
