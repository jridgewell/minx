// @ts-nocheck

function renderChildren(children, indent) {
  if (!Array.isArray(children)) {
    if (typeof children === 'string') return children;
    children = [children];
  }

  let output = '';
  for (const c of children) {
    output += '\n' + '  '.repeat(indent);
    if (typeof c === 'string') output += c;
    else output += renderInternal(c, indent);
  }
  if (!output) return '';
  return `${output}\n${'  '.repeat(indent - 1)}`;
}

function renderInternal({ type, props }, indent) {
  let { children, ..._props } = props || {};
  const attrs = Object.entries(_props).map((attr) => {
    return `${attr[0]}="${attr[1]}"`;
  });

  children = children == null ? '' : renderChildren(children, indent + 1);
  let output = `<${type}`;
  if (attrs.length) {
    output += ` ${attrs.join(' ')}`;
  }
  output += '>';
  if (children) output += children;
  return output + `</${type}>`;
}

export function render(jsx) {
  return renderInternal(jsx, 0);
}
