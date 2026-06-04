import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CsvExportService {
  exportToCsv(filename: string, rows: unknown[][]): void {
    const separator = ';';
    const csvContent = rows
      .map((row) => row
        .map((value) => {
          const text = this.normalizeText(value).replace(/"/g, '""');
          return `"${text}"`;
        })
        .join(separator))
      .join('\r\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .replace(/Ã©/g, 'é')
      .replace(/Ã¨/g, 'è')
      .replace(/Ãª/g, 'ê')
      .replace(/Ã«/g, 'ë')
      .replace(/Ã /g, 'à')
      .replace(/Ã¢/g, 'â')
      .replace(/Ã´/g, 'ô')
      .replace(/Ã»/g, 'û')
      .replace(/Ã¹/g, 'ù')
      .replace(/Ã§/g, 'ç')
      .replace(/Ã€/g, 'À')
      .replace(/Ã‰/g, 'É')
      .replace(/â€™/g, "'")
      .replace(/â€˜/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€¢/g, '•')
      .replace(/Â/g, '');
  }
}
