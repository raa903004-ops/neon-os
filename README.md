# ✦ NEON OS

**Your browser, your universe.** A mini operating system built entirely with HTML, CSS and vanilla JavaScript — no framework, no backend, no dependencies required.

![NEON OS](preview.svg)

## ✨ Features

- 🪟 **Desktop with windows** — open, close, minimize, maximize, and drag windows.
- 💻 **Terminal** — command history, useful commands, and hidden easter eggs.
- 📝 **Notes** — automatically saved in the browser using `localStorage`.
- 🎨 **Pixel Art** — draw on a 20×14 canvas and export your work as a PNG.
- 🧮 **Calculator** — basic arithmetic, percent, and sign toggle.
- 🌗 **Themes** — light and dark mode, saved between visits.
- 📱 **Responsive layout** — usable on phones and desktop.

## 🚀 Run locally

Download the repository and open `index.html` in a browser. That's it!

You can also use **VS Code → Live Server** for live reload while editing.

## 🌍 Deploy with GitHub Pages

1. Create a public GitHub repository (for example, `neon-os`).
2. Upload `index.html`, `style.css`, `script.js`, `preview.svg`, and this README **to the repository root**.
3. In GitHub go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then click **Save**.
5. Your app will be available at `https://YOUR_USERNAME.github.io/neon-os/` when the deployment completes.

## 💻 Terminal commands

| Command | Action |
| --- | --- |
| `help` | See available commands |
| `ls` | List apps |
| `open notes` | Launch Notes |
| `open paint` | Launch Pixel Art |
| `open calc` | Launch Calculator |
| `date` | Show local date and time |
| `whoami` | Show current user |
| `echo hello` | Print text |
| `theme` | Toggle theme |
| `clear` | Clear terminal |
| `matrix` | Show a surprise |
| `secret` | Unlock an easter egg |

## 🧱 Project structure

```text
neon-os/
├── index.html     # Desktop and app shell
├── style.css      # Styles and responsive layout
├── script.js      # Windows, apps, terminal, saving
├── preview.svg    # Project cover
└── README.md      # Documentation
```

## 🧠 Ideas for v2

Add a music player with your own tracks, a file manager, keyboard shortcuts, and customizable wallpapers.

## 📜 License

MIT — feel free to learn from, modify, and share this project.