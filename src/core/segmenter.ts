import { Segment } from './types';

function findCloseParen(s: string, openIdx: number): number {
    let i = openIdx, depth = 0, inStr = false;
    let bracketDelim: string | null = null;
    for (; i < s.length; i++) {
        const ch = s[i];
        if (bracketDelim) {
            if (ch === ']' && s.startsWith(bracketDelim, i)) {
                i += bracketDelim.length - 1;
                bracketDelim = null;
            }
            continue;
        }
        if (inStr) {
            if (ch === '"' && s[i - 1] !== '\\') {
                inStr = false;
            }
            continue;
        }
        if (ch === '"') { inStr = true; continue; }
        if (ch === '[') {
            const m = s.slice(i).match(/^\[(=*)\[/);
            if (m) { bracketDelim = ']' + m[1] + ']'; i += m[0].length - 1; continue; }
        }
        if (ch === '(') { depth++; continue; }
        if (ch === ')') { depth--; if (depth === 0) { return i; } continue; }
    }
    return -1;
}

export function segment(text: string): Segment[] {
    const segments: Segment[] = [];
    const cmdStart = /(^|\n)[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/g;
    let pos = 0;
    let m: RegExpExecArray | null;
    while ((m = cmdStart.exec(text))) {
        const matchStart = m.index + (m[1] ? m[1].length : 0);
        const name = m[2];
        if (matchStart > pos) {
            segments.push({ kind: 'raw', start: pos, end: matchStart, text: text.slice(pos, matchStart) });
        }
        const openIdx = text.indexOf('(', matchStart);
        const endIdx = findCloseParen(text, openIdx);
        if (endIdx < 0) {
            break;
        }
        const cmdText = text.slice(matchStart, endIdx + 1);
        const argsText = text.slice(openIdx + 1, endIdx);
        segments.push({ kind: 'command', name: name.toLowerCase(), start: matchStart, end: endIdx + 1, argsText, text: cmdText });
        pos = endIdx + 1;
        cmdStart.lastIndex = pos;
    }
    if (pos < text.length) {
        segments.push({ kind: 'raw', start: pos, end: text.length, text: text.slice(pos) });
    }
    return segments;
}
