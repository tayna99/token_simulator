import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '../src/index.css'
import { PRODUCT_NAME } from '../src/lib/productBrand'

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: 'Production demo workspace for AI SaaS cost and agent operations.',
  other: {
    google: 'notranslate',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" translate="no">
      <body>{children}</body>
    </html>
  )
}
