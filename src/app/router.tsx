import { createBrowserRouter, Navigate } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'

/**
 * مسیرها بر اساس معماری قفل‌شده:
 * / (فهرست بازی‌ها) · /play/:exerciseId · /reports
 */
export function createAppRouter() {
  return createBrowserRouter([
    { path: '/', element: <HomePage /> },
    {
      path: '/play/:exerciseId',
      lazy: () => import('../pages/ExercisePage').then((m) => ({ Component: m.ExercisePage })),
    },
    {
      path: '/reports',
      lazy: () => import('../pages/ReportsPage').then((m) => ({ Component: m.ReportsPage })),
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ])
}
