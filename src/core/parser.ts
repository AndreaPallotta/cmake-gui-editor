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
        if (/^(STATIC|SHARED|INTERFACE)$/i.test(l)) {
            kind = 'library';
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
                const tgt = targetsByName.get(t.tname) || { name: t.tname, kind: t.kind, sources: [], linkLibs: [] };
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
                const tgt = targetsByName.get(tll.target) || { name: tll.target, kind: 'executable', sources: [], linkLibs: [] };
                tgt.linkLibs = tll.libs;
                tgt.tllRange = [seg.start, seg.end];
                targetsByName.set(tll.target, tgt);
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
