import { theme } from "antd";
import type { ThemeConfig } from "antd";

/**
 * Global Ant Design theme configuration.
 *
 * This object customizes base design tokens that are applied across the app,
 * such as typography and default algorithm. It is passed to Ant Design's
 * `ConfigProvider` in `App.tsx` so that all Ant Design components share the
 * same visual styling.
 */
const themeConfig: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    // Base font stack for the application
    fontFamily: "'Caladea', system-ui, Avenir, Helvetica, Arial, sans-serif",
    fontSize: 18,
    colorPrimary: "#002B5C",
    colorTextSecondary: "#0077B3",
    colorLink: "#0077B3",
    colorBgBase: "#fafdff",
  },
};

export default themeConfig;
