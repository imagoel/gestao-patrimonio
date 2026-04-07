import { App as AntdApp, ConfigProvider } from 'antd'
import { AppRoutes } from './routes/AppRoutes'

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0f766e',
          colorTextBase: '#12313c',
          borderRadius: 16,
          fontFamily: "'Segoe UI', sans-serif",
        },
      }}
    >
      <AntdApp>
        <AppRoutes />
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
