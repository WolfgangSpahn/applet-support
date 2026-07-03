#!/usr/bin/env bash
set -euo pipefail

OUT="${1:-dist/index.html}"

SERVER="${SERVER:?SERVER is required}"
ROOT_PATH="${ROOT_PATH:-/usr/share/nginx/html}"
APPLET_DIR="${APPLET_DIR:-$ROOT_PATH/applets}"

mkdir -p "$(dirname "$OUT")"

# Read remote applet directory names.
# Only immediate subdirectories are used.
mapfile -t APPLETS < <(
  ssh "$SERVER" \
    "find '$APPLET_DIR' -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort"
)

APPLET_LINKS=""

if [[ ${#APPLETS[@]} -eq 0 ]]; then
  APPLET_LINKS='          <span class="link-btn placeholder">To be added</span>'
else
  for app in "${APPLETS[@]}"; do
    APPLET_LINKS+="          <a href=\"/applets/${app}/\" class=\"link-btn\">${app}</a>"$'\n'
  done
fi

cat > "$OUT" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IS2 KI Systems</title>

  <style>
    :root {
      --phbern-red: #ad1030;
      --text: #222222;
      --muted: #666666;
      --bg: #ffffff;
      --soft-bg: #f5f5f5;
      --line: #dddddd;
      --card: #ffffff;
    }

    * {
      box-sizing: border-box;
    }

    html {
      margin: 0;
      padding: 0;
    }

    body {
      min-height: 100vh;
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
      display: flex;
      flex-direction: column;
    }

    header {
      border-bottom: 1px solid var(--line);
      background: var(--bg);
    }

    .brand {
      background: var(--phbern-red);
      color: #ffffff;
      font-size: 2.4em;
      line-height: 1;
      padding: 22px 48px;
    }

    .brand b {
      font-weight: 800;
    }

    .brand span {
      font-weight: 400;
    }

    .header-title {
      padding: 28px 48px 30px;
    }

    h1 {
      margin: 0;
      font-size: 2.2em;
      font-weight: 700;
      color: var(--text);
    }

    .subtitle {
      margin-top: 10px;
      font-size: 1.05em;
      color: var(--muted);
    }

    main {
      flex: 1 0 auto;
      width: 100%;
      max-width: 1100px;
      margin: 42px auto;
      padding: 0 32px;
    }

    .section-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 28px;
    }

    .section-card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 2px;
      padding: 26px 28px 30px;
      min-height: 230px;
    }

    .section-card h2 {
      margin: 0 0 22px;
      padding-bottom: 12px;
      font-size: 1.45em;
      font-weight: 700;
      border-bottom: 4px solid var(--phbern-red);
    }

    .link-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .link-btn {
      display: block;
      padding: 13px 16px;
      background: var(--soft-bg);
      color: var(--text);
      text-decoration: none;
      font-size: 1.05em;
      border-left: 5px solid var(--phbern-red);
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .link-btn:hover {
      background: var(--phbern-red);
      color: #ffffff;
    }

    .placeholder {
      color: var(--muted);
      border-left-color: #bbbbbb;
      pointer-events: none;
    }

    footer {
      flex-shrink: 0;
      border-top: 1px solid var(--line);
      padding: 18px 48px;
      font-size: 0.9em;
      color: var(--muted);
      background: var(--soft-bg);
    }

    @media (max-width: 700px) {
      .brand {
        padding: 20px 24px;
        font-size: 2em;
      }

      .header-title {
        padding: 24px;
      }

      main {
        padding: 0 24px;
        margin-top: 30px;
      }

      h1 {
        font-size: 1.8em;
      }
    }
  </style>
</head>

<body>
  <header>
    <div class="brand"><b>PH</b><span>Bern</span></div>

    <div class="header-title">
      <h1>Lernen und Lehren mit KI Lerntechnologien</h1>
      <div class="subtitle">Teaching, applets and AI tutoring systems</div>
    </div>
  </header>

  <main>
    <div class="section-grid">

      <section class="section-card">
        <h2>Presentations</h2>
        <div class="link-list">
          <a href="/current/" class="link-btn">Current</a>
          <a href="/docs/" class="link-btn">Info</a>
          <a href="/atelier/" class="link-btn">Atelier</a>
          <a href="/ai4t/" class="link-btn">KI in der Bildung</a>
        </div>
      </section>

      <section class="section-card">
        <h2>Applets</h2>
        <div class="link-list">
${APPLET_LINKS}
        </div>
      </section>

      <section class="section-card">
        <h2>Tutors</h2>
        <div class="link-list">
          <a href="/aidu/" class="link-btn">AIDu</a>
          <a href="/SaveThePlanetDemo/" class="link-btn">Save The Planet</a>
        </div>
      </section>

    </div>
  </main>

  <footer>
    2024 PHBern
  </footer>
</body>
</html>
EOF

echo "Updated $OUT"
echo "Found ${#APPLETS[@]} applet(s) on $SERVER:$APPLET_DIR"