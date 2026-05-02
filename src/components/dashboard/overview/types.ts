export type DashboardStats = {
  activeProjects: number;
  notebooks: number;
  upcomingItems: number;
};

export type DashboardEventItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  sourceType: "event" | "task" | "project";
  projectName: string;
  color: string | null;
};

export type DashboardProject = {
  id: string;
  name: string;
  color: string | null;
  isArchived?: boolean;
  updatedAt: string;
  _count?: {
    tasks: number;
    users: number;
  };
};

export type MeResponse = {
  username?: string;
  name?: string;
};
