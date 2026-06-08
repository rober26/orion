"use client";

import { LoaderCircle, MessageSquare, MoreHorizontal, Plus, Send, Settings, X } from "lucide-react";
import { CSSProperties, FormEvent, KeyboardEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import AiConfigPanel from "./AiConfigPanel";
import {
  createAiConversation,
  deleteAiConversation,
  getAiConfig,
  getAiConversationDetail,
  getAiConversations,
  sendAiMessage,
  updateAiConversationSettings,
  updateAiConversationConnection,
} from "./service";
import type { AiConfigView, AiConnection, AiConversationListItem, AiMessage } from "./types";
import ContextMenu from "../ui/ContextMenu";

const DEFAULT_CONFIG: AiConfigView = {
  provider: "SELF_HOSTED_OPENAI",
  model: "llama3.1:8b",
  baseUrl: null,
  preferredLanguage: "es",
  preferredName: "Usuario",
  isActive: true,
  requiresApiKey: false,
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
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [switchingConnection, setSwitchingConnection] = useState(false);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [renameConversation, setRenameConversation] = useState<{ id: string; value: string } | null>(null);
  const [openConversationMenuId, setOpenConversationMenuId] = useState<string | null>(null);
  const [conversationMenuPosition, setConversationMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [conversationSettings, setConversationSettings] = useState<{
    id: string;
    title: string;
    personaStyle: string;
    primaryFunction: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sendAbortRef = useRef<AbortController | null>(null);
  const pendingSendRef = useRef<{ requestId: string; tempMessageId: string; content: string } | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );
  const menuConversation = useMemo(
    () => conversations.find((item) => item.id === openConversationMenuId) ?? null,
    [conversations, openConversationMenuId],
  );
  const connectionOptions: AiConnection[] = config.connections || [];
  const hasConnections = connectionOptions.length > 0;

  const closeConversationMenu = () => {
    setOpenConversationMenuId(null);
    setConversationMenuPosition(null);
  };

  useEffect(() => {
    const settingsId = conversationSettings?.id;
    if (!settingsId) {
      return;
    }

    const source = conversations.find((item) => item.id === settingsId);
    if (!source) {
      return;
    }

    setConversationSettings((prev) => {
      if (!prev) {
        return prev;
      }

      const nextTitle = source.title;
      const nextPersonaStyle = source.personaStyle || "";
      const nextPrimaryFunction = source.primaryFunction || "";

      if (
        prev.title === nextTitle
        && prev.personaStyle === nextPersonaStyle
        && prev.primaryFunction === nextPrimaryFunction
      ) {
        return prev;
      }

      return {
        ...prev,
        title: nextTitle,
        personaStyle: nextPersonaStyle,
        primaryFunction: nextPrimaryFunction,
      };
    });
  }, [conversationSettings?.id, conversations]);

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
      console.error("AI_CHAT_LOAD_CONVERSATIONS_ERROR", err);
      setError("Ha ocurrido un error");
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
      console.error("AI_CHAT_LOAD_CONVERSATION_DETAIL_ERROR", err);
      setError("Ha ocurrido un error");
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
    } catch (err) {
      console.error("AI_CHAT_LOAD_CONFIG_ERROR", err);
      setConfig(DEFAULT_CONFIG);
      setError("Ha ocurrido un error");
    } finally {
      setLoadingConfig(false);
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
    if (!hasConnections) {
      console.error("AI_CHAT_NO_CONNECTION_FOR_CREATE");
      setError("Ha ocurrido un error");
      return;
    }

    try {
      const created = await createAiConversation();
      await loadConversations(created.id);
    } catch (err) {
      console.error("AI_CHAT_CREATE_CONVERSATION_ERROR", err);
      setError("Ha ocurrido un error");
    }
  };

  const onDeleteConversation = async (conversationId: string) => {
    try {
      await deleteAiConversation(conversationId);
      if (conversationSettings?.id === conversationId) {
        setConversationSettings(null);
      }
      await loadConversations();
    } catch (err) {
      console.error("AI_CHAT_DELETE_CONVERSATION_ERROR", err);
      setError("Ha ocurrido un error");
    }
  };

  const openConversationSettings = (conversation: AiConversationListItem) => {
    setIsConversationsOpen(false);
    setIsConfigOpen(false);
    setOpenConversationMenuId(null);
    setConversationMenuPosition(null);
    setConversationSettings({
      id: conversation.id,
      title: conversation.title,
      personaStyle: conversation.personaStyle || "",
      primaryFunction: conversation.primaryFunction || "",
    });
  };

  const onSaveConversationSettings = async () => {
    if (!conversationSettings) {
      return;
    }

    try {
      await updateAiConversationSettings({
        conversationId: conversationSettings.id,
        title: conversationSettings.title.trim(),
        personaStyle: conversationSettings.personaStyle,
        primaryFunction: conversationSettings.primaryFunction,
      });

      await loadConversations(conversationSettings.id);
      if (activeConversationId === conversationSettings.id) {
        await loadConversationDetail(conversationSettings.id);
      }
      setConversationSettings(null);
    } catch (err) {
      console.error("AI_CHAT_SAVE_CONVERSATION_SETTINGS_ERROR", err);
      setError("Ha ocurrido un error");
    }
  };

  const onRenameConversation = async (conversationId: string, currentTitle: string) => {
    const nextTitle = renameConversation?.id === conversationId ? renameConversation.value.trim() : currentTitle;

    if (!nextTitle || nextTitle === currentTitle) {
      setRenameConversation(null);
      return;
    }

    try {
      await updateAiConversationSettings({ conversationId, title: nextTitle });
      await loadConversations(conversationId);
      setRenameConversation(null);
    } catch (err) {
      console.error("AI_CHAT_RENAME_CONVERSATION_ERROR", err);
      setError("Ha ocurrido un error");
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
      console.error("AI_CHAT_CHANGE_CONNECTION_ERROR", err);
      setError("Ha ocurrido un error");
    } finally {
      setSwitchingConnection(false);
    }
  };

  const onConversationActionMenuToggle = (conversationId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (openConversationMenuId === conversationId) {
      closeConversationMenu();
      return;
    }

    const target = event.currentTarget.getBoundingClientRect();
    const nextX = Math.round(target.right);
    const nextY = Math.round(target.bottom + 4);

    setOpenConversationMenuId(conversationId);
    setConversationMenuPosition({ x: nextX, y: nextY });
  };

  const onCancelSending = () => {
    const pendingSend = pendingSendRef.current;

    if (pendingSend) {
      setMessages((prev) => prev.filter((message) => message.id !== pendingSend.tempMessageId));
      setMessageInput((prev) => (prev.trim().length > 0 ? prev : pendingSend.content));
      pendingSendRef.current = null;
    }

    sendAbortRef.current?.abort();
    sendAbortRef.current = null;
    setSending(false);
  };

  const selectedConnectionId = activeConversation?.connectionId || config.defaultConnectionId || "";

  const onSubmitMessage = async (event: FormEvent) => {
    event.preventDefault();

    const content = messageInput.trim();

    if (!content || sending) {
      return;
    }

    if (!hasConnections) {
      console.error("AI_CHAT_NO_CONNECTION_FOR_SEND");
      setError("Ha ocurrido un error");
      return;
    }

    setSending(true);
    setError(null);
    const controller = new AbortController();
    sendAbortRef.current = controller;

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempMessageId = `tmp-user-${requestId}`;
    const localUserMessage: AiMessage = {
      id: tempMessageId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    pendingSendRef.current = {
      requestId,
      tempMessageId,
      content,
    };

    setMessages((prev) => [...prev, localUserMessage]);
    setMessageInput("");

    try {
      const response = await sendAiMessage({
        conversationId: activeConversationId ?? undefined,
        content,
      }, { signal: controller.signal });

      if (!pendingSendRef.current || pendingSendRef.current.requestId !== requestId) {
        return;
      }

      setMessages((prev) => [
        ...prev.filter((message) => message.id !== tempMessageId),
        {
          id: `user-${requestId}`,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        },
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
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      console.error("AI_CHAT_SEND_MESSAGE_ERROR", {
        error: err,
        category: err instanceof Error && err.message === "No se pudo conectar con el servidor" ? "network" : "application",
      });
      setMessages((prev) => prev.filter((message) => message.id !== tempMessageId));
      setMessageInput((prev) => (prev.trim().length > 0 ? prev : content));
      setError("Ha ocurrido un error");
    } finally {
      if (pendingSendRef.current?.requestId === requestId) {
        pendingSendRef.current = null;
      }

      sendAbortRef.current = null;
      setSending(false);
    }
  };

  const onMessageInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  useEffect(() => {
    const textarea = messageInputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "40px";
    const maxHeight = 156;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [messageInput]);

  const onConfigSaved = (nextConfig: AiConfigView) => {
    const hadConnections = (config.connections || []).length > 0;
    const hasNowConnections = (nextConfig.connections || []).length > 0;
    setConfig(nextConfig);
    setError(null);

    if (hasNowConnections) {
      if (!hadConnections && conversations.length === 0) {
        void (async () => {
          try {
            const created = await createAiConversation();
            await loadConversations(created.id);
          } catch (err) {
            console.error("AI_CHAT_CREATE_INITIAL_CONVERSATION_ERROR", err);
            setError("Ha ocurrido un error");
            await loadConversations();
          }
        })();
      } else {
        void loadConversations();
      }

      setIsConversationsOpen(false);
      setIsConfigOpen(false);
    }
  };

  useEffect(() => {
    return () => {
      sendAbortRef.current?.abort();
    };
  }, []);

  if (loadingConfig) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-4">
        <p className="inline-flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle size={14} className="animate-spin" />
          Cargando configuracion IA...
        </p>
      </div>
    );
  }

  if (!hasConnections) {
    return (
      <div className="grid h-full min-h-0 grid-cols-1 gap-3 content-start">
        <section className="surface-panel h-fit w-full self-start p-4">
          <h1 className="text-left text-xl font-black tracking-tight text-slate-900 dark:text-white">Configura tu primera conexion IA</h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Para empezar a usar el chat, guarda tu endpoint local.
          </p>
        </section>

        <div className="w-full self-start">
          <AiConfigPanel onConfigSaved={onConfigSaved} />
        </div>
      </div>
    );
  }

  const isMobilePanelOpen = isConversationsOpen || isConfigOpen;

  const desktopPanelLayoutStyle = {
    "--ai-left-panel": isConversationsOpen ? "300px" : "0px",
    "--ai-right-panel": isConfigOpen ? "360px" : "0px",
  } as CSSProperties;

  return (
    <div
      className="motion-panel relative grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[var(--ai-left-panel)_minmax(0,1fr)_var(--ai-right-panel)]"
      style={desktopPanelLayoutStyle}
    >
      <button
        type="button"
        aria-label="Cerrar paneles"
        onClick={() => {
          setIsConversationsOpen(false);
          setIsConfigOpen(false);
        }}
        className={`motion-fade absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] xl:hidden ${
          isMobilePanelOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <section
        className={`motion-panel surface-panel hidden min-h-[220px] flex-col p-4 xl:flex xl:min-h-0 ${
          isConversationsOpen ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-2 opacity-0"
        }`}
      >
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
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setOpenConversationMenuId(conversation.id);
                      setConversationMenuPosition({ x: event.clientX, y: event.clientY });
                    }}
                    className={`motion-interactive relative rounded-2xl border px-3 py-2 pr-11 ${
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
                      {renameConversation?.id === conversation.id ? (
                        <input
                          value={renameConversation.value}
                          onChange={(event) => setRenameConversation({ id: conversation.id, value: event.target.value })}
                          onBlur={() => void onRenameConversation(conversation.id, conversation.title)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void onRenameConversation(conversation.id, conversation.title);
                            }

                            if (event.key === "Escape") {
                              setRenameConversation(null);
                            }
                          }}
                          className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none dark:text-slate-100"
                          maxLength={160}
                          autoFocus
                        />
                      ) : (
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{conversation.title}</p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-500">
                        {conversation.connectionName || conversation.model}
                      </p>
                    </button>
                    <div className="absolute right-2 top-2" data-row-menu="true">
                      <button
                        type="button"
                        onClick={(event) => onConversationActionMenuToggle(conversation.id, event)}
                        className="btn-secondary inline-flex h-7 w-7 items-center justify-center p-0"
                        aria-label="Abrir menu de conversacion"
                      >
                        <MoreHorizontal size={13} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </section>

      <section className="flex min-h-[360px] flex-col rounded-2xl bg-orion-surface shadow-sm dark:bg-slate-900 xl:min-h-0">
          <header className="mb-3 border-b border-orion-border px-4 pb-3 pt-4 dark:border-orion-dark-border sm:px-5 sm:pt-5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="btn-secondary inline-flex h-10 w-10 items-center justify-center p-0"
                onClick={() => {
                  setIsConversationsOpen((prev) => !prev);
                  setIsConfigOpen(false);
                }}
                aria-label={isConversationsOpen ? "Ocultar conversaciones" : "Mostrar conversaciones"}
                title={isConversationsOpen ? "Ocultar conversaciones" : "Mostrar conversaciones"}
              >
                <MessageSquare size={17} />
              </button>

               <div className="min-w-0 flex-1 px-1">
                 <h1 className="truncate text-xl font-black tracking-tight text-slate-900 dark:text-white">
                   {activeConversation?.title || "Nueva conversacion"}
                 </h1>
               </div>
               {activeConversation && connectionOptions.length > 0 && (
                 <div className="hidden items-center gap-2 sm:flex">
                   <select
                     className="select-orion h-8 min-w-44 max-w-[240px] text-xs"
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
              <button
                type="button"
                className="btn-secondary inline-flex h-10 w-10 items-center justify-center p-0"
                onClick={() => {
                  setIsConfigOpen((prev) => !prev);
                  setIsConversationsOpen(false);
                }}
                aria-label={isConfigOpen ? "Ocultar conexion IA" : "Mostrar conexion IA"}
                title={isConfigOpen ? "Ocultar conexion IA" : "Mostrar conexion IA"}
              >
                <Settings size={17} />
              </button>
            </div>
            {activeConversation && connectionOptions.length > 0 && (
              <div className="mt-2 flex items-center gap-2 sm:hidden">
                <select
                  className="select-orion h-8 min-w-0 flex-1 text-xs"
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

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3 sm:px-5">
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
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-colors duration-200 ${
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

          <form onSubmit={onSubmitMessage} className="border-t border-orion-border px-4 pb-4 pt-3 dark:border-orion-dark-border sm:px-5 sm:pb-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <textarea
                ref={messageInputRef}
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={onMessageInputKeyDown}
                rows={1}
                className="input-orion motion-height h-10 flex-1 resize-none overflow-y-hidden py-2.5 leading-5"
                placeholder="Escribe tu mensaje..."
                maxLength={6000}
              />
              <button
                type={sending ? "button" : "submit"}
                className="btn-primary inline-flex h-10 items-center justify-center gap-2 sm:min-w-[108px]"
                onClick={sending ? onCancelSending : undefined}
                disabled={!sending && !messageInput.trim()}
              >
                {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? "Cancelar" : "Enviar"}
              </button>
            </div>
          </form>

          {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      </section>

      <div
        className={`motion-panel hidden self-start overflow-hidden xl:block ${
          isConfigOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-2 opacity-0"
        }`}
      >
        <AiConfigPanel onConfigSaved={onConfigSaved} />
      </div>

      {conversationSettings && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-2 sm:p-4">
          <section className="surface-panel w-full max-w-xl p-4 transition-all duration-300 ease-out sm:p-5">
            <header className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Configuracion de conversacion</h3>
              <button
                type="button"
                className="btn-secondary inline-flex h-8 w-8 items-center justify-center p-0"
                onClick={() => setConversationSettings(null)}
                aria-label="Cerrar configuracion"
              >
                <X size={14} />
              </button>
            </header>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Nombre de conversacion</span>
                <input
                  className="input-orion text-sm"
                  value={conversationSettings.title}
                  onChange={(event) =>
                    setConversationSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            title: event.target.value,
                          }
                        : prev,
                    )
                  }
                  maxLength={160}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Personalidad IA</span>
                <input
                  className="input-orion text-sm"
                  value={conversationSettings.personaStyle}
                  onChange={(event) =>
                    setConversationSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            personaStyle: event.target.value,
                          }
                        : prev,
                    )
                  }
                  placeholder="mentor claro y paciente"
                  maxLength={160}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Funcion principal</span>
                <input
                  className="input-orion text-sm"
                  value={conversationSettings.primaryFunction}
                  onChange={(event) =>
                    setConversationSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            primaryFunction: event.target.value,
                          }
                        : prev,
                    )
                  }
                  placeholder="asistente de programacion"
                  maxLength={160}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                className="btn-secondary h-9 text-xs text-red-700"
                onClick={() => void onDeleteConversation(conversationSettings.id)}
              >
                Eliminar conversacion
              </button>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-secondary h-9 text-xs" onClick={() => setConversationSettings(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary h-9 text-xs" onClick={() => void onSaveConversationSettings()}>
                  Guardar cambios
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <aside
        className={`motion-panel absolute inset-y-0 left-0 z-50 w-[min(88vw,22rem)] p-2 sm:p-3 xl:hidden ${
          isConversationsOpen ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-4 opacity-0"
        }`}
      >
          <section className="surface-panel flex h-full min-h-0 flex-col p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Conversaciones</h2>
              <button
                className="btn-primary h-9 text-xs"
                type="button"
                onClick={onCreateConversation}
              >
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
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setOpenConversationMenuId(conversation.id);
                      setConversationMenuPosition({ x: event.clientX, y: event.clientY });
                    }}
                    className={`motion-interactive relative rounded-2xl border px-3 py-2 pr-11 ${
                        isActive
                          ? "border-blue-200 bg-blue-50/80 dark:border-blue-800/70 dark:bg-blue-900/30"
                          : "border-orion-border bg-white hover:bg-slate-50 dark:border-orion-dark-border dark:bg-slate-900 dark:hover:bg-slate-800"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveConversationId(conversation.id);
                          setIsConversationsOpen(false);
                        }}
                        className="w-full text-left"
                      >
                        {renameConversation?.id === conversation.id ? (
                          <input
                            value={renameConversation.value}
                            onChange={(event) => setRenameConversation({ id: conversation.id, value: event.target.value })}
                            onBlur={() => void onRenameConversation(conversation.id, conversation.title)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void onRenameConversation(conversation.id, conversation.title);
                              }

                              if (event.key === "Escape") {
                                setRenameConversation(null);
                              }
                            }}
                            className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none dark:text-slate-100"
                            maxLength={160}
                            autoFocus
                          />
                        ) : (
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{conversation.title}</p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-500">
                          {conversation.connectionName || conversation.model}
                        </p>
                      </button>
                      <div className="absolute right-2 top-2" data-row-menu="true">
                        <button
                          type="button"
                          onClick={(event) => onConversationActionMenuToggle(conversation.id, event)}
                          className="btn-secondary inline-flex h-7 w-7 items-center justify-center p-0"
                          aria-label="Abrir menu de conversacion"
                        >
                          <MoreHorizontal size={13} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
      </aside>

      <aside
        className={`motion-panel absolute inset-y-0 right-0 z-50 w-[min(92vw,24rem)] p-2 sm:p-3 xl:hidden ${
          isConfigOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"
        }`}
      >
          <div className="h-full min-h-0 overflow-y-auto">
            <AiConfigPanel onConfigSaved={onConfigSaved} />
          </div>
      </aside>

      <ContextMenu
        open={Boolean(menuConversation && conversationMenuPosition)}
        position={conversationMenuPosition}
        onRequestClose={closeConversationMenu}
        items={
          menuConversation
            ? [
                {
                  label: "Configuracion",
                  onSelect: () => {
                    openConversationSettings(menuConversation);
                  },
                },
                {
                  label: "Renombrar",
                  onSelect: () => {
                    setRenameConversation({ id: menuConversation.id, value: menuConversation.title });
                    closeConversationMenu();
                  },
                },
                {
                  label: "Eliminar",
                  tone: "danger",
                  onSelect: () => {
                    void onDeleteConversation(menuConversation.id);
                    closeConversationMenu();
                  },
                },
              ]
            : []
        }
      />
    </div>
  );
}
