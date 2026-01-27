import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        colors: {
          primary: "#7500FF",
          secondary: "#8B5CF6",
          accent: "#06B6D4",
          error: "#EF4444",
          info: "#3B82F6",
          success: "#10B981",
          warning: "#F59E0B",
          background: "#F8FAFC",
          surface: "#FFFFFF",
        },
      },
      dark: {
        colors: {
          primary: "#7500FF",
          secondary: "#A78BFA",
          accent: "#67E8F9",
          error: "#F87171",
          info: "#60A5FA",
          success: "#34D399",
          warning: "#FBBF24",
          background: "#0F172A",
          surface: "#1E293B",
        },
      },
    },
  },
});
