import type { MessageKey } from '../i18n';
import type { PixKeyType } from '../lib/pix/key';

export type CardType = 'docs' | 'address' | 'pix';
export type ColorId = 'graphite' | 'blue' | 'green' | 'teal' | 'purple' | 'orange';

export interface CardBase {
  v: 1;
  id: string;
  type: CardType;
  color: ColorId;
  updatedAt: number;
}
export interface DocsCard extends CardBase {
  type: 'docs';
  cpf: string;
  name: string;
  rg: string;
  rnm: string;
  passport: string;
  barcode: boolean;
}
export interface AddressCard extends CardBase {
  type: 'address';
  cep: string;
  line1: string;
  line2: string;
  district: string;
  city: string;
  uf: string;
  reference: string;
}
export interface PixCard extends CardBase {
  type: 'pix';
  key: string;
  keyType: PixKeyType | null;
  name: string;
  city: string;
}
export type Card = DocsCard | AddressCard | PixCard;

export interface PassField {
  key: string;
  label: string;
  value: string;
  detect?: false;
  link?: { href: string; text: string };
}
export interface PassLayout {
  description: string;
  logoText: string;
  primary: PassField[];
  secondary: PassField[];
  auxiliary: PassField[];
  back: PassField[];
  colors: { bg: string; fg: string; label: string };
  barcodes: { format: 'PKBarcodeFormatCode128' | 'PKBarcodeFormatQR'; message: string }[];
}
export interface FieldSpec {
  id: string;
  label: MessageKey;
  required: boolean;
  maxLength: number;
  inputmode?: string;
  autocomplete?: string;
  uppercase?: boolean;
  /** Typed exactly: no autocapitalize, autocorrect or spellcheck (the Pix key). */
  verbatim?: boolean;
  /** Digit mask applied as you type, `0` = digit (e.g. `000.000.000-00`). */
  mask?: string;
  normalize(s: string): string;
  valid?(v: string): boolean;
  format?(v: string): string;
}
