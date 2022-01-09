// `dedent` global is loaded through `--bootstrap website/bootstrap.mjs`.

function Code({ name, lang, children }) {
  return (
    <pre>
      <span>{name}</span>
      <code className={lang}>{children}</code>
    </pre>
  );
}

export default function () {
  debugger;
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>minx</title>
        <link rel="stylesheet" href="style.css" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/base16/solarized-dark.min.css"
        />
        <script type="module" async src="script.js"></script>
      </head>
      <body>
        <h1>@jridgewell/minx</h1>
        <h2>A completely static site generator powered by JS+JSX</h2>
        <p>
          Static website generators are far too complicated. I don't want to
          learn how to configure the site to get it running, I just want to
          write basic HTML. But, then I want to avoid duplicate a bunch code
          when I reuse a section. If only there were a way to program in JS and
          build static HTML…
        </p>
        <p>
          Minx gives you the full power of JS to create a completely static
          site. Each file needs to export just a `default` function in ESM, and
          its return value will be interpreted as Preact JSX and used to
          generate your HTML.
        </p>
        <Code name="website/index.mjs" lang="javascript">
          {dedent`
            export default function Website() {
              return <html>
                <body>
                  Hello World!
                </body>
              </html>;
            }
          `}
        </Code>
      </body>
    </html>
  );
}
