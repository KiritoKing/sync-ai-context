import path from 'node:path';
import { loadConfigFromFile } from './config';
import { checkContext, doctorContext, syncContext } from './engine';

export interface CliIo {
  cwd?: string;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
}

interface ParsedArgs {
  command: 'sync' | 'check' | 'doctor';
  target?: string;
  force: boolean;
  dryRun: boolean;
  configPath: string;
}

function parseArgs(args: string[]): ParsedArgs {
  const [commandRaw, ...rest] = args;
  const command = commandRaw as ParsedArgs['command'];
  if (
    !command ||
    (command !== 'sync' && command !== 'check' && command !== 'doctor')
  ) {
    throw new Error('Unknown command. Use: sync | check | doctor');
  }
  const parsed: ParsedArgs = {
    command,
    force: false,
    dryRun: false,
    configPath: 'context-sync.config.json',
  };

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }
    if (token === '-f' || token === '--force') {
      parsed.force = true;
      continue;
    }
    if (token === '-t' || token === '--target') {
      parsed.target = rest[i + 1];
      i += 1;
      continue;
    }
    if (token === '-c' || token === '--config') {
      parsed.configPath = rest[i + 1] ?? parsed.configPath;
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${token}`);
  }
  return parsed;
}

function writeLines(writer: (line: string) => void, lines: string[]): void {
  for (const line of lines) {
    writer(line);
  }
}

export async function runCli(args: string[], io: CliIo = {}): Promise<number> {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? ((line) => process.stdout.write(`${line}\n`));
  const stderr = io.stderr ?? ((line) => process.stderr.write(`${line}\n`));

  try {
    const parsed = parseArgs(args);
    const configPath = path.isAbsolute(parsed.configPath)
      ? parsed.configPath
      : path.join(cwd, parsed.configPath);
    const config = await loadConfigFromFile(cwd, configPath);

    if (parsed.command === 'sync') {
      const result = await syncContext({
        config,
        target: parsed.target,
        dryRun: parsed.dryRun,
        force: parsed.force,
      });
      writeLines(stdout, result.actions);
      writeLines(stderr, result.errors);
      return result.success ? 0 : 1;
    }

    if (parsed.command === 'check') {
      const result = await checkContext({
        config,
        target: parsed.target,
      });
      writeLines(stdout, result.actions);
      writeLines(stderr, result.errors);
      return result.success ? 0 : 1;
    }

    const result = await doctorContext({
      config,
      target: parsed.target,
    });
    writeLines(stdout, result.actions);
    writeLines(stderr, result.errors);
    return result.success ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr(message);
    return 1;
  }
}
