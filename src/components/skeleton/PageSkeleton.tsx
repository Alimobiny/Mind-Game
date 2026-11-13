import styles from './skeleton.module.css'

/**
 * اسکلتون بارگذاری صفحه — جایگزین صفحهٔ خالی هنگام دریافت chunkهای lazy
 * (تمرین/برنامه/سیر/گزارش). ساختار سادهٔ نوار + کارت‌ها با درخشش آرام؛
 * زیر prefers-reduced-motion فقط سطوح ساکن می‌مانند.
 */
export function PageSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="در حال بارگذاری صفحه">
      <span className={styles.bar} aria-hidden="true" />
      <span className={`${styles.block} ${styles.blockWide}`} aria-hidden="true" />
      <span className={styles.rowGroup} aria-hidden="true">
        <span className={styles.row} />
        <span className={`${styles.row} ${styles.rowShort}`} />
      </span>
      <span className={`${styles.block} ${styles.blockTall}`} aria-hidden="true" />
    </div>
  )
}
