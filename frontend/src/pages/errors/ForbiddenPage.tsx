import { Button } from 'antd'
import { Link } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { EmptyState } from '../../components/shared/EmptyState'

export function ForbiddenPage() {
  return (
    <AppLayout label="Acesso negado">
      <section className="page-center">
        <EmptyState
          title="Voce nao tem permissao para acessar esta area"
          description="Esta area exige permissao administrativa ou escopo compativel com o seu perfil."
          action={
            <Button type="primary">
              <Link to="/app">Voltar para a area autenticada</Link>
            </Button>
          }
        />
      </section>
    </AppLayout>
  )
}
