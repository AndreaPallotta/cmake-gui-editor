import { CMakeModel, Parsed, TargetKind, TargetModel } from './types';
import { SUPPORTED_COMMANDS } from './constants';
import { firstToken, splitArgsLines, filterNonCommentRaw } from './utils';
import { segment } from './segmenter';

function parseAddTarget(name: string, args: string): { tname?: string; kind: TargetKind; sources: string[] } {
    const tname = firstToken(args);
    let kind: TargetKind = name === 'add_library' ? 'library' : 'executable';
    const list = splitArgsLines(args);
    const cleaned: string[] = [];
    for (const l of list) {
        if (!tname) {
            break;
        }
        if (l === tname) {
            continue;
        }
        if (/^(STATIC|SHARED|MODULE|OBJECT|INTERFACE|EXCLUDE_FROM_ALL|ALIAS)$/i.test(l)) {
            if (/^(STATIC|SHARED|MODULE|OBJECT)$/i.test(l)) {
                kind = 'library';
            }
            continue;
        }
        cleaned.push(l);
    }
    return { tname, kind, sources: cleaned };
}

function parseTll(args: string): { target?: string; libs: string[] } {
    const list = splitArgsLines(args);
    const target = list[0];
    const libs = list.slice(1).filter(x => !/^(PRIVATE|PUBLIC|INTERFACE)$/i.test(x));
    return { target, libs };
}

function parseTid(args: string): { target?: string; dirs: string[] } {
    const list = splitArgsLines(args);
    const target = list[0];
    const dirs = list.slice(1).filter(x => !/^(PRIVATE|PUBLIC|INTERFACE|BEFORE|AFTER|SYSTEM)$/i.test(x));
    return { target, dirs };
}

export function parseCMake(text: string): Parsed {
    const segments = segment(text);
    const model: CMakeModel = { targets: [], unsupportedPreview: '' };
    const targetsByName = new Map<string, TargetModel>();

    for (const seg of segments) {
        if (seg.kind !== 'command') {
            continue;
        }
        const n = seg.name;
        if (n === 'project') {
            const name = firstToken(seg.argsText);
            if (name) {
                model.projectName = name;
            }
            continue;
        }
        if (n === 'cmake_minimum_required') {
            const mv = /VERSION\s+([0-9][0-9.]*)/i.exec(seg.argsText);
            if (mv) {
                model.minVersion = mv[1];
            }
            continue;
        }
        if (n === 'set') {
            const ms = /CMAKE_CXX_STANDARD\s+(\d+)/i.exec(seg.argsText);
            if (ms) {
                model.cxxStandard = ms[1];
            }
            continue;
        }
        if (n === 'add_executable' || n === 'add_library') {
            const t = parseAddTarget(n, seg.argsText);
            if (t.tname) {
                const tgt = targetsByName.get(t.tname) || { name: t.tname, kind: t.kind, sources: [], linkLibs: [], includeDirs: [] };
                tgt.kind = t.kind;
                tgt.sources = t.sources;
                tgt.addRange = [seg.start, seg.end];
                targetsByName.set(t.tname, tgt);
            }
            continue;
        }
        if (n === 'target_link_libraries') {
            const tll = parseTll(seg.argsText);
            if (tll.target) {
                const tgt = targetsByName.get(tll.target) || { name: tll.target, kind: 'executable', sources: [], linkLibs: [], includeDirs: [] };
                // Keep the first occurrence's range as the canonical insert-after point.
                if (!tgt.tllRange) {
                    tgt.linkLibs = tll.libs;
                    tgt.tllRange = [seg.start, seg.end];
                } else {
                    // Merge libs from subsequent blocks so the UI shows the full picture.
                    for (const lib of tll.libs) {
                        if (!tgt.linkLibs.includes(lib)) {
                            tgt.linkLibs.push(lib);
                        }
                    }
                }
                targetsByName.set(tll.target, tgt);
            }
            continue;
        }
        if (n === 'target_include_directories') {
            const tid = parseTid(seg.argsText);
            if (tid.target) {
                const tgt = targetsByName.get(tid.target) || { name: tid.target, kind: 'executable', sources: [], linkLibs: [], includeDirs: [] };
                if (!tgt.tidRange) {
                    tgt.includeDirs = tid.dirs;
                    tgt.tidRange = [seg.start, seg.end];
                } else {
                    for (const dir of tid.dirs) {
                        if (!tgt.includeDirs.includes(dir)) {
                            tgt.includeDirs.push(dir);
                        }
                    }
                }
                targetsByName.set(tid.target, tgt);
            }
            continue;
        }
    }

    model.targets = Array.from(targetsByName.values());

    const unsupportedPieces: string[] = [];
    for (const seg of segments) {
        if (seg.kind === 'raw') {
            const cleaned = filterNonCommentRaw(seg.text);
            if (cleaned) {
                unsupportedPieces.push(cleaned);
            }
        } else if (!SUPPORTED_COMMANDS.has(seg.name)) {
            unsupportedPieces.push(seg.text);
        }
    }
    model.unsupportedPreview = unsupportedPieces.join('\n\n').trim();
    return { segments, model };
}
