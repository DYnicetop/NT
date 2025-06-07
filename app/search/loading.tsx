import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Skeleton } from "@/components/ui/skeleton"
import { Search } from "lucide-react"

export default function SearchLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* 검색 헤더 섹션 */}
        <section className="relative py-12 md:py-16 border-b">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-[800px]">
              <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">검색 결과</h1>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>

              <div className="mt-4">
                <Skeleton className="h-5 w-64" />
              </div>
            </div>
          </div>
        </section>

        {/* 검색 결과 섹션 */}
        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            <Skeleton className="h-10 w-full max-w-md mb-8" />

            <div className="space-y-8">
              <div>
                <Skeleton className="h-8 w-40 mb-4" />
                <div className="grid gap-6 md:grid-cols-2">
                  <Skeleton className="h-64 w-full rounded-lg" />
                  <Skeleton className="h-64 w-full rounded-lg" />
                </div>
              </div>

              <div>
                <Skeleton className="h-8 w-40 mb-4" />
                <div className="grid gap-6 md:grid-cols-2">
                  <Skeleton className="h-64 w-full rounded-lg" />
                  <Skeleton className="h-64 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
