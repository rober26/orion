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
  projectId: string | null;
  projectName: string | null;
  calendarId: string | null;
  calendarName: string | null;
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

export interface UserCalendarItem {
  id: string;
  name: string;
  color: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  isDefault: boolean;
  role: "OWNER" | "EDITOR" | "READER";
  source: "owned" | "shared";
}

export interface CalendarMemberItem {
  user: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  role: "OWNER" | "EDITOR" | "READER";
  joinedAt: string | null;
  inherited: boolean;
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
