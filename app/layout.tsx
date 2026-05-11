import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import './tailwind-theme.css';

export const metadata: Metadata = {
  title: {
    default: 'Ticketa — 백화점 상품권을 안전하게',
    template: '%s · Ticketa',
  },
  description:
    '롯데·현대·신세계·갤러리아·AK 백화점 상품권 B2C 마켓플레이스. 검수 통과한 매물만, 분쟁은 어드민이 중재.',
  applicationName: 'Ticketa',
  openGraph: {
    title: 'Ticketa — 백화점 상품권을 안전하게',
    description: '에이전트가 검수한 매물만, 분쟁은 어드민이 중재. 백화점 상품권 B2C 거래 플랫폼.',
    siteName: 'Ticketa',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Ticketa — 백화점 상품권을 안전하게',
    description: '에이전트가 검수한 매물만, 분쟁은 어드민이 중재.',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="antialiased">
      <body className="flex min-h-svh flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
