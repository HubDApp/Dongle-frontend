import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormExportMenu } from "@/components/ui/FormExportMenu";

const { exportMock } = vi.hoisted(() => ({ exportMock: vi.fn(() => "file.csv") }));

vi.mock("@/lib/form-export", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/form-export")>();
  return { ...actual, exportFormData: exportMock };
});

describe("FormExportMenu", () => {
  beforeEach(() => exportMock.mockClear());

  it("exports the current data as CSV by default", async () => {
    const getData = vi.fn(() => ({ name: "Test" }));
    render(<FormExportMenu getData={getData} filename="proj" labels={{ name: "Name" }} />);

    await userEvent.click(screen.getByRole("button", { name: /export data/i }));

    expect(getData).toHaveBeenCalledTimes(1);
    expect(exportMock).toHaveBeenCalledWith({ name: "Test" }, "csv", "proj", {
      labels: { name: "Name" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("Exported file.csv");
  });

  it("offers multiple formats and uses the selected one", async () => {
    render(<FormExportMenu getData={() => ({})} />);
    const select = screen.getByLabelText(/export format/i);
    expect(screen.getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual([
      "csv",
      "csv-semicolon",
      "tsv",
      "json",
    ]);

    await userEvent.selectOptions(select, "json");
    await userEvent.click(screen.getByRole("button", { name: /export data/i }));

    expect(exportMock).toHaveBeenCalledWith({}, "json", "form-data", {});
  });

  it("announces failures", async () => {
    exportMock.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<FormExportMenu getData={() => ({})} />);

    await userEvent.click(screen.getByRole("button", { name: /export data/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/export failed/i);
  });
});
