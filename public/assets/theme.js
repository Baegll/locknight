// Synchronous fetch of design tokens — must run BEFORE Tailwind CDN
(function () {
  const base = document.currentScript?.getAttribute("data-base") || "";
  const xhr = new XMLHttpRequest();
  xhr.open("GET", `${base}/design-tokens.json`, false);
  xhr.send();
  const t = JSON.parse(xhr.responseText);
  window.__designTokens = t;

  // Determine initial theme
  const stored = localStorage.getItem("theme");
  if (stored !== "light") {
    document.documentElement.classList.add("dark");
  }

  // Inject Google Fonts
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = t.fonts.googleFontsUrl;
  document.head.appendChild(link);

  // Inject CSS custom properties — dark mode swaps via .dark class on <html>
  const l = t.colors.lightMode;
  const d = t.colors.darkMode;
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --t-primary: ${l.primary};
      --t-secondary: ${l.secondary};
      --t-cta: ${l.cta};
      --t-cta-hover: ${l.ctaHover};
      --t-cta-text: ${l.ctaText};
      --t-surface: ${l.background};
      --t-text: ${l.text};
      --t-border: ${l.border};
      --t-muted: ${l.muted};
      --t-highlight: ${l.highlight};
      --t-text-highlight: ${l.textHighlight};
      --t-font-heading: ${t.fonts.heading}, sans-serif;
      --t-font-body: ${t.fonts.body}, sans-serif;
      --t-font-code: ${t.fonts.code}, monospace;
    }
    .dark {
      --t-primary: ${d.primary};
      --t-secondary: ${d.secondary};
      --t-cta: ${d.cta};
      --t-cta-hover: ${d.ctaHover};
      --t-cta-text: ${d.ctaText};
      --t-surface: ${d.background};
      --t-text: ${d.text};
      --t-border: ${d.border};
      --t-muted: ${d.muted};
      --t-highlight: ${d.highlight};
      --t-text-highlight: ${d.textHighlight};
    }
  `;
  document.head.appendChild(style);

  if (!document.title || document.title === "Untitled") {
    document.title = t.site.title;
  }

  function init() {
    var emailLink = document.getElementById("email-link");
    if (emailLink && t.site.email) emailLink.href = "mailto:" + t.site.email;
    var emailText = document.getElementById("email-text");
    if (emailText && t.site.email) emailText.textContent = t.site.email;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

function toggleTheme() {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
}
