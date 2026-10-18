import type { Meta, StoryObj } from "@storybook/react";
import TransactionProgressPanel from "./TransactionProgressPanel";
import { createProgressState } from "@/lib/transaction-progress";
import type { TransactionPhase } from "@/lib/transaction-progress";

const meta = {
  title: "Transactions/TransactionProgressPanel",
  component: TransactionProgressPanel,
  tags: ["autodocs"],
  argTypes: {
    progress: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TransactionProgressPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const make = (phase: TransactionPhase) => ({ progress: createProgressState(phase) });

export const Preparing:  Story = { args: make("preparing") };
export const Signing:    Story = { args: make("signing") };
export const Submitting: Story = { args: make("submitting") };
export const Confirming: Story = { args: make("confirming") };
export const Success:    Story = { args: make("success") };

export const Failure: Story = {
  args: {
    progress: createProgressState("failure", {
      error: new Error("Insufficient balance to cover transaction fee"),
    }),
    onRetry: () => alert("retry clicked"),
  },
};

export const FailureNonRetryable: Story = {
  args: {
    progress: createProgressState("failure", {
      error: Object.assign(new Error("User declined the request"), { name: "UserRejectionError" }),
    }),
  },
};
