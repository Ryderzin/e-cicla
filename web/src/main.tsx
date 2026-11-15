import 'leaflet/dist/leaflet.css'
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'

import AuthProvider from './auth/AuthProvider.tsx'
import Layout from './components/Layout.tsx'
import RequireAdmin from './components/RequireAdmin.tsx'
import AccountPage from './pages/AccountPage.tsx'
import AdminChartPage from './pages/AdminChartPage.tsx'
import AdminPointFormPage from './pages/AdminPointFormPage.tsx'
import AdminPointsPage from './pages/AdminPointsPage.tsx'
import AdminReportPage from './pages/AdminReportPage.tsx'
import AdminSuggestionReviewPage from './pages/AdminSuggestionReviewPage.tsx'
import AdminSuggestionsPage from './pages/AdminSuggestionsPage.tsx'
import DeviceFormPage from './pages/DeviceFormPage.tsx'
import DevicesPage from './pages/DevicesPage.tsx'
import DisposalsPage from './pages/DisposalsPage.tsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx'
import HomePage from './pages/HomePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import MapPage from './pages/MapPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import NotificationsPage from './pages/NotificationsPage.tsx'
import PrivacyPage from './pages/PrivacyPage.tsx'
import RegisterPage from './pages/RegisterPage.tsx'
import ResetPasswordPage from './pages/ResetPasswordPage.tsx'
import SuggestionFormPage from './pages/SuggestionFormPage.tsx'
import SuggestionsPage from './pages/SuggestionsPage.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'mapa', element: <MapPage /> },
      { path: 'sugestoes', element: <SuggestionsPage /> },
      { path: 'sugestoes/nova', element: <SuggestionFormPage /> },
      { path: 'sugestoes/:id/editar', element: <SuggestionFormPage key="editar" /> },
      { path: 'entrar', element: <LoginPage /> },
      { path: 'esqueci-minha-senha', element: <ForgotPasswordPage /> },
      { path: 'redefinir-senha', element: <ResetPasswordPage /> },
      { path: 'criar-conta', element: <RegisterPage /> },
      { path: 'conta', element: <AccountPage /> },
      { path: 'privacidade', element: <PrivacyPage /> },
      { path: 'meus-aparelhos', element: <DevicesPage /> },
      { path: 'meus-aparelhos/novo', element: <DeviceFormPage /> },
      { path: 'meus-aparelhos/:id/editar', element: <DeviceFormPage key="editar" /> },
      { path: 'meus-descartes', element: <DisposalsPage /> },
      { path: 'avisos', element: <NotificationsPage /> },
      {
        path: 'admin/pontos',
        element: (
          <RequireAdmin>
            <AdminPointsPage />
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/pontos/novo',
        element: (
          <RequireAdmin>
            <AdminPointFormPage />
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/pontos/:id',
        element: (
          <RequireAdmin>
            <AdminPointFormPage key="editar" />
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/sugestoes',
        element: (
          <RequireAdmin>
            <AdminSuggestionsPage />
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/sugestoes/:id',
        element: (
          <RequireAdmin>
            <AdminSuggestionReviewPage />
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/relatorio',
        element: (
          <RequireAdmin>
            <AdminReportPage />
          </RequireAdmin>
        ),
      },
      {
        path: 'admin/grafico',
        element: (
          <RequireAdmin>
            <AdminChartPage />
          </RequireAdmin>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
