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
import { usuariosService } from '../../services/usuarios.service'
import { Perfil } from '../../types/enums'
import type { UsuarioFormValues } from '../../types/usuarios.types'
import { emailRule } from '../../utils/validators'

export function UsuarioFormPage() {
  const [form] = Form.useForm<UsuarioFormValues>()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()

  const optionsQuery = useQuery({
    queryKey: ['usuarios-options'],
    queryFn: usuariosService.findOptions,
  })

  const usuarioQuery = useQuery({
    queryKey: ['usuario-detail', id],
    queryFn: () => usuariosService.findOne(id as string),
    enabled: isEditing,
  })

  const mutation = useMutation({
    mutationFn: (values: UsuarioFormValues) => {
      const payload: UsuarioFormValues = {
        ...values,
        secretariaId: values.secretariaId || null,
      }

      if (!payload.senha) {
        delete payload.senha
      }

      return isEditing
        ? usuariosService.update(id as string, payload)
        : usuariosService.create(payload)
    },
    onSuccess: async () => {
      message.success(
        isEditing ? 'Usuario atualizado com sucesso.' : 'Usuario criado com sucesso.',
      )
      await queryClient.invalidateQueries({ queryKey: ['usuarios-list'] })
      navigate('/usuarios', { replace: true })
    },
    onError: () => {
      message.error('Nao foi possivel salvar o usuario.')
    },
  })

  useEffect(() => {
    if (usuarioQuery.data) {
      form.setFieldsValue({
        nome: usuarioQuery.data.nome,
        email: usuarioQuery.data.email,
        perfil: usuarioQuery.data.perfil,
        ativo: usuarioQuery.data.ativo,
        secretariaId: usuarioQuery.data.secretariaId,
      })
    }
  }, [form, usuarioQuery.data])

  if (!hasPerfil(Perfil.ADMINISTRADOR)) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label={isEditing ? 'Editar usuario' : 'Novo usuario'}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title={isEditing ? 'Editar usuario' : 'Cadastrar usuario'}
          description="O modulo de usuarios fica restrito ao perfil administrador."
        />

        <Card loading={usuarioQuery.isLoading || optionsQuery.isLoading}>
          <Form<UsuarioFormValues>
            form={form}
            layout="vertical"
            initialValues={{
              perfil: Perfil.USUARIO_CONSULTA,
              ativo: true,
            }}
            onFinish={(values) => {
              void mutation.mutateAsync(values)
            }}
          >
            <Form.Item
              label="Nome"
              name="nome"
              rules={[{ required: true, message: 'Informe o nome.' }]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item
              label="E-mail"
              name="email"
              rules={[
                { required: true, message: 'Informe o e-mail.' },
                emailRule,
              ]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item
              label={isEditing ? 'Nova senha' : 'Senha'}
              name="senha"
              rules={
                isEditing
                  ? []
                  : [{ required: true, message: 'Informe a senha inicial.' }]
              }
              extra={
                isEditing
                  ? 'Preencha apenas se quiser alterar a senha.'
                  : undefined
              }
            >
              <Input.Password size="large" />
            </Form.Item>

            <Form.Item
              label="Perfil"
              name="perfil"
              rules={[{ required: true, message: 'Selecione o perfil.' }]}
            >
              <Select
                size="large"
                options={Object.values(Perfil).map((item) => ({
                  label: item,
                  value: item,
                }))}
              />
            </Form.Item>

            <Form.Item label="Secretaria vinculada" name="secretariaId">
              <Select
                allowClear
                size="large"
                options={(optionsQuery.data?.secretarias ?? []).map((secretaria) => ({
                  label: `${secretaria.sigla} - ${secretaria.nomeCompleto}`,
                  value: secretaria.id,
                }))}
              />
            </Form.Item>

            <Form.Item label="Usuario ativo" name="ativo" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                {isEditing ? 'Salvar alteracoes' : 'Criar usuario'}
              </Button>
              <Button onClick={() => navigate('/usuarios')}>Cancelar</Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </AppLayout>
  )
}
