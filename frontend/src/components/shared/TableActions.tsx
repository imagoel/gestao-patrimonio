import { Button, Space } from 'antd'
import type { ButtonProps } from 'antd'
import type { ReactNode } from 'react'
import { ConfirmModal } from './ConfirmModal'
import type { ConfirmModalProps } from './ConfirmModal'

interface TableAction {
  buttonType?: ButtonProps['type']
  confirm?: Omit<ConfirmModalProps, 'children'>
  danger?: boolean
  disabled?: boolean
  key: string
  label: ReactNode
  loading?: boolean
  onClick?: () => void
}

interface TableActionsProps {
  actions: TableAction[]
}

export function TableActions({ actions }: TableActionsProps) {
  return (
    <Space>
      {actions.map((action) => {
        const button = (
          <Button
            danger={action.danger}
            disabled={action.disabled}
            loading={action.loading}
            onClick={action.confirm ? undefined : action.onClick}
            type={action.buttonType}
          >
            {action.label}
          </Button>
        )

        if (!action.confirm) {
          return <span key={action.key}>{button}</span>
        }

        return (
          <ConfirmModal key={action.key} {...action.confirm}>
            {button}
          </ConfirmModal>
        )
      })}
    </Space>
  )
}
