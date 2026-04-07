import { api } from './api'
import type { ImportacaoPatrimonioResponse } from '../types/importacoes.types'

function extractFilename(contentDisposition?: string) {
  if (!contentDisposition) {
    return 'template-importacao-patrimonios.csv'
  }

  const match = contentDisposition.match(/filename="?(.*?)"?$/i)

  return match?.[1] ?? 'template-importacao-patrimonios.csv'
}

export const importacoesService = {
  async downloadPatrimoniosTemplate() {
    const response = await api.get('/importacoes/patrimonios/template', {
      responseType: 'blob',
    })

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers['content-disposition']),
    }
  },

  async importPatrimonios(file: File) {
    const formData = new FormData()

    formData.append('file', file)

    const response = await api.post<ImportacaoPatrimonioResponse>(
      '/importacoes/patrimonios',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )

    return response.data
  },
}
