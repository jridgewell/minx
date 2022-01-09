# @jridgewell/minx

> A completely static site generator powered by JS+JSX

Static website generators are far too complicated. I don't want to learn
how to configure the site to get it running, I just want to write basic
HTML. But, then I want to avoid duplicate a bunch code when I reuse a
section. If only there were a way to program in JS and build static
HTML…

Minx gives you the full power of JS to create a completely static site.
Each file needs to export just a `default` function in ESM, and its
return value will be interpreted as Preact JSX and used to generate your
HTML.

```jsx
// website/index.mjs

export default function Website() {
  return <html>
    <body>
      Hello World!
    </body>
  </html>;
}
```

## Installation

```bash
$ npm install -g @jridgewell/minx
```

## Usage

Basic usage is as follows:

```bash
$ minx build [--in <dir>] [--out <dir>]

$ minx serve [--in <dir>] [--port <port>]
```

See each command's help message for full options.
