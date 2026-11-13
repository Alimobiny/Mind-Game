import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import { PageSkeleton } from '../components/skeleton/PageSkeleton'
import { createAppRouter } from './router'

const router = createAppRouter()

export function App() {
  // صفحات غیر از خانه با route.lazy بار می‌شوند؛ تا آماده‌شدن اولیهٔ روتر
  // (!initialized — مثل بازکردن مستقیم /reports در بار اول) fallbackElement
  // رندر می‌شود. Suspense بیرونی هم تور ایمنی برای هر ساسپشن آینده است.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RouterProvider router={router} fallbackElement={<PageSkeleton />} />
    </Suspense>
  )
}
