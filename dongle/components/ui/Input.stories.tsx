import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    placeholder: { control: "text" },
    error:       { control: "boolean" },
    disabled:    { control: "boolean" },
    readOnly:    { control: "boolean" },
    type:        { control: "select", options: ["text", "email", "password", "number", "url"] },
  },
  args: { placeholder: "Enter value…", type: "text", error: false, disabled: false, readOnly: false },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: "dongle.stellar.org", placeholder: "" } };
export const Error: Story = { args: { error: true, defaultValue: "bad@", "aria-describedby": "err" } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "Not editable" } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: "Read-only value" } };
export const Password: Story = { args: { type: "password", placeholder: "Enter password" } };
