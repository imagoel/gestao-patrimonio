import { api } from "./api";
import type {
  RelatorioAuditoriaMovimentacaoFilters,
  RelatorioBaixaFilters,
  RelatorioMovimentacaoFilters,
  RelatorioPatrimonioFilters,
  RelatoriosOptionsResponse,
} from "../types/relatorios.types";

function resolveFilename(
  contentDisposition: string | undefined,
  fallback: string,
) {
  if (!contentDisposition) {
    return fallback;
  }

  const match = contentDisposition.match(/filename="([^"]+)"/i);

  return match?.[1] ?? fallback;
}

export const relatoriosService = {
  async findOptions() {
    const response = await api.get<RelatoriosOptionsResponse>(
      "/relatorios/options",
    );

    return response.data;
  },

  async downloadPatrimonio(filters: RelatorioPatrimonioFilters) {
    const response = await api.get<Blob>("/relatorios/patrimonio", {
      params: filters,
      responseType: "blob",
    });

    return {
      blob: response.data,
      filename: resolveFilename(
        response.headers["content-disposition"],
        "relatorio-patrimonio.pdf",
      ),
    };
  },

  async downloadBensPorLocalizacao(filters: RelatorioPatrimonioFilters) {
    const response = await api.get<Blob>("/relatorios/bens-por-localizacao", {
      params: filters,
      responseType: "blob",
    });

    return {
      blob: response.data,
      filename: resolveFilename(
        response.headers["content-disposition"],
        "relatorio-bens-por-localizacao.pdf",
      ),
    };
  },

  async downloadBensInativos(filters: RelatorioPatrimonioFilters) {
    const response = await api.get<Blob>("/relatorios/bens-inativos", {
      params: filters,
      responseType: "blob",
    });

    return {
      blob: response.data,
      filename: resolveFilename(
        response.headers["content-disposition"],
        "relatorio-bens-inativos.pdf",
      ),
    };
  },

  async downloadMovimentacoes(filters: RelatorioMovimentacaoFilters) {
    const response = await api.get<Blob>("/relatorios/movimentacoes", {
      params: filters,
      responseType: "blob",
    });

    return {
      blob: response.data,
      filename: resolveFilename(
        response.headers["content-disposition"],
        "relatorio-movimentacoes.pdf",
      ),
    };
  },

  async downloadMovimentacoesPendentes(filters: RelatorioMovimentacaoFilters) {
    const response = await api.get<Blob>(
      "/relatorios/movimentacoes-pendentes",
      {
        params: filters,
        responseType: "blob",
      },
    );

    return {
      blob: response.data,
      filename: resolveFilename(
        response.headers["content-disposition"],
        "relatorio-movimentacoes-pendentes.pdf",
      ),
    };
  },

  async downloadMovimentacoesConcluidas(filters: RelatorioMovimentacaoFilters) {
    const response = await api.get<Blob>(
      "/relatorios/movimentacoes-concluidas",
      {
        params: filters,
        responseType: "blob",
      },
    );

    return {
      blob: response.data,
      filename: resolveFilename(
        response.headers["content-disposition"],
        "relatorio-movimentacoes-concluidas.pdf",
      ),
    };
  },

  async downloadBaixas(filters: RelatorioBaixaFilters) {
    const response = await api.get<Blob>("/relatorios/baixas", {
      params: filters,
      responseType: "blob",
    });

    return {
      blob: response.data,
      filename: resolveFilename(
        response.headers["content-disposition"],
        "relatorio-baixas.pdf",
      ),
    };
  },

  async downloadAuditoriaMovimentacoes(
    filters: RelatorioAuditoriaMovimentacaoFilters,
  ) {
    const response = await api.get<Blob>(
      "/relatorios/auditoria-movimentacoes",
      {
        params: filters,
        responseType: "blob",
      },
    );

    return {
      blob: response.data,
      filename: resolveFilename(
        response.headers["content-disposition"],
        "relatorio-auditoria-movimentacoes.pdf",
      ),
    };
  },

  async downloadHistoricoPatrimonio(patrimonioId: string) {
    const response = await api.get<Blob>(
      `/relatorios/patrimonios/${patrimonioId}/historico`,
      {
        responseType: "blob",
      },
    );

    return {
      blob: response.data,
      filename: resolveFilename(
        response.headers["content-disposition"],
        "relatorio-historico-patrimonio.pdf",
      ),
    };
  },
};
