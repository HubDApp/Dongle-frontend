import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormConfirmationPage } from "@/components/forms/FormConfirmationPage";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { demoIntakeSchema, type FormSubmissionRecord } from "@/services/form-builder";

const submission: FormSubmissionRecord = {
  confirmationNumber: "DNG-TEST-1234",
  formId: "project-intake",
  formVersion: 1,
  answers: {
    projectName: "Alpha",
    projectType: "other",
    contactEmail: "a@b.com",
    otherDescription: "Building something useful on Stellar network.",
  },
  visibleSectionIds: ["basics", "other-details"],
  locale: "en",
  submittedAt: Date.now(),
  summaryLabels: {
    projectName: "Project name",
    projectType: "Project type",
    contactEmail: "Contact email",
    otherDescription: "Describe your project",
  },
};

function renderPage() {
  return render(
    <LocaleProvider>
      <FormConfirmationPage
        submission={submission}
        schema={demoIntakeSchema}
        submitAnotherHref="/forms"
      />
    </LocaleProvider>,
  );
}

describe("FormConfirmationPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows success, confirmation number, summary, next steps, and submit another", () => {
    renderPage();
    expect(screen.getByText(/Submission received/i)).toBeInTheDocument();
    expect(screen.getByTestId("confirmation-number")).toHaveTextContent(
      "DNG-TEST-1234",
    );
    expect(screen.getByText("What you submitted")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Next steps")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Submit another/i }),
    ).toHaveAttribute("href", "/forms");
  });
});
