import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "./Spinner";

const meta = {
  title: "UI/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
  args: { size: "md" },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6 p-4">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};
