import { Navigate } from "react-router-dom";

const SETTINGS_KEY = "ledgerly_settings";

const ROUTES = {
  overview: "/dashboard",
  expenses: "/expenses",
  analytics: "/analytics",
};

export default function WorkspaceDefaultRedirect() {
  let dashboardView = "overview";

  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);

    if (storedSettings) {
      const settings = JSON.parse(storedSettings);

      if (
        settings &&
        typeof settings.dashboardView === "string" &&
        ROUTES[settings.dashboardView]
      ) {
        dashboardView = settings.dashboardView;
      }
    }
  } catch (error) {
    console.error(
      "Unable to read Ledgerly workspace preference:",
      error
    );

    dashboardView = "overview";
  }

  return (
    <Navigate
      to={ROUTES[dashboardView]}
      replace
    />
  );
}