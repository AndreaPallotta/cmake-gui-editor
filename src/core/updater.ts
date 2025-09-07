import { ApplyInput, CMakeModel, Parsed, Segment } from './types';
import { lineSepAt } from './utils';

export function applyToText(original: string, parsed: Parsed, input: ApplyInput): string {
    type Edit = { start: number; end: number; text: string };
    const edits: Edit[] = [];
    const findCmd = (name: string): Segment | undefined => parsed.segments.find(s => s.kind === 'command' && s.name === name);

    if (input.minVersion) {
        const existing = findCmd('cmake_minimum_required') as Extract<Segment, { kind: 'command' }> | undefined;
        const newText = `cmake_minimum_required(VERSION ${input.minVersion})`;
        if (existing) {
            edits.push({ start: existing.start, end: existing.end, text: newText });
        }
        else {
            edits.push({ start: 0, end: 0, text: newText + lineSepAt(original) });
        }
    }

    if (input.projectName) {
        const existing = findCmd('project') as Extract<Segment, { kind: 'command' }> | undefined;
        const newText = `project(${input.projectName} LANGUAGES CXX)`;
        if (existing) {
            edits.push({ start: existing.start, end: existing.end, text: newText });
        }
        else {
            const afterCmr = findCmd('cmake_minimum_required')?.end ?? 0;
            const prefix = (afterCmr > 0 && original[afterCmr - 1] !== '\n') ? '\n' : '';
            edits.push({ start: afterCmr, end: afterCmr, text: prefix + newText + '\n\n' });
        }
    }

    if (input.cxxStandard) {
        const existing = parsed.segments.find(s => s.kind === 'command' && s.name === 'set' && /CMAKE_CXX_STANDARD/i.test((s as any).argsText)) as Extract<Segment, { kind: 'command' }> | undefined;
        const newText = `set(CMAKE_CXX_STANDARD ${input.cxxStandard})`;
        if (existing) {
            edits.push({ start: existing.start, end: existing.end, text: newText });
        }
        else {
            const afterProj = findCmd('project')?.end ?? 0;
            const prefix = (afterProj > 0 && original[afterProj - 1] !== '\n') ? '\n' : '';
            edits.push({ start: afterProj, end: afterProj, text: prefix + newText + '\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\n\n' });
        }
    }

    const t = parsed.model.targets.find(t => t.name === input.targetName);
    if (t) {
        const libsBody = input.linkLibs.length ? `\n    ${input.linkLibs.join('\n    ')}\n` : '\n';
        const newText = `target_link_libraries(${t.name} PRIVATE${libsBody})`;
        if (t.tllRange) {
            edits.push({ start: t.tllRange[0], end: t.tllRange[1], text: newText });
        }
        else if (t.addRange) {
            const after = t.addRange[1];
            const prefix = (original[after] === '\n') ? '' : '\n';
            edits.push({ start: after, end: after, text: prefix + newText + '\n' });
        }
    }

    edits.sort((a, b) => b.start - a.start);
    let out = original;
    for (const e of edits) {
        out = out.slice(0, e.start) + e.text + out.slice(e.end);
    }
    return out;
}
