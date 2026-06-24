import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import SubmitPage from "@/app/submit/page";

describe("/submit route", () => {
  it("redirects to the canonical project submission flow", () => {
    SubmitPage();
    expect(redirect).toHaveBeenCalledWith("/projects/new");
  });
});
