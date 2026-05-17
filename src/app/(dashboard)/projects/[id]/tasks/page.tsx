"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ProjectSidebar from "@/src/components/projects/ProjectSidebar";
import { CalendarClock, Edit3, Loader2, Lock, Plus, Trash2, X } from "lucide-react";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

interface UserSummary {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

interface TaskAssignee {
  user: UserSummary;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  position: number;
  columnId: string | null;
  assignees: TaskAssignee[];
}

interface KanbanColumn {
  id: string;
  name: string;
  color: string | null;
  position: number;
  tasks: TaskItem[];
}

interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
}

interface ProjectMember {
  user: UserSummary;
  role: "OWNER" | "MEMBER" | "VIEWER";
}

interface ApiError {
  error?: string;
}

interface ProjectPermissions {
  permissions?: {
    canEdit?: boolean;
  };
}

interface TaskFormState {
  id: string | null;
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  columnId: string;
  assigneeIds: string[];
}

const EMPTY_FORM: TaskFormState = {
  id: null,
  title: "",
  description: "",
  dueDate: "",
  priority: "MEDIUM",
  columnId: "",
  assigneeIds: [],
};

const DEFAULT_BOARD_NAME = "Tareas";
const DEFAULT_COLUMNS = ["Por asignar", "Por hacer", "En progreso", "Completado"];

function fullName(user: UserSummary): string {
  const value = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return value || user.username;
}

function statusLabel(status: TaskStatus): string {
  if (status === "IN_PROGRESS") {
    return "En progreso";
  }
  if (status === "DONE") {
    return "Hecho";
  }
  return "Por hacer";
}

export default function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormState>(EMPTY_FORM);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) || null,
    [boards, selectedBoardId],
  );
  const isDefaultBoard = selectedBoard?.name === DEFAULT_BOARD_NAME;

  const editableMembers = useMemo(
    () => members.filter((member) => member.role === "OWNER" || member.role === "MEMBER"),
    [members],
  );

  const taskById = useMemo(() => {
    const map = new Map<string, TaskItem>();
    for (const column of selectedBoard?.columns || []) {
      for (const task of column.tasks) {
        map.set(task.id, task);
      }
    }
    return map;
  }, [selectedBoard]);

  const activeTask = useMemo(
    () => (activeTaskId ? taskById.get(activeTaskId) || null : null),
    [activeTaskId, taskById],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [boardsRes, membersRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${id}/kanban/boards`),
        fetch(`/api/projects/${id}/members`),
        fetch(`/api/projects/${id}`, { cache: "no-store" }),
      ]);

      const [boardsPayload, membersPayload, projectPayload] = (await Promise.all([
        boardsRes.json(),
        membersRes.json(),
        projectRes.json(),
      ])) as [
        KanbanBoard[] | ApiError,
        { members?: ProjectMember[] } & ApiError,
        ProjectPermissions & ApiError,
      ];

      if (!boardsRes.ok) {
        throw new Error((boardsPayload as ApiError).error || "No se pudieron cargar los tableros");
      }

      if (!membersRes.ok) {
        throw new Error(membersPayload.error || "No se pudieron cargar los miembros");
      }

      if (!projectRes.ok) {
        throw new Error(projectPayload.error || "No se pudieron cargar permisos del proyecto");
      }

      const nextBoards = Array.isArray(boardsPayload) ? boardsPayload : [];
      setBoards(nextBoards);
      setMembers(Array.isArray(membersPayload.members) ? membersPayload.members : []);
      setCanEdit(Boolean(projectPayload.permissions?.canEdit));

      if (nextBoards.length > 0) {
        const nextBoardId = nextBoards.some((item) => item.id === selectedBoardId) ? selectedBoardId : nextBoards[0].id;
        setSelectedBoardId(nextBoardId);
      } else {
        setSelectedBoardId("");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo cargar el tablero");
      setBoards([]);
      setMembers([]);
      setCanEdit(false);
    } finally {
      setLoading(false);
    }
  }, [id, selectedBoardId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const createBoard = async () => {
    const name = newBoardName.trim();
    if (!name) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/kanban/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo crear el tablero");
      }
      setNewBoardName("");
      await loadData();
      setFeedback("Tablero creado");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear el tablero");
    } finally {
      setSaving(false);
    }
  };

  const createColumn = async () => {
    if (!selectedBoard) {
      return;
    }

    const name = newColumnName.trim();
    if (!name) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/kanban/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: selectedBoard.id, name }),
      });
      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo crear la columna");
      }
      setNewColumnName("");
      setIsColumnModalOpen(false);
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear la columna");
    } finally {
      setSaving(false);
    }
  };

  const deleteColumn = async (columnId: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/kanban/columns/${columnId}`, { method: "DELETE" });
      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo eliminar la columna");
      }
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo eliminar la columna");
    } finally {
      setSaving(false);
    }
  };

  const openCreateTaskModal = () => {
    setTaskForm({
      ...EMPTY_FORM,
      columnId: selectedBoard?.columns[0]?.id || "",
    });
    setDeleteConfirmTaskId(null);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: TaskItem) => {
    setTaskForm({
      id: task.id,
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      priority: task.priority,
      columnId: task.columnId || "",
      assigneeIds: task.assignees.map((assignee) => assignee.user.id),
    });
    setDeleteConfirmTaskId(null);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    if (saving) {
      return;
    }
    setTaskForm(EMPTY_FORM);
    setDeleteConfirmTaskId(null);
    setIsTaskModalOpen(false);
  };

  const saveTask = async () => {
    const title = taskForm.title.trim();
    if (!title) {
      setFeedback("El título de la tarea es obligatorio");
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        title,
        description: taskForm.description,
        dueDate: taskForm.dueDate || null,
        priority: taskForm.priority,
        columnId: taskForm.columnId || null,
        assigneeIds: taskForm.assigneeIds,
      };

      const url = taskForm.id ? `/api/projects/${id}/tasks/${taskForm.id}` : `/api/projects/${id}/tasks`;
      const method = taskForm.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(responsePayload.error || "No se pudo guardar la tarea");
      }

      closeTaskModal();
      await loadData();
      setFeedback(taskForm.id ? "Tarea actualizada" : "Tarea creada");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar la tarea");
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/tasks/${taskId}`, { method: "DELETE" });
      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo eliminar la tarea");
      }

      closeTaskModal();
      await loadData();
      setFeedback("Tarea eliminada");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo eliminar la tarea");
    } finally {
      setSaving(false);
    }
  };

  const updateTaskPositions = async (updates: Array<{ taskId: string; columnId: string | null; position: number }>) => {
    if (updates.length === 0) {
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        updates.map((update) =>
          fetch(`/api/projects/${id}/tasks/${update.taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              columnId: update.columnId,
              position: update.position,
            }),
          }),
        ),
      );
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudieron reordenar tareas");
    } finally {
      setSaving(false);
    }
  };

  const updateColumnPositions = async (updates: Array<{ columnId: string; position: number }>) => {
    if (updates.length === 0) {
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        updates.map((update) =>
          fetch(`/api/projects/${id}/kanban/columns/${update.columnId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: update.position }),
          }),
        ),
      );
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudieron reordenar columnas");
    } finally {
      setSaving(false);
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    if (!canEdit) {
      setActiveTaskId(null);
      return;
    }

    const { active, over } = event;
    if (!over || !selectedBoard) {
      setActiveTaskId(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("column:") && overId.startsWith("column:")) {
      const sourceColumnId = activeId.replace("column:", "");
      const targetColumnId = overId.replace("column:", "");

      if (sourceColumnId === targetColumnId) {
        return;
      }

      const sourceIndex = selectedBoard.columns.findIndex((column) => column.id === sourceColumnId);
      const targetIndex = selectedBoard.columns.findIndex((column) => column.id === targetColumnId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return;
      }

      const reordered = arrayMove(selectedBoard.columns, sourceIndex, targetIndex);
      await updateColumnPositions(reordered.map((column, index) => ({ columnId: column.id, position: index })));
      setActiveTaskId(null);
      return;
    }

    if (!activeId.startsWith("task:")) {
      setActiveTaskId(null);
      return;
    }

    const taskId = activeId.replace("task:", "");
    const draggedTask = taskById.get(taskId);
    if (!draggedTask) {
      setActiveTaskId(null);
      return;
    }

    if (overId.startsWith("task:")) {
      const targetTaskId = overId.replace("task:", "");
      const targetTask = taskById.get(targetTaskId);
      if (!targetTask) {
        setActiveTaskId(null);
        return;
      }

      const sourceColumn = selectedBoard.columns.find((column) => column.id === draggedTask.columnId);
      const targetColumn = selectedBoard.columns.find((column) => column.id === targetTask.columnId);

      if (!sourceColumn || !targetColumn) {
        setActiveTaskId(null);
        return;
      }

      if (sourceColumn.id === targetColumn.id) {
        const fromIndex = sourceColumn.tasks.findIndex((task) => task.id === draggedTask.id);
        const toIndex = sourceColumn.tasks.findIndex((task) => task.id === targetTask.id);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
          setActiveTaskId(null);
          return;
        }

        const reordered = arrayMove(sourceColumn.tasks, fromIndex, toIndex);
        await updateTaskPositions(
          reordered.map((task, index) => ({
            taskId: task.id,
            columnId: sourceColumn.id,
            position: index,
          })),
        );
        setActiveTaskId(null);
        return;
      }

      const sourceTasks = sourceColumn.tasks.filter((task) => task.id !== draggedTask.id);
      const targetTasks = [...targetColumn.tasks];
      const insertionIndex = targetTasks.findIndex((task) => task.id === targetTask.id);
      targetTasks.splice(insertionIndex < 0 ? targetTasks.length : insertionIndex, 0, {
        ...draggedTask,
        columnId: targetColumn.id,
      });

      await updateTaskPositions([
        ...sourceTasks.map((task, index) => ({ taskId: task.id, columnId: sourceColumn.id, position: index })),
        ...targetTasks.map((task, index) => ({ taskId: task.id, columnId: targetColumn.id, position: index })),
      ]);
      setActiveTaskId(null);
      return;
    }

    if (overId.startsWith("drop-column:")) {
      const targetColumnId = overId.replace("drop-column:", "");
      const sourceColumn = selectedBoard.columns.find((column) => column.id === draggedTask.columnId);
      const targetColumn = selectedBoard.columns.find((column) => column.id === targetColumnId);
      if (!sourceColumn || !targetColumn) {
        setActiveTaskId(null);
        return;
      }

      if (sourceColumn.id === targetColumn.id) {
        setActiveTaskId(null);
        return;
      }

      const sourceTasks = sourceColumn.tasks.filter((task) => task.id !== draggedTask.id);
      const targetTasks = [...targetColumn.tasks, { ...draggedTask, columnId: targetColumn.id }];

      await updateTaskPositions([
        ...sourceTasks.map((task, index) => ({ taskId: task.id, columnId: sourceColumn.id, position: index })),
        ...targetTasks.map((task, index) => ({ taskId: task.id, columnId: targetColumn.id, position: index })),
      ]);
    }

    setActiveTaskId(null);
  };

  const onDragStart = (event: DragStartEvent) => {
    if (!canEdit) {
      setActiveTaskId(null);
      return;
    }

    const activeId = String(event.active.id);
    if (activeId.startsWith("task:")) {
      setActiveTaskId(activeId.replace("task:", ""));
      return;
    }

    setActiveTaskId(null);
  };

  return (
    <div className="flex h-full rounded-[1rem] bg-orion-surface dark:bg-slate-950 overflow-hidden">
      <ProjectSidebar />

      <main className="app-workspace-main">
        <section className="w-full space-y-3">
          <header className="page-head">
            <h1 className="page-title">Tareas</h1>
            <p className="page-subtitle">Tablero personalizable con drag & drop y CRUD completo de tareas.</p>
            {!canEdit && (
              <p className="mt-2 inline-flex items-center rounded-full bg-slate-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Solo lectura
              </p>
            )}
          </header>

          {feedback && (
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {feedback}
            </div>
          )}

          <div className="section-panel-compact space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBoardId}
                onChange={(event) => setSelectedBoardId(event.target.value)}
                className="select-orion min-w-56"
              >
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>

              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBoardName("");
                      setIsBoardModalOpen(true);
                    }}
                    disabled={saving}
                    className="btn-primary rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-70"
                  >
                    <Plus size={14} /> Crear tablero
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewColumnName("");
                      setIsColumnModalOpen(true);
                    }}
                    disabled={saving || !selectedBoard}
                    className="btn-secondary text-sm"
                  >
                    <Plus size={14} /> Columna
                  </button>

                  <button
                    type="button"
                    onClick={openCreateTaskModal}
                    disabled={saving || !selectedBoard}
                    className="btn-secondary text-sm"
                  >
                    <Plus size={14} /> Nueva tarea
                  </button>
                </>
              )}

              {isDefaultBoard && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Lock size={11} /> Tablero base bloqueado
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="inline-flex items-center gap-2 text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Cargando tablero...
            </div>
          ) : !selectedBoard ? (
            <div className="rounded-xl border border-dashed border-orion-border px-4 py-10 text-center text-sm text-slate-500 dark:border-orion-dark-border">
              No hay tableros disponibles.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={onDragStart}
              onDragCancel={() => setActiveTaskId(null)}
              onDragEnd={(event) => void onDragEnd(event)}
            >
              <div className="pb-2">
                <SortableContext items={selectedBoard.columns.map((column) => `column:${column.id}`)} strategy={rectSortingStrategy}>
                  <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))" }}>
                    {selectedBoard.columns.map((column) => (
                      <SortableColumn
                        key={column.id}
                        column={column}
                        onDelete={() => {
                          if (canEdit && !DEFAULT_COLUMNS.includes(column.name)) {
                            void deleteColumn(column.id);
                          }
                        }}
                        onEditTask={openEditTaskModal}
                        saving={saving || !canEdit}
                        readOnly={!canEdit}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>

              {canEdit && (
                <DragOverlay>
                  {activeTask ? <TaskCard task={activeTask} onEdit={() => undefined} draggingOverlay /> : null}
                </DragOverlay>
              )}
            </DndContext>
          )}
        </section>
      </main>

      {canEdit && isBoardModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="surface-panel w-full max-w-lg rounded-[1.75rem] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Crear tablero</h2>
              <button type="button" onClick={() => setIsBoardModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white">
                <X size={16} />
              </button>
            </div>
            <input
              value={newBoardName}
              onChange={(event) => setNewBoardName(event.target.value)}
              placeholder="Nombre del tablero"
              className="input-orion"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsBoardModalOpen(false)} className="btn-secondary">Cancelar</button>
              <button type="button" onClick={() => void createBoard()} className="btn-primary" disabled={saving || !newBoardName.trim()}>
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {canEdit && isColumnModalOpen && selectedBoard && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="surface-panel w-full max-w-lg rounded-[1.75rem] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Crear columna</h2>
              <button type="button" onClick={() => setIsColumnModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white">
                <X size={16} />
              </button>
            </div>
            <input
              value={newColumnName}
              onChange={(event) => setNewColumnName(event.target.value)}
              placeholder="Nombre de la columna"
              className="input-orion"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsColumnModalOpen(false)} className="btn-secondary">Cancelar</button>
              <button type="button" onClick={() => void createColumn()} className="btn-primary" disabled={saving || !newColumnName.trim()}>
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {canEdit && isTaskModalOpen && selectedBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="surface-panel w-full max-w-2xl rounded-[1.75rem] p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {taskForm.id ? "Editar tarea" : "Nueva tarea"}
                </h2>
                <p className="text-sm text-slate-500">Define título, prioridad, fecha, columna y responsables.</p>
              </div>
              <button
                type="button"
                onClick={closeTaskModal}
                disabled={saving}
                className="rounded-lg border border-orion-border p-2 text-slate-500 hover:text-slate-700 dark:border-orion-dark-border dark:text-slate-300 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Título</span>
                <input
                  value={taskForm.title}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="input-orion"
                  placeholder="Ej. Implementar onboarding"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Descripción</span>
                <textarea
                  value={taskForm.description}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="input-orion min-h-24 resize-none"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Prioridad</span>
                <select
                  value={taskForm.priority}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))}
                  className="select-orion"
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Fecha límite</span>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="input-orion"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Columna</span>
                <select
                  value={taskForm.columnId}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, columnId: event.target.value }))}
                  className="select-orion"
                >
                  {selectedBoard.columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Estado</span>
                <div className="input-orion inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CalendarClock size={14} />
                  {taskForm.id ? statusLabel(taskById.get(taskForm.id)?.status || "TODO") : "Por hacer"}
                </div>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Asignados</span>
                <select
                  multiple
                  value={taskForm.assigneeIds}
                  onChange={(event) => {
                    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                    setTaskForm((prev) => ({ ...prev, assigneeIds: values }));
                  }}
                  className="select-orion min-h-24"
                >
                  {editableMembers.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {fullName(member.user)}
                    </option>
                  ))}
                </select>
                {taskForm.assigneeIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {taskForm.assigneeIds.map((userId) => {
                      const user = editableMembers.find((member) => member.user.id === userId)?.user;
                      if (!user) {
                        return null;
                      }

                      return (
                        <button
                          key={userId}
                          type="button"
                          onClick={() =>
                            setTaskForm((prev) => ({
                              ...prev,
                              assigneeIds: prev.assigneeIds.filter((id) => id !== userId),
                            }))
                          }
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          {fullName(user)} <X size={10} className="inline" />
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setTaskForm((prev) => ({ ...prev, assigneeIds: [] }))}
                      className="rounded-full border border-orion-border px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-orion-dark-border dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Deseleccionar usuarios
                    </button>
                  </div>
                )}
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                {taskForm.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (taskForm.id && deleteConfirmTaskId === taskForm.id) {
                        void deleteTask(taskForm.id);
                      } else {
                        setDeleteConfirmTaskId(taskForm.id);
                      }
                    }}
                    disabled={saving}
                    className="rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <Trash2 size={14} /> {deleteConfirmTaskId === taskForm.id ? "Confirmar eliminar" : "Eliminar"}
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeTaskModal}
                  disabled={saving}
                  className="rounded-xl border border-orion-border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-orion-dark-border dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void saveTask()}
                  disabled={saving}
                  className="btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-70"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {taskForm.id ? "Guardar cambios" : "Crear tarea"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableColumn({
  column,
  onDelete,
  onEditTask,
  saving,
  readOnly,
}: {
  column: KanbanColumn;
  onDelete: () => void;
  onEditTask: (task: TaskItem) => void;
  saving: boolean;
  readOnly: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `column:${column.id}`,
  });
  const isProtected = DEFAULT_COLUMNS.includes(column.name);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="surface-panel w-full rounded-[1.5rem] p-4"
      {...(!readOnly ? attributes : {})}
      {...(!readOnly ? listeners : {})}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="inline-flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color || "#64748b" }} />
          <h3 className="font-bold text-slate-900 dark:text-white truncate">{column.name}</h3>
          <span className="text-xs text-slate-500">{column.tasks.length}</span>
        </div>
        {isProtected ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">
            <Lock size={11} /> Base
          </span>
        ) : (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <ColumnDropZone id={`drop-column:${column.id}`}>
        <SortableContext items={column.tasks.map((task) => `task:${task.id}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {column.tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-orion-border px-3 py-6 text-center text-xs text-slate-500 dark:border-orion-dark-border">
                Sin tareas
              </div>
            ) : (
               column.tasks.map((task) => (
                 <SortableTask key={task.id} task={task} onEdit={() => onEditTask(task)} readOnly={readOnly} />
               ))
             )}
          </div>
        </SortableContext>
      </ColumnDropZone>
    </div>
  );
}

function SortableTask({ task, onEdit, readOnly }: { task: TaskItem; onEdit: () => void; readOnly: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task:${task.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...(!readOnly ? attributes : {})}
      {...(!readOnly ? listeners : {})}
    >
      <TaskCard task={task} onEdit={onEdit} readOnly={readOnly} />
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  draggingOverlay = false,
  readOnly = false,
}: {
  task: TaskItem;
  onEdit: () => void;
  draggingOverlay?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-orion-border dark:border-orion-dark-border p-3 space-y-2 bg-white/70 dark:bg-slate-900/50 ${
        draggingOverlay ? "shadow-2xl ring-2 ring-orion-primary/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-900 dark:text-white leading-tight">{task.title}</p>
        {!draggingOverlay && !readOnly && (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onEdit}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
            title="Editar"
          >
            <Edit3 size={13} />
          </button>
        )}
      </div>

      {task.description ? <p className="text-xs text-slate-500 line-clamp-3">{task.description}</p> : null}

      <div className="text-[11px] text-slate-500 inline-flex items-center gap-1">
        <CalendarClock size={12} />
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Sin fecha"}
      </div>
    </div>
  );
}

function ColumnDropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`rounded-2xl p-1.5 transition-colors ${isOver ? "bg-orion-primary/10 ring-2 ring-orion-primary/35" : ""}`}>
      {children}
    </div>
  );
}
