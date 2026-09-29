import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/ui/FormField";

function RegisteredField({ onSubmit }: { onSubmit: (data: { name: string }) => void }) {
  const { register, handleSubmit, formState } = useForm<{ name: string }>({
    defaultValues: { name: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField
        label="Project Name"
        name="name"
        register={register}
        required
        error={formState.errors.name?.message}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe("FormField", () => {
  it("integrates with react-hook-form register by field name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<RegisteredField onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/project name/i), "Dongle");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      { name: "Dongle" },
      expect.anything(),
    );
  });

  it("shows required indicator and dark-mode-safe label classes", () => {
    render(<FormField label="Website" required />);

    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Website")).toHaveClass("dark:text-zinc-300");
    expect(screen.getByLabelText(/website/i)).toHaveAttribute("aria-required", "true");
  });
});
