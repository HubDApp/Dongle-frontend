import type { StorybookConfig } from "@storybook/react-webpack5";
import path from "path";

const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(ts|tsx)", "../stories/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",    // controls, actions, docs, viewport, backgrounds
    "@storybook/addon-a11y",           // accessibility panel
    "@storybook/addon-themes",         // dark mode via class toggle
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  docs: { autodocs: "tag" },
  webpackFinal: async (config) => {
    // Resolve the project's @/* path alias
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(__dirname, ".."),
    };

    // Tailwind v4 — process CSS through postcss
    config.module ??= {};
    config.module.rules ??= [];
    config.module.rules.push({
      test: /\.css$/,
      use: [
        "style-loader",
        "css-loader",
        {
          loader: "postcss-loader",
          options: { postcssOptions: { config: path.resolve(__dirname, "../postcss.config.mjs") } },
        },
      ],
    });

    return config;
  },
};

export default config;
