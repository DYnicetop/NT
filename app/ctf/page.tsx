"use client"

import { useState, useEffect, useRef } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, orderBy, type Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import {
  Calendar,
  Trophy,
  Users,
  Lock,
  ArrowRight,
  Shield,
  Clock,
  Flag,
  Terminal,
  Search,
  Filter,
  ChevronDown,
  Sparkles,
  Zap,
  Award,
  BarChart,
  BookOpen,
  Cpu,
  Layers,
  Bookmark,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { Progress } from "@/components/ui/progress"
import { Particles } from "@/components/ui/particles"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// CTF 대회 타입 정의
type CTFContest = {
  id: string
  title: string
  description: string
  startTime: Timestamp
  endTime: Timestamp
  problemCount: number
  participants: string[]
  author: string
  authorId: string
  createdAt: Timestamp
  status: "upcoming" | "active" | "completed"
  isPasswordProtected?: boolean
  difficulty?: string
  category?: string
  bannerImage?: string
  tags?: string[]
}

// 이 줄을 삭제합니다
// type CTFContests = CTFContest // Fix: Declare CTFContests type

export default function CTFPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [contests, setContests] = useState<CTFContest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [showFilters, setShowFilters] = useState(false)
  const [featuredContest, setFeaturedContest] = useState<CTFContest | null>(null)
  const [upcomingContests, setUpcomingContests] = useState<CTFContest[]>([])
  const [activeContests, setActiveContests] = useState<CTFContest[]>([])
  const [completedContests, setCompletedContests] = useState<CTFContest[]>([])
  const [userParticipation, setUserParticipation] = useState<Record<string, boolean>>({})
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLDivElement>(null)

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 마우스 위치 추적
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // CTF 대회 목록 불러오기
  useEffect(() => {
    const fetchContests = async () => {
      try {
        setIsLoading(true)
        const contestsRef = collection(db, "ctf_contests")

        // 인덱스 오류를 방지하기 위해 쿼리 방식 변경
        let querySnapshot

        if (isAdmin) {
          // 관리자는 모든 대회 볼 수 있음
          const q = query(contestsRef, orderBy("startTime", "desc"))
          querySnapshot = await getDocs(q)
        } else {
          // 일반 사용자는 공개 대회만 볼 수 있음
          // 모든 대회를 가져온 후 클라이언트에서 필터링
          const q = query(contestsRef, orderBy("startTime", "desc"))
          const allContestsSnapshot = await getDocs(q)

          // 클라이언트에서 isPublic이 true인 항목만 필터링
          const publicContests = allContestsSnapshot.docs.filter((doc) => doc.data().isPublic === true)

          // QuerySnapshot과 유사한 형태로 만들기
          querySnapshot = {
            forEach: (callback) => {
              publicContests.forEach(callback)
            },
          }
        }

        const contestsData: CTFContest[] = []
        const now = new Date()
        const upcoming: CTFContest[] = []
        const active: CTFContest[] = []
        const completed: CTFContest[] = []
        const userParticipationMap: Record<string, boolean> = {}

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          const startTime = data.startTime?.toDate() || new Date()
          const endTime = data.endTime?.toDate() || new Date()

          let status: "upcoming" | "active" | "completed" = "upcoming"
          if (now < startTime) {
            status = "upcoming"
          } else if (now >= startTime && now <= endTime) {
            status = "active"
          } else {
            status = "completed"
          }

          const contest = {
            id: doc.id,
            ...data,
            status,
          } as CTFContest

          contestsData.push(contest)

          // 사용자 참가 여부 확인
          if (user && data.participants && data.participants.includes(user.uid)) {
            userParticipationMap[doc.id] = true
          }

          // 상태별로 분류
          if (status === "upcoming") {
            upcoming.push(contest)
          } else if (status === "active") {
            active.push(contest)
          } else {
            completed.push(contest)
          }
        })

        // 대회 정렬
        upcoming.sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime())
        active.sort((a, b) => b.endTime.toDate().getTime() - a.endTime.toDate().getTime())
        completed.sort((a, b) => b.endTime.toDate().getTime() - a.endTime.toDate().getTime())

        setContests(contestsData)
        setUpcomingContests(upcoming)
        setActiveContests(active)
        setCompletedContests(completed)
        setUserParticipation(userParticipationMap)

        // 추천 대회 설정
        if (active.length > 0) {
          setFeaturedContest(active[0])
        } else if (upcoming.length > 0) {
          setFeaturedContest(upcoming[0])
        } else if (completed.length > 0) {
          setFeaturedContest(completed[0])
        }
      } catch (error) {
        console.error("Error fetching contests:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContests()
  }, [isAdmin, user])

  // 날짜 포맷 함수
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 남은 시간 계산 함수
  const getTimeRemaining = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()

    if (diff <= 0) return "종료됨"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}일 ${hours}시간 남음`
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`
    return `${minutes}분 남음`
  }

  // 진행률 계산 함수
  const calculateProgress = (startTime: Date, endTime: Date) => {
    const now = new Date()
    const total = endTime.getTime() - startTime.getTime()
    const elapsed = now.getTime() - startTime.getTime()

    if (elapsed <= 0) return 0
    if (elapsed >= total) return 100

    return Math.floor((elapsed / total) * 100)
  }

  // 대회 상세 페이지로 이동하는 함수
  const navigateToContest = (contestId: string) => {
    router.push(`/ctf/${contestId}`)
  }

  // 필터링된 대회 목록
  const filteredContests = contests
    .filter((contest) => {
      // 탭 필터
      if (activeTab !== "all" && contest.status !== activeTab) return false

      // 검색어 필터
      if (
        searchTerm &&
        !contest.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !contest.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false

      // 난이도 필터
      if (difficultyFilter !== "all" && contest.difficulty !== difficultyFilter) return false

      // 카테고리 필터
      if (categoryFilter !== "all" && contest.category !== categoryFilter) return false

      return true
    })
    .sort((a, b) => {
      // 정렬 기준
      if (sortBy === "newest") {
        return b.startTime.toDate().getTime() - a.startTime.toDate().getTime()
      } else if (sortBy === "oldest") {
        return a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
      } else if (sortBy === "popular") {
        return (b.participants?.length || 0) - (a.participants?.length || 0)
      } else if (sortBy === "problems") {
        return (b.problemCount || 0) - (a.problemCount || 0)
      }

      // 기본 정렬: 진행 중인 대회를 먼저 표시
      if (a.status === "active" && b.status !== "active") return -1
      if (a.status !== "active" && b.status === "active") return 1

      // 그 다음 예정된 대회
      if (a.status === "upcoming" && b.status === "completed") return -1
      if (a.status === "completed" && b.status === "upcoming") return 1

      // 같은 상태면 시작 시간 기준 정렬
      return b.startTime.toDate().getTime() - a.startTime.toDate().getTime()
    })

  // 난이도 배지 색상
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "초급":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      case "중급":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
      case "고급":
        return "bg-red-500/20 text-red-500 border-red-500/30"
      default:
        return "bg-blue-500/20 text-blue-500 border-blue-500/30"
    }
  }

  // 카테고리 아이콘
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "웹 해킹":
        return <Terminal className="h-4 w-4" />
      case "시스템 해킹":
        return <Cpu className="h-4 w-4" />
      case "암호학":
        return <Lock className="h-4 w-4" />
      case "포렌식":
        return <BookOpen className="h-4 w-4" />
      case "리버싱":
        return <Layers className="h-4 w-4" />
      default:
        return <Flag className="h-4 w-4" />
    }
  }

  // 애니메이션 변수
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-background/90">
      <Navbar />
      <main className="flex-1">
        {/* 히어로 섹션 */}
        <section ref={heroRef} className="relative py-20 md:py-28 overflow-hidden border-b border-white/10">
          {/* 배경 효과 */}
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

          {/* 파티클 효과 */}
          <div className="absolute inset-0 z-0">
            <Particles className="absolute inset-0" quantity={50} />
          </div>

          {/* 그라데이션 오브 */}
          <div
            className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-3xl"
            style={{
              transform: `translate3d(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px, 0)`,
            }}
          ></div>
          <div
            className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-primary/10 to-cyan-500/10 blur-3xl"
            style={{
              transform: `translate3d(${-mousePosition.x * 0.01}px, ${-mousePosition.y * 0.01}px, 0)`,
            }}
          ></div>

          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="grid gap-12 md:grid-cols-2 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Badge
                    className="px-3 py-1 text-sm border border-primary/20 bg-primary/10 backdrop-blur-sm"
                    variant="outline"
                  >
                    <Flag className="h-3.5 w-3.5 mr-1 text-primary" />
                    <span className="text-primary">Capture The Flag</span>
                  </Badge>
                </motion.div>

                <motion.h1
                  className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-primary-foreground to-white dark:from-primary dark:via-white dark:to-primary"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  CTF 대회
                </motion.h1>

                <motion.p
                  className="text-xl text-muted-foreground"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  보안 기술을 테스트하고 실력을 향상시키는 Capture The Flag 대회에 참가하세요. 다양한 보안 문제를
                  해결하고 플래그를 획득하여 순위를 경쟁하세요.
                </motion.p>

                <motion.div
                  className="flex flex-wrap gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Button
                    size="lg"
                    className="rounded-full bg-gradient-to-r from-primary/80 to-blue-600 hover:from-primary/90 hover:to-blue-600/90 border-0 shadow-lg hover:shadow-primary/20"
                    onClick={() => {
                      if (activeContests.length > 0) {
                        router.push(`/ctf/${activeContests[0].id}`)
                      } else if (upcomingContests.length > 0) {
                        router.push(`/ctf/${upcomingContests[0].id}`)
                      } else {
                        const contestsSection = document.getElementById("contests-section")
                        if (contestsSection) {
                          contestsSection.scrollIntoView({ behavior: "smooth" })
                        }
                      }
                    }}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {activeContests.length > 0
                      ? "진행 중인 대회 참가하기"
                      : upcomingContests.length > 0
                        ? "예정된 대회 보기"
                        : "대회 목록 보기"}
                  </Button>

                  {isAdmin && (
                    <Link href="/admin/ctf/create">
                      <Button variant="outline" size="lg" className="rounded-full">
                        새 대회 만들기
                      </Button>
                    </Link>
                  )}
                </motion.div>

                <motion.div
                  className="flex flex-wrap gap-6 text-sm text-muted-foreground"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span>다양한 보안 문제</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <span>실시간 순위표</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-yellow-500" />
                    <span>점수 시스템</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* 추천 대회 카드 */}
              {featuredContest && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="relative"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-lg blur opacity-30"></div>
                  <Card className="relative overflow-hidden border-2 border-white/10 bg-black/50 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5"></div>
                    <div
                      className="h-48 bg-gradient-to-r from-gray-900 to-gray-700 relative"
                      style={{
                        backgroundImage: featuredContest.bannerImage
                          ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${featuredContest.bannerImage})`
                          : `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(/placeholder.svg?height=160&width=400&text=CTF+Contest)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <div className="absolute inset-0 p-6 flex flex-col justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/80 text-white backdrop-blur-sm">
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                            추천 대회
                          </Badge>

                          {featuredContest.status === "active" ? (
                            <Badge variant="default" className="bg-green-500 text-white">
                              진행 중
                            </Badge>
                          ) : featuredContest.status === "upcoming" ? (
                            <Badge variant="secondary" className="bg-blue-500 text-white">
                              예정됨
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-500 text-white">
                              종료됨
                            </Badge>
                          )}
                        </div>

                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">{featuredContest.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-white/80">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(featuredContest.startTime.toDate()).split(" ")[0]}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              <span>{featuredContest.problemCount || 0}문제</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{featuredContest.participants?.length || 0}명</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <p className="text-muted-foreground line-clamp-2 mb-4">
                        {featuredContest.description.replace(/<[^>]*>?/gm, "")}
                      </p>

                      {featuredContest.status === "active" && (
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">진행률</span>
                            <span className="font-medium">
                              {calculateProgress(featuredContest.startTime.toDate(), featuredContest.endTime.toDate())}%
                            </span>
                          </div>
                          <Progress
                            value={calculateProgress(
                              featuredContest.startTime.toDate(),
                              featuredContest.endTime.toDate(),
                            )}
                            className="h-2"
                          />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatDate(featuredContest.startTime.toDate())}</span>
                            <span>{formatDate(featuredContest.endTime.toDate())}</span>
                          </div>
                        </div>
                      )}

                      {featuredContest.tags && featuredContest.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {featuredContest.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-primary/10 text-primary border-primary/20"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        {featuredContest.status === "active" && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {getTimeRemaining(featuredContest.endTime.toDate())}
                          </Badge>
                        )}
                        {featuredContest.status === "upcoming" && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {getTimeRemaining(featuredContest.startTime.toDate())}
                          </Badge>
                        )}
                        {featuredContest.isPasswordProtected && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                            <Lock className="h-3.5 w-3.5 mr-1" />
                            비밀번호 보호
                          </Badge>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="p-6 pt-0">
                      <Button
                        className="w-full"
                        variant={featuredContest.status === "active" ? "default" : "outline"}
                        onClick={() => navigateToContest(featuredContest.id)}
                      >
                        {featuredContest.status === "active"
                          ? "대회 참가하기"
                          : featuredContest.status === "upcoming"
                            ? "대회 정보 보기"
                            : "결과 확인하기"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* 통계 섹션 */}
        <section className="py-12 border-b border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-muted/30 to-background/0"></div>
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <motion.div
                className="p-6 rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <h3 className="text-3xl font-bold">{contests.length}</h3>
                <p className="text-muted-foreground">총 대회 수</p>
              </motion.div>

              <motion.div
                className="p-6 rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Zap className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h3 className="text-3xl font-bold">{activeContests.length}</h3>
                <p className="text-muted-foreground">진행 중인 대회</p>
              </motion.div>

              <motion.div
                className="p-6 rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h3 className="text-3xl font-bold">{upcomingContests.length}</h3>
                <p className="text-muted-foreground">예정된 대회</p>
              </motion.div>

              <motion.div
                className="p-6 rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <h3 className="text-3xl font-bold">
                  {contests.reduce((total, contest) => total + (contest.participants?.length || 0), 0)}
                </h3>
                <p className="text-muted-foreground">총 참가자 수</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 대회 목록 섹션 */}
        <section id="contests-section" className="py-16 relative">
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">CTF 대회 목록</h2>
                <p className="text-muted-foreground">
                  다양한 CTF 대회에 참가하여 보안 기술을 테스트하고 실력을 향상시키세요.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="대회 검색..."
                    className="pl-10 rounded-lg border-white/10 bg-black/20 backdrop-blur-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-lg border-white/10 bg-black/20 backdrop-blur-sm">
                      <Filter className="h-4 w-4 mr-2" />
                      필터
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-black/80 backdrop-blur-md border-white/10">
                    <div className="p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">정렬 기준</p>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="정렬 기준" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">최신순</SelectItem>
                          <SelectItem value="oldest">오래된순</SelectItem>
                          <SelectItem value="popular">인기순</SelectItem>
                          <SelectItem value="problems">문제 수</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-2 border-t border-white/10">
                      <p className="text-xs font-medium text-muted-foreground mb-2">난이도</p>
                      <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="난이도" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">모든 난이도</SelectItem>
                          <SelectItem value="초급">초급</SelectItem>
                          <SelectItem value="중급">중급</SelectItem>
                          <SelectItem value="고급">고급</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-2 border-t border-white/10">
                      <p className="text-xs font-medium text-muted-foreground mb-2">카테고리</p>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="카테고리" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">모든 카테고리</SelectItem>
                          <SelectItem value="웹 해킹">웹 해킹</SelectItem>
                          <SelectItem value="시스템 해킹">시스템 해킹</SelectItem>
                          <SelectItem value="암호학">암호학</SelectItem>
                          <SelectItem value="포렌식">포렌식</SelectItem>
                          <SelectItem value="리버싱">리버싱</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 flex flex-wrap bg-black/20 backdrop-blur-sm border border-white/10 p-1 rounded-full">
                <TabsTrigger
                  value="all"
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  전체
                </TabsTrigger>
                <TabsTrigger
                  value="active"
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  진행 중
                </TabsTrigger>
                <TabsTrigger
                  value="upcoming"
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  예정됨
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  종료됨
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                {isLoading ? (
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div key={i} variants={item}>
                        <Card className="overflow-hidden border-2 border-muted">
                          <div className="h-40 bg-muted animate-pulse" />
                          <CardHeader>
                            <Skeleton className="h-5 w-20 mb-2" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-2/3" />
                          </CardContent>
                          <CardFooter>
                            <Skeleton className="h-10 w-full" />
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : filteredContests.length === 0 ? (
                  <motion.div
                    className="text-center py-12 border-2 border-dashed rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">대회가 없습니다</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm || difficultyFilter !== "all" || categoryFilter !== "all"
                        ? "검색 조건에 맞는 CTF 대회가 없습니다."
                        : "현재 등록된 CTF 대회가 없습니다."}
                    </p>
                    {(searchTerm || difficultyFilter !== "all" || categoryFilter !== "all") && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("")
                          setDifficultyFilter("all")
                          setCategoryFilter("all")
                        }}
                      >
                        필터 초기화
                      </Button>
                    )}
                    {isAdmin && (
                      <Link href="/admin/ctf/create" className="ml-2">
                        <Button>새 대회 만들기</Button>
                      </Link>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    <AnimatePresence>
                      {filteredContests.map((contest) => (
                        <motion.div
                          key={contest.id}
                          variants={item}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card
                            className={`group h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border-white/10 bg-black/50 backdrop-blur-sm ${
                              contest.status === "active"
                                ? "border-2 border-primary/50"
                                : contest.status === "upcoming"
                                  ? "border-2 border-blue-500/30"
                                  : ""
                            }`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"></div>
                            <div className="absolute -inset-px rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-md pointer-events-none"></div>
                            </div>

                            <div
                              className="h-40 bg-gradient-to-r from-gray-900 to-gray-700 relative"
                              style={{
                                backgroundImage: contest.bannerImage
                                  ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${contest.bannerImage})`
                                  : `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(/placeholder.svg?height=160&width=400&text=CTF+Contest)`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            >
                              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                                <div className="flex items-center gap-2">
                                  {contest.status === "active" ? (
                                    <Badge variant="default" className="bg-green-500 text-white">
                                      진행 중
                                    </Badge>
                                  ) : contest.status === "upcoming" ? (
                                    <Badge variant="secondary" className="bg-blue-500 text-white">
                                      예정됨
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-gray-500 text-white">
                                      종료됨
                                    </Badge>
                                  )}

                                  {contest.isPasswordProtected && (
                                    <Badge variant="outline" className="bg-amber-500/80 text-white">
                                      <Lock className="h-3 w-3 mr-1" />
                                      비밀번호
                                    </Badge>
                                  )}

                                  {userParticipation[contest.id] && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="bg-green-500/80 text-white">
                                            <Bookmark className="h-3 w-3 mr-1" />
                                            참가 중
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>이 대회에 참가 중입니다</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>

                                <div>
                                  <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                    {contest.title}
                                  </h3>

                                  {contest.difficulty && (
                                    <Badge
                                      variant="outline"
                                      className={`mt-2 ${getDifficultyColor(contest.difficulty)} border-0`}
                                    >
                                      {contest.difficulty}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <CardContent className="flex-1 p-4">
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {contest.description.replace(/<[^>]*>?/gm, "")}
                              </p>

                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{formatDate(contest.startTime.toDate())}</span>
                                </div>

                                {contest.status === "active" && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-red-500" />
                                    <span className="font-medium text-red-500">
                                      {getTimeRemaining(contest.endTime.toDate())}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                  <span>{contest.problemCount || 0}문제</span>

                                  <Users className="h-4 w-4 ml-2" />
                                  <span>{contest.participants?.length || 0}명 참가</span>
                                </div>

                                {contest.category && (
                                  <div className="flex items-center gap-2">
                                    {getCategoryIcon(contest.category)}
                                    <span>{contest.category}</span>
                                  </div>
                                )}
                              </div>

                              {contest.tags && contest.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {contest.tags.slice(0, 3).map((tag, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs bg-primary/5 text-primary/80 border-primary/10"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {contest.tags.length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-muted/50 text-muted-foreground border-muted/30"
                                    >
                                      +{contest.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </CardContent>

                            <CardFooter className="p-4 pt-0">
                              <Button
                                className="w-full"
                                variant={contest.status === "active" ? "default" : "outline"}
                                onClick={() => navigateToContest(contest.id)}
                              >
                                {contest.status === "active"
                                  ? "대회 참가하기"
                                  : contest.status === "upcoming"
                                    ? "대회 정보 보기"
                                    : "결과 확인하기"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>

              {/* 다른 탭들도 동일한 내용이 반복되므로 생략 */}
              <TabsContent value="active" className="mt-0">
                {isLoading ? (
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div key={i} variants={item}>
                        <Card className="overflow-hidden border-2 border-muted">
                          <div className="h-40 bg-muted animate-pulse" />
                          <CardHeader>
                            <Skeleton className="h-5 w-20 mb-2" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-2/3" />
                          </CardContent>
                          <CardFooter>
                            <Skeleton className="h-10 w-full" />
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : activeContests.length === 0 ? (
                  <motion.div
                    className="text-center py-12 border-2 border-dashed rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">진행 중인 대회가 없습니다</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm || difficultyFilter !== "all" || categoryFilter !== "all"
                        ? "검색 조건에 맞는 진행 중인 CTF 대회가 없습니다."
                        : "현재 진행 중인 CTF 대회가 없습니다."}
                    </p>
                    {(searchTerm || difficultyFilter !== "all" || categoryFilter !== "all") && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("")
                          setDifficultyFilter("all")
                          setCategoryFilter("all")
                        }}
                      >
                        필터 초기화
                      </Button>
                    )}
                    {isAdmin && (
                      <Link href="/admin/ctf/create" className="ml-2">
                        <Button>새 대회 만들기</Button>
                      </Link>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    <AnimatePresence>
                      {activeContests.map((contest) => (
                        <motion.div
                          key={contest.id}
                          variants={item}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card
                            className={`group h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border-white/10 bg-black/50 backdrop-blur-sm ${
                              contest.status === "active"
                                ? "border-2 border-primary/50"
                                : contest.status === "upcoming"
                                  ? "border-2 border-blue-500/30"
                                  : ""
                            }`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"></div>
                            <div className="absolute -inset-px rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-md pointer-events-none"></div>
                            </div>

                            <div
                              className="h-40 bg-gradient-to-r from-gray-900 to-gray-700 relative"
                              style={{
                                backgroundImage: contest.bannerImage
                                  ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${contest.bannerImage})`
                                  : `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(/placeholder.svg?height=160&width=400&text=CTF+Contest)`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            >
                              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                                <div className="flex items-center gap-2">
                                  {contest.status === "active" ? (
                                    <Badge variant="default" className="bg-green-500 text-white">
                                      진행 중
                                    </Badge>
                                  ) : contest.status === "upcoming" ? (
                                    <Badge variant="secondary" className="bg-blue-500 text-white">
                                      예정됨
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-gray-500 text-white">
                                      종료됨
                                    </Badge>
                                  )}

                                  {contest.isPasswordProtected && (
                                    <Badge variant="outline" className="bg-amber-500/80 text-white">
                                      <Lock className="h-3 w-3 mr-1" />
                                      비밀번호
                                    </Badge>
                                  )}

                                  {userParticipation[contest.id] && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="bg-green-500/80 text-white">
                                            <Bookmark className="h-3 w-3 mr-1" />
                                            참가 중
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>이 대회에 참가 중입니다</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>

                                <div>
                                  <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                    {contest.title}
                                  </h3>

                                  {contest.difficulty && (
                                    <Badge
                                      variant="outline"
                                      className={`mt-2 ${getDifficultyColor(contest.difficulty)} border-0`}
                                    >
                                      {contest.difficulty}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <CardContent className="flex-1 p-4">
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {contest.description.replace(/<[^>]*>?/gm, "")}
                              </p>

                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{formatDate(contest.startTime.toDate())}</span>
                                </div>

                                {contest.status === "active" && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-red-500" />
                                    <span className="font-medium text-red-500">
                                      {getTimeRemaining(contest.endTime.toDate())}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                  <span>{contest.problemCount || 0}문제</span>

                                  <Users className="h-4 w-4 ml-2" />
                                  <span>{contest.participants?.length || 0}명 참가</span>
                                </div>

                                {contest.category && (
                                  <div className="flex items-center gap-2">
                                    {getCategoryIcon(contest.category)}
                                    <span>{contest.category}</span>
                                  </div>
                                )}
                              </div>

                              {contest.tags && contest.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {contest.tags.slice(0, 3).map((tag, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs bg-primary/5 text-primary/80 border-primary/10"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {contest.tags.length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-muted/50 text-muted-foreground border-muted/30"
                                    >
                                      +{contest.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </CardContent>

                            <CardFooter className="p-4 pt-0">
                              <Button
                                className="w-full"
                                variant={contest.status === "active" ? "default" : "outline"}
                                onClick={() => navigateToContest(contest.id)}
                              >
                                {contest.status === "active"
                                  ? "대회 참가하기"
                                  : contest.status === "upcoming"
                                    ? "대회 정보 보기"
                                    : "결과 확인하기"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="mt-0">
                {isLoading ? (
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div key={i} variants={item}>
                        <Card className="overflow-hidden border-2 border-muted">
                          <div className="h-40 bg-muted animate-pulse" />
                          <CardHeader>
                            <Skeleton className="h-5 w-20 mb-2" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-2/3" />
                          </CardContent>
                          <CardFooter>
                            <Skeleton className="h-10 w-full" />
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : upcomingContests.length === 0 ? (
                  <motion.div
                    className="text-center py-12 border-2 border-dashed rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">예정된 대회가 없습니다</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm || difficultyFilter !== "all" || categoryFilter !== "all"
                        ? "검색 조건에 맞는 예정된 CTF 대회가 없습니다."
                        : "현재 예정된 CTF 대회가 없습니다."}
                    </p>
                    {(searchTerm || difficultyFilter !== "all" || categoryFilter !== "all") && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("")
                          setDifficultyFilter("all")
                          setCategoryFilter("all")
                        }}
                      >
                        필터 초기화
                      </Button>
                    )}
                    {isAdmin && (
                      <Link href="/admin/ctf/create" className="ml-2">
                        <Button>새 대회 만들기</Button>
                      </Link>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    <AnimatePresence>
                      {upcomingContests.map((contest) => (
                        <motion.div
                          key={contest.id}
                          variants={item}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card
                            className={`group h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border-white/10 bg-black/50 backdrop-blur-sm ${
                              contest.status === "active"
                                ? "border-2 border-primary/50"
                                : contest.status === "upcoming"
                                  ? "border-2 border-blue-500/30"
                                  : ""
                            }`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"></div>
                            <div className="absolute -inset-px rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-md pointer-events-none"></div>
                            </div>

                            <div
                              className="h-40 bg-gradient-to-r from-gray-900 to-gray-700 relative"
                              style={{
                                backgroundImage: contest.bannerImage
                                  ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${contest.bannerImage})`
                                  : `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(/placeholder.svg?height=160&width=400&text=CTF+Contest)`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            >
                              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                                <div className="flex items-center gap-2">
                                  {contest.status === "active" ? (
                                    <Badge variant="default" className="bg-green-500 text-white">
                                      진행 중
                                    </Badge>
                                  ) : contest.status === "upcoming" ? (
                                    <Badge variant="secondary" className="bg-blue-500 text-white">
                                      예정됨
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-gray-500 text-white">
                                      종료됨
                                    </Badge>
                                  )}

                                  {contest.isPasswordProtected && (
                                    <Badge variant="outline" className="bg-amber-500/80 text-white">
                                      <Lock className="h-3 w-3 mr-1" />
                                      비밀번호
                                    </Badge>
                                  )}

                                  {userParticipation[contest.id] && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="bg-green-500/80 text-white">
                                            <Bookmark className="h-3 w-3 mr-1" />
                                            참가 중
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>이 대회에 참가 중입니다</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>

                                <div>
                                  <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                    {contest.title}
                                  </h3>

                                  {contest.difficulty && (
                                    <Badge
                                      variant="outline"
                                      className={`mt-2 ${getDifficultyColor(contest.difficulty)} border-0`}
                                    >
                                      {contest.difficulty}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <CardContent className="flex-1 p-4">
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {contest.description.replace(/<[^>]*>?/gm, "")}
                              </p>

                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{formatDate(contest.startTime.toDate())}</span>
                                </div>

                                {contest.status === "active" && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-red-500" />
                                    <span className="font-medium text-red-500">
                                      {getTimeRemaining(contest.endTime.toDate())}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                  <span>{contest.problemCount || 0}문제</span>

                                  <Users className="h-4 w-4 ml-2" />
                                  <span>{contest.participants?.length || 0}명 참가</span>
                                </div>

                                {contest.category && (
                                  <div className="flex items-center gap-2">
                                    {getCategoryIcon(contest.category)}
                                    <span>{contest.category}</span>
                                  </div>
                                )}
                              </div>

                              {contest.tags && contest.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {contest.tags.slice(0, 3).map((tag, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs bg-primary/5 text-primary/80 border-primary/10"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {contest.tags.length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-muted/50 text-muted-foreground border-muted/30"
                                    >
                                      +{contest.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </CardContent>

                            <CardFooter className="p-4 pt-0">
                              <Button
                                className="w-full"
                                variant={contest.status === "active" ? "default" : "outline"}
                                onClick={() => navigateToContest(contest.id)}
                              >
                                {contest.status === "active"
                                  ? "대회 참가하기"
                                  : contest.status === "upcoming"
                                    ? "대회 정보 보기"
                                    : "결과 확인하기"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-0">
                {isLoading ? (
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div key={i} variants={item}>
                        <Card className="overflow-hidden border-2 border-muted">
                          <div className="h-40 bg-muted animate-pulse" />
                          <CardHeader>
                            <Skeleton className="h-5 w-20 mb-2" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-2/3" />
                          </CardContent>
                          <CardFooter>
                            <Skeleton className="h-10 w-full" />
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : completedContests.length === 0 ? (
                  <motion.div
                    className="text-center py-12 border-2 border-dashed rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">종료된 대회가 없습니다</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm || difficultyFilter !== "all" || categoryFilter !== "all"
                        ? "검색 조건에 맞는 종료된 CTF 대회가 없습니다."
                        : "현재 종료된 CTF 대회가 없습니다."}
                    </p>
                    {(searchTerm || difficultyFilter !== "all" || categoryFilter !== "all") && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("")
                          setDifficultyFilter("all")
                          setCategoryFilter("all")
                        }}
                      >
                        필터 초기화
                      </Button>
                    )}
                    {isAdmin && (
                      <Link href="/admin/ctf/create" className="ml-2">
                        <Button>새 대회 만들기</Button>
                      </Link>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    <AnimatePresence>
                      {completedContests.map((contest) => (
                        <motion.div
                          key={contest.id}
                          variants={item}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card
                            className={`group h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border-white/10 bg-black/50 backdrop-blur-sm ${
                              contest.status === "active"
                                ? "border-2 border-primary/50"
                                : contest.status === "upcoming"
                                  ? "border-2 border-blue-500/30"
                                  : ""
                            }`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"></div>
                            <div className="absolute -inset-px rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-md pointer-events-none"></div>
                            </div>

                            <div
                              className="h-40 bg-gradient-to-r from-gray-900 to-gray-700 relative"
                              style={{
                                backgroundImage: contest.bannerImage
                                  ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${contest.bannerImage})`
                                  : `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(/placeholder.svg?height=160&width=400&text=CTF+Contest)`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            >
                              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                                <div className="flex items-center gap-2">
                                  {contest.status === "active" ? (
                                    <Badge variant="default" className="bg-green-500 text-white">
                                      진행 중
                                    </Badge>
                                  ) : contest.status === "upcoming" ? (
                                    <Badge variant="secondary" className="bg-blue-500 text-white">
                                      예정됨
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-gray-500 text-white">
                                      종료됨
                                    </Badge>
                                  )}

                                  {contest.isPasswordProtected && (
                                    <Badge variant="outline" className="bg-amber-500/80 text-white">
                                      <Lock className="h-3 w-3 mr-1" />
                                      비밀번호
                                    </Badge>
                                  )}

                                  {userParticipation[contest.id] && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="bg-green-500/80 text-white">
                                            <Bookmark className="h-3 w-3 mr-1" />
                                            참가 중
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>이 대회에 참가 중입니다</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>

                                <div>
                                  <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                    {contest.title}
                                  </h3>

                                  {contest.difficulty && (
                                    <Badge
                                      variant="outline"
                                      className={`mt-2 ${getDifficultyColor(contest.difficulty)} border-0`}
                                    >
                                      {contest.difficulty}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <CardContent className="flex-1 p-4">
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {contest.description.replace(/<[^>]*>?/gm, "")}
                              </p>

                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{formatDate(contest.startTime.toDate())}</span>
                                </div>

                                {contest.status === "active" && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-red-500" />
                                    <span className="font-medium text-red-500">
                                      {getTimeRemaining(contest.endTime.toDate())}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  <Trophy className="h-4 w-4 text-yellow-500" />
                                  <span>{contest.problemCount || 0}문제</span>

                                  <Users className="h-4 w-4 ml-2" />
                                  <span>{contest.participants?.length || 0}명 참가</span>
                                </div>

                                {contest.category && (
                                  <div className="flex items-center gap-2">
                                    {getCategoryIcon(contest.category)}
                                    <span>{contest.category}</span>
                                  </div>
                                )}
                              </div>

                              {contest.tags && contest.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {contest.tags.slice(0, 3).map((tag, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs bg-primary/5 text-primary/80 border-primary/10"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {contest.tags.length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-muted/50 text-muted-foreground border-muted/30"
                                    >
                                      +{contest.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </CardContent>

                            <CardFooter className="p-4 pt-0">
                              <Button
                                className="w-full"
                                variant={contest.status === "active" ? "default" : "outline"}
                                onClick={() => navigateToContest(contest.id)}
                              >
                                {contest.status === "active"
                                  ? "대회 참가하기"
                                  : contest.status === "upcoming"
                                    ? "대회 정보 보기"
                                    : "결과 확인하기"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* CTF 소개 섹션 */}
        <section className="py-16 border-t border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-muted/20 to-background/0"></div>
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="grid gap-12 md:grid-cols-2 items-center">
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold tracking-tight">CTF란 무엇인가요?</h2>
                <p className="text-lg text-muted-foreground">
                  Capture The Flag(CTF)는 정보 보안 분야에서 사용되는 경쟁 방식의 연습 대회입니다. 참가자들은 다양한
                  보안 문제를 해결하고 숨겨진 '플래그'를 찾아 점수를 획득합니다.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Terminal className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold">웹 해킹</h3>
                      <p className="text-muted-foreground">웹 애플리케이션의 취약점을 발견하고 악용하는 문제</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Cpu className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold">시스템 해킹</h3>
                      <p className="text-muted-foreground">운영체제와 네트워크 서비스의 취약점을 찾는 문제</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold">암호학</h3>
                      <p className="text-muted-foreground">암호화 알고리즘과 해시 함수의 약점을 이용하는 문제</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="relative"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-lg blur opacity-30"></div>
                <Card className="relative overflow-hidden border-2 border-white/10 bg-black/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>CTF 참가 방법</CardTitle>
                    <CardDescription>
                      CTF 대회에 참가하는 방법은 간단합니다. 아래 단계를 따라 시작해보세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">1</span>
                      </div>
                      <div>
                        <h3 className="font-bold">계정 생성</h3>
                        <p className="text-muted-foreground">NT CTF 웹사이트에 회원가입하고 로그인합니다.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">2</span>
                      </div>
                      <div>
                        <h3 className="font-bold">대회 선택</h3>
                        <p className="text-muted-foreground">진행 중인 대회를 선택하고 참가 버튼을 클릭합니다.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">3</span>
                      </div>
                      <div>
                        <h3 className="font-bold">문제 해결</h3>
                        <p className="text-muted-foreground">다양한 보안 문제를 해결하고 플래그를 찾아 제출합니다.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">4</span>
                      </div>
                      <div>
                        <h3 className="font-bold">순위 확인</h3>
                        <p className="text-muted-foreground">실시간 순위표에서 자신의 순위와 점수를 확인합니다.</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => {
                        if (activeContests.length > 0) {
                          router.push(`/ctf/${activeContests[0].id}`)
                        } else if (upcomingContests.length > 0) {
                          router.push(`/ctf/${upcomingContests[0].id}`)
                        } else {
                          const contestsSection = document.getElementById("contests-section")
                          if (contestsSection) {
                            contestsSection.scrollIntoView({ behavior: "smooth" })
                          }
                        }
                      }}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      지금 시작하기
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
