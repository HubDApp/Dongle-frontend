import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    // Default backgrounds matching the app's light/dark surfaces
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark",  value: "#09090b" },
      ],
    },
    // Accessibility addon — run checks on every story by default
    a11y: {
      config: {},
      options: { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date:  /date$/i,
      },
    },
  },
  // Apply the `dark` class to <html> when the "dark" background is selected
  decorators: [
    (Story, context) => {
      const isDark = context.globals.backgrounds?.value === "#09090b";
      document.documentElement.classList.toggle("dark", isDark);
      return Story();
    },
  ],
};

export default preview;
