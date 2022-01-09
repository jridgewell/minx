# @jridgewell/minx

> A completely static site generator powered by JS+JSX

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
  </html>
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
