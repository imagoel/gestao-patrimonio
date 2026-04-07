import { Badge, Button, Space, Tag, Typography } from 'antd'
import type { KeyboardEvent } from 'react'
import logo from '../../assets/logo.svg'

const { Title, Text } = Typography

interface HeaderProps {
  isAuthenticated: boolean
  isDesktop: boolean
  label: string
  notificationCount: number
  userEmail?: string
  userName?: string
  userPerfil?: string
  onLogout: () => void
  onNavigateHome: () => void
  onNavigateNotifications: () => void
  onOpenMenu: () => void
}

export function Header({
  isAuthenticated,
  isDesktop,
  label,
  notificationCount,
  userEmail,
  userName,
  userPerfil,
  onLogout,
  onNavigateHome,
  onNavigateNotifications,
  onOpenMenu,
}: HeaderProps) {
  function handleBrandKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onNavigateHome()
    }
  }

  return (
    <header className="app-shell__header">
      <div className="app-shell__header-left">
        {isAuthenticated && !isDesktop ? (
          <Button onClick={onOpenMenu}>Menu</Button>
        ) : null}

        <div
          className="app-shell__brand"
          role="button"
          tabIndex={0}
          onClick={onNavigateHome}
          onKeyDown={handleBrandKeyDown}
        >
          <img src={logo} alt="Sistema de Gestao de Patrimonio" />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Sistema de Gestao de Patrimonio
            </Title>
            <p>Prefeitura - operacao integrada do projeto</p>
          </div>
        </div>
      </div>

      <Space wrap size={[12, 12]} className="app-shell__header-actions">
        <Tag color="geekblue">{label}</Tag>

        {isAuthenticated ? (
          <>
            <div className="app-shell__session">
              <Text strong>{userName ?? 'Usuario autenticado'}</Text>
              <Text type="secondary">{userEmail ?? 'Sessao ativa'}</Text>
            </div>

            {userPerfil ? <Tag color="cyan">{userPerfil}</Tag> : null}

            <Badge count={notificationCount} overflowCount={99} size="small">
              <Button onClick={onNavigateNotifications}>Notificacoes</Button>
            </Badge>

            <Button onClick={onLogout}>Sair</Button>
          </>
        ) : null}
      </Space>
    </header>
  )
}
