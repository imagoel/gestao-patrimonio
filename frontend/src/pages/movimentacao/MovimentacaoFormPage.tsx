import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Select,
  Space,
} from 'antd'
import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { usePermissao } from '../../hooks/usePermissao'
import { movimentacaoService } from '../../services/movimentacao.service'
import { Perfil } from '../../types/enums'
import type { MovimentacaoFormValues } from '../../types/movimentacao.types'

export function MovimentacaoFormPage() {
  const [form] = Form.useForm<MovimentacaoFormValues>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()
  const watchedPatrimonioId = Form.useWatch('patrimonioId', form)
  const watchedSecretariaDestinoId = Form.useWatch('secretariaDestinoId', form)

  const optionsQuery = useQuery({
    queryKey: ['movimentacoes-options'],
    queryFn: movimentacaoService.findOptions,
  })

  const selectedPatrimonio = useMemo(
    () =>
      (optionsQuery.data?.patrimonios ?? []).find(
        (patrimonio) => patrimonio.id === watchedPatrimonioId,
      ) ?? null,
    [optionsQuery.data?.patrimonios, watchedPatrimonioId],
  )

  const filteredResponsaveis = useMemo(
    () =>
      (optionsQuery.data?.responsaveis ?? []).filter(
        (responsavel) =>
          !watchedSecretariaDestinoId ||
          responsavel.secretariaId === watchedSecretariaDestinoId,
      ),
    [optionsQuery.data?.responsaveis, watchedSecretariaDestinoId],
  )

  const requireDestinoResponsavel =
    Boolean(selectedPatrimonio) &&
    Boolean(watchedSecretariaDestinoId) &&
    watchedSecretariaDestinoId !== selectedPatrimonio?.secretariaAtualId

  useEffect(() => {
    const currentResponsavelDestinoId = form.getFieldValue('responsavelDestinoId')

    if (
      currentResponsavelDestinoId &&
      !filteredResponsaveis.some(
        (responsavel) => responsavel.id === currentResponsavelDestinoId,
      )
    ) {
      form.setFieldValue('responsavelDestinoId', undefined)
    }
  }, [filteredResponsaveis, form])

  const mutation = useMutation({
    mutationFn: (values: MovimentacaoFormValues) => movimentacaoService.create(values),
    onSuccess: async (movimentacao) => {
      message.success('Movimentacao criada com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes-list'] })
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes-options'] })
      await queryClient.invalidateQueries({ queryKey: ['patrimonios-list'] })
      await queryClient.invalidateQueries({ queryKey: ['patrimonios-options'] })
      navigate(`/movimentacoes/${movimentacao.id}`, { replace: true })
    },
    onError: () => {
      message.error('Nao foi possivel criar a movimentacao.')
    },
  })

  if (
    !hasPerfil(
      Perfil.ADMINISTRADOR,
      Perfil.TECNICO_PATRIMONIO,
      Perfil.CHEFE_SETOR,
    )
  ) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Nova movimentacao">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Solicitar movimentacao"
          description="A origem e lida automaticamente do patrimonio atual. Nesta etapa, a movimentacao segue para entrega, recebimento e validacao final."
        />

        <Card loading={optionsQuery.isLoading}>
          <Form<MovimentacaoFormValues>
            form={form}
            layout="vertical"
            onFinish={(values) => {
              void mutation.mutateAsync({
                ...values,
                responsavelDestinoId: values.responsavelDestinoId || null,
                observacoes: values.observacoes || null,
              })
            }}
          >
            <Form.Item
              label="Patrimonio"
              name="patrimonioId"
              rules={[{ required: true, message: 'Selecione o patrimonio.' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                size="large"
                options={(optionsQuery.data?.patrimonios ?? []).map((patrimonio) => ({
                  label: `${patrimonio.tombo} - ${patrimonio.item} - ${patrimonio.secretariaAtual.sigla}`,
                  value: patrimonio.id,
                }))}
              />
            </Form.Item>

            {selectedPatrimonio ? (
              <Card size="small" style={{ marginBottom: 24 }}>
                <Descriptions title="Origem atual" column={1} bordered size="small">
                  <Descriptions.Item label="Tombo">
                    {selectedPatrimonio.tombo}
                  </Descriptions.Item>
                  <Descriptions.Item label="Item">
                    {selectedPatrimonio.item}
                  </Descriptions.Item>
                  <Descriptions.Item label="Secretaria">
                    {selectedPatrimonio.secretariaAtual.sigla} -{' '}
                    {selectedPatrimonio.secretariaAtual.nomeCompleto}
                  </Descriptions.Item>
                  <Descriptions.Item label="Responsavel">
                    {selectedPatrimonio.responsavelAtual.nome} -{' '}
                    {selectedPatrimonio.responsavelAtual.setor}
                  </Descriptions.Item>
                  <Descriptions.Item label="Localizacao">
                    {selectedPatrimonio.localizacaoAtual}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ) : null}

            <Form.Item
              label="Secretaria de destino"
              name="secretariaDestinoId"
              rules={[
                { required: true, message: 'Selecione a secretaria de destino.' },
              ]}
            >
              <Select
                size="large"
                options={(optionsQuery.data?.secretarias ?? []).map((secretaria) => ({
                  label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                  value: secretaria.id,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Responsavel de destino"
              name="responsavelDestinoId"
              rules={
                requireDestinoResponsavel
                  ? [
                      {
                        required: true,
                        message:
                          'Selecione o responsavel de destino quando houver mudanca de secretaria.',
                      },
                    ]
                  : []
              }
              extra={
                requireDestinoResponsavel
                  ? 'Obrigatorio quando a secretaria de destino for diferente da atual.'
                  : 'Pode ficar vazio quando o responsavel atual continuar valido.'
              }
            >
              <Select
                allowClear
                size="large"
                options={filteredResponsaveis.map((responsavel) => ({
                  label: `${responsavel.nome} - ${responsavel.setor}`,
                  value: responsavel.id,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Localizacao de destino"
              name="localizacaoDestino"
              rules={[
                { required: true, message: 'Informe a localizacao de destino.' },
                {
                  min: 2,
                  message:
                    'A localizacao de destino deve ter ao menos 2 caracteres.',
                },
              ]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item
              label="Motivo"
              name="motivo"
              rules={[
                { required: true, message: 'Informe o motivo da movimentacao.' },
                { min: 5, message: 'O motivo deve ter ao menos 5 caracteres.' },
              ]}
            >
              <Input.TextArea rows={4} />
            </Form.Item>

            <Form.Item label="Observacoes" name="observacoes">
              <Input.TextArea rows={4} />
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                Criar movimentacao
              </Button>
              <Button onClick={() => navigate('/movimentacoes')}>Cancelar</Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </AppLayout>
  )
}
