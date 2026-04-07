import { Button } from 'antd'
import { Link } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { EmptyState } from '../../components/shared/EmptyState'

export function NotFoundPage() {
  return (
    <AppLayout label="Roteamento base">
      <section className="page-center">
        <EmptyState
          title="Pagina nao encontrada"
          description="A base inicial do projeto contem apenas a rota de login e o fallback de erro."
          action={
            <Button type="primary">
              <Link to="/login">Voltar para /login</Link>
            </Button>
          }
        />
      </section>
    </AppLayout>
  )
}
