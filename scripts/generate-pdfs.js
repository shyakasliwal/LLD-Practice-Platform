const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { marked } = require("marked");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs", "pdf");
const tmpDir = path.join(outDir, "_html");

function findBrowser() {
  const candidates = [
    path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.PROGRAMFILES || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  ];
  return candidates.find((p) => p && fs.existsSync(p));
}

function wrapHtml(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page { margin: 18mm 16mm; }
    body {
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.45;
      font-size: 11.5pt;
      max-width: 820px;
      margin: 0 auto;
    }
    h1 { font-size: 20pt; border-bottom: 2px solid #1f4e79; padding-bottom: 6px; }
    h2 { font-size: 14pt; color: #1f4e79; margin-top: 1.3em; }
    h3 { font-size: 12pt; color: #2e5a88; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
    th, td { border: 1px solid #c5c5c5; padding: 6px 8px; vertical-align: top; }
    th { background: #1f4e79; color: #fff; text-align: left; }
    tr:nth-child(even) td { background: #f4f7fb; }
    code, pre { font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; }
    pre { background: #f6f6f6; padding: 10px; border: 1px solid #ddd; white-space: pre-wrap; }
    hr { border: none; border-top: 1px solid #ccc; margin: 28px 0; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function toPdf(mdPath, title, pdfName) {
  const md = fs.readFileSync(mdPath, "utf8");
  const html = wrapHtml(title, marked.parse(md));
  const htmlPath = path.join(tmpDir, pdfName.replace(/\.pdf$/i, ".html"));
  fs.writeFileSync(htmlPath, html, "utf8");
  const pdfPath = path.join(outDir, pdfName);
  const browser = findBrowser();
  if (!browser) {
    throw new Error("Chrome/Edge not found; cannot print PDF");
  }
  const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  const result = spawnSync(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      `--print-to-pdf=${pdfPath}`,
      "--no-pdf-header-footer",
      fileUrl,
    ],
    { encoding: "utf8" }
  );
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF was not created: ${pdfName}\n${result.stderr || result.stdout || result.status}`);
  }
  console.log("Wrote", pdfPath);
}

fs.mkdirSync(tmpDir, { recursive: true });

const combinedMd = [
  fs.readFileSync(path.join(root, "README.md"), "utf8"),
  "\n\n---\n\n",
  fs.readFileSync(path.join(root, "AI_USAGE.md"), "utf8"),
].join("");
const combinedPath = path.join(tmpDir, "README_and_AI_USAGE.md");
fs.writeFileSync(combinedPath, combinedMd, "utf8");

toPdf(path.join(root, "docs", "RESEARCH.md"), "Research Note — LLD Practice Platform", "Research_Note.pdf");
toPdf(path.join(root, "docs", "DESIGN.md"), "Design Note — LLD Practice Platform", "Design_Note.pdf");
toPdf(combinedPath, "README and AI_USAGE — LLD Practice Platform", "README_and_AI_USAGE.pdf");
