import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "success", "warning", "error", "outline"] },
    children: { control: "text" },
  },
  args: { children: "Badge", variant: "primary" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Success: Story = { args: { variant: "success", children: "Verified" } };
export const Warning: Story = { args: { variant: "warning", children: "Pending" } };
export const Error: Story = { args: { variant: "error", children: "Rejected" } };
export const Outline: Story = { args: { variant: "outline" } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {(["primary", "secondary", "success", "warning", "error", "outline"] as const).map((v) => (
        <Badge key={v} variant={v}>{v}</Badge>
      ))}
    </div>
  ),
};
