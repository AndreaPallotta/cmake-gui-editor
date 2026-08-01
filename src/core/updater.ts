import { ApplyInput, Parsed, Segment } from './types';
import { firstToken, lineSepAt } from './utils';

export function applyToText(original: string, parsed: Parsed, input: ApplyInput): string {
    type Edit = { start: number; end: number; text: string };
    const edits: Edit[] = [];

    /** Return the first command segment matching `name`. */
    const findCmd = (name: string): Extract<Segment, { kind: 'command' }> | undefined =>
        parsed.segments.find(s => s.kind === 'command' && s.name === name) as any;

    /** Return ALL command segments matching `name` and target. */
    const findAllTll = (targetName: string): Extract<Segment, { kind: 'command' }>[] =>
        parsed.segments.filter(s =>
            s.kind === 'command' &&
            s.name === 'target_link_libraries' &&
            firstToken((s as any).argsText) === targetName
        ) as any[];

    /** Return ALL target_include_directories segments for `targetName`. */
    const findAllTid = (targetName: string): Extract<Segment, { kind: 'command' }>[] =>
        parsed.segments.filter(s =>
            s.kind === 'command' &&
            s.name === 'target_include_directories' &&
            firstToken((s as any).argsText) === targetName
        ) as any[];

    // ── cmake_minimum_required ──────────────────────────────────────────────
    if (input.minVersion) {
        const existing = findCmd('cmake_minimum_required');
        const newText = `cmake_minimum_required(VERSION ${input.minVersion})`;
        if (existing) {
            edits.push({ start: existing.start, end: existing.end, text: newText });
        } else {
            edits.push({ start: 0, end: 0, text: newText + lineSepAt(original) });
        }
    }

    // ── project ─────────────────────────────────────────────────────────────
    if (input.projectName) {
        const existing = findCmd('project');
        const newText = `project(${input.projectName} LANGUAGES CXX)`;
        if (existing) {
            edits.push({ start: existing.start, end: existing.end, text: newText });
        } else {
            const afterCmr = findCmd('cmake_minimum_required')?.end ?? 0;
            const prefix = (afterCmr > 0 && original[afterCmr - 1] !== '\n') ? '\n' : '';
            edits.push({ start: afterCmr, end: afterCmr, text: prefix + newText + '\n\n' });
        }
    }

    // ── set(CMAKE_CXX_STANDARD …) ────────────────────────────────────────────
    if (input.cxxStandard) {
        const existing = parsed.segments.find(
            s => s.kind === 'command' && s.name === 'set' && /CMAKE_CXX_STANDARD/i.test((s as any).argsText)
        ) as Extract<Segment, { kind: 'command' }> | undefined;
        const newText = `set(CMAKE_CXX_STANDARD ${input.cxxStandard})`;
        if (existing) {
            edits.push({ start: existing.start, end: existing.end, text: newText });
        } else {
            const afterProj = findCmd('project')?.end ?? 0;
            const prefix = (afterProj > 0 && original[afterProj - 1] !== '\n') ? '\n' : '';
            edits.push({ start: afterProj, end: afterProj, text: prefix + newText + '\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\n\n' });
        }
    }

    const t = parsed.model.targets.find(t => t.name === input.targetName);
    if (t) {
        // ── target_link_libraries ─────────────────────────────────────────────
        // Bug 5 fix: find ALL tll blocks for this target, replace the first,
        // delete the rest so we don't leave behind stale/duplicate blocks.
        const tllSegs = findAllTll(input.targetName).sort((a, b) => a.start - b.start);
        const libsBody = input.linkLibs.length ? `\n    ${input.linkLibs.join('\n    ')}\n` : '\n';
        const tllText = `target_link_libraries(${t.name} PRIVATE${libsBody})`;

        if (tllSegs.length > 0) {
            edits.push({ start: tllSegs[0].start, end: tllSegs[0].end, text: tllText });
            // Delete extra blocks (drop leading newline too if present)
            for (let i = 1; i < tllSegs.length; i++) {
                const s = tllSegs[i];
                const delStart = (s.start > 0 && original[s.start - 1] === '\n') ? s.start - 1 : s.start;
                edits.push({ start: delStart, end: s.end, text: '' });
            }
        } else if (t.addRange) {
            const after = t.addRange[1];
            const prefix = original[after] === '\n' ? '' : '\n';
            edits.push({ start: after, end: after, text: prefix + tllText + '\n' });
        }

        // ── target_include_directories ────────────────────────────────────────
        const tidSegs = findAllTid(input.targetName).sort((a, b) => a.start - b.start);
        const dirsBody = input.includeDirs.length ? `\n    ${input.includeDirs.join('\n    ')}\n` : '\n';
        const tidText = `target_include_directories(${t.name} PRIVATE${dirsBody})`;

        if (tidSegs.length > 0) {
            edits.push({ start: tidSegs[0].start, end: tidSegs[0].end, text: tidText });
            for (let i = 1; i < tidSegs.length; i++) {
                const s = tidSegs[i];
                const delStart = (s.start > 0 && original[s.start - 1] === '\n') ? s.start - 1 : s.start;
                edits.push({ start: delStart, end: s.end, text: '' });
            }
        } else if (input.includeDirs.length > 0) {
            // Only insert a new block if the user actually specified dirs.
            const insertAfter = tllSegs[0]?.end ?? t.addRange?.[1] ?? 0;
            if (insertAfter > 0) {
                const prefix = original[insertAfter] === '\n' ? '' : '\n';
                edits.push({ start: insertAfter, end: insertAfter, text: prefix + tidText + '\n' });
            }
        }
    }

    // Apply edits from end → start so offsets don't shift.
    edits.sort((a, b) => b.start - a.start);
    let out = original;
    for (const e of edits) {
        out = out.slice(0, e.start) + e.text + out.slice(e.end);
    }
    return out;
}
