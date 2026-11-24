/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Jetons de la charte Chez Laziz, portés par des variables CSS (voir
        // :root dans src/index.css) : la boutique est en thème sombre,
        // l'administration reste claire, et les mêmes classes — text-ink,
        // border-sand, bg-surface… — prennent la bonne valeur des deux côtés.
        // « rgb(var(--c-x) / <alpha-value>) » garde les variantes d'opacité
        // (text-ink/50, border-sand/70…) utilisées partout dans src/.
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        "ink-deep": "rgb(var(--c-ink-deep) / <alpha-value>)",
        sand: "rgb(var(--c-sand) / <alpha-value>)",
        cream: "rgb(var(--c-cream) / <alpha-value>)",
        "muted-warm": "rgb(var(--c-muted-warm) / <alpha-value>)",
        // Fond de page, et fond des cartes et des champs posés dessus.
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        // L'or de la maison, sa version soutenue, et le texte qu'on pose
        // dessus.
        gold: "rgb(var(--c-gold) / <alpha-value>)",
        "gold-deep": "rgb(var(--c-gold-deep) / <alpha-value>)",
        "on-gold": "rgb(var(--c-on-gold) / <alpha-value>)",
        // Texte posé sur un aplat « ink » (bouton inversé).
        "on-ink": "rgb(var(--c-on-ink) / <alpha-value>)",
        // Étiquette de prix.
        sticker: "rgb(var(--c-sticker) / <alpha-value>)",
        // Vert WhatsApp lisible en TEXTE sur le fond du thème.
        "wa-text": "rgb(var(--c-wa-text) / <alpha-value>)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        // « accent » EST l'or de la maison. Il était mappé sur une variable
        // HSL de shadcn que :root écrasait par une couleur hexadécimale :
        // text-accent ne tenait que par un utilitaire écrit à la main, et
        // border-accent, bg-accent ou text-accent/70 ne produisaient aucune
        // couleur valide.
        accent: {
          DEFAULT: "rgb(var(--c-gold) / <alpha-value>)",
          foreground: "rgb(var(--c-on-gold) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}