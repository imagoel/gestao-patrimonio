import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { startTransition, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.svg'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth.service'
import { healthService } from '../../services/health.service'
import type { LoginPayload } from '../../types/auth.types'
import { formatDateTimeWithSeconds } from '../../utils/formatters'
import { emailRule } from '../../utils/validators'

const { Paragraph, Text, Title } = Typography

export function LoginPage() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const { isAuthenticated, login } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: healthService.check,
    retry: false,
  })

  if (isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  async function handleFinish(values: LoginPayload) {
    try {
      setIsSubmitting(true)

      const response = await authService.login(values)

      login({
        token: response.accessToken,
        user: response.user,
      })

      message.success('Login realizado com sucesso.')

      startTransition(() => {
        navigate('/app', { replace: true })
      })
    } catch {
      message.error('Nao foi possivel autenticar com as credenciais informadas.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout label="Autenticacao inicial">
      <section className="page-center">
        <div className="login-panel">
          <div className="login-copy">
            <span className="login-copy__kicker">Fase 1 - autenticacao</span>
            <Title>
              Login real com JWT para iniciar o sistema patrimonial.
            </Title>
            <Paragraph>
              Esta etapa abre a Fase 1 com autenticacao local por e-mail e
              senha, emissao de token JWT, validacao de usuario ativo e sessao
              persistida no front-end.
            </Paragraph>
            <Paragraph>
              O seed inicial ja disponibiliza um administrador para o primeiro
              acesso local, sem necessidade de criar usuarios manualmente antes
              dos proximos modulos.
            </Paragraph>
            <Space wrap size={[8, 8]}>
              <Tag color="green">Passport Local</Tag>
              <Tag color="blue">Passport JWT</Tag>
              <Tag color="purple">Sessao persistida</Tag>
              <Tag color="cyan">Auditoria de login</Tag>
            </Space>
          </div>

          <Card className="login-card">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div className="login-card__logo">
                <img src={logo} alt="" width={40} height={40} />
              </div>

              <div>
                <Text type="secondary">Primeiro acesso local</Text>
                <Title level={3} style={{ marginTop: 8, marginBottom: 8 }}>
                  Entre com o usuario inicial
                </Title>
                <Paragraph type="secondary">
                  Credenciais do seed:
                  {' '}
                  <strong>admin@patrimonio.local</strong>
                  {' / '}
                  <strong>Admin@123</strong>
                </Paragraph>
              </div>

              <Form<LoginPayload>
                layout="vertical"
                onFinish={(values) => {
                  void handleFinish(values)
                }}
                initialValues={{
                  email: 'admin@patrimonio.local',
                  senha: 'Admin@123',
                }}
              >
                <Form.Item
                  label="E-mail"
                  name="email"
                  rules={[
                    { required: true, message: 'Informe o e-mail.' },
                    emailRule,
                  ]}
                >
                  <Input size="large" placeholder="admin@patrimonio.local" />
                </Form.Item>

                <Form.Item
                  label="Senha"
                  name="senha"
                  rules={[{ required: true, message: 'Informe a senha.' }]}
                >
                  <Input.Password size="large" placeholder="Digite sua senha" />
                </Form.Item>

                <Button
                  block
                  size="large"
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting}
                >
                  Entrar
                </Button>
              </Form>

              <Divider style={{ margin: 0 }} />

              {healthQuery.isLoading ? (
                <Spin tip="Consultando GET /api/health..." />
              ) : null}

              {healthQuery.isSuccess ? (
                <Alert
                  showIcon
                  type="success"
                  message="Back-end acessivel pelo cliente Axios"
                  description={`Resposta recebida em ${formatDateTimeWithSeconds(
                    healthQuery.data.timestamp,
                  )}. Servico: ${
                    healthQuery.data.service
                  }.`}
                />
              ) : null}

              {healthQuery.isError ? (
                <Alert
                  showIcon
                  type="error"
                  message="Nao foi possivel consultar /api/health"
                  description="Revise os servicos backend e nginx quando for subir os containers."
                />
              ) : null}

              <Text type="secondary">
                Sessao atual:{' '}
                {isAuthenticated ? 'autenticada' : 'aguardando login'}
              </Text>
            </Space>
          </Card>
        </div>
      </section>
    </AppLayout>
  )
}
