// فرایند اصلی الکترون — نسخهٔ دسکتاپ آزمایشگاه تمرین شناختی
//
// ساده و بی‌وابستگی: فقط dist/ ساخته‌شدهٔ vite را با file:// بار می‌کند.
// روتر اپ در src/app/router.tsx روی پروتکل file: به hash-router سوییچ می‌کند.
// داده‌ها (IndexedDB) در پروفایل کاربر الکترون ذخیره می‌شوند:
//   %APPDATA%/Cognitive Training Lab
// و با Export/JSON صفحهٔ گزارش‌ها به/از نسخهٔ مرورگر منتقل می‌شوند.

const { app, BrowserWindow } = require('electron')
const path = require('node:path')

// --smoke: بارگذاری موفق → ۳ ثانیه → خروج ۰ (راستی‌آزمایی خودکار بیلد)
const SMOKE = process.argv.includes('--smoke')

// اجرای هم‌زمان دوم فقط پنجرهٔ موجود را جلو می‌آورد
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  const createWindow = () => {
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 420,
      minHeight: 560,
      backgroundColor: '#0f172a',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        // اپ وبِ خالص است — هیچ دسترسی Node در رندرر لازم نیست
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    win.once('ready-to-show', () => win.show())
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
    if (SMOKE) {
      win.webContents.once('did-finish-load', () => {
        setTimeout(async () => {
          // اسکرین‌شات برای تأیید رندر واقعی (نه صفحهٔ خالی) — در test-results
          try {
            const image = await win.webContents.capturePage()
            const fs = require('node:fs')
            fs.mkdirSync(path.join(__dirname, '..', 'test-results'), { recursive: true })
            fs.writeFileSync(path.join(__dirname, '..', 'test-results', 'electron-smoke.png'), image.toPNG())
            console.log('smoke-ok')
          } catch (err) {
            console.error('smoke-capture-failed', err)
          }
          app.exit(0)
        }, 3000)
      })
    }
  }

  app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
}
