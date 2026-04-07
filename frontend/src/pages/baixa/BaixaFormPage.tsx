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
import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { usePermissao } from '../../hooks/usePermissao'
import { baixaService } from '../../services/baixa.service'
import { MotivoBaixa, Perfil } from '../../types/enums'
import type { BaixaFormValues } from '../../types/baixa.types'

export function BaixaFormPage() {
  const [form] = Form.useForm<BaixaFormValues>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()
  const watchedPatrimonioId = Form.useWatch('patrimonioId', form)

  const optionsQuery = useQuery({
    queryKey: ['baixas-options'],
    queryFn: baixaService.findOptions,
  })

  const selectedPatrimonio = useMemo(
    () =>
      (optionsQuery.data?.patrimonios ?? []).find(
        (patrimonio) => patrimonio.id === watchedPatrimonioId,
      ) ?? null,
    [optionsQuery.data?.patrimonios, watchedPatrimonioId],
  )

  const mutation = useMutation({
    mutationFn: (values: BaixaFormValues) => baixaService.create(values),
    onSuccess: async () => {
      message.success('Baixa patrimonial registrada com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['baixas-list'] })
      await queryClient.invalidateQueries({ queryKey: ['baixas-options'] })
      await queryClient.invalidateQueries({ queryKey: ['patrimonios-list'] })
      await queryClient.invalidateQueries({ queryKey: ['patrimonios-options'] })
      navigate('/baixas', { replace: true })
    },
    onError: () => {
      message.error('Nao foi possivel registrar a baixa patrimonial.')
    },
  })

  if (!hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Nova baixa patrimonial">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Registrar baixa patrimonial"
          description="A baixa exige motivo e retira o item de circulacao de forma definitiva nesta fase."
        />

        <Card loading={optionsQuery.isLoading}>
          <Form<BaixaFormValues>
            form={form}
            layout="vertical"
            onFinish={(values) => {
              void mutation.mutateAsync({
                ...values,
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
                <Descriptions title="Dados atuais do patrimonio" column={1} bordered size="small">
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
                  <Descriptions.Item label="Status atual">
                    {selectedPatrimonio.status}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ) : null}

            <Form.Item
              label="Motivo da baixa"
              name="motivo"
              rules={[{ required: true, message: 'Selecione o motivo da baixa.' }]}
            >
              <Select
                size="large"
                options={(optionsQuery.data?.motivos ?? Object.values(MotivoBaixa)).map(
                  (motivo) => ({
                    label: motivo,
                    value: motivo,
                  }),
                )}
              />
            </Form.Item>

            <Form.Item label="Observacoes" name="observacoes">
              <Input.TextArea rows={4} />
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                Registrar baixa
              </Button>
              <Button onClick={() => navigate('/baixas')}>Cancelar</Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </AppLayout>
  )
}
