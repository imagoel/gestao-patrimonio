import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { HomePage } from '../pages/app/HomePage'
import { AuditoriaListPage } from '../pages/auditoria/AuditoriaListPage'
import { BaixaFormPage } from '../pages/baixa/BaixaFormPage'
import { BaixaListPage } from '../pages/baixa/BaixaListPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { ForbiddenPage } from '../pages/errors/ForbiddenPage'
import { NotFoundPage } from '../pages/errors/NotFoundPage'
import { FornecedorFormPage } from '../pages/fornecedores/FornecedorFormPage'
import { FornecedoresListPage } from '../pages/fornecedores/FornecedoresListPage'
import { PatrimonioImportPage } from '../pages/importacoes/PatrimonioImportPage'
import { InventarioDetalhePage } from '../pages/inventarios/InventarioDetalhePage'
import { InventarioFormPage } from '../pages/inventarios/InventarioFormPage'
import { InventariosListPage } from '../pages/inventarios/InventariosListPage'
import { MovimentacaoDetalhePage } from '../pages/movimentacao/MovimentacaoDetalhePage'
import { MovimentacaoFormPage } from '../pages/movimentacao/MovimentacaoFormPage'
import { MovimentacaoListPage } from '../pages/movimentacao/MovimentacaoListPage'
import { NotificacoesPage } from '../pages/notificacoes/NotificacoesPage'
import { PatrimonioDetalhePage } from '../pages/patrimonio/PatrimonioDetalhePage'
import { PatrimonioFormPage } from '../pages/patrimonio/PatrimonioFormPage'
import { PatrimonioListPage } from '../pages/patrimonio/PatrimonioListPage'
import { RelatoriosPage } from '../pages/relatorios/RelatoriosPage'
import { ResponsavelFormPage } from '../pages/responsaveis/ResponsavelFormPage'
import { ResponsaveisListPage } from '../pages/responsaveis/ResponsaveisListPage'
import { SecretariaFormPage } from '../pages/secretarias/SecretariaFormPage'
import { SecretariasListPage } from '../pages/secretarias/SecretariasListPage'
import { UsuarioFormPage } from '../pages/usuarios/UsuarioFormPage'
import { UsuariosListPage } from '../pages/usuarios/UsuariosListPage'
import { Perfil } from '../types/enums'
import { ProtectedRoute } from './ProtectedRoute'

function RootRedirect() {
  const { isAuthenticated } = useAuth()

  return <Navigate to={isAuthenticated ? '/app' : '/login'} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<HomePage />} />
        <Route path="/patrimonios" element={<PatrimonioListPage />} />
        <Route path="/patrimonios/:id" element={<PatrimonioDetalhePage />} />
        <Route path="/movimentacoes" element={<MovimentacaoListPage />} />
        <Route path="/movimentacoes/:id" element={<MovimentacaoDetalhePage />} />
        <Route path="/baixas" element={<BaixaListPage />} />
        <Route path="/notificacoes" element={<NotificacoesPage />} />
        <Route path="/inventarios" element={<InventariosListPage />} />
        <Route path="/inventarios/:id" element={<InventarioDetalhePage />} />
      </Route>
      <Route element={<ProtectedRoute allowedPerfis={[Perfil.ADMINISTRADOR]} />}>
        <Route path="/usuarios" element={<UsuariosListPage />} />
        <Route path="/usuarios/novo" element={<UsuarioFormPage />} />
        <Route path="/usuarios/:id/editar" element={<UsuarioFormPage />} />
        <Route path="/secretarias" element={<SecretariasListPage />} />
        <Route path="/secretarias/nova" element={<SecretariaFormPage />} />
        <Route path="/secretarias/:id/editar" element={<SecretariaFormPage />} />
        <Route path="/responsaveis" element={<ResponsaveisListPage />} />
        <Route path="/responsaveis/novo" element={<ResponsavelFormPage />} />
        <Route path="/responsaveis/:id/editar" element={<ResponsavelFormPage />} />
        <Route path="/fornecedores" element={<FornecedoresListPage />} />
        <Route path="/fornecedores/novo" element={<FornecedorFormPage />} />
        <Route path="/fornecedores/:id/editar" element={<FornecedorFormPage />} />
      </Route>
      <Route
        element={
          <ProtectedRoute
            allowedPerfis={[Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO]}
          />
        }
      >
        <Route path="/patrimonios/novo" element={<PatrimonioFormPage />} />
        <Route path="/patrimonios/:id/editar" element={<PatrimonioFormPage />} />
        <Route path="/importacoes/patrimonios" element={<PatrimonioImportPage />} />
        <Route path="/inventarios/novo" element={<InventarioFormPage />} />
        <Route path="/movimentacoes/nova" element={<MovimentacaoFormPage />} />
        <Route path="/baixas/nova" element={<BaixaFormPage />} />
        <Route path="/auditoria" element={<AuditoriaListPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
      </Route>
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
