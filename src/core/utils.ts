export function firstToken(args: string): string | undefined {
  const m = args.trim().match(/^([A-Za-z0-9_.-]+)/);
  return m?.[1];
}

export function splitArgsLines(block: string): string[] {
  return block.split(/\r?\n/).map(stripComment).flatMap(line => line.split(/[ \t]+/)).map(s => s.trim()).filter(Boolean);
}

export function stripComment(s: string): string {
  const i = s.indexOf('#');
  return i >= 0 ? s.slice(0, i).trim() : s.trim();
}

export function lineSepAt(text: string): string {
  return /\r\n/.test(text) ? '\r\n' : '\n';
}

export function filterNonCommentRaw(text: string): string {
  const kept = text.split(/\r?\n/).filter(line => {
    const t = line.trim();
    if (!t) {
      return false;
    }
    if (/^\s*#\s*===\s*cmake-builder:(begin|end)\s*===\s*$/i.test(t)) {
      return false;
    }
    if (/^\s*#/.test(t)) {
      return false;
    }
    return true;
  });
  return kept.join('\n').trim();
}
