import { useEffect } from "react";

const SETTINGS_KEY = "ledgerflow_settings";

export default function ThemeProvider({ children }) {
  useEffect(() => {
    applyTheme();

    // Listen for changes made from Settings
    const handleSettingsUpdate = (event) => {
      const settings = event.detail;

      if (settings?.appearance) {
        applyTheme(settings.appearance);
      }
    };

    window.addEventListener(
      "ledgerflow-settings-updated",
      handleSettingsUpdate
    );

    return () => {
      window.removeEventListener(
        "ledgerflow-settings-updated",
        handleSettingsUpdate
      );
    };
  }, []);

  function applyTheme(savedAppearance = null) {
    let appearance = savedAppearance;

    /*
     * If no appearance was supplied,
     * load it from saved settings.
     */
    if (!appearance) {
      const storedSettings =
        localStorage.getItem(SETTINGS_KEY);

      if (storedSettings) {
        try {
          const parsed = JSON.parse(
            storedSettings
          );

          appearance =
            parsed.appearance || "light";
        } catch {
          appearance = "light";
        }
      } else {
        appearance = "light";
      }
    }

    /*
     * System theme
     */
    if (appearance === "system") {
      const prefersDark =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;

      appearance =
        prefersDark
          ? "dark"
          : "light";
    }

    /*
     * Apply theme globally
     */
    document.documentElement.setAttribute(
      "data-theme",
      appearance
    );

    /*
     * Keep a simple copy too.
     */
    localStorage.setItem(
      "ledgerflow_theme",
      appearance
    );
  }

  return children;
}