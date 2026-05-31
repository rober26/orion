const PROJECT_CALENDAR_PREFIX = "project::";
const PROJECT_CALENDAR_SEPARATOR = "::";

export function buildProjectCalendarPrefix(projectId: string): string {
  return `${PROJECT_CALENDAR_PREFIX}${projectId.trim()}${PROJECT_CALENDAR_SEPARATOR}`;
}

export function buildProjectCalendarName(projectId: string, projectName: string): string {
  const normalizedProjectId = projectId.trim();
  const normalizedProjectName = projectName.trim() || "Proyecto";
  return `${buildProjectCalendarPrefix(normalizedProjectId)}${normalizedProjectName}`;
}

export function parseProjectCalendarName(rawName: string): { projectId: string; projectName: string } | null {
  if (!rawName.startsWith(PROJECT_CALENDAR_PREFIX)) {
    return null;
  }

  const payload = rawName.slice(PROJECT_CALENDAR_PREFIX.length);
  const separatorIndex = payload.indexOf(PROJECT_CALENDAR_SEPARATOR);
  if (separatorIndex <= 0) {
    return null;
  }

  const projectId = payload.slice(0, separatorIndex).trim();
  const projectName = payload.slice(separatorIndex + PROJECT_CALENDAR_SEPARATOR.length).trim();
  if (!projectId) {
    return null;
  }

  return {
    projectId,
    projectName: projectName || "Proyecto",
  };
}

export function toCalendarDisplayName(rawName: string): string {
  const parsed = parseProjectCalendarName(rawName);
  return parsed ? parsed.projectName : rawName;
}
