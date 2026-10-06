const usage = 'Usage: mypandoc -i input.md -o output.html';
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(usage);
  process.exit(0);
}

let input: string | undefined;
let output: string | undefined;

for (let i = 0; i < args.length; ++i) {
  switch (args[i]) {
    case '-i':
    case '--input':
      input = args[++i];
      break;
    case '-o':
    case '--output':
      output = args[++i];
      break;
    default:
      console.error(`Unknown argument: ${args[i]}`);
      process.exit(1);
  }
}

if (!input || !output) {
  console.error(usage);
  process.exit(2);
}

const fs = await import('node:fs');
const path = await import('node:path');
const { fileURLToPath, pathToFileURL } = await import('node:url');
const { JSDOM } = await import('jsdom');

// blended-marked requires browser globals before its renderer is imported.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window as any;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;

const { renderPresentationMarkdown } = await import('./presentation-markdown');
const { preparePresentationSlides } = await import('./presentation-dom');

const markdown = fs.readFileSync(input, 'utf8');
const renderedSlides = renderPresentationMarkdown(markdown);
const slidesElement = document.createElement('div');
slidesElement.innerHTML = renderedSlides;
preparePresentationSlides(slidesElement, pathToFileURL(path.resolve(input)).href);
const preparedSlides = slidesElement.innerHTML;

const executableDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(executableDir, '..');
const outputPath = path.resolve(output);
const outputDir = path.dirname(outputPath);
const templatePath = path.join(projectDir, 'template.html');
const template = fs.readFileSync(templatePath, 'utf8');
const html = template.replace('{{SLIDES}}', preparedSlides);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');

function copyResource(source: string, target: string): void {
  if (!fs.existsSync(source)) {
    console.error(`Resource not found: ${source}`);
    process.exit(1);
  }
  if (path.resolve(source) !== path.resolve(target)) {
    fs.copyFileSync(source, target);
  }
}

copyResource(path.join(projectDir, 'styles.css'), path.join(outputDir, 'styles.css'));
copyResource(path.join(executableDir, 'reveal-menu.js'), path.join(outputDir, 'reveal-menu.js'));
copyResource(path.join(executableDir, 'print.js'), path.join(outputDir, 'print.js'));
dom.window.close();
