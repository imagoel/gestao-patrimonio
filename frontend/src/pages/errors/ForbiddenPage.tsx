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
          description="Este modulo exige perfil administrativo na fase atual do projeto."
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
