import { config } from './config';

export function t(key: string, ...args: (string | number)[]): string {
  const template = config.locales[key];
  if (template == null) return key;

  let index = 0;
  return template.replace(/%[sd]/g, (placeholder) => {
    const value = args[index++];
    return value == null ? placeholder : String(value);
  });
}
