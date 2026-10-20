import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarImage, AvatarFallback } from "./Avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/github.png" alt="GitHub" />
    </Avatar>
  ),
};

export const WithFallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-4">
      {(["h-6 w-6", "h-10 w-10", "h-16 w-16"] as const).map((cls) => (
        <Avatar key={cls} className={cls}>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      ))}
    </div>
  ),
};
