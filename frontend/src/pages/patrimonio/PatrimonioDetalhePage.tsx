import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Space,
  Table,
} from 'antd'
import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { CopyToClipboard } from '../../components/shared/CopyToClipboard'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { createTableLocale } from '../../components/shared/TableEmpty'
import { usePermissao } from '../../hooks/usePermissao'
import { patrimonioService } from '../../services/patrimonio.service'
import { Perfil, StatusItem } from '../../types/enums'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatItemStatus,
  formatTipoEntrada,
} from '../../utils/formatters'
import type { PatrimonioHistoricoItem } from '../../types/patrimonio.types'

function getStatusColor(status: StatusItem) {
  switch (status) {
    case StatusItem.ATIVO:
      return 'green'
    case StatusItem.INATIVO:
      return 'red'
    case StatusItem.EM_MANUTENCAO:
      return 'orange'
    case StatusItem.EM_MOVIMENTACAO:
      return 'gold'
    case StatusItem.BAIXADO:
      return 'default'
    default:
      return 'blue'
  }
}

function buildHistoricoReferencia(item: PatrimonioHistoricoItem) {
  if (item.movimentacao) {
    return `Movimentacao ${item.movimentacao.status}`
  }

  if (item.baixaPatrimonial) {
    return `Baixa ${item.baixaPatrimonial.motivo}`
  }

  return 'Atualizacao direta'
}

export function PatrimonioDetalhePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { id } = useParams()
  const { hasPerfil } = usePermissao()
  const canManage = hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)

  const patrimonioQuery = useQuery({
    queryKey: ['patrimonio-detail', id],
    queryFn: () => patrimonioService.findOne(id as string),
    enabled: Boolean(id),
  })

  const historicoQuery = useQuery({
    queryKey: ['patrimonio-history', id],
    queryFn: () => patrimonioService.findHistorico(id as string),
    enabled: Boolean(id),
  })

  const avaliacaoQuery = useQuery({
    queryKey: ['patrimonio-avaliacao-valor-atual', id],
    queryFn: () => patrimonioService.findAvaliacaoValorAtual(id as string),
    enabled: Boolean(id),
  })

  const aplicarEstimativaMutation = useMutation({
    mutationFn: () => patrimonioService.aplicarValorEstimado(id as string),
    onSuccess: async () => {
      message.success('Estimativa de valor atual aplicada com sucesso.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patrimonio-detail', id] }),
        queryClient.invalidateQueries({
          queryKey: ['patrimonio-avaliacao-valor-atual', id],
        }),
        queryClient.invalidateQueries({ queryKey: ['patrimonio-history', id] }),
        queryClient.invalidateQueries({ queryKey: ['patrimonios-list'] }),
      ])
    },
    onError: () => {
      message.error('Nao foi possivel aplicar a estimativa de valor atual.')
    },
  })

  const historicoColumns = useMemo(
    () => [
      {
        title: 'Evento',
        dataIndex: 'evento',
        key: 'evento',
        render: (value: string) => <StatusBadge color="blue">{value}</StatusBadge>,
      },
      {
        title: 'Descricao',
        dataIndex: 'descricao',
        key: 'descricao',
      },
      {
        title: 'Usuario',
        key: 'usuario',
        render: (record: PatrimonioHistoricoItem) =>
          record.usuario?.nome ?? 'Sistema',
      },
      {
        title: 'Referencia',
        key: 'referencia',
        render: (record: PatrimonioHistoricoItem) =>
          buildHistoricoReferencia(record),
      },
      {
        title: 'Registrado em',
        dataIndex: 'criadoEm',
        key: 'criadoEm',
        render: (value: string) => formatDateTime(value),
      },
    ],
    [],
  )

  if (
    !hasPerfil(
      Perfil.ADMINISTRADOR,
      Perfil.TECNICO_PATRIMONIO,
      Perfil.CHEFE_SETOR,
      Perfil.USUARIO_CONSULTA,
    )
  ) {
    return <Navigate to="/403" replace />
  }

  const patrimonio = patrimonioQuery.data

  return (
    <AppLayout label="Detalhe do patrimonio">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title={`Patrimonio ${patrimonio ? `${patrimonio.tombo} - ${patrimonio.item}` : '--'}`}
          description="Consulta consolidada do cadastro atual do bem e da sua trilha de historico no sistema."
          actions={
            <StatusBadge color={patrimonio ? getStatusColor(patrimonio.status) : 'blue'}>
              {patrimonio ? formatItemStatus(patrimonio.status) : 'Carregando'}
            </StatusBadge>
          }
        />

        {patrimonioQuery.isError ? (
          <Alert
            showIcon
            type="error"
            message="Nao foi possivel carregar os dados principais do patrimonio."
          />
        ) : null}

        {historicoQuery.isError ? (
          <Alert
            showIcon
            type="warning"
            message="O cadastro do patrimonio foi carregado, mas o historico nao pode ser consultado agora."
          />
        ) : null}

        {avaliacaoQuery.isError ? (
          <Alert
            showIcon
            type="warning"
            message="Os dados de valor atual e depreciacao estao indisponiveis no momento."
          />
        ) : null}

        {patrimonio ? (
          <Space wrap size={[16, 16]}>
            <Card size="small" title="Status atual">
              <StatusBadge color={getStatusColor(patrimonio.status)}>
                {formatItemStatus(patrimonio.status)}
              </StatusBadge>
            </Card>
            <Card size="small" title="Secretaria atual">
              {patrimonio.secretariaAtual.sigla} - {patrimonio.secretariaAtual.nomeCompleto}
            </Card>
            <Card size="small" title="Localizacao atual">
              {patrimonio.localizacaoAtual}
            </Card>
            <Card size="small" title="Responsavel atual">
              {patrimonio.responsavelAtual.nome}
            </Card>
          </Space>
        ) : null}

        {patrimonio?.status === StatusItem.EM_MOVIMENTACAO ? (
          <Alert
            showIcon
            type="info"
            message="Este item esta em movimentacao."
            description="A secretaria, a localizacao e o responsavel so mudam oficialmente depois da validacao final da movimentacao."
          />
        ) : null}

        {patrimonio?.status === StatusItem.BAIXADO ? (
          <Alert
            showIcon
            type="warning"
            message="Este item foi baixado."
            description="Itens baixados permanecem consultaveis, mas nao devem voltar a circular sem regra administrativa especifica."
          />
        ) : null}

        <Card loading={patrimonioQuery.isLoading}>
          {patrimonio ? (
            <Descriptions title="Dados cadastrais" column={1} bordered>
              <Descriptions.Item label="Tombo">
                <CopyToClipboard text={patrimonio.tombo} />
              </Descriptions.Item>
              <Descriptions.Item label="Item">
                {patrimonio.item}
              </Descriptions.Item>
              <Descriptions.Item label="Secretaria atual">
                {patrimonio.secretariaAtual.sigla} -{' '}
                {patrimonio.secretariaAtual.nomeCompleto}
              </Descriptions.Item>
              <Descriptions.Item label="Responsavel atual">
                {patrimonio.responsavelAtual.nome} -{' '}
                {patrimonio.responsavelAtual.setor}
              </Descriptions.Item>
              <Descriptions.Item label="Localizacao atual">
                {patrimonio.localizacaoAtual}
              </Descriptions.Item>
              <Descriptions.Item label="Estado de conservacao">
                {patrimonio.estadoConservacao}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo de entrada">
                {formatTipoEntrada(patrimonio.tipoEntrada)}
              </Descriptions.Item>
              <Descriptions.Item label="Fornecedor">
                {patrimonio.fornecedor
                  ? `${patrimonio.fornecedor.nome}${
                      patrimonio.fornecedor.cpfCnpj
                        ? ` - ${patrimonio.fornecedor.cpfCnpj}`
                        : ''
                    }`
                  : 'Nao informado'}
              </Descriptions.Item>
              <Descriptions.Item label="Valor original">
                {formatCurrency(patrimonio.valorOriginal)}
              </Descriptions.Item>
              <Descriptions.Item label="Valor atual">
                {patrimonio.valorAtual
                  ? formatCurrency(patrimonio.valorAtual)
                  : 'Nao informado'}
              </Descriptions.Item>
              <Descriptions.Item label="Data de aquisicao">
                {patrimonio.dataAquisicao
                  ? formatDate(patrimonio.dataAquisicao)
                  : 'Nao informada'}
              </Descriptions.Item>
              <Descriptions.Item label="Descricao">
                {patrimonio.descricao ?? 'Nao informada'}
              </Descriptions.Item>
              <Descriptions.Item label="Observacoes">
                {patrimonio.observacoes ?? 'Nao informadas'}
              </Descriptions.Item>
              <Descriptions.Item label="Atualizado em">
                {formatDateTime(patrimonio.updatedAt)}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>

        <Card
          title="Valor atual e depreciacao"
          loading={avaliacaoQuery.isLoading}
          extra={
            canManage && avaliacaoQuery.data?.valorAtualSugerido ? (
              <Button
                loading={aplicarEstimativaMutation.isPending}
                onClick={() => {
                  void aplicarEstimativaMutation.mutateAsync()
                }}
              >
                Aplicar estimativa
              </Button>
            ) : null
          }
        >
          {avaliacaoQuery.data ? (
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Modo atual">
                <StatusBadge
                  color={avaliacaoQuery.data.modoAtual === 'MANUAL' ? 'blue' : 'green'}
                >
                  {avaliacaoQuery.data.modoAtual}
                </StatusBadge>
              </Descriptions.Item>
              <Descriptions.Item label="Valor em exibicao">
                {avaliacaoQuery.data.valorAtualExibicao
                  ? formatCurrency(avaliacaoQuery.data.valorAtualExibicao)
                  : 'Nao disponivel'}
              </Descriptions.Item>
              <Descriptions.Item label="Valor atual cadastrado">
                {avaliacaoQuery.data.valorAtualInformado
                  ? formatCurrency(avaliacaoQuery.data.valorAtualInformado)
                  : 'Nao informado'}
              </Descriptions.Item>
              <Descriptions.Item label="Estimativa do sistema">
                {avaliacaoQuery.data.valorAtualSugerido
                  ? formatCurrency(avaliacaoQuery.data.valorAtualSugerido)
                  : 'Estimativa indisponivel'}
              </Descriptions.Item>
              <Descriptions.Item label="Idade considerada">
                {avaliacaoQuery.data.idadeMeses === null
                  ? 'Nao calculada'
                  : `${avaliacaoQuery.data.idadeMeses} mes(es)`}
              </Descriptions.Item>
              <Descriptions.Item label="Percentual aplicado">
                {avaliacaoQuery.data.percentualAplicado === null
                  ? 'Nao calculado'
                  : `${avaliacaoQuery.data.percentualAplicado}%`}
              </Descriptions.Item>
              <Descriptions.Item label="Taxa anual provisoria">
                {avaliacaoQuery.data.taxaDepreciacaoAnualPercentual}%
              </Descriptions.Item>
              <Descriptions.Item label="Valor residual minimo">
                {avaliacaoQuery.data.valorResidualPercentual}%
              </Descriptions.Item>
              <Descriptions.Item label="Regra aplicada">
                {avaliacaoQuery.data.regra}
              </Descriptions.Item>
              <Descriptions.Item label="Observacao">
                {avaliacaoQuery.data.observacao}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>

        <Card
          title="Historico do item"
          extra={
            canManage && patrimonio ? (
              <Button onClick={() => navigate(`/patrimonios/${patrimonio.id}/editar`)}>
                Editar patrimonio
              </Button>
            ) : null
          }
          loading={historicoQuery.isLoading}
        >
          <Table
            rowKey="id"
            dataSource={historicoQuery.data ?? []}
            columns={historicoColumns}
            locale={createTableLocale({
              description: 'Nenhum evento de historico foi registrado para este patrimonio.',
            })}
            pagination={false}
          />
        </Card>

        <Space>
          <Button onClick={() => navigate('/patrimonios')}>Voltar</Button>
          {canManage ? (
            <Button onClick={() => navigate('/auditoria')}>Abrir auditoria</Button>
          ) : null}
        </Space>
      </Space>
    </AppLayout>
  )
}
