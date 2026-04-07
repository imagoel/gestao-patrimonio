type PdfDocumentDefinition = Record<string, unknown>;

interface MovimentacaoReportRow {
  tombo: string;
  item: string;
  origem: string;
  destino: string;
  status: string;
  solicitante: string;
  solicitadoEm: string;
}

interface BuildMovimentacaoReportInput {
  titulo: string;
  subtitulo: string;
  filtros: string[];
  geradoEm: string;
  geradoPor: string;
  total: number;
  rows: MovimentacaoReportRow[];
}

function buildEmptyRow(message: string, colSpan: number) {
  return [
    {
      text: message,
      colSpan,
      alignment: 'center',
      margin: [0, 8, 0, 8],
    },
    ...Array.from({ length: colSpan - 1 }, () => ({})),
  ];
}

export function buildMovimentacaoReportDefinition(
  input: BuildMovimentacaoReportInput,
): PdfDocumentDefinition {
  const body = [
    [
      { text: 'Tombo', style: 'tableHeader' },
      { text: 'Item', style: 'tableHeader' },
      { text: 'Origem', style: 'tableHeader' },
      { text: 'Destino', style: 'tableHeader' },
      { text: 'Status', style: 'tableHeader' },
      { text: 'Solicitante', style: 'tableHeader' },
      { text: 'Solicitado em', style: 'tableHeader' },
    ],
    ...(input.rows.length
      ? input.rows.map((row) => [
          row.tombo,
          row.item,
          row.origem,
          row.destino,
          row.status,
          row.solicitante,
          row.solicitadoEm,
        ])
      : [buildEmptyRow('Nenhuma movimentacao encontrada para os filtros informados.', 7)]),
  ];

  const filtersSummary = input.filtros.length
    ? input.filtros.join(' | ')
    : 'nenhum';

  return {
    pageOrientation: 'landscape',
    pageMargins: [32, 32, 32, 32],
    content: [
      { text: input.titulo, style: 'title' },
      { text: input.subtitulo, style: 'subtitle' },
      {
        text: `Filtros aplicados: ${filtersSummary}. Total de registros: ${input.total}.`,
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: [50, '*', 120, 120, 85, 90, 82],
          body,
        },
        layout: 'lightHorizontalLines',
      },
      {
        text: `Gerado por ${input.geradoPor} em ${input.geradoEm}.`,
        style: 'footer',
      },
    ],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
    },
    styles: {
      title: {
        fontSize: 16,
        bold: true,
        margin: [0, 0, 0, 4],
      },
      subtitle: {
        fontSize: 11,
        color: '#666666',
        margin: [0, 0, 0, 8],
      },
      tableHeader: {
        bold: true,
        fillColor: '#f0f0f0',
      },
      footer: {
        margin: [0, 12, 0, 0],
        fontSize: 8,
        color: '#666666',
      },
    },
  };
}
