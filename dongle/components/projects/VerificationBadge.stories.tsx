import type { Meta, StoryObj } from "@storybook/react";
import { VerificationBadge } from "./VerificationBadge";

const meta = {
  title: "Projects/VerificationBadge",
  component: VerificationBadge,
  tags: ["autodocs"],
  argTypes: {
    status:   { control: "select", options: ["NONE", "PENDING", "VERIFIED", "REJECTED"] },
    showIcon: { control: "boolean" },
  },
  args: { status: "NONE", showIcon: true },
} satisfies Meta<typeof VerificationBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unverified: Story = { args: { status: "NONE" } };
export const Pending:    Story = { args: { status: "PENDING" } };
export const Verified:   Story = { args: { status: "VERIFIED" } };
export const Rejected:   Story = { args: { status: "REJECTED" } };
export const NoIcon:     Story = { args: { status: "VERIFIED", showIcon: false } };

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {(["NONE", "PENDING", "VERIFIED", "REJECTED"] as const).map((s) => (
        <VerificationBadge key={s} status={s} />
      ))}
    </div>
  ),
};
