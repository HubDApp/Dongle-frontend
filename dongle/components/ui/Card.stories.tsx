import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["default", "glass", "outline"] },
    padding: { control: "select", options: ["none", "sm", "md", "lg"] },
    children: { control: "text" },
  },
  args: { variant: "default", padding: "md", children: "Card content" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Glass: Story = { args: { variant: "glass" } };
export const Outline: Story = { args: { variant: "outline" } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 p-4">
      {(["default", "glass", "outline"] as const).map((v) => (
        <Card key={v} variant={v} className="w-52">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{v}</p>
          <p className="text-xs text-zinc-500 mt-1">Card variant example</p>
        </Card>
      ))}
    </div>
  ),
};
