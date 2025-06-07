"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Clock, Loader2, Plus, Search, Users, ChevronRight, Filter, Star } from "lucide-react"
import Link from "next/link"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BannerSlider } from "@/components/banner-slider"
import type { Curriculum, CurriculumCategory, Banner } from "@/lib/curriculum-types"

export default function CurriculumPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [categories, setCategories] = useState<CurriculumCategory[]>([])
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeType, setActiveType] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("latest")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"

  // 카테고리 및 커리큘럼 가져오기
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError("")

      // 배너 가져오기 (선택적)
      try {
        const bannersRef = collection(db, "banners")
        const bannersQuery = query(bannersRef, where("isActive", "==", true), orderBy("order", "asc"))
        const bannersSnapshot = await getDocs(bannersQuery)

        const bannersData: Banner[] = []
        bannersSnapshot.forEach((doc) => {
          const data = doc.data()
          bannersData.push({
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            imageUrl: data.imageUrl || "",
            linkUrl: data.linkUrl,
            isActive: data.isActive || false,
            order: data.order || 0,
            backgroundColor: data.backgroundColor || "#3B82F6",
            textColor: data.textColor || "#FFFFFF",
            buttonText: data.buttonText,
            buttonColor: data.buttonColor,
            createdAt: data.createdAt || { toDate: () => new Date() },
            updatedAt: data.updatedAt || { toDate: () => new Date() },
            createdBy: data.createdBy || "",
            startDate: data.startDate,
            endDate: data.endDate,
          })
        })
        setBanners(bannersData)
      } catch (bannerError) {
        console.error("Banner loading error (non-critical):", bannerError)
      }

      // 카테고리 가져오기
      const categoriesRef = collection(db, "curriculum_categories")
      const categoriesQuery = query(categoriesRef, orderBy("order", "asc"))
      const categoriesSnapshot = await getDocs(categoriesQuery)

      const categoriesData: CurriculumCategory[] = []
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data()
        categoriesData.push({
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
          order: data.order || 0,
          createdAt: data.createdAt || { toDate: () => new Date() },
          updatedAt: data.updatedAt || { toDate: () => new Date() },
          createdBy: data.createdBy || "",
        })
      })
      setCategories(categoriesData)

      // 커리큘럼 가져오기
      const curriculumsRef = collection(db, "curriculums")
      let curriculumsQuery

      try {
        curriculumsQuery = query(curriculumsRef, where("isPublished", "==", true), orderBy("createdAt", "desc"))
        const curriculumsSnapshot = await getDocs(curriculumsQuery)

        const curriculumsData: Curriculum[] = []
        curriculumsSnapshot.forEach((doc) => {
          const data = doc.data()
          curriculumsData.push({
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            content: data.content || "",
            category: data.category || "",
            thumbnailUrl: data.thumbnailUrl,
            createdAt: data.createdAt || { toDate: () => new Date() },
            updatedAt: data.updatedAt || { toDate: () => new Date() },
            createdBy: data.createdBy || "",
            createdByName: data.createdByName || "",
            isPublished: data.isPublished || false,
            viewCount: data.viewCount || 0,
            tags: data.tags || [],
            steps: data.steps || [],
            totalSteps: data.totalSteps || 0,
            tier: data.tier || 0,
            difficulty: data.difficulty || "Easy",
            estimatedTime: data.estimatedTime || "",
            courseType: data.courseType || "Skill Path",
            rating: data.rating || 4.5,
            enrollmentCount: data.enrollmentCount || 0,
            instructor: data.instructor || "",
          })
        })
        setCurriculums(curriculumsData)
      } catch (indexError) {
        console.error("Index error, falling back to simple query:", indexError)

        try {
          curriculumsQuery = query(curriculumsRef)
          const curriculumsSnapshot = await getDocs(curriculumsQuery)

          const curriculumsData: Curriculum[] = []
          curriculumsSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.isPublished === true) {
              curriculumsData.push({
                id: doc.id,
                title: data.title || "",
                description: data.description || "",
                content: data.content || "",
                category: data.category || "",
                thumbnailUrl: data.thumbnailUrl,
                createdAt: data.createdAt || { toDate: () => new Date() },
                updatedAt: data.updatedAt || { toDate: () => new Date() },
                createdBy: data.createdBy || "",
                createdByName: data.createdByName || "",
                isPublished: data.isPublished || false,
                viewCount: data.viewCount || 0,
                tags: data.tags || [],
                steps: data.steps || [],
                totalSteps: data.totalSteps || 0,
                tier: data.tier || 0,
                difficulty: data.difficulty || "Easy",
                estimatedTime: data.estimatedTime || "",
                courseType: data.courseType || "Skill Path",
                rating: data.rating || 4.5,
                enrollmentCount: data.enrollmentCount || 0,
                instructor: data.instructor || "",
              })
            }
          })

          curriculumsData.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date()
            const dateB = b.createdAt?.toDate?.() || new Date()
            return dateB.getTime() - dateA.getTime()
          })

          setCurriculums(curriculumsData)
        } catch (fallbackError) {
          console.error("Fallback query error:", fallbackError)
          setError("데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
          setCurriculums([])
        }
      }
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError("데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
      toast({
        title: "데이터 로딩 오류",
        description: `데이터를 불러오지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 검색 및 필터링된 커리큘럼
  const filteredCurriculums = curriculums.filter((curriculum) => {
    const matchesSearch =
      searchQuery === "" ||
      curriculum.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      curriculum.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (curriculum.tags && curriculum.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())))

    const matchesCategory = activeCategory === "all" || curriculum.category === activeCategory
    const matchesType = activeType === "all" || curriculum.courseType === activeType
    const matchesDifficulty = selectedDifficulty === null || curriculum.difficulty === selectedDifficulty

    return matchesSearch && matchesCategory && matchesType && matchesDifficulty
  })

  // 정렬
  const sortedCurriculums = [...filteredCurriculums].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return (b.viewCount || 0) - (a.viewCount || 0)
      case "rating":
        return (b.rating || 0) - (a.rating || 0)
      case "title":
        return a.title.localeCompare(b.title)
      case "latest":
      default:
        const dateA = a.createdAt?.toDate?.() || new Date()
        const dateB = b.createdAt?.toDate?.() || new Date()
        return dateB.getTime() - dateA.getTime()
    }
  })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-900/50 text-green-300 border-green-700"
      case "Medium":
        return "bg-yellow-900/50 text-yellow-300 border-yellow-700"
      case "Hard":
        return "bg-orange-900/50 text-orange-300 border-orange-700"
      case "Expert":
        return "bg-red-900/50 text-red-300 border-red-700"
      default:
        return "bg-gray-900/50 text-gray-300 border-gray-700"
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-400">커리큘럼을 불러오는 중입니다...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Navbar />
      <main className="flex-1">
        {/* 배너 섹션 */}
        {banners.length > 0 && (
          <div className="container mx-auto px-4 md:px-6 pt-6">
            <BannerSlider banners={banners} />
          </div>
        )}

        <div className="container mx-auto px-4 md:px-6 py-8">
          {/* 헤더 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Learning Paths</h1>
              <p className="text-gray-400 text-lg">체계적인 보안 학습 경로를 제공합니다</p>
            </div>
            {isAdmin && (
              <Link href="/admin/curriculum/create">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />새 커리큘럼 작성
                </Button>
              </Link>
            )}
          </div>

          {/* 검색 및 필터 */}
          <div className="mb-8 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="관심 있는 학습 경로를 검색해보세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-gray-900/50 border-gray-700 text-white h-14 text-lg placeholder:text-gray-500 backdrop-blur-sm"
              />
            </div>

            <Tabs value={activeType} onValueChange={setActiveType} className="w-full">
              <TabsList className="bg-gray-900/50 border border-gray-700 backdrop-blur-sm">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
                >
                  All Paths
                </TabsTrigger>
                <TabsTrigger
                  value="Skill Path"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
                >
                  Skill Path
                </TabsTrigger>
                <TabsTrigger
                  value="Job Role Path"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
                >
                  Job Role Path
                </TabsTrigger>
                <TabsTrigger
                  value="Single Course"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300"
                >
                  Single Course
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex gap-8">
            {/* 사이드바 필터 */}
            <div className="hidden lg:block w-80 space-y-6">
              <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
                    <Filter className="h-5 w-5 text-blue-500" />
                    필터
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-200 mb-3">난이도</h4>
                      <div className="space-y-2">
                        {["Easy", "Medium", "Hard", "Expert"].map((difficulty) => (
                          <label key={difficulty} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                              checked={selectedDifficulty === difficulty}
                              onChange={(e) => setSelectedDifficulty(e.target.checked ? difficulty : null)}
                            />
                            <span className="text-sm text-gray-300">{difficulty}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-gray-600 text-gray-400 hover:bg-gray-800"
                      onClick={() => {
                        setSelectedDifficulty(null)
                        setActiveCategory("all")
                        setSearchQuery("")
                      }}
                    >
                      필터 초기화
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-white">
                    Learning Paths <span className="text-gray-400">({sortedCurriculums.length})</span>
                  </h2>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-600 rounded-lg bg-gray-900/50 text-white text-sm backdrop-blur-sm focus:border-blue-500"
                >
                  <option value="latest">최신순</option>
                  <option value="popular">인기순</option>
                  <option value="rating">평점순</option>
                  <option value="title">이름순</option>
                </select>
              </div>

              {/* 커리큘럼 그리드 */}
              {sortedCurriculums.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {sortedCurriculums.map((curriculum) => {
                    const category = categories.find((cat) => cat.id === curriculum.category)

                    return (
                      <Card
                        key={curriculum.id}
                        className="group bg-gray-900/50 border-gray-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-sm hover:shadow-xl hover:shadow-blue-500/10"
                        onClick={() => router.push(`/curriculum/${curriculum.id}`)}
                      >
                        <div className="relative">
                          {/* 썸네일 또는 그라디언트 배경 */}
                          <div className="h-48 bg-gradient-to-br from-blue-900/50 via-purple-900/50 to-gray-900 relative overflow-hidden">
                            {curriculum.thumbnailUrl ? (
                              <img
                                src={curriculum.thumbnailUrl || "/placeholder.svg"}
                                alt={curriculum.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 bg-blue-600/80 rounded-full flex items-center justify-center backdrop-blur-sm">
                                  <BookOpen className="h-10 w-10 text-white" />
                                </div>
                              </div>
                            )}

                            {/* 오버레이 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                            {/* 평점 */}
                            <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-white font-medium">{curriculum.rating || 4.5}</span>
                            </div>
                          </div>

                          <CardContent className="p-6">
                            <div className="mb-4">
                              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                                {curriculum.title}
                              </h3>
                              <p className="text-sm text-gray-400 line-clamp-2 mb-3">{curriculum.description}</p>

                              {curriculum.instructor && (
                                <p className="text-xs text-gray-500 mb-2">강사: {curriculum.instructor}</p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                              <Badge className={`${getDifficultyColor(curriculum.difficulty || "Easy")} text-xs`}>
                                {curriculum.difficulty || "Easy"}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-900/50 text-blue-300 border-blue-700 text-xs">
                                {curriculum.courseType || "Skill Path"}
                              </Badge>
                              {category && (
                                <Badge
                                  variant="outline"
                                  className="bg-purple-900/50 text-purple-300 border-purple-700 text-xs"
                                >
                                  {category.name}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-sm text-gray-400">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  <span>{curriculum.enrollmentCount || curriculum.viewCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{curriculum.estimatedTime || `${curriculum.totalSteps || 0}단계`}</span>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform text-blue-400" />
                            </div>

                            {/* 진행률 표시 (로그인한 사용자만) */}
                            {user && (
                              <div className="mt-4 pt-4 border-t border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-500">진행률</span>
                                  <span className="text-xs text-gray-500">0%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: "0%" }}></div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <BookOpen className="h-12 w-12 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">커리큘럼이 없습니다</h3>
                  <p className="text-gray-400 mb-6 max-w-md">
                    {searchQuery ? "검색 조건에 맞는 커리큘럼이 없습니다." : "아직 등록된 커리큘럼이 없습니다."}
                  </p>
                  {isAdmin && (
                    <Link href="/admin/curriculum/create">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="mr-2 h-4 w-4" />새 커리큘럼 작성
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
