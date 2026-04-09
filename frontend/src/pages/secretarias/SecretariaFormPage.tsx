import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Space,
  Switch,
} from 'antd'
import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { PageHeader } from '../../components/layout/PageHeader'
import { usePermissao } from '../../hooks/usePermissao'
import { secretariasService } from '../../services/secretarias.service'
import { Perfil } from '../../types/enums'
import type { SecretariaFormValues } from '../../types/secretarias.types'

export function SecretariaFormPage() {
  const [form] = Form.useForm<SecretariaFormValues>()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()

  const secretariaQuery = useQuery({
    queryKey: ['secretaria-detail', id],
    queryFn: () => secretariasService.findOne(id as string),
    enabled: isEditing,
  })

  const mutation = useMutation({
    mutationFn: (values: SecretariaFormValues) =>
      isEditing
        ? secretariasService.update(id as string, values)
        : secretariasService.create(values),
    onSuccess: async () => {
      message.success(
        isEditing
          ? 'Secretaria atualizada com sucesso.'
          : 'Secretaria criada com sucesso.',
      )
      await queryClient.invalidateQueries({ queryKey: ['secretarias-list'] })
      await queryClient.invalidateQueries({ queryKey: ['secretarias-options'] })
      await queryClient.invalidateQueries({ queryKey: ['usuarios-options'] })
      navigate('/secretarias', { replace: true })
    },
    onError: () => {
      message.error('Nao foi possivel salvar a secretaria.')
    },
  })

  useEffect(() => {
    if (secretariaQuery.data) {
      form.setFieldsValue({
        sigla: secretariaQuery.data.sigla,
        nomeCompleto: secretariaQuery.data.nomeCompleto,
        ativo: secretariaQuery.data.ativo,
      })
    }
  }, [form, secretariaQuery.data])

  if (!hasPerfil(Perfil.ADMINISTRADOR)) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label={isEditing ? 'Editar secretaria' : 'Nova secretaria'}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title={isEditing ? 'Editar secretaria' : 'Cadastrar secretaria'}
          description="Este cadastro permanece restrito ao perfil administrador."
        />

        <Card loading={secretariaQuery.isLoading}>
          <Form<SecretariaFormValues>
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
              label="Sigla"
              name="sigla"
              rules={[
                { required: true, message: 'Informe a sigla.' },
                { min: 2, message: 'A sigla deve ter ao menos 2 caracteres.' },
                { max: 10, message: 'A sigla deve ter no maximo 10 caracteres.' },
              ]}
              extra="A sigla sera normalizada em maiusculas no backend."
            >
              <Input size="large" maxLength={10} style={{ textTransform: 'uppercase' }} />
            </Form.Item>

            <Form.Item
              label="Nome completo"
              name="nomeCompleto"
              rules={[
                { required: true, message: 'Informe o nome completo.' },
                {
                  min: 3,
                  message: 'O nome completo deve ter ao menos 3 caracteres.',
                },
              ]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item label="Secretaria ativa" name="ativo" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                {isEditing ? 'Salvar alteracoes' : 'Criar secretaria'}
              </Button>
              <Button onClick={() => navigate('/secretarias')}>Cancelar</Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </AppLayout>
  )
}
