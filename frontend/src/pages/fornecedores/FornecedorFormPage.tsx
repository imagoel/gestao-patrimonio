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
import { fornecedoresService } from '../../services/fornecedores.service'
import { Perfil } from '../../types/enums'
import type { FornecedorFormValues } from '../../types/fornecedores.types'
import { emailRule } from '../../utils/validators'
const { TextArea } = Input

export function FornecedorFormPage() {
  const [form] = Form.useForm<FornecedorFormValues>()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const queryClient = useQueryClient()
  const { message } = AntdApp.useApp()
  const { hasPerfil } = usePermissao()

  const fornecedorQuery = useQuery({
    queryKey: ['fornecedor-detail', id],
    queryFn: () => fornecedoresService.findOne(id as string),
    enabled: isEditing,
  })

  const mutation = useMutation({
    mutationFn: (values: FornecedorFormValues) =>
      isEditing
        ? fornecedoresService.update(id as string, values)
        : fornecedoresService.create(values),
    onSuccess: async () => {
      message.success(
        isEditing
          ? 'Fornecedor atualizado com sucesso.'
          : 'Fornecedor criado com sucesso.',
      )
      await queryClient.invalidateQueries({ queryKey: ['fornecedores-list'] })
      await queryClient.invalidateQueries({ queryKey: ['fornecedores-options'] })
      navigate('/fornecedores', { replace: true })
    },
    onError: () => {
      message.error('Nao foi possivel salvar o fornecedor.')
    },
  })

  useEffect(() => {
    if (fornecedorQuery.data) {
      form.setFieldsValue({
        nome: fornecedorQuery.data.nome,
        cpfCnpj: fornecedorQuery.data.cpfCnpj,
        telefone: fornecedorQuery.data.telefone,
        email: fornecedorQuery.data.email,
        observacoes: fornecedorQuery.data.observacoes,
        ativo: fornecedorQuery.data.ativo,
      })
    }
  }, [form, fornecedorQuery.data])

  if (!hasPerfil(Perfil.ADMINISTRADOR)) {
    return <Navigate to="/403" replace />
  }

  return (
    <AppLayout label={isEditing ? 'Editar fornecedor' : 'Novo fornecedor'}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <PageHeader
          title={isEditing ? 'Editar fornecedor' : 'Cadastrar fornecedor'}
          description="Este cadastro permanece restrito ao perfil administrador."
        />

        <Card loading={fornecedorQuery.isLoading}>
          <Form<FornecedorFormValues>
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
              label="Nome ou razao social"
              name="nome"
              rules={[
                { required: true, message: 'Informe o nome do fornecedor.' },
                { min: 3, message: 'O nome deve ter ao menos 3 caracteres.' },
              ]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item
              label="CPF/CNPJ"
              name="cpfCnpj"
              extra="O backend normaliza o valor para apenas digitos."
            >
              <Input size="large" maxLength={18} />
            </Form.Item>

            <Form.Item label="Telefone" name="telefone">
              <Input size="large" maxLength={30} />
            </Form.Item>

            <Form.Item
              label="E-mail"
              name="email"
              rules={[emailRule]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item label="Observacoes" name="observacoes">
              <TextArea rows={4} />
            </Form.Item>

            <Form.Item label="Fornecedor ativo" name="ativo" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                {isEditing ? 'Salvar alteracoes' : 'Criar fornecedor'}
              </Button>
              <Button onClick={() => navigate('/fornecedores')}>Cancelar</Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </AppLayout>
  )
}
