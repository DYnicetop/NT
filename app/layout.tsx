import type { ReactNode } from "react"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth-context"
import "./globals.css"
import { SearchProvider } from "@/components/search-provider"
import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata } from "next"
import { NotificationListener } from "@/components/notification-listener"
import { Suspense } from "react"
import { SanctionInitializer } from "@/components/sanction-initializer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NiceTop CTF",
  description:
    "덕영고등학교 정보보안소프트웨어과가 개발한 최첨단 사이버 보안 플랫폼입니다. NiceTop 팀의 전문 기술력으로 구현된 이 플랫폼은 워게임, CTF 대회, 커뮤니티 기능을 통해 실전적인 보안 경험을 제공합니다. 미래 사이버 보안 전문가를 위한 최적의 훈련 환경을 경험해보세요.",
  icons: {
    icon: "/NT-Logo.png",
  },
    generator: 'v0.dev'
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.className} dark`}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              }
            >
              <SearchProvider>
                <NotificationListener />
                <SanctionInitializer />
                {children}
              </SearchProvider>
            </Suspense>
          </ThemeProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
