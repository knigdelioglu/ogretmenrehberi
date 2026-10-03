import fs from "node:fs";
import path from "node:path";

function tokenize(source, filename) {
  const tokens = [];
  let index = 0;
  let line = 1;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      if (char === "\n") line += 1;
      index += 1;
      continue;
    }
    if (char === "/" && source[index + 1] === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        if (source[index] === "\n") line += 1;
        index += 1;
      }
      if (index >= source.length) throw new Error(`Unclosed comment in ${filename}`);
      index += 2;
      continue;
    }
    if (char === "'" || char === '"') {
      const startLine = line;
      const quote = char;
      let value = "";
      index += 1;
      while (index < source.length && source[index] !== quote) {
        if (source[index] === "\\") {
          index += 1;
          if (index >= source.length) break;
          const escaped = source[index];
          value += ({ n: "\n", r: "\r", t: "\t" })[escaped] ?? escaped;
        } else {
          if (source[index] === "\n") line += 1;
          value += source[index];
        }
        index += 1;
      }
      if (source[index] !== quote) throw new Error(`Unclosed string in ${filename}:${startLine}`);
      index += 1;
      tokens.push({ type: "string", value, line: startLine });
      continue;
    }
    if (char === "`") {
      const startLine = line;
      let value = "";
      let interpolated = false;
      index += 1;
      while (index < source.length && source[index] !== "`") {
        if (source[index] === "\\") {
          index += 1;
          if (index < source.length) value += source[index++];
          continue;
        }
        if (source[index] === "$" && source[index + 1] === "{") interpolated = true;
        if (source[index] === "\n") line += 1;
        value += source[index++];
      }
      if (source[index] !== "`") throw new Error(`Unclosed template string in ${filename}:${startLine}`);
      index += 1;
      tokens.push({ type: "template", value, interpolated, line: startLine });
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      const start = index;
      while (index < source.length && /[A-Za-z0-9_$]/.test(source[index])) index += 1;
      tokens.push({ type: "identifier", value: source.slice(start, index), line });
      continue;
    }
    tokens.push({ type: "punctuation", value: char, line });
    index += 1;
  }
  return tokens;
}

function moduleSpecifiers(source, filename) {
  const tokens = tokenize(source, filename);
  const specifiers = new Set();
  const add = (token) => {
    if (token.type === "string") specifiers.add(token.value);
    else if (token.type === "template" && !token.interpolated) specifiers.add(token.value);
    else throw new Error(`Cannot precache a non-literal module import in ${filename}:${token.line}`);
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "identifier" || (token.value !== "import" && token.value !== "export")) continue;
    const next = tokens[index + 1];
    if (token.value === "import" && next?.value === ".") continue; // import.meta
    if (token.value === "import" && next?.value === "(") {
      const argument = tokens[index + 2];
      if (!argument || !["string", "template"].includes(argument.type) || tokens[index + 3]?.value !== ")") {
        throw new Error(`Cannot precache a non-literal dynamic import in ${filename}:${token.line}`);
      }
      add(argument);
      continue;
    }
    if (token.value === "import" && (next?.type === "string" || next?.type === "template")) {
      add(next);
      continue;
    }

    for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
      const candidate = tokens[cursor];
      if (candidate.value === ";" || (candidate.line > token.line &&
          candidate.type === "identifier" && ["import", "export"].includes(candidate.value))) break;
      if (candidate.type === "identifier" && candidate.value === "from") {
        const sourceToken = tokens[cursor + 1];
        if (sourceToken?.type === "string" || sourceToken?.type === "template") add(sourceToken);
        break;
      }
    }
  }
  return [...specifiers];
}

export function discoverLocalModuleGraph(sourceRoot, entry = "app.js") {
  const root = path.resolve(sourceRoot);
  const queue = [path.resolve(root, entry)];
  const files = new Set();
  const requests = new Set();

  while (queue.length) {
    const file = queue.pop();
    const relativeFile = path.relative(root, file);
    if (relativeFile.startsWith(`..${path.sep}`) || relativeFile === ".." || path.isAbsolute(relativeFile)) {
      throw new Error(`Application module escapes source root: ${file}`);
    }
    if (files.has(relativeFile)) continue;
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`Application module is missing: ${relativeFile}`);
    }
    if (![".js", ".mjs"].includes(path.extname(file))) {
      throw new Error(`Offline import is not a JavaScript module: ${relativeFile}`);
    }
    files.add(relativeFile);

    const source = fs.readFileSync(file, "utf8");
    for (const specifier of moduleSpecifiers(source, relativeFile)) {
      if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
        throw new Error(`Offline app uses an unsupported external or bare import: ${specifier} (${relativeFile})`);
      }
      const moduleUrl = new URL(specifier, `https://offline.invalid/${relativeFile.split(path.sep).join("/")}`);
      if (moduleUrl.origin !== "https://offline.invalid") {
        throw new Error(`Offline app imports an external module: ${specifier} (${relativeFile})`);
      }
      // Resolve the source file separately from its browser request URL so query
      // strings are preserved in the precache key but never treated as filenames.
      const resolvedTarget = specifier.startsWith("/")
        ? path.resolve(root, decodeURIComponent(moduleUrl.pathname.replace(/^\//, "")))
        : path.resolve(path.dirname(file), decodeURIComponent(specifier.split(/[?#]/, 1)[0]));
      const normalizedTarget = path.normalize(resolvedTarget);
      const normalizedRelative = path.relative(root, normalizedTarget);
      if (normalizedRelative.startsWith(`..${path.sep}`) || normalizedRelative === ".." || path.isAbsolute(normalizedRelative)) {
        throw new Error(`Offline import escapes source root: ${specifier} (${relativeFile})`);
      }
      if (![".js", ".mjs"].includes(path.extname(normalizedTarget))) {
        throw new Error(`Offline import is not a JavaScript module: ${specifier} (${relativeFile})`);
      }
      const requestPath = `${moduleUrl.pathname.replace(/^\//, "")}${moduleUrl.search}`;
      requests.add(requestPath);
      queue.push(normalizedTarget);
    }
  }

  return {
    files: [...files].map((file) => file.split(path.sep).join("/")).sort(),
    requests: [...requests].sort()
  };
}
