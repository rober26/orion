import { AccessRole, ProjectRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { normalizeProjectRole, parseAccessRole, parseProjectMemberRole, roleCapabilities } from "@/src/lib/permissions";

describe("lib/permissions", () => {
  it("normalizes project role values", () => {
    expect(normalizeProjectRole(ProjectRole.OWNER)).toBe("OWNER");
    expect(normalizeProjectRole(ProjectRole.MEMBER)).toBe("MEMBER");
    expect(normalizeProjectRole(ProjectRole.VIEWER)).toBe("VIEWER");
  });

  it("parses member and access roles safely", () => {
    expect(parseProjectMemberRole("MEMBER")).toBe(ProjectRole.MEMBER);
    expect(parseProjectMemberRole("OWNER")).toBeNull();
    expect(parseAccessRole("EDITOR")).toBe(AccessRole.EDITOR);
    expect(parseAccessRole("OWNER")).toBeNull();
  });

  it("returns capabilities per access role", () => {
    expect(roleCapabilities(AccessRole.OWNER)).toEqual({ canEdit: true, canShare: true, canDelete: true, canRequestEdit: false });
    expect(roleCapabilities(AccessRole.READER)).toEqual({ canEdit: false, canShare: false, canDelete: false, canRequestEdit: true });
  });
});
