import { App as AntdApp, Typography } from 'antd'
import { useState } from 'react'

const { Text } = Typography

interface CopyToClipboardProps {
  text: string
  label?: string
}

export function CopyToClipboard({ text, label }: CopyToClipboardProps) {
  const { message } = AntdApp.useApp()
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    setCopied(true)
    message.success(`"${text}" copiado para a area de transferencia.`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Text
      copyable={{
        text,
        onCopy: handleCopy,
        tooltips: ['Copiar', 'Copiado!'],
      }}
      style={{
        cursor: 'pointer',
        transition: 'color 0.2s ease',
        color: copied ? '#0f766e' : undefined,
      }}
    >
      {label ?? text}
    </Text>
  )
}
