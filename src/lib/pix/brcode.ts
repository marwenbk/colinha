import { toPixText } from '../text/ascii';
import { crc16 } from './crc16';

const field = (id: string, value: string): string =>
  id + String(value.length).padStart(2, '0') + value;

export function buildPixPayload(p: { key: string; name: string; city: string }): string {
  if (p.key.length > 77) throw new Error('Pix key too long');
  const body =
    field('00', '01') +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', p.key)) +
    field('52', '0000') +
    field('53', '986') +
    field('58', 'BR') +
    field('59', toPixText(p.name, 25)) +
    field('60', toPixText(p.city, 15)) +
    field('62', field('05', '***')) +
    '6304';
  return body + crc16(body);
}
