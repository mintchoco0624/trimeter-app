import { Pipe, type PipeTransform } from '@angular/core';

/** 35 -> "₱35", 37.5 -> "₱37.50". */
export function formatPeso(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `₱${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2)}`;
}

@Pipe({
  name: 'peso',
})
export class PesoPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatPeso(value);
  }
}
