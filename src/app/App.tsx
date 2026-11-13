import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import { PageSkeleton } from '../components/skeleton/PageSkeleton'
import { createAppRouter } from './router'

const router = createAppRouter()

export function App() {
  // صفحات غیر از خانه lazy هستند؛ تا رسیدن chunk، اسکلتون دیده می‌شود —
  // نه صفحهٔ خالی (route.lazy خودش Suspense می‌خواهد).
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
