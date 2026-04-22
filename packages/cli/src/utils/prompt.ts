import chalk from 'chalk';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const enquirer = require('enquirer');

function getPreset(): Record<string, unknown> | null {
  if (!process.env.CAPX_PRESET) return null;
  try {
    return JSON.parse(process.env.CAPX_PRESET) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function promptText(key: string, message: string, initial?: string): Promise<string> {
  const preset = getPreset();
  if (preset && key in preset) return String(preset[key]);

  const { value } = await enquirer.prompt({
    type: 'input',
    name: 'value',
    message,
    initial,
  }) as { value: string };
  return value.trim();
}

export async function promptList(key: string, message: string, separator = ','): Promise<string[]> {
  const preset = getPreset();
  if (preset && key in preset) {
    const raw = preset[key];
    if (Array.isArray(raw)) return raw.map(String);
    return String(raw).split(separator).map((s) => s.trim()).filter(Boolean);
  }

  const { value } = await enquirer.prompt({
    type: 'input',
    name: 'value',
    message,
  }) as { value: string };
  return value.split(separator).map((s: string) => s.trim()).filter(Boolean);
}

export async function promptConfirm(key: string, message: string, initial = true): Promise<boolean> {
  const preset = getPreset();
  if (preset && key in preset) {
    const val = preset[key];
    if (typeof val === 'boolean') return val;
    return String(val).toLowerCase() === 'true' || val === 'y' || val === '1';
  }

  const { confirmed } = await enquirer.prompt({
    type: 'confirm',
    name: 'confirmed',
    message,
    initial,
  }) as { confirmed: boolean };
  return confirmed;
}

export async function promptSelect(key: string, message: string, choices: string[]): Promise<string> {
  const preset = getPreset();
  if (preset && key in preset) return String(preset[key]);

  const { value } = await enquirer.prompt({
    type: 'select',
    name: 'value',
    message,
    choices,
  }) as { value: string };
  return value;
}

export function log(message: string): void {
  console.log(chalk.cyan('  →'), message);
}
