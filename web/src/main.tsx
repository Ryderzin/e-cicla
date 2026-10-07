import 'leaflet/dist/leaflet.css'
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'

import AuthProvider from './auth/AuthProvider.tsx'
import Layout from './components/Layout.tsx'
import RequireAdmin from './components/RequireAdmin.tsx'
import AccountPage from './pages/AccountPage.tsx'
import AdminPointFormPage from './pages/AdminPointFormPage.tsx'
import AdminPointsPage from './pages/AdminPointsPage.tsx'
import HomePage from './pages/HomePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import MapPage from './pages/MapPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import PrivacyPage from './pages/PrivacyPage.tsx'
import RegisterPage from './pages/RegisterPage.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'mapa', element: <MapPage /> },
      { path: 'entrar', element: <LoginPage /> },
      { path: 'criar-conta', element: <RegisterPage /> },
      { path: 'conta', element: <AccountPage /> },
      { path: 'privacidade', element: <PrivacyPage /> },
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
