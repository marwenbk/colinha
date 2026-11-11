export function toPixText(s: string, max: number): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .,/-]/g, '')
    .replace(/ +/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}
