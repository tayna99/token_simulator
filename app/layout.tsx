import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '../src/index.css'
import { PRODUCT_NAME } from '../src/lib/productBrand'

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: 'AI SaaS 사용량 CSV로 손해 고객, 마진을 깨는 기능, 토큰 정책 후보를 찾는 데모 workspace.',
  other: {
    google: 'notranslate',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" translate="no">
      <body>{children}</body>
    </html>
  )
}
