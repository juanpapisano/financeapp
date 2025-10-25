/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
        display: ["League Spartan", "Poppins", "sans-serif"],
      },
      colors: {
        base: {
          darkest: "#031314",
          dark: "#052224",
          card: "#0E3E3E",
          muted: "#093030",
        },
        brand: {
          DEFAULT: "#00D09E",
          hover: "#00B789",
          soft: "#DFF7E2",
        },
        sky: {
          light: "#6DB6FE",
          DEFAULT: "#3299FF",
          deep: "#0068FF",
        },
        text: {
          primary: "#F1FFF3",
          secondary: "#DFF7E2",
          muted: "#8FA9A9",
        },
        border: "#144444",
      },
      backgroundImage: {
        "gradient-hero":
          "linear-gradient(140deg, rgba(8, 46, 46, 0.85) 0%, rgba(3, 19, 20, 0.98) 70%)",
        "gradient-card":
          "linear-gradient(160deg, rgba(0, 208, 158, 0.18) 0%, rgba(50, 153, 255, 0.12) 100%)",
        "gradient-login":
          "radial-gradient(circle at top, rgba(0, 208, 158, 0.25) 0%, rgba(3, 19, 20, 0.95) 55%)",
      },
      boxShadow: {
        soft: "0 28px 60px -28px rgba(0, 0, 0, 0.45)",
        card: "0 22px 48px -30px rgba(0, 208, 158, 0.35)",
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2.25rem",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
