export type Segment =
  | { kind: 'raw'; start: number; end: number; text: string }
  | { kind: 'command'; name: string; start: number; end: number; argsText: string; text: string };

export type TargetKind = 'executable' | 'library';

export interface TargetModel {
  name: string;
  kind: TargetKind;
  sources: string[];
  linkLibs: string[];
  includeDirs: string[];
  addRange?: [number, number];
  tllRange?: [number, number];  // first target_link_libraries range (kept for insert-after fallback)
  tidRange?: [number, number];  // target_include_directories range
}

export interface CMakeModel {
  projectName?: string;
  minVersion?: string;
  cxxStandard?: string;
  targets: TargetModel[];
  unsupportedPreview: string;
}

export interface ApplyInput {
  projectName?: string;
  minVersion?: string;
  cxxStandard?: string;
  targetName: string;
  linkLibs: string[];
  includeDirs: string[];
}

export interface Parsed {
  segments: Segment[];
  model: CMakeModel;
}
