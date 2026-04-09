import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Space,
  Typography,
} from 'antd'
import { startTransition, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import brandLogo from '../../assets/brand/minha-logo.png'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth.service'
import type { LoginPayload } from '../../types/auth.types'
import { emailRule } from '../../utils/validators'

const { Paragraph, Text, Title } = Typography

export function LoginPage() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const { isAuthenticated, login } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    <AppLayout label="Acesso ao sistema">
      <section className="page-center">
        <div className="login-panel">
          <div className="login-copy">
            <span className="login-copy__kicker">Prefeitura Municipal de Amargosa</span>
            <Title>
              Acesse o sistema de gestao patrimonial.
            </Title>
            <Paragraph>
              Use seu e-mail e senha para consultar informacoes e executar as
              operacoes permitidas ao seu perfil.
            </Paragraph>
            <Paragraph>
              Em caso de duvidas sobre acesso, procure a administracao do
              sistema.
            </Paragraph>
          </div>

          <Card className="login-card">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div className="login-card__logo login-card__logo--brand">
                <img src={brandLogo} alt="Logo institucional" />
              </div>

              <div>
                <Text type="secondary">Identificacao</Text>
                <Title level={3} style={{ marginTop: 8, marginBottom: 8 }}>
                  Entrar
                </Title>
                <Paragraph type="secondary">
                  Informe suas credenciais para continuar.
                </Paragraph>
              </div>

              <Form<LoginPayload>
                layout="vertical"
                onFinish={(values) => {
                  void handleFinish(values)
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
                  <Input size="large" placeholder="Digite seu e-mail" />
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

              <Text type="secondary">
                Acesso restrito a usuarios autorizados.
              </Text>
            </Space>
          </Card>
        </div>
      </section>
    </AppLayout>
  )
}
