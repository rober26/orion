"use client";

import { LoaderCircle, Plus, Send, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AiConfigPanel from "./AiConfigPanel";
import {
  createAiConversation,
  deleteAiConversation,
  getAiConfig,
  getAiConversationDetail,
  getAiConversations,
  sendAiMessage,
  updateAiConversationConnection,
} from "./service";
import type { AiConfigView, AiConnection, AiConversationListItem, AiMessage } from "./types";

const DEFAULT_CONFIG: AiConfigView = {
  provider: "GITHUB_MODELS",
  model: "openai/gpt-4.1-mini",
  baseUrl: null,
  isActive: true,
  requiresApiKey: true,
  hasApiKey: false,
  maskedApiKey: null,
  updatedAt: null,
  providerOptions: [],
};

export default function AiChatWorkspace() {
  const [config, setConfig] = useState<AiConfigView>(DEFAULT_CONFIG);
  const [conversations, setConversations] = useState<AiConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [switchingConnection, setSwitchingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const loadConversations = async (focusConversationId?: string | null) => {
    setLoadingConversations(true);
    setError(null);

    try {
      const data = await getAiConversations();
      setConversations(data);

      const nextActive =
        focusConversationId && data.some((item) => item.id === focusConversationId)
          ? focusConversationId
          : data[0]?.id ?? null;

      setActiveConversationId(nextActive);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las conversaciones");
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversationDetail = async (conversationId: string) => {
    setLoadingMessages(true);
    setError(null);

    try {
      const detail = await getAiConversationDetail(conversationId);
      setMessages(detail.messages);
    } catch (err) {
      setMessages([]);
      setError(err instanceof Error ? err.message : "No se pudo cargar la conversacion");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void loadConversations();

    const loadConfig = async () => {
      try {
        const nextConfig = await getAiConfig();
        setConfig(nextConfig);
      } catch {
        setConfig(DEFAULT_CONFIG);
      }
    };

    void loadConfig();
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    void loadConversationDetail(activeConversationId);
  }, [activeConversationId]);

  const onCreateConversation = async () => {
    try {
      const created = await createAiConversation();
      await loadConversations(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la conversacion");
    }
  };

  const onDeleteConversation = async (conversationId: string) => {
    try {
      await deleteAiConversation(conversationId);
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la conversacion");
    }
  };

  const onChangeConversationConnection = async (connectionId: string) => {
    if (!activeConversationId || switchingConnection) {
      return;
    }

    setSwitchingConnection(true);
    setError(null);

    try {
      await updateAiConversationConnection(activeConversationId, connectionId);
      await loadConversations(activeConversationId);
      await loadConversationDetail(activeConversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la IA de la conversacion");
    } finally {
      setSwitchingConnection(false);
    }
  };

  const connectionOptions: AiConnection[] = config.connections || [];
  const selectedConnectionId = activeConversation?.connectionId || config.defaultConnectionId || "";
  const selectedConnection =
    connectionOptions.find((connection) => connection.id === selectedConnectionId) ||
    connectionOptions.find((connection) => connection.isDefault) ||
    null;

  const onSubmitMessage = async (event: FormEvent) => {
    event.preventDefault();

    const content = messageInput.trim();

    if (!content || sending) {
      return;
    }

    if (selectedConnection?.requiresApiKey && !selectedConnection.hasApiKey) {
      setError("La IA de esta conversacion requiere API key");
      return;
    }

    setSending(true);
    setError(null);

    const localUserMessage: AiMessage = {
      id: `tmp-user-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, localUserMessage]);
    setMessageInput("");

    try {
      const response = await sendAiMessage({
        conversationId: activeConversationId ?? undefined,
        content,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `tmp-assistant-${Date.now()}`,
          role: "assistant",
          content: response.assistantMessage,
          createdAt: new Date().toISOString(),
        },
      ]);

      await loadConversations(response.conversationId);
      setActiveConversationId(response.conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-hidden p-2 sm:p-3">
      <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <section className="surface-panel flex min-h-[220px] flex-col p-4 xl:min-h-0">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Conversaciones
            </h2>
            <button className="btn-primary h-9 text-xs" type="button" onClick={onCreateConversation}>
              <Plus size={14} />
              Nueva
            </button>
          </header>

          {loadingConversations ? (
            <p className="inline-flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle size={14} className="animate-spin" />
              Cargando...
            </p>
          ) : conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-orion-border p-4 text-xs text-slate-500 dark:border-orion-dark-border">
              Aun no hay conversaciones. Crea la primera para empezar.
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-1">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;

                return (
                  <article
                    key={conversation.id}
                    className={`rounded-2xl border px-3 py-2 transition ${
                      isActive
                        ? "border-blue-200 bg-blue-50/80 dark:border-blue-800/70 dark:bg-blue-900/30"
                        : "border-orion-border bg-white hover:bg-slate-50 dark:border-orion-dark-border dark:bg-slate-900 dark:hover:bg-slate-800"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveConversationId(conversation.id)}
                      className="w-full text-left"
                    >
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{conversation.title}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {(conversation.connectionName || conversation.model) + " · " + conversation.messageCount + " mensajes"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteConversation(conversation.id)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={12} />
                      Eliminar
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="surface-panel flex min-h-[360px] flex-col p-4 sm:p-5 xl:min-h-0">
          <header className="mb-3 border-b border-orion-border pb-3 dark:border-orion-dark-border">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">IA Chat</h1>
            <p className="text-xs text-slate-500">
              {activeConversation ? activeConversation.title : "Selecciona o crea una conversacion"}
            </p>
            {activeConversation && connectionOptions.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">IA activa</span>
                <select
                  className="select-orion h-8 min-w-44 max-w-full text-xs sm:max-w-xs"
                  value={selectedConnectionId}
                  onChange={(event) => void onChangeConversationConnection(event.target.value)}
                  disabled={switchingConnection}
                >
                  {connectionOptions.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.name} · {connection.model}
                    </option>
                  ))}
                </select>
                {switchingConnection && <LoaderCircle size={13} className="animate-spin text-slate-500" />}
              </div>
            )}
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
            {loadingMessages ? (
              <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                <LoaderCircle size={14} className="animate-spin" />
                Cargando mensajes...
              </p>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-orion-border p-5 text-sm text-slate-500 dark:border-orion-dark-border">
                Envia el primer mensaje para iniciar la conversacion.
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "ml-auto bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </article>
              ))
            )}
          </div>

          <form onSubmit={onSubmitMessage} className="border-t border-orion-border pt-3 dark:border-orion-dark-border">
            <div className="flex flex-col gap-2 sm:flex-row">
              <textarea
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                className="input-orion min-h-12 flex-1 resize-none"
                placeholder="Escribe tu mensaje..."
                maxLength={6000}
              />
              <button type="submit" className="btn-primary h-10 sm:h-fit" disabled={sending || !messageInput.trim()}>
                {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? "Enviando" : "Enviar"}
              </button>
            </div>
          </form>

          {selectedConnection && selectedConnection.requiresApiKey && !selectedConnection.hasApiKey && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              La IA seleccionada para esta conversacion requiere API key. Actualiza esa conexion en el panel derecho.
            </p>
          )}

          {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
        </section>

        <div className="min-h-[320px] xl:min-h-0">
          <AiConfigPanel onConfigSaved={setConfig} />
        </div>
      </div>
    </div>
  );
}
