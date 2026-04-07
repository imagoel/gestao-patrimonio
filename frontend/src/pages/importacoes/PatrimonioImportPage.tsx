import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  Divider,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
  Upload,
} from 'antd'
import type { UploadFile } from 'antd'
import type { AxiosError } from 'axios'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { usePermissao } from '../../hooks/usePermissao'
import { importacoesService } from '../../services/importacoes.service'
import { patrimonioService } from '../../services/patrimonio.service'
import { Perfil, StatusItem } from '../../types/enums'
import type {
  ImportacaoPatrimonioErro,
  ImportacaoPatrimonioResponse,
} from '../../types/importacoes.types'
import { formatDateTime } from '../../utils/formatters'

const { Dragger } = Upload
const { Paragraph, Text } = Typography

const TEMPLATE_COLUMNS = [
  'item',
  'tombo',
  'secretariaSigla',
  'localizacaoAtual',
  'responsavelNome',
  'responsavelSetor',
  'estadoConservacao',
  'status',
  'fornecedorNome',
  'tipoEntrada',
  'valorOriginal',
  'valorAtual',
  'descricao',
  'dataAquisicao',
  'observacoes',
]

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function resolveImportErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string | string[] }>
  const payload = axiosError.response?.data

  if (Array.isArray(payload?.message)) {
    return payload.message.join(' | ')
  }

  if (typeof payload?.message === 'string') {
    return payload.message
  }

  return 'Nao foi possivel concluir a importacao da planilha.'
}

export function PatrimonioImportPage() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const queryClient = useQueryClient()
  const { hasPerfil } = usePermissao()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [result, setResult] = useState<ImportacaoPatrimonioResponse | null>(null)
  const canManage = hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)

  const optionsQuery = useQuery({
    queryKey: ['patrimonio-options'],
    queryFn: patrimonioService.findOptions,
    enabled: canManage,
  })

  const templateMutation = useMutation({
    mutationFn: importacoesService.downloadPatrimoniosTemplate,
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename)
      message.success('Template CSV baixado com sucesso.')
    },
    onError: () => {
      message.error('Nao foi possivel baixar o template da importacao.')
    },
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('Selecione um arquivo CSV antes de importar.')
      }

      return importacoesService.importPatrimonios(selectedFile)
    },
    onSuccess: async (response) => {
      setResult(response)
      message.success(
        `Importacao concluida: ${response.importados} linha(s) importada(s).`,
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patrimonios-list'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      ])
    },
    onError: (error) => {
      message.error(resolveImportErrorMessage(error))
    },
  })

  const importErrorColumns = useMemo(
    () => [
      {
        title: 'Linha',
        dataIndex: 'linha',
        key: 'linha',
      },
      {
        title: 'Item',
        key: 'item',
        render: (record: ImportacaoPatrimonioErro) => record.item ?? '--',
      },
      {
        title: 'Tombo',
        key: 'tombo',
        render: (record: ImportacaoPatrimonioErro) => record.tombo ?? '--',
      },
      {
        title: 'Falha',
        dataIndex: 'mensagem',
        key: 'mensagem',
      },
    ],
    [],
  )

  if (!canManage) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Importacao por planilha">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Importacao inicial de patrimonio por CSV"
          description="Primeiro recorte da importacao por planilha na Fase 3. O arquivo cria patrimonios linha a linha usando as mesmas validacoes, historico e auditoria do cadastro manual."
          actions={
            <Space wrap>
              <Button
                loading={templateMutation.isPending}
                onClick={() => {
                  void templateMutation.mutateAsync()
                }}
              >
                Baixar template CSV
              </Button>
              <Button onClick={() => navigate('/patrimonios')}>
                Voltar para patrimonios
              </Button>
            </Space>
          }
        />

        <Card title="Formato esperado">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph style={{ margin: 0 }}>
              Use arquivos <Text strong>.csv</Text> com separador{' '}
              <Text code>;</Text> ou <Text code>,</Text>. O template ja vem
              pronto com o cabecalho e uma linha de exemplo.
            </Paragraph>
            <Space wrap size={[8, 8]}>
              {TEMPLATE_COLUMNS.map((column) => (
                <StatusBadge key={column} color="blue">
                  {column}
                </StatusBadge>
              ))}
            </Space>
            <Alert
              type="info"
              showIcon
              message="Regras importantes"
              description={
                <Space direction="vertical" size="small">
                  <Text>O tombo deve ter exatamente 5 digitos e ser unico.</Text>
                  <Text>
                    secretariaSigla precisa apontar para uma secretaria ativa.
                  </Text>
                  <Text>
                    responsavelNome e responsavelSetor devem bater com um
                    responsavel existente da mesma secretaria.
                  </Text>
                  <Text>
                    fornecedorNome e opcional, mas quando informado precisa
                    existir no cadastro.
                  </Text>
                  <Text>
                    status aceita apenas {StatusItem.ATIVO}, {StatusItem.INATIVO}{' '}
                    e {StatusItem.EM_MANUTENCAO}.
                  </Text>
                  <Text>
                    dataAquisicao aceita <Text code>YYYY-MM-DD</Text> ou{' '}
                    <Text code>DD/MM/YYYY</Text>.
                  </Text>
                </Space>
              }
            />
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card title="Enviar arquivo CSV">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Dragger
                  accept=".csv,text/csv"
                  beforeUpload={(file) => {
                    setSelectedFile(file)
                    setFileList([
                      {
                        uid: file.uid,
                        name: file.name,
                        status: 'done',
                      },
                    ])
                    return false
                  }}
                  fileList={fileList}
                  maxCount={1}
                  onRemove={() => {
                    setSelectedFile(null)
                    setFileList([])
                  }}
                >
                  <p style={{ marginBottom: 8 }}>
                    Arraste o arquivo CSV aqui ou clique para selecionar
                  </p>
                  <p style={{ margin: 0, color: '#48616b' }}>
                    O processamento e parcial: linhas validas entram, linhas com
                    erro voltam no resumo.
                  </p>
                </Dragger>

                <Space wrap>
                  <Button
                    type="primary"
                    loading={importMutation.isPending}
                    onClick={() => {
                      void importMutation.mutateAsync()
                    }}
                  >
                    Importar planilha
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedFile(null)
                      setFileList([])
                      setResult(null)
                    }}
                  >
                    Limpar
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>

          <Col xs={24} xl={10}>
            <Card title="Valores aceitos" loading={optionsQuery.isLoading}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Secretarias ativas</Text>
                  <Divider style={{ margin: '8px 0 12px' }} />
                  <Space wrap size={[8, 8]}>
                    {(optionsQuery.data?.secretarias ?? []).map((secretaria) => (
                      <StatusBadge key={secretaria.id} color="geekblue">
                        {secretaria.sigla}
                      </StatusBadge>
                    ))}
                  </Space>
                </div>

                <div>
                  <Text strong>Estados de conservacao</Text>
                  <Divider style={{ margin: '8px 0 12px' }} />
                  <Space wrap size={[8, 8]}>
                    {(optionsQuery.data?.estadosConservacao ?? []).map((item) => (
                      <StatusBadge key={item}>{item}</StatusBadge>
                    ))}
                  </Space>
                </div>

                <div>
                  <Text strong>Tipos de entrada</Text>
                  <Divider style={{ margin: '8px 0 12px' }} />
                  <Space wrap size={[8, 8]}>
                    {(optionsQuery.data?.tiposEntrada ?? []).map((item) => (
                      <StatusBadge key={item} color="purple">
                        {item}
                      </StatusBadge>
                    ))}
                  </Space>
                </div>

                <Paragraph type="secondary" style={{ margin: 0 }}>
                  Responsavel e fornecedor sao resolvidos pelos nomes ja
                  cadastrados. Se houver ambiguidade, a linha volta como falha.
                </Paragraph>
              </Space>
            </Card>
          </Col>
        </Row>

        {result ? (
          <Card title="Resultado da importacao">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Paragraph type="secondary" style={{ margin: 0 }}>
                Arquivo <Text strong>{result.arquivo}</Text> processado em{' '}
                {formatDateTime(result.processadoEm)}
              </Paragraph>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Card>
                    <Statistic title="Linhas lidas" value={result.totalLinhas} />
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card>
                    <Statistic title="Importadas" value={result.importados} />
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card>
                    <Statistic title="Falhas" value={result.falhas} />
                  </Card>
                </Col>
              </Row>

              {result.erros.length ? (
                <Table
                  rowKey={(record) =>
                    `${record.linha}-${record.tombo ?? record.item ?? 'erro'}`
                  }
                  dataSource={result.erros}
                  columns={importErrorColumns}
                  pagination={false}
                  size="small"
                />
              ) : (
                <Alert
                  type="success"
                  showIcon
                  message="Todas as linhas foram importadas com sucesso."
                />
              )}
            </Space>
          </Card>
        ) : null}
      </Space>
    </AppLayout>
  )
}
