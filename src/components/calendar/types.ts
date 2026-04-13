export type CalendarSourceType = "event" | "task" | "project";
export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarEventItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  allDay: boolean;
  sourceType: CalendarSourceType;
  projectId: string;
  projectName: string;
  color: string | null;
  isReadOnly: boolean;
  canReschedule: boolean;
}

export type EventTimeMode = "range" | "single" | "all-day";

export interface CalendarProjectItem {
  id: string;
  name: string;
  color: string | null;
}

export interface CalendarAttendeeItem {
  user: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  responseStatus: "PENDING" | "ACCEPTED" | "REJECTED";
}
