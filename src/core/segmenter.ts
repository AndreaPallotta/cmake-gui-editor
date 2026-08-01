import { Segment } from './types';

/**
 * Finds the index of the closing ')' that matches the opening at `openIdx`.
 * Handles: quoted strings, CMake bracket strings [[...]], nested parens,
 * and line comments starting with '#' (which CMake ignores for paren-matching).
 */
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
        // Bug 4 fix: skip '#' line comments so a ')' inside a comment doesn't
        // prematurely close the argument list.
        if (ch === '#') {
            while (i < s.length && s[i] !== '\n') { i++; }
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

        // Bug 4 fix: skip matches that begin after a '#' on the same line
        // (i.e. the command name is inside a comment).
        const lineStart = text.lastIndexOf('\n', matchStart - 1) + 1;
        const linePrefix = text.slice(lineStart, matchStart);
        if (linePrefix.includes('#')) {
            // This "command" is inside a comment — advance past it and continue.
            cmdStart.lastIndex = matchStart + 1;
            continue;
        }

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
