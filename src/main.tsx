import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
// فقط زیرمجموعهٔ عربی/فارسی فونت — زیرمجموعه‌های latin/latin-ext برای این
// اپ بی‌استفاده‌اند (~۷۲KB وزن اضافه) و اعداد لاتین به‌ندرت رخ می‌دهد
// (رقم‌ها همه فارسی‌اند؛ fallback سیستم برای موارد جزئی کافی است)
import '@fontsource/vazirmatn/arabic-400.css'
import '@fontsource/vazirmatn/arabic-500.css'
import '@fontsource/vazirmatn/arabic-700.css'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Service Worker فقط در بیلد وبِ پروDUCTION — سرور توسعه و الکترون (file://)
// مستثنا می‌مانند تا جریان تست و دسکتاپ دست‌نخورده بمانند
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  })
}
