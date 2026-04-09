import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Switch,
} from 'antd'
import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { usePermissao } from '../../hooks/usePermissao'
import { responsaveisService } from '../../services/responsaveis.service'
import { secretariasService } from '../../services/secretarias.service'
import { Perfil } from '../../types/enums'
import type { ResponsavelFormValues } from '../../types/responsaveis.types'

export function ResponsavelFormPage() {
  const [form] = Form.useForm<ResponsavelFormValues>()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()

  const secretariasQuery = useQuery({
    queryKey: ['secretarias-options'],
    queryFn: secretariasService.findOptions,
  })

  const responsavelQuery = useQuery({
    queryKey: ['responsavel-detail', id],
    queryFn: () => responsaveisService.findOne(id as string),
    enabled: isEditing,
  })

  const mutation = useMutation({
    mutationFn: (values: ResponsavelFormValues) =>
      isEditing
        ? responsaveisService.update(id as string, values)
        : responsaveisService.create(values),
    onSuccess: async () => {
      message.success(
        isEditing
          ? 'Responsavel atualizado com sucesso.'
          : 'Responsavel criado com sucesso.',
      )
      await queryClient.invalidateQueries({ queryKey: ['responsaveis-list'] })
      await queryClient.invalidateQueries({ queryKey: ['responsaveis-options'] })
      navigate('/responsaveis', { replace: true })
    },
    onError: () => {
      message.error('Nao foi possivel salvar o responsavel.')
    },
  })

  useEffect(() => {
    if (responsavelQuery.data) {
      form.setFieldsValue({
        nome: responsavelQuery.data.nome,
        cargo: responsavelQuery.data.cargo,
        setor: responsavelQuery.data.setor,
        contato: responsavelQuery.data.contato,
        secretariaId: responsavelQuery.data.secretariaId,
        ativo: responsavelQuery.data.ativo,
      })
    }
  }, [form, responsavelQuery.data])

  if (!hasPerfil(Perfil.ADMINISTRADOR)) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label={isEditing ? 'Editar responsavel' : 'Novo responsavel'}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title={isEditing ? 'Editar responsavel' : 'Cadastrar responsavel'}
          description="Este cadastro permanece restrito ao perfil administrador."
        />

        <Card loading={responsavelQuery.isLoading || secretariasQuery.isLoading}>
          <Form<ResponsavelFormValues>
            form={form}
            layout="vertical"
            initialValues={{
              ativo: true,
            }}
            onFinish={(values) => {
              void mutation.mutateAsync(values)
            }}
          >
            <Form.Item
              label="Nome"
              name="nome"
              rules={[
                { required: true, message: 'Informe o nome.' },
                { min: 3, message: 'O nome deve ter ao menos 3 caracteres.' },
              ]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item label="Cargo ou funcao" name="cargo">
              <Input size="large" />
            </Form.Item>

            <Form.Item
              label="Setor"
              name="setor"
              rules={[
                { required: true, message: 'Informe o setor.' },
                { min: 2, message: 'O setor deve ter ao menos 2 caracteres.' },
              ]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item label="Contato" name="contato">
              <Input size="large" />
            </Form.Item>

            <Form.Item
              label="Secretaria"
              name="secretariaId"
              rules={[{ required: true, message: 'Selecione a secretaria.' }]}
            >
              <Select
                size="large"
                options={(secretariasQuery.data ?? []).map((secretaria) => ({
                  label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                  value: secretaria.id,
                }))}
              />
            </Form.Item>

            <Form.Item label="Responsavel ativo" name="ativo" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                {isEditing ? 'Salvar alteracoes' : 'Criar responsavel'}
              </Button>
              <Button onClick={() => navigate('/responsaveis')}>Cancelar</Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </AppLayout>
  )
}
