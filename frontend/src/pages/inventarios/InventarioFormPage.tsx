import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
} from 'antd'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { usePermissao } from '../../hooks/usePermissao'
import { inventariosService } from '../../services/inventarios.service'
import { Perfil } from '../../types/enums'
import type { CreateInventarioValues } from '../../types/inventarios.types'

export function InventarioFormPage() {
  const [form] = Form.useForm<CreateInventarioValues>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()
  const canManage = hasPerfil(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)

  const optionsQuery = useQuery({
    queryKey: ['inventarios-options'],
    queryFn: inventariosService.findOptions,
    enabled: canManage,
  })

  const mutation = useMutation({
    mutationFn: inventariosService.create,
    onSuccess: async (result) => {
      message.success('Inventario aberto com sucesso.')
      await queryClient.invalidateQueries({ queryKey: ['inventarios-list'] })
      navigate(`/inventarios/${result.id}`, { replace: true })
    },
    onError: () => {
      message.error('Nao foi possivel abrir o inventario.')
    },
  })

  if (!canManage) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label="Novo inventario">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title="Abrir inventario periodico"
          description="Este recorte cria um inventario por secretaria e gera o snapshot dos bens ativos ou em manutencao existentes naquele momento."
        />

        <Card loading={optionsQuery.isLoading}>
          <Form<CreateInventarioValues>
            form={form}
            layout="vertical"
            onFinish={(values) => {
              void mutation.mutateAsync(values)
            }}
          >
            <Form.Item
              label="Titulo"
              name="titulo"
              rules={[
                { required: true, message: 'Informe o titulo do inventario.' },
                {
                  min: 3,
                  message: 'O titulo deve ter ao menos 3 caracteres.',
                },
              ]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item
              label="Secretaria"
              name="secretariaId"
              rules={[{ required: true, message: 'Selecione a secretaria.' }]}
            >
              <Select
                size="large"
                options={(optionsQuery.data?.secretarias ?? []).map((secretaria) => ({
                  label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                  value: secretaria.id,
                }))}
              />
            </Form.Item>

            <Form.Item label="Observacoes" name="observacoes">
              <Input.TextArea rows={4} />
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                Abrir inventario
              </Button>
              <Button onClick={() => navigate('/inventarios')}>Cancelar</Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </AppLayout>
  )
}
