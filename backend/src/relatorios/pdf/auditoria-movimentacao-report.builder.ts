type PdfDocumentDefinition = Record<string, unknown>;

interface AuditoriaMovimentacaoReportRow {
  dataHora: string;
  acao: string;
  usuario: string;
  tombo: string;
  item: string;
  movimentacao: string;
  resumo: string;
}

interface BuildAuditoriaMovimentacaoReportInput {
  titulo: string;
  subtitulo: string;
  filtros: string[];
  geradoEm: string;
  geradoPor: string;
  total: number;
  rows: AuditoriaMovimentacaoReportRow[];
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

export function buildAuditoriaMovimentacaoReportDefinition(
  input: BuildAuditoriaMovimentacaoReportInput,
): PdfDocumentDefinition {
  const body = [
    [
      { text: 'Data e hora', style: 'tableHeader' },
      { text: 'Acao', style: 'tableHeader' },
      { text: 'Usuario', style: 'tableHeader' },
      { text: 'Tombo', style: 'tableHeader' },
      { text: 'Item', style: 'tableHeader' },
      { text: 'Movimentacao', style: 'tableHeader' },
      { text: 'Resumo', style: 'tableHeader' },
    ],
    ...(input.rows.length
      ? input.rows.map((row) => [
          row.dataHora,
          row.acao,
          row.usuario,
          row.tombo,
          row.item,
          row.movimentacao,
          row.resumo,
        ])
      : [
          buildEmptyRow(
            'Nenhum evento de auditoria de movimentacao encontrado para os filtros informados.',
            7,
          ),
        ]),
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
          widths: [74, 85, 85, 50, 110, 90, '*'],
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
