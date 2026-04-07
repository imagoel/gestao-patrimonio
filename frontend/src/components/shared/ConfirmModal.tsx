import { Popconfirm } from 'antd'
import type { PropsWithChildren, ReactNode } from 'react'

export interface ConfirmModalProps extends PropsWithChildren {
  cancelText?: string
  description?: ReactNode
  disabled?: boolean
  okText?: string
  onConfirm: () => void
  title: ReactNode
}

export function ConfirmModal({
  cancelText = 'Cancelar',
  children,
  description,
  disabled,
  okText = 'Confirmar',
  onConfirm,
  title,
}: ConfirmModalProps) {
  return (
    <Popconfirm
      cancelText={cancelText}
      description={description}
      disabled={disabled}
      okText={okText}
      onConfirm={onConfirm}
      title={title}
    >
      {children}
    </Popconfirm>
  )
}
