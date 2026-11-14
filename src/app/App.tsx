import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RouterProvider } from 'react-router-dom'
import { PageSkeleton } from '../components/skeleton/PageSkeleton'
import { createAppRouter } from './router'

const router = createAppRouter()

/** مرز خطای ریشه — خطای رندر هر صفحه نباید اپ را سفید کند */
class RootErrorBoundary extends Component<
  { readonly children: ReactNode },
  { readonly error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('خطای رندر نگاه‌داشته نشد:', error, info.componentStack)
  }

  render() {
    if (this.state.error !== null) {
      return (
        <main className="app-shell" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <h1>خطای غیرمنتظره</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: 'var(--space-4) 0' }}>
            نمایش این صفحه با خطا روبه‌رو شد. داده‌های شما روی همین دستگاه سالم است — از
            صفحهٔ اصلی دوباره شروع کن.
          </p>
          <Link to="/" style={{ color: 'var(--color-primary)' }}>
            بازگشت به خانه
          </Link>
        </main>
      )
    }
    return this.props.children
  }
}

export function App() {
  // صفحات غیر از خانه با route.lazy بار می‌شوند؛ تا آماده‌شدن اولیهٔ روتر
  // (!initialized — مثل بازکردن مستقیم /reports در بار اول) fallbackElement
  // رندر می‌شود. Suspense بیرونی هم تور ایمنی برای هر ساسپشن آینده است.
  return (
    <RootErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <RouterProvider router={router} fallbackElement={<PageSkeleton />} />
      </Suspense>
    </RootErrorBoundary>
  )
}
