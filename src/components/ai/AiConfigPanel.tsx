"use client";

import { CheckCircle2, LoaderCircle, PlugZap, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AI_PROVIDER_PROFILES } from "../../lib/ai/constants";
import { getAiConfig, testAiConfig, updateAiConfig } from "./service";
import type { AiConfigView, AiConnection, AiProvider, AiProviderOption } from "./types";

const FALLBACK_PROVIDER_OPTIONS: AiProviderOption[] = Object.values(AI_PROVIDER_PROFILES);

const EMPTY_CONFIG: AiConfigView = {
  provider: "GITHUB_MODELS",
  model: "openai/gpt-4.1-mini",
  baseUrl: null,
  isActive: true,
  requiresApiKey: true,
  hasApiKey: false,
  maskedApiKey: null,
  updatedAt: null,
  providerOptions: FALLBACK_PROVIDER_OPTIONS,
};

export default function AiConfigPanel({ onConfigSaved }: { onConfigSaved: (config: AiConfigView) => void }) {
  const [config, setConfig] = useState<AiConfigView>(EMPTY_CONFIG);
  const [model, setModel] = useState(EMPTY_CONFIG.model);
  const [baseUrl, setBaseUrl] = useState("");
  const [provider, setProvider] = useState<AiProvider>(EMPTY_CONFIG.provider);
  const [apiKey, setApiKey] = useState("");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [connectionName, setConnectionName] = useState("Conexion principal");
  const [createNewConnection, setCreateNewConnection] = useState(false);
  const [makeDefault, setMakeDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
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
        if (selectedConnection) {
          setConnectionName(selectedConnection.name);
          setProvider(selectedConnection.provider);
          setModel(selectedConnection.model);
          setBaseUrl(selectedConnection.baseUrl || "");
          setMakeDefault(selectedConnection.isDefault);
        } else {
          setConnectionName("Conexion principal");
          setProvider(next.provider);
          setModel(next.model);
          setBaseUrl(next.baseUrl || "");
          setMakeDefault(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar la configuracion IA");
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
      const selectedProvider =
        providerOptions.find((option) => option.id === provider) ||
        FALLBACK_PROVIDER_OPTIONS.find((option) => option.id === provider) ||
        FALLBACK_PROVIDER_OPTIONS[0];

      const updated = await updateAiConfig({
        connectionId: createNewConnection ? undefined : selectedConnectionId || undefined,
        connectionName,
        createNew: createNewConnection,
        makeDefault,
        provider,
        model,
        baseUrl,
        apiKey: apiKey.trim() || undefined,
        isActive: true,
        requiresApiKey: selectedProvider?.requiresApiKey ?? true,
      });

      setConfig(updated);
      const connections = updated.connections || [];
      const nextSelectedId =
        !createNewConnection && selectedConnectionId && connections.some((item) => item.id === selectedConnectionId)
          ? selectedConnectionId
          : (updated.lastSavedConnectionId || updated.defaultConnectionId || connections[0]?.id || "");
      setSelectedConnectionId(nextSelectedId);

      const savedConnection = connections.find((item) => item.id === nextSelectedId);
      if (savedConnection) {
        setConnectionName(savedConnection.name);
        setProvider(savedConnection.provider);
        setModel(savedConnection.model);
        setBaseUrl(savedConnection.baseUrl || "");
        setMakeDefault(savedConnection.isDefault);
      }

      setCreateNewConnection(false);
      setApiKey("");
      setMessage(createNewConnection ? "Nueva conexion IA guardada" : "Conexion IA actualizada");
      onConfigSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuracion");
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    setError(null);
    setMessage(null);

    try {
      const selectedProvider =
        providerOptions.find((option) => option.id === provider) ||
        FALLBACK_PROVIDER_OPTIONS.find((option) => option.id === provider) ||
        FALLBACK_PROVIDER_OPTIONS[0];

      const result = await testAiConfig({
        provider,
        model,
        baseUrl,
        apiKey: apiKey.trim() || undefined,
        requiresApiKey: selectedProvider?.requiresApiKey ?? true,
      });
      setMessage(`Conexion correcta (${result.providerLabel}): ${result.reply}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo probar la conexion");
    } finally {
      setTesting(false);
    }
  };

  const providerOptions =
    config.providerOptions && config.providerOptions.length > 0
      ? config.providerOptions
      : FALLBACK_PROVIDER_OPTIONS;
  const activeProviderMeta =
    providerOptions.find((option) => option.id === provider) ||
    providerOptions.find((option) => option.id === config.provider) ||
    null;

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
    setProvider(connection.provider);
    setModel(connection.model);
    setBaseUrl(connection.baseUrl || "");
    setMakeDefault(connection.isDefault);
  };

  const onStartCreateConnection = () => {
    const defaultProvider = FALLBACK_PROVIDER_OPTIONS[0];
    setCreateNewConnection(true);
    setConnectionName(`Conexion ${new Date().toLocaleDateString()}`);
    setProvider(defaultProvider.id);
    setModel(defaultProvider.defaultModel);
    setBaseUrl(defaultProvider.defaultBaseUrl);
    setApiKey("");
    setMakeDefault(false);
  };

  const onCancelCreateConnection = () => {
    setCreateNewConnection(false);
    const connection = connections.find((item) => item.id === selectedConnectionId) || connections[0];

    if (!connection) {
      return;
    }

    setConnectionName(connection.name);
    setProvider(connection.provider);
    setModel(connection.model);
    setBaseUrl(connection.baseUrl || "");
    setMakeDefault(connection.isDefault);
  };

  return (
    <section className="surface-panel h-full min-h-0 overflow-y-auto p-4 sm:p-5 lg:p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">Conexion IA</h2>
          <p className="mt-1 text-xs text-slate-500">Tu API key queda cifrada y solo se usa para tus mensajes.</p>
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
                  {selectedConnection.provider} · {selectedConnection.model} · ultima actualizacion {new Date(selectedConnection.updatedAt).toLocaleString()}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {!createNewConnection ? (
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={onStartCreateConnection}
                    disabled={saving || testing}
                  >
                    Nueva conexion
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={onCancelCreateConnection}
                    disabled={saving || testing}
                  >
                    Cancelar nueva
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
              placeholder="Conexion principal"
              maxLength={80}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Proveedor</span>
            <select
              className="select-orion text-sm"
              value={provider}
              onChange={(event) => {
                const nextProvider = event.target.value as AiProvider;
                setProvider(nextProvider);
                const option = providerOptions.find((item) => item.id === nextProvider);
                if (option) {
                  setModel(option.defaultModel);
                  setBaseUrl(option.defaultBaseUrl);
                }
              }}
            >
              {providerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {activeProviderMeta && <p className="mt-1 text-[11px] text-slate-500">{activeProviderMeta.description}</p>}
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
              placeholder="gpt-4o-mini"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Base URL (opcional)</span>
            <input
              className="input-orion text-sm"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
              API key {config.maskedApiKey ? `(actual: ${config.maskedApiKey})` : ""}
            </span>
            <input
              type="password"
              className="input-orion text-sm"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={config.hasApiKey ? "Deja vacio para mantener la actual" : "Pega tu API key"}
            />
            {activeProviderMeta && (
              <p className="mt-1 text-[11px] text-slate-500">Tipo de credencial: {activeProviderMeta.apiKeyLabel}</p>
            )}
            {activeProviderMeta && !activeProviderMeta.requiresApiKey && (
              <p className="mt-1 text-[11px] text-slate-500">
                API key opcional para esta conexion.
              </p>
            )}
          </label>

          {message && (
            <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={14} />
              {message}
            </p>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button className="btn-secondary w-full text-xs sm:w-auto" type="button" onClick={onTest} disabled={testing || saving}>
              {testing ? <LoaderCircle size={14} className="animate-spin" /> : <PlugZap size={14} />}
              {testing ? "Probando..." : "Probar"}
            </button>

            <button className="btn-primary w-full text-xs sm:w-auto" type="button" onClick={onSave} disabled={saving}>
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Guardando..." : "Guardar conexion"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
