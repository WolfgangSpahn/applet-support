console.log('STEP 0: module started');

console.log('STEP 1: importing node:fs');
const fs = await import('node:fs');
console.log('STEP 1: done');

console.log('STEP 2: importing node:path');
const path = await import('node:path');
console.log('STEP 2: done');

console.log('STEP 3: importing node:url');
const { fileURLToPath } = await import('node:url');
console.log('STEP 3: done');

console.log('STEP 4: importing jsdom');
const { JSDOM } = await import('jsdom');
console.log('STEP 4: done');

// -----------------------------------------------------------------------------
// Browser environment required by blended-marked
// -----------------------------------------------------------------------------

console.log('STEP 5: creating JSDOM');

const dom = new JSDOM(
  '<!doctype html><html><body></body></html>'
);

globalThis.window = dom.window as any;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;

console.log('STEP 5: JSDOM created');

// -----------------------------------------------------------------------------
// Import renderer only AFTER browser globals exist
// -----------------------------------------------------------------------------

console.log('STEP 6: importing presentation renderer');

const {
  renderPresentationMarkdown
} = await import('./presentation-markdown');

console.log('STEP 6: presentation renderer imported');

// -----------------------------------------------------------------------------
// Command line
// -----------------------------------------------------------------------------

console.log('STEP 7: parsing arguments');

const args = process.argv.slice(2);

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

    case '-h':
    case '--help':
      console.log(
        'Usage: mypandoc -i input.md -o output.html'
      );
      process.exit(0);

    default:
      console.error(
        `Unknown argument: ${args[i]}`
      );
      process.exit(1);
  }
}

console.log('STEP 7: arguments parsed');

if (!input || !output) {
  console.error(
    'Usage: mypandoc -i input.md -o output.html'
  );
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Read Markdown
// -----------------------------------------------------------------------------

console.log('STEP 8: reading markdown');

const markdown =
  fs.readFileSync(input, 'utf8');

console.log(
  `STEP 8: markdown read (${markdown.length} chars)`
);

// -----------------------------------------------------------------------------
// Render presentation
// -----------------------------------------------------------------------------

console.log('STEP 9: rendering presentation');

const renderedSlides =
  renderPresentationMarkdown(markdown);

console.log(
  `STEP 9: presentation rendered (${renderedSlides.length} chars)`
);

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

console.log('STEP 10: determining paths');

const executableDir =
  path.dirname(
    fileURLToPath(import.meta.url)
  );

const projectDir =
  path.resolve(
    executableDir,
    '..'
  );

const outputPath =
  path.resolve(output);

const outputDir =
  path.dirname(outputPath);

// -----------------------------------------------------------------------------
// Template
// -----------------------------------------------------------------------------

console.log('STEP 11: reading template');

const templatePath =
  path.join(
    projectDir,
    'template.html'
  );

const template =
  fs.readFileSync(
    templatePath,
    'utf8'
  );

console.log('STEP 11: template read');

const html =
  template.replace(
    '{{SLIDES}}',
    renderedSlides
  );

// -----------------------------------------------------------------------------
// Write HTML
// -----------------------------------------------------------------------------

console.log('STEP 12: writing HTML');

fs.mkdirSync(
  outputDir,
  {
    recursive: true,
  }
);

fs.writeFileSync(
  outputPath,
  html,
  'utf8'
);

console.log('STEP 12: HTML written');

// -----------------------------------------------------------------------------
// Copy static resources
// -----------------------------------------------------------------------------

function copyResource(
  source: string,
  target: string
): void {
  if (!fs.existsSync(source)) {
    console.error(
      `Resource not found: ${source}`
    );
    process.exit(1);
  }

  if (
    path.resolve(source) ===
    path.resolve(target)
  ) {
    return;
  }

  fs.copyFileSync(
    source,
    target
  );
}

console.log('STEP 13: copying resources');

copyResource(
  path.join(
    projectDir,
    'styles.css'
  ),
  path.join(
    outputDir,
    'styles.css'
  )
);

copyResource(
  path.join(
    executableDir,
    'reveal-menu.js'
  ),
  path.join(
    outputDir,
    'reveal-menu.js'
  )
);

console.log('STEP 13: resources copied');

// -----------------------------------------------------------------------------
// Cleanup
// -----------------------------------------------------------------------------

console.log('STEP 14: closing JSDOM');

dom.window.close();

console.log('STEP 15: finished');