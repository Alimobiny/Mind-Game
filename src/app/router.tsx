import { createBrowserRouter, createHashRouter, Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'

/**
 * مسیرها بر اساس معماری قفل‌شده:
 * / (فهرست بازی‌ها) · /play/:exerciseId · /reports · /program (برنامه امروز من)
 * · /journey (سیر پیشرفت — تقویم فعالیت و نشان‌ها)
 */
const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  {
    path: '/play/:exerciseId',
    lazy: () => import('../pages/ExercisePage').then((m) => ({ Component: m.ExercisePage })),
  },
  {
    path: '/program',
    lazy: () => import('../pages/ProgramPage').then((m) => ({ Component: m.ProgramPage })),
  },
  {
    path: '/journey',
    lazy: () => import('../pages/JourneyPage').then((m) => ({ Component: m.JourneyPage })),
  },
  {
    path: '/reports',
    lazy: () => import('../pages/ReportsPage').then((m) => ({ Component: m.ReportsPage })),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export function createAppRouter() {
  // نسخهٔ دسکتاپ (الکترون) فایل را با پروتکل file:// بار می‌کند؛ BrowserRouter
  // بدون سرور آنجا کار نمی‌کند — روتر hash لازم است (لینک‌های to=... یکسان‌اند).
  if (window.location.protocol === 'file:') {
    return createHashRouter(routes)
  }
  // نسخهٔ وب: basename از base ساخت (vite) می‌آید: '/' در dev/تست، '/Mind-Game/' در استقرار
  return createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })
}
