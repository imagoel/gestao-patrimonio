import { Badge, Menu, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePermissao } from '../../hooks/usePermissao'
import { Perfil } from '../../types/enums'

const { Text } = Typography

interface SidebarProps {
  notificationCount?: number
  onNavigate?: () => void
}

interface NavigationDefinition {
  key: string
  label: string
  perfis?: Perfil[]
}

const navigationGroups: Array<{
  key: string
  label: string
  items: NavigationDefinition[]
}> = [
  {
    key: 'operacao',
    label: 'Operacao',
    items: [
      { key: '/app', label: 'Dashboard' },
      { key: '/patrimonios', label: 'Patrimonios' },
      { key: '/movimentacoes', label: 'Movimentacoes' },
      { key: '/baixas', label: 'Baixas' },
      { key: '/inventarios', label: 'Inventarios' },
      { key: '/notificacoes', label: 'Notificacoes' },
    ],
  },
  {
    key: 'gestao',
    label: 'Gestao',
    items: [
      {
        key: '/auditoria',
        label: 'Auditoria',
        perfis: [Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO],
      },
      {
        key: '/relatorios',
        label: 'Relatorios',
        perfis: [Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO],
      },
      {
        key: '/importacoes/patrimonios',
        label: 'Importacoes',
        perfis: [Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO],
      },
    ],
  },
  {
    key: 'cadastros',
    label: 'Cadastros',
    items: [
      {
        key: '/usuarios',
        label: 'Usuarios',
        perfis: [Perfil.ADMINISTRADOR],
      },
      {
        key: '/secretarias',
        label: 'Secretarias',
        perfis: [Perfil.ADMINISTRADOR],
      },
      {
        key: '/responsaveis',
        label: 'Responsaveis',
        perfis: [Perfil.ADMINISTRADOR],
      },
      {
        key: '/fornecedores',
        label: 'Fornecedores',
        perfis: [Perfil.ADMINISTRADOR],
      },
    ],
  },
]

function resolveSelectedKey(pathname: string) {
  const routePrefixes = [
    '/importacoes/patrimonios',
    '/movimentacoes',
    '/patrimonios',
    '/fornecedores',
    '/responsaveis',
    '/secretarias',
    '/usuarios',
    '/inventarios',
    '/notificacoes',
    '/auditoria',
    '/relatorios',
    '/baixas',
    '/app',
  ]

  return (
    routePrefixes.find(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) ?? ''
  )
}

export function Sidebar({
  notificationCount = 0,
  onNavigate,
}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { hasPerfil } = usePermissao()

  const items = useMemo<MenuProps['items']>(() => {
    return navigationGroups
      .map((group) => {
        const visibleItems = group.items
          .filter((item) =>
            item.perfis?.length ? hasPerfil(...item.perfis) : true,
          )
          .map((item) => ({
            key: item.key,
            label:
              item.key === '/notificacoes' ? (
                <Space size={8}>
                  <span>{item.label}</span>
                  {notificationCount > 0 ? (
                    <Badge
                      count={notificationCount}
                      overflowCount={99}
                      size="small"
                    />
                  ) : null}
                </Space>
              ) : (
                item.label
              ),
          }))

        if (!visibleItems.length) {
          return null
        }

        return {
          key: group.key,
          type: 'group' as const,
          label: group.label,
          children: visibleItems,
        }
      })
      .filter(Boolean)
  }, [hasPerfil, notificationCount])

  return (
    <div className="app-shell__sidebar">
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong style={{ color: '#12313c' }}>
          Navegacao do sistema
        </Text>
        <Text type="secondary">
          Atalhos dos modulos ja implantados por perfil.
        </Text>
      </Space>

      <Menu
        mode="inline"
        selectedKeys={[resolveSelectedKey(location.pathname)]}
        items={items}
        onClick={({ key }) => {
          navigate(String(key))
          onNavigate?.()
        }}
      />
    </div>
  )
}
