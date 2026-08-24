import { useEffect } from "react";

const SETTINGS_KEY = "ledgerly_settings";

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
      "ledgerly-settings-updated",
      handleSettingsUpdate
    );

    return () => {
      window.removeEventListener(
        "ledgerly-settings-updated",
        handleSettingsUpdate
      );
    };
  }, []);

  function applyTheme(savedAppearance = null) {
    let appearance = savedAppearance;

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

    document.documentElement.setAttribute(
      "data-theme",
      appearance
    );

    
    localStorage.setItem(
      "ledgerflow_theme",
      appearance
    );
  }

  return children;
}