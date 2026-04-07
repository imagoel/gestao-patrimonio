import { useMutation, useQuery } from '@tanstack/react-query'
import { App as AntdApp, Button, Card, Input, Select, Space } from 'antd'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { usePermissao } from '../../hooks/usePermissao'
import { relatoriosService } from '../../services/relatorios.service'
import { MotivoBaixa, Perfil, StatusItem, StatusMovimentacao } from '../../types/enums'

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

export function RelatoriosPage() {
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()
  const canAccess = hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  const [patrimonioSecretariaId, setPatrimonioSecretariaId] = useState<
    string | undefined
  >(undefined)
  const [patrimonioResponsavelId, setPatrimonioResponsavelId] = useState<
    string | undefined
  >(undefined)
  const [patrimonioStatus, setPatrimonioStatus] = useState<StatusItem | undefined>(
    undefined,
  )
  const [patrimonioLocalizacao, setPatrimonioLocalizacao] = useState('')
  const [movimentacaoSecretariaId, setMovimentacaoSecretariaId] = useState<
    string | undefined
  >(undefined)
  const [movimentacaoStatus, setMovimentacaoStatus] = useState<
    StatusMovimentacao | undefined
  >(undefined)
  const [baixaSecretariaId, setBaixaSecretariaId] = useState<string | undefined>(
    undefined,
  )
  const [baixaMotivo, setBaixaMotivo] = useState<MotivoBaixa | undefined>(
    undefined,
  )
  const [auditoriaAcao, setAuditoriaAcao] = useState<string | undefined>(undefined)
  const [auditoriaUsuarioId, setAuditoriaUsuarioId] = useState<
    string | undefined
  >(undefined)
  const [auditoriaPatrimonioId, setAuditoriaPatrimonioId] = useState<
    string | undefined
  >(undefined)
  const [historicoPatrimonioId, setHistoricoPatrimonioId] = useState<
    string | undefined
  >(undefined)

  const optionsQuery = useQuery({
    queryKey: ['relatorios-options'],
    queryFn: relatoriosService.findOptions,
    enabled: canAccess,
  })

  const patrimonioMutation = useMutation({
    mutationFn: () =>
      relatoriosService.downloadPatrimonio({
        secretariaAtualId: patrimonioSecretariaId,
        responsavelAtualId: patrimonioResponsavelId,
        status: patrimonioStatus,
        localizacaoAtual: patrimonioLocalizacao.trim() || undefined,
      }),
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename)
      message.success('Relatorio de patrimonio gerado com sucesso.')
    },
    onError: () => {
      message.error('Nao foi possivel gerar o relatorio de patrimonio.')
    },
  })

  const movimentacaoMutation = useMutation({
    mutationFn: () =>
      relatoriosService.downloadMovimentacoes({
        secretariaId: movimentacaoSecretariaId,
        status: movimentacaoStatus,
      }),
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename)
      message.success('Relatorio de movimentacoes gerado com sucesso.')
    },
    onError: () => {
      message.error('Nao foi possivel gerar o relatorio de movimentacoes.')
    },
  })

  const baixaMutation = useMutation({
    mutationFn: () =>
      relatoriosService.downloadBaixas({
        secretariaId: baixaSecretariaId,
        motivo: baixaMotivo,
      }),
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename)
      message.success('Relatorio de baixas gerado com sucesso.')
    },
    onError: () => {
      message.error('Nao foi possivel gerar o relatorio de baixas.')
    },
  })

  const historicoMutation = useMutation({
    mutationFn: async () => {
      if (!historicoPatrimonioId) {
        throw new Error('Selecione um patrimonio')
      }

      return relatoriosService.downloadHistoricoPatrimonio(historicoPatrimonioId)
    },
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename)
      message.success('Relatorio de historico gerado com sucesso.')
    },
    onError: () => {
      message.error('Nao foi possivel gerar o relatorio de historico.')
    },
  })

  const auditoriaMutation = useMutation({
    mutationFn: () =>
      relatoriosService.downloadAuditoriaMovimentacoes({
        acao: auditoriaAcao,
        usuarioId: auditoriaUsuarioId,
        patrimonioId: auditoriaPatrimonioId,
      }),
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename)
      message.success('Relatorio de auditoria de movimentacoes gerado com sucesso.')
    },
    onError: () => {
      message.error(
        'Nao foi possivel gerar o relatorio de auditoria de movimentacoes.',
      )
    },
  })

  if (!canAccess) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Modulo de relatorios">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Relatorios em PDF"
          description="Emissao inicial de relatorios PDF para patrimonio, movimentacoes, baixas e historico de item, conforme a Fase 2."
        />

        <Card title="Relatorio de patrimonio">
          <Space wrap size={[12, 12]}>
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Secretaria"
              style={{ width: 240 }}
              value={patrimonioSecretariaId}
              onChange={setPatrimonioSecretariaId}
              options={(optionsQuery.data?.secretarias ?? []).map((secretaria) => ({
                label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                value: secretaria.id,
              }))}
            />
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Responsavel"
              style={{ width: 280 }}
              value={patrimonioResponsavelId}
              onChange={setPatrimonioResponsavelId}
              options={(optionsQuery.data?.responsaveis ?? []).map((responsavel) => ({
                label: `${responsavel.nome} - ${responsavel.setor}`,
                value: responsavel.id,
              }))}
            />
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 220 }}
              value={patrimonioStatus}
              onChange={setPatrimonioStatus}
              options={(
                optionsQuery.data?.statusPatrimonio ?? Object.values(StatusItem)
              ).map((item) => ({
                label: item,
                value: item,
              }))}
            />
            <Input
              allowClear
              placeholder="Localizacao contendo"
              style={{ width: 260 }}
              value={patrimonioLocalizacao}
              onChange={(event) => {
                setPatrimonioLocalizacao(event.target.value)
              }}
            />
            <Button
              type="primary"
              loading={patrimonioMutation.isPending}
              onClick={() => {
                void patrimonioMutation.mutateAsync()
              }}
            >
              Gerar PDF
            </Button>
          </Space>
        </Card>

        <Card title="Relatorio de movimentacoes">
          <Space wrap size={[12, 12]}>
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Secretaria"
              style={{ width: 240 }}
              value={movimentacaoSecretariaId}
              onChange={setMovimentacaoSecretariaId}
              options={(optionsQuery.data?.secretarias ?? []).map((secretaria) => ({
                label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                value: secretaria.id,
              }))}
            />
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 280 }}
              value={movimentacaoStatus}
              onChange={setMovimentacaoStatus}
              options={(
                optionsQuery.data?.statusMovimentacao ??
                Object.values(StatusMovimentacao)
              ).map((item) => ({
                label: item,
                value: item,
              }))}
            />
            <Button
              type="primary"
              loading={movimentacaoMutation.isPending}
              onClick={() => {
                void movimentacaoMutation.mutateAsync()
              }}
            >
              Gerar PDF
            </Button>
          </Space>
        </Card>

        <Card title="Relatorio de baixas">
          <Space wrap size={[12, 12]}>
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Secretaria"
              style={{ width: 240 }}
              value={baixaSecretariaId}
              onChange={setBaixaSecretariaId}
              options={(optionsQuery.data?.secretarias ?? []).map((secretaria) => ({
                label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                value: secretaria.id,
              }))}
            />
            <Select
              allowClear
              placeholder="Motivo"
              style={{ width: 240 }}
              value={baixaMotivo}
              onChange={setBaixaMotivo}
              options={(
                optionsQuery.data?.motivosBaixa ?? Object.values(MotivoBaixa)
              ).map((item) => ({
                label: item,
                value: item,
              }))}
            />
            <Button
              type="primary"
              loading={baixaMutation.isPending}
              onClick={() => {
                void baixaMutation.mutateAsync()
              }}
            >
              Gerar PDF
            </Button>
          </Space>
        </Card>

        <Card title="Relatorio de auditoria de movimentacoes">
          <Space wrap size={[12, 12]}>
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Acao"
              style={{ width: 260 }}
              value={auditoriaAcao}
              onChange={setAuditoriaAcao}
              options={(
                optionsQuery.data?.acoesAuditoriaMovimentacao ?? []
              ).map((item) => ({
                label: item,
                value: item,
              }))}
            />
            <Select
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Usuario"
              style={{ width: 280 }}
              value={auditoriaUsuarioId}
              onChange={setAuditoriaUsuarioId}
              options={(optionsQuery.data?.usuariosAuditoriaMovimentacao ?? []).map(
                (usuario) => ({
                  label: `${usuario.nome} - ${usuario.email}`,
                  value: usuario.id,
                }),
              )}
            />
            <Select
              showSearch
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Patrimonio"
              style={{ width: 380 }}
              value={auditoriaPatrimonioId}
              onChange={setAuditoriaPatrimonioId}
              options={(optionsQuery.data?.patrimonios ?? []).map((patrimonio) => ({
                label: `${patrimonio.tombo} - ${patrimonio.item} - ${patrimonio.status}`,
                value: patrimonio.id,
              }))}
              optionFilterProp="label"
            />
            <Button
              type="primary"
              loading={auditoriaMutation.isPending}
              onClick={() => {
                void auditoriaMutation.mutateAsync()
              }}
            >
              Gerar PDF
            </Button>
          </Space>
        </Card>

        <Card title="Historico de um patrimonio">
          <Space wrap size={[12, 12]}>
            <Select
              showSearch
              allowClear
              loading={optionsQuery.isLoading}
              placeholder="Selecione um patrimonio"
              style={{ width: 380 }}
              value={historicoPatrimonioId}
              onChange={setHistoricoPatrimonioId}
              options={(optionsQuery.data?.patrimonios ?? []).map((patrimonio) => ({
                label: `${patrimonio.tombo} - ${patrimonio.item} - ${patrimonio.status}`,
                value: patrimonio.id,
              }))}
              optionFilterProp="label"
            />
            <Button
              type="primary"
              disabled={!historicoPatrimonioId}
              loading={historicoMutation.isPending}
              onClick={() => {
                void historicoMutation.mutateAsync()
              }}
            >
              Gerar PDF
            </Button>
          </Space>
        </Card>
      </Space>
    </AppLayout>
  )
}
