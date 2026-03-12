export type SyncMode = 'link' | 'copy';

export interface SourceCanonicalInput {
  kind: 'canonical';
  skillsPath: string;
  memoryPath?: string;
}

export interface SourceToolInput {
  kind: 'tool';
  tool: string;
  skillsPath: string;
  memoryPath?: string;
}

export type SourceInput = SourceCanonicalInput | SourceToolInput;

export interface TargetInput {
  skillsPath: string;
  memoryPath?: string;
  mode: SyncMode;
}

export interface ConfigInput {
  $schema?: string;
  source: SourceInput;
  targets: Record<string, TargetInput>;
}

export interface SourceCanonicalConfig {
  kind: 'canonical';
  skillsPath: string;
  memoryPath?: string;
}

export interface SourceToolConfig {
  kind: 'tool';
  tool: string;
  skillsPath: string;
  memoryPath?: string;
}

export type SourceConfig = SourceCanonicalConfig | SourceToolConfig;

export interface TargetConfig {
  skillsPath: string;
  memoryPath?: string;
  mode: SyncMode;
}

export interface ParsedConfig {
  repoRoot: string;
  source: SourceConfig;
  targets: Record<string, TargetConfig>;
}

export interface DiffSummary {
  modified: string[];
  missing: string[];
  extra: string[];
}

export interface OperationResult {
  success: boolean;
  actions: string[];
  errors: string[];
}
