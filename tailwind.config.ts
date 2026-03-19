import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        syngenta: {
          navy: "#010066",
          green: "#019934",
          leafBlue: "#0057A0",
          leafYellow: "#F0AB00",
          leafRed: "#E03C31",
          cloud: "#F7FAF8",
          mist: "#EEF3F1",
        },
      },
      boxShadow: {
        soft: "0 4px 18px rgba(1, 0, 102, 0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
};

export default config;
