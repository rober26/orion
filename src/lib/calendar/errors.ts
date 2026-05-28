import { unauthorized } from "@/src/lib/http";
import { getInvalidSessionMessage } from "@/src/lib/validation/auth";

export function invalidSessionResponse() {
  return unauthorized(getInvalidSessionMessage());
}

export const CALENDAR_ERROR_MESSAGE = {
  invalidRange: "Rango de fechas invalido",
  invalidDates: "Fechas invalidas",
  endBeforeStart: "La fecha de fin no puede ser menor a la de inicio",
  missingOwnerReference: "calendarId o projectId obligatorio",
} as const;
