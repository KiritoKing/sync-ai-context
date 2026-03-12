import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { checkbox, confirm, input, select } from '@inquirer/prompts';
import { DEFAULT_TARGETS } from './adapters';
import { ensureParentDir, pathExists } from './fs-utils';
import type {
  ConfigInput,
  OperationResult,
  SourceInput,
  SyncMode,
  TargetInput,
} from './types';

type SourceKind = SourceInput['kind'];
type ModeStrategy = 'preset' | SyncMode;

export interface PromptChoice<T extends string> {
  label: string;
  value: T;
}

export interface PromptAdapter {
  select<T extends string>(
    message: string,
    choices: PromptChoice<T>[],
    defaultValue?: T,
  ): Promise<T>;
  multiSelect<T extends string>(
    message: string,
    choices: PromptChoice<T>[],
    defaultValues?: T[],
  ): Promise<T[]>;
  input(message: string, defaultValue?: string): Promise<string>;
  confirm(message: string, defaultValue?: boolean): Promise<boolean>;
}

export interface InitOptions {
  cwd: string;
  configPath: string;
  promptAdapter?: PromptAdapter;
}

interface SourceAnswers {
  kind: SourceKind;
  tool?: string;
  skillsPath: string;
}

interface InitAnswers {
  source: SourceAnswers;
  selectedTargets: string[];
  modeStrategy: ModeStrategy;
  configPath: string;
}

export const OFFICIAL_SCHEMA_URL =
  'https://raw.githubusercontent.com/bytedance/vibe-coder-manager/main/context-sync.schema.json';

const SOURCE_KIND_CHOICES: PromptChoice<SourceKind>[] = [
  { label: 'canonical (独立目录)', value: 'canonical' },
  { label: 'tool (直接使用某工具目录)', value: 'tool' },
];

const MODE_STRATEGY_CHOICES: PromptChoice<ModeStrategy>[] = [
  { label: 'preset (使用工具默认模式)', value: 'preset' },
  { label: 'link (全部 target 使用 link)', value: 'link' },
  { label: 'copy (全部 target 使用 copy)', value: 'copy' },
];

export function createInquirerPromptAdapter(): PromptAdapter {
  return {
    select: async <T extends string>(
      message: string,
      choices: PromptChoice<T>[],
      defaultValue?: T,
    ) =>
      select<T>({
        message,
        choices: choices.map((choice) => ({
          name: choice.label,
          value: choice.value,
        })),
        default: defaultValue,
      }),
    multiSelect: async <T extends string>(
      message: string,
      choices: PromptChoice<T>[],
      defaultValues: T[] = [],
    ) =>
      checkbox<T>({
        message,
        choices: choices.map((choice) => ({
          name: choice.label,
          value: choice.value,
          checked: defaultValues.includes(choice.value),
        })),
      }),
    input: async (message: string, defaultValue?: string) =>
      input({
        message,
        default: defaultValue,
      }),
    confirm: async (message: string, defaultValue = false) =>
      confirm({
        message,
        default: defaultValue,
      }),
  };
}

function normalizeNonEmpty(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required`);
  }
  return trimmed;
}

function resolveDefaultSourcePath(sourceTool?: string): string {
  if (!sourceTool) {
    return '.aime/skills';
  }
  const targetPreset = DEFAULT_TARGETS[sourceTool];
  if (targetPreset) {
    return targetPreset.skillsPath;
  }
  return `.${sourceTool}/skills`;
}

function buildTargets(
  selectedTargets: string[],
  modeStrategy: ModeStrategy,
): Record<string, TargetInput> {
  const targets: Record<string, TargetInput> = {};
  for (const targetName of selectedTargets) {
    const preset = DEFAULT_TARGETS[targetName];
    if (!preset) {
      continue;
    }
    const mode = modeStrategy === 'preset' ? preset.mode : modeStrategy;
    targets[targetName] = {
      skillsPath: preset.skillsPath,
      memoryPath: preset.memoryPath,
      mode,
    };
  }
  return targets;
}

async function collectAnswers(
  promptAdapter: PromptAdapter,
  defaultConfigPath: string,
): Promise<InitAnswers> {
  const kind = await promptAdapter.select(
    'Choose source.kind',
    SOURCE_KIND_CHOICES,
    'canonical',
  );

  let tool: string | undefined;
  if (kind === 'tool') {
    const toolAnswer = await promptAdapter.input(
      'Source tool name (e.g. claude)',
      'claude',
    );
    tool = normalizeNonEmpty(toolAnswer, 'source.tool');
  }

  const sourcePath = await promptAdapter.input(
    'Source skills path',
    resolveDefaultSourcePath(tool),
  );
  const skillsPath = normalizeNonEmpty(sourcePath, 'source.skillsPath');

  const targetChoices = Object.keys(DEFAULT_TARGETS).map(
    (targetName): PromptChoice<string> => ({
      label: targetName,
      value: targetName,
    }),
  );
  const selectedTargetNames = await promptAdapter.multiSelect(
    'Select target tools',
    targetChoices,
    ['codex'],
  );

  const modeStrategy = await promptAdapter.select(
    'Target mode strategy',
    MODE_STRATEGY_CHOICES,
    'preset',
  );

  const configPathAnswer = await promptAdapter.input(
    'Config output path',
    defaultConfigPath,
  );
  const configPath = normalizeNonEmpty(configPathAnswer, 'configPath');

  return {
    source: { kind, tool, skillsPath },
    selectedTargets: selectedTargetNames,
    modeStrategy,
    configPath,
  };
}

function buildConfigFromAnswers(answers: InitAnswers): ConfigInput {
  const filteredTargets = answers.selectedTargets.filter((targetName) => {
    if (answers.source.kind !== 'tool') {
      return true;
    }
    return targetName !== answers.source.tool;
  });

  if (filteredTargets.length === 0) {
    throw new Error('At least one target must be selected');
  }

  const source: SourceInput =
    answers.source.kind === 'tool'
      ? {
          kind: 'tool',
          tool: normalizeNonEmpty(answers.source.tool ?? '', 'source.tool'),
          skillsPath: answers.source.skillsPath,
        }
      : {
          kind: 'canonical',
          skillsPath: answers.source.skillsPath,
        };

  const targets = buildTargets(filteredTargets, answers.modeStrategy);
  if (Object.keys(targets).length === 0) {
    throw new Error('No valid targets selected');
  }

  return {
    $schema: OFFICIAL_SCHEMA_URL,
    source,
    targets,
  };
}

export async function runInit(options: InitOptions): Promise<OperationResult> {
  const promptAdapter = options.promptAdapter ?? createInquirerPromptAdapter();
  const actions: string[] = [];
  const errors: string[] = [];

  try {
    const answers = await collectAnswers(promptAdapter, options.configPath);
    const config = buildConfigFromAnswers(answers);
    const outputPath = path.isAbsolute(answers.configPath)
      ? answers.configPath
      : path.join(options.cwd, answers.configPath);

    if (await pathExists(outputPath)) {
      const confirmed = await promptAdapter.confirm(
        `Config already exists at ${answers.configPath}. Overwrite?`,
        false,
      );
      if (!confirmed) {
        return {
          success: false,
          actions,
          errors: [
            `init aborted: config already exists (${answers.configPath})`,
          ],
        };
      }
    }

    await ensureParentDir(outputPath);
    await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    actions.push(`wrote config: ${outputPath}`);
    actions.push(`targets: ${Object.keys(config.targets).join(', ')}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
  }

  return {
    success: errors.length === 0,
    actions,
    errors,
  };
}
