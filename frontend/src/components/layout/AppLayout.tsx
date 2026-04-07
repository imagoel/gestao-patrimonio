import { useQuery } from '@tanstack/react-query'
import { Drawer, Grid, Layout } from 'antd'
import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { notificacoesService } from '../../services/notificacoes.service'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

const { Content, Sider } = Layout

interface AppLayoutProps extends PropsWithChildren {
  label?: string
}

export function AppLayout({
  children,
  label = 'Passo 1 - Estrutura base e containers',
}: AppLayoutProps) {
  const navigate = useNavigate()
  const { isAuthenticated, logout, session } = useAuth()
  const screens = Grid.useBreakpoint()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isDesktop = Boolean(screens.lg)
  const notificacoesQuery = useQuery({
    queryKey: ['notificacoes-header'],
    queryFn: () => notificacoesService.list(5),
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 60000 : false,
  })
  const notificationCount =
    notificacoesQuery.data?.summary.actionRequired ?? 0

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Layout className="app-shell">
      {isAuthenticated && isDesktop ? (
        <Sider width={288} className="app-shell__sider" theme="light">
          <Sidebar notificationCount={notificationCount} />
        </Sider>
      ) : null}

      <Layout className="app-shell__main">
        <Header
          isAuthenticated={isAuthenticated}
          isDesktop={isDesktop}
          label={label}
          notificationCount={notificationCount}
          onLogout={handleLogout}
          onNavigateHome={() => navigate(isAuthenticated ? '/app' : '/login')}
          onNavigateNotifications={() => navigate('/notificacoes')}
          onOpenMenu={() => setMobileMenuOpen(true)}
          userEmail={session.user?.email}
          userName={session.user?.nome}
          userPerfil={session.user?.perfil}
        />

        <Content className="app-shell__content">{children}</Content>
      </Layout>

      {isAuthenticated && !isDesktop ? (
        <Drawer
          width={320}
          placement="left"
          title="Navegacao"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          bodyStyle={{ padding: 0 }}
        >
          <Sidebar
            notificationCount={notificationCount}
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </Drawer>
      ) : null}
    </Layout>
  )
}
