type PdfDocumentDefinition = Record<string, unknown>;

interface PatrimonioReportRow {
  tombo: string;
  item: string;
  secretaria: string;
  responsavel: string;
  localizacao: string;
  status: string;
}

interface PatrimonioHistoricoRow {
  evento: string;
  descricao: string;
  usuario: string;
  referencia: string;
  criadoEm: string;
}

interface BuildPatrimonioReportInput {
  titulo: string;
  subtitulo: string;
  filtros: string[];
  geradoEm: string;
  geradoPor: string;
  total: number;
  rows: PatrimonioReportRow[];
}

interface PatrimonioByLocationGroup {
  localizacao: string;
  total: number;
  rows: Omit<PatrimonioReportRow, 'localizacao'>[];
}

interface BuildPatrimonioByLocationReportInput {
  titulo: string;
  subtitulo: string;
  filtros: string[];
  geradoEm: string;
  geradoPor: string;
  total: number;
  totalLocalizacoes: number;
  groups: PatrimonioByLocationGroup[];
}

interface BuildHistoricoReportInput {
  titulo: string;
  subtitulo: string;
  geradoEm: string;
  geradoPor: string;
  patrimonio: {
    tombo: string;
    item: string;
    secretaria: string;
    responsavel: string;
    localizacao: string;
    status: string;
  };
  rows: PatrimonioHistoricoRow[];
}

function buildFiltersSummary(filters: string[]) {
  if (!filters.length) {
    return 'Filtros aplicados: nenhum.';
  }

  return `Filtros aplicados: ${filters.join(' | ')}.`;
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

function buildPatrimonioBody(rows: PatrimonioReportRow[]) {
  return [
    [
      { text: 'Tombo', style: 'tableHeader' },
      { text: 'Item', style: 'tableHeader' },
      { text: 'Secretaria', style: 'tableHeader' },
      { text: 'Responsavel', style: 'tableHeader' },
      { text: 'Localizacao', style: 'tableHeader' },
      { text: 'Status', style: 'tableHeader' },
    ],
    ...(rows.length
      ? rows.map((row) => [
          row.tombo,
          row.item,
          row.secretaria,
          row.responsavel,
          row.localizacao,
          row.status,
        ])
      : [
          buildEmptyRow(
            'Nenhum patrimonio encontrado para os filtros informados.',
            6,
          ),
        ]),
  ];
}

function buildPatrimonioByLocationBody(
  rows: Omit<PatrimonioReportRow, 'localizacao'>[],
) {
  return [
    [
      { text: 'Tombo', style: 'tableHeader' },
      { text: 'Item', style: 'tableHeader' },
      { text: 'Secretaria', style: 'tableHeader' },
      { text: 'Responsavel', style: 'tableHeader' },
      { text: 'Status', style: 'tableHeader' },
    ],
    ...rows.map((row) => [
      row.tombo,
      row.item,
      row.secretaria,
      row.responsavel,
      row.status,
    ]),
  ];
}

export function buildPatrimonioReportDefinition(
  input: BuildPatrimonioReportInput,
): PdfDocumentDefinition {
  const body = buildPatrimonioBody(input.rows);

  return {
    pageOrientation: 'landscape',
    pageMargins: [32, 32, 32, 32],
    content: [
      { text: input.titulo, style: 'title' },
      { text: input.subtitulo, style: 'subtitle' },
      {
        text: `${buildFiltersSummary(input.filtros)} Total de registros: ${input.total}.`,
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: [52, '*', 80, 100, 110, 70],
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

export function buildPatrimonioByLocationReportDefinition(
  input: BuildPatrimonioByLocationReportInput,
): PdfDocumentDefinition {
  const content: Record<string, unknown>[] = [
    { text: input.titulo, style: 'title' },
    { text: input.subtitulo, style: 'subtitle' },
    {
      text: `${buildFiltersSummary(input.filtros)} Total de registros: ${input.total}. Localizacoes agrupadas: ${input.totalLocalizacoes}.`,
      margin: [0, 0, 0, 12],
    },
  ];

  if (!input.groups.length) {
    content.push({
      text: 'Nenhum patrimonio encontrado para os filtros informados.',
      alignment: 'center',
      margin: [0, 16, 0, 16],
    });
  } else {
    input.groups.forEach((group) => {
      content.push({
        text: `Localizacao: ${group.localizacao} (${group.total} item(ns))`,
        style: 'sectionTitle',
      });
      content.push({
        table: {
          headerRows: 1,
          widths: [52, '*', 80, 120, 70],
          body: buildPatrimonioByLocationBody(group.rows),
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 12],
      });
    });
  }

  content.push({
    text: `Gerado por ${input.geradoPor} em ${input.geradoEm}.`,
    style: 'footer',
  });

  return {
    pageOrientation: 'landscape',
    pageMargins: [32, 32, 32, 32],
    content,
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
      sectionTitle: {
        bold: true,
        fontSize: 11,
        margin: [0, 8, 0, 6],
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

export function buildPatrimonioHistoricoReportDefinition(
  input: BuildHistoricoReportInput,
): PdfDocumentDefinition {
  const body = [
    [
      { text: 'Evento', style: 'tableHeader' },
      { text: 'Descricao', style: 'tableHeader' },
      { text: 'Usuario', style: 'tableHeader' },
      { text: 'Referencia', style: 'tableHeader' },
      { text: 'Registrado em', style: 'tableHeader' },
    ],
    ...(input.rows.length
      ? input.rows.map((row) => [
          row.evento,
          row.descricao,
          row.usuario,
          row.referencia,
          row.criadoEm,
        ])
      : [buildEmptyRow('Nenhum evento encontrado para este patrimonio.', 5)]),
  ];

  return {
    pageMargins: [32, 32, 32, 32],
    content: [
      { text: input.titulo, style: 'title' },
      { text: input.subtitulo, style: 'subtitle' },
      {
        columns: [
          [
            { text: `Tombo: ${input.patrimonio.tombo}`, margin: [0, 0, 0, 4] },
            { text: `Item: ${input.patrimonio.item}`, margin: [0, 0, 0, 4] },
            {
              text: `Secretaria: ${input.patrimonio.secretaria}`,
              margin: [0, 0, 0, 4],
            },
          ],
          [
            {
              text: `Responsavel: ${input.patrimonio.responsavel}`,
              margin: [0, 0, 0, 4],
            },
            {
              text: `Localizacao: ${input.patrimonio.localizacao}`,
              margin: [0, 0, 0, 4],
            },
            {
              text: `Status: ${input.patrimonio.status}`,
              margin: [0, 0, 0, 4],
            },
          ],
        ],
        columnGap: 24,
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: [78, '*', 90, 90, 82],
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
