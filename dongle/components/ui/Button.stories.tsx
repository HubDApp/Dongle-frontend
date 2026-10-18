import type { Meta, StoryObj } from "@storybook/react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant:     { control: "select", options: ["primary", "secondary", "outline", "ghost", "error"] },
    size:        { control: "select", options: ["sm", "md", "lg"] },
    isLoading:   { control: "boolean" },
    disabled:    { control: "boolean" },
    loadingText: { control: "text" },
    children:    { control: "text" },
  },
  args: {
    children: "Button",
    variant: "primary",
    size: "md",
    isLoading: false,
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Outline: Story = { args: { variant: "outline" } };

export const Ghost: Story = { args: { variant: "ghost" } };

export const Destructive: Story = { args: { variant: "error", children: "Delete" } };

export const Small: Story = { args: { size: "sm" } };

export const Large: Story = { args: { size: "lg" } };

export const Loading: Story = { args: { isLoading: true, loadingText: "Saving…" } };

export const WithLeftIcon: Story = {
  args: { leftIcon: <Plus className="w-4 h-4" />, children: "Add project" },
};

export const WithRightIcon: Story = {
  args: { rightIcon: <Wallet className="w-4 h-4" />, children: "Connect wallet" },
};

export const Disabled: Story = { args: { disabled: true } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 p-4">
      {(["primary", "secondary", "outline", "ghost", "error"] as const).map((v) => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  ),
};
