"use client"

import { useState, useEffect } from "react"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  setDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import {
  Search,
  Plus,
  AlertCircle,
  Trophy,
  Users,
  Target,
  Shield,
  Zap,
  Code,
  Lock,
  Server,
  Brain,
  Activity,
  TrendingUp,
  Filter,
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { WargameChallenge } from "@/lib/wargame-types"

// 워게임 사용자 타입 정의
type WargameUser = {
  uid: string
  username: string
  photoURL?: string
  wargameScore: number
  solvedWargameProblems: string[]
  rank?: number
}

// 활성 사용자 타입 정의
type ActiveUser = {
  uid: string
  username: string
  photoURL?: string
  lastActive: Timestamp
}

// 플랫폼 통계 타입
type PlatformStats = {
  totalChallenges: number
  totalSolves: number
  activeUsers: number
  totalUsers: number
}

export default function WargamePage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [challenges, setChallenges] = useState<WargameChallenge[]>([])
  const [filteredChallenges, setFilteredChallenges] = useState<WargameChallenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState(0)
  const [solvedFilter, setSolvedFilter] = useState("all")
  const [topUsers, setTopUsers] = useState<WargameUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalChallenges: 0,
    totalSolves: 0,
    activeUsers: 0,
    totalUsers: 0,
  })

  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 플랫폼 통계 가져오기
  useEffect(() => {
    const fetchPlatformStats = async () => {
      try {
        const [challengesSnapshot, usersSnapshot] = await Promise.all([
          getDocs(collection(db, "wargame_challenges")),
          getDocs(collection(db, "users")),
        ])

        const totalSolves = challengesSnapshot.docs.reduce((acc, doc) => {
          const data = doc.data()
          return acc + (data.solvedCount || 0)
        }, 0)

        setPlatformStats({
          totalChallenges: challengesSnapshot.size,
          totalSolves,
          activeUsers: activeUsers.length,
          totalUsers: usersSnapshot.size,
        })
      } catch (error) {
        console.error("Error fetching platform stats:", error)
      }
    }

    fetchPlatformStats()
  }, [activeUsers])

  // 활성 사용자 실시간 업데이트
  useEffect(() => {
    const now = Timestamp.now()
    const fiveMinutesAgo = new Timestamp(now.seconds - 300, now.nanoseconds)

    const activeUsersRef = collection(db, "active_users")
    const q = query(activeUsersRef, where("lastActive", ">", fiveMinutesAgo), where("page", "==", "wargame"), limit(50))

    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const users: ActiveUser[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          users.push({
            uid: doc.id,
            username: data.username || "사용자",
            photoURL: data.photoURL,
            lastActive: data.lastActive,
          })
        })

        // 최근 활동 순으로 정렬
        users.sort((a, b) => b.lastActive.seconds - a.lastActive.seconds)
        setActiveUsers(users)
      },
      (error) => {
        console.error("Error listening to active users:", error)
      },
    )

    // 현재 사용자의 활성 상태 업데이트 함수
    const updateUserActivity = async () => {
      if (user && userProfile) {
        try {
          const userActivityRef = doc(db, "active_users", user.uid)
          await updateDoc(userActivityRef, {
            uid: user.uid,
            username: userProfile.username || user.displayName || "사용자",
            photoURL: user.photoURL || userProfile.photoURL,
            lastActive: Timestamp.now(),
            page: "wargame",
          }).catch(async (error) => {
            // 문서가 없으면 새로 생성
            if (error.code === "not-found") {
              await setDoc(userActivityRef, {
                uid: user.uid,
                username: userProfile.username || user.displayName || "사용자",
                photoURL: user.photoURL || userProfile.photoURL,
                lastActive: Timestamp.now(),
                page: "wargame",
              })
            }
          })
        } catch (error) {
          console.error("Error updating user activity:", error)
        }
      }
    }

    // 즉시 업데이트
    updateUserActivity()

    // 30초마다 업데이트 (더 자주 업데이트)
    const interval = setInterval(updateUserActivity, 30000)

    // 페이지 포커스/블러 이벤트 처리
    const handleFocus = () => updateUserActivity()
    const handleBeforeUnload = async () => {
      if (user) {
        try {
          const userActivityRef = doc(db, "active_users", user.uid)
          await updateDoc(userActivityRef, {
            lastActive: Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000)), // 10분 전으로 설정하여 비활성화
          })
        } catch (error) {
          console.error("Error updating user activity on leave:", error)
        }
      }
    }

    window.addEventListener("focus", handleFocus)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      unsubscribe()
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [user, userProfile])

  // 워게임 상위 사용자 불러오기
  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        setIsLoadingUsers(true)
        const usersRef = collection(db, "users")
        const q = query(usersRef, orderBy("wargameScore", "desc"), limit(10))
        const querySnapshot = await getDocs(q)

        const users: WargameUser[] = []
        let rank = 1

        querySnapshot.forEach((doc) => {
          const userData = doc.data()
          users.push({
            uid: doc.id,
            username: userData.username || "사용자",
            photoURL: userData.photoURL,
            wargameScore: userData.wargameScore || 0,
            solvedWargameProblems: userData.solvedWargameProblems || [],
            rank,
          })
          rank++
        })

        setTopUsers(users)
      } catch (error) {
        console.error("Error fetching top users:", error)
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchTopUsers()
  }, [])

  // 워게임 문제 불러오기
  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const challengesRef = collection(db, "wargame_challenges")
        const q = query(challengesRef, orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(q)

        const challengesData: WargameChallenge[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data() as WargameChallenge
          challengesData.push({
            id: doc.id,
            ...data,
            solvedBy: data.solvedBy || [],
            solvedCount: data.solvedCount || 0,
          })
        })

        setChallenges(challengesData)
        setFilteredChallenges(challengesData)
      } catch (error) {
        console.error("Error fetching challenges:", error)
        toast({
          title: "오류 발생",
          description: "문제를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchChallenges()
  }, [toast])

  // 필터링 적용
  useEffect(() => {
    let result = [...challenges]

    if (searchQuery) {
      result = result.filter(
        (challenge) =>
          challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          challenge.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (categoryFilter !== "all") {
      result = result.filter((challenge) => challenge.category === categoryFilter)
    }

    if (difficultyFilter !== "all") {
      result = result.filter((challenge) => challenge.difficulty === difficultyFilter)
    }

    if (levelFilter > 0) {
      result = result.filter((challenge) => challenge.level === levelFilter)
    }

    if (user) {
      if (solvedFilter === "solved") {
        result = result.filter(
          (challenge) => Array.isArray(challenge.solvedBy) && challenge.solvedBy.includes(user.uid),
        )
      } else if (solvedFilter === "unsolved") {
        result = result.filter(
          (challenge) => !Array.isArray(challenge.solvedBy) || !challenge.solvedBy.includes(user.uid),
        )
      }
    }

    setFilteredChallenges(result)
  }, [challenges, searchQuery, categoryFilter, difficultyFilter, levelFilter, solvedFilter, user])

  const difficultyLevels = Array.from({ length: 10 }, (_, i) => i + 1)

  const getLevelColor = (level: number) => {
    if (level <= 3) return "bg-emerald-600/80 text-emerald-100 border-emerald-400"
    if (level <= 6) return "bg-amber-600/80 text-amber-100 border-amber-400"
    if (level <= 8) return "bg-orange-600/80 text-orange-100 border-orange-400"
    return "bg-red-600/80 text-red-100 border-red-400"
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "웹 해킹":
        return <Code className="h-4 w-4" />
      case "시스템 해킹":
        return <Server className="h-4 w-4" />
      case "리버싱":
        return <Brain className="h-4 w-4" />
      case "암호학":
        return <Lock className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 미니멀한 배경 효과 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 via-black to-gray-900/20" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      </div>

      <Navbar />

      <main className="py-8">
        <div className="container mx-auto px-6 max-w-7xl">
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <p className="text-amber-200">
                  이 페이지는 로그인이 필요합니다.{" "}
                  <Link href="/login" className="font-semibold underline hover:text-amber-100 transition-colors">
                    로그인
                  </Link>{" "}
                  또는{" "}
                  <Link href="/register" className="font-semibold underline hover:text-amber-100 transition-colors">
                    회원가입
                  </Link>
                  을 해주세요.
                </p>
              </div>
            </motion.div>
          )}

          {/* 헤더 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ y }}
            className="mb-12 text-center"
          >
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              워게임 문제
            </h1>
            <p className="text-xl text-gray-400 mb-8">다양한 보안 문제를 풀면서 실력을 향상시키세요</p>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {[
                {
                  title: "총 문제",
                  value: platformStats.totalChallenges,
                  icon: <Target className="h-6 w-6" />,
                  color: "blue",
                },
                {
                  title: "총 풀이",
                  value: platformStats.totalSolves,
                  icon: <Trophy className="h-6 w-6" />,
                  color: "amber",
                },
                {
                  title: "활성 사용자",
                  value: platformStats.activeUsers,
                  icon: <Activity className="h-6 w-6" />,
                  color: "emerald",
                },
                {
                  title: "전체 사용자",
                  value: platformStats.totalUsers,
                  icon: <Users className="h-6 w-6" />,
                  color: "purple",
                },
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <Card className="p-6 bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all duration-300 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-400`}>{stat.icon}</div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</div>
                        <div className="text-sm text-gray-400">{stat.title}</div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* 검색 및 액션 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="문제 검색..."
                  className="pl-12 w-80 bg-gray-900/50 border-gray-800 focus:border-blue-500 text-white placeholder-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {isAdmin && (
                <Link href="/admin/wargame/create">
                  <Button className="bg-white text-black hover:bg-gray-200 px-6">
                    <Plus className="mr-2 h-4 w-4" />
                    문제 추가
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 메인 콘텐츠 */}
            <div className="lg:col-span-3 space-y-8">
              {/* 필터 섹션 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                {/* 카테고리 필터 */}
                <Card className="p-6 bg-gray-900/30 border-gray-800 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">분야</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "all", label: "전체", icon: <Filter className="h-4 w-4" /> },
                      { key: "웹 해킹", label: "웹 해킹", icon: <Code className="h-4 w-4" /> },
                      { key: "시스템 해킹", label: "시스템 해킹", icon: <Server className="h-4 w-4" /> },
                      { key: "리버싱", label: "리버싱", icon: <Brain className="h-4 w-4" /> },
                      { key: "암호학", label: "암호학", icon: <Lock className="h-4 w-4" /> },
                    ].map((category) => (
                      <Button
                        key={category.key}
                        variant={categoryFilter === category.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCategoryFilter(category.key)}
                        className={`${
                          categoryFilter === category.key
                            ? "bg-white text-black border-white shadow-lg"
                            : "bg-gray-900 border-gray-500 text-white hover:bg-white hover:text-black hover:border-white"
                        } transition-all duration-200`}
                      >
                        {category.icon}
                        <span className="ml-2">{category.label}</span>
                      </Button>
                    ))}
                  </div>
                </Card>

                {/* 레벨 및 풀이 상태 필터 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 bg-gray-900/30 border-gray-800 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-lg font-semibold text-white">레벨</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={levelFilter === 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLevelFilter(0)}
                        className={`${
                          levelFilter === 0
                            ? "bg-white text-black border-white shadow-lg"
                            : "bg-gray-900 border-gray-500 text-white hover:bg-white hover:text-black hover:border-white"
                        } transition-all duration-200`}
                      >
                        전체
                      </Button>
                      {difficultyLevels.map((level) => (
                        <Button
                          key={level}
                          variant={levelFilter === level ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLevelFilter(level)}
                          className={`w-10 h-10 p-0 font-bold ${
                            levelFilter === level
                              ? "bg-emerald-600 hover:bg-emerald-700 text-black border-emerald-600"
                              : `${getLevelColor(level)} border-2 hover:scale-110 hover:shadow-lg text-black`
                          } transition-all duration-200`}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6 bg-gray-900/30 border-gray-800 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="h-5 w-5 text-amber-400" />
                      <h3 className="text-lg font-semibold text-white">풀이 상태</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: "all", label: "전체" },
                        { key: "unsolved", label: "미해결" },
                        { key: "solved", label: "해결" },
                      ].map((filter) => (
                        <Button
                          key={filter.key}
                          variant={solvedFilter === filter.key ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSolvedFilter(filter.key)}
                          className={`${
                            solvedFilter === filter.key
                              ? "bg-white text-black border-white shadow-lg"
                              : "bg-gray-900 border-gray-500 text-white hover:bg-white hover:text-black hover:border-white"
                          } transition-all duration-200`}
                        >
                          {filter.label}
                        </Button>
                      ))}
                    </div>
                  </Card>
                </div>
              </motion.div>

              {/* 문제 목록 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="bg-gray-900/30 border-gray-800 backdrop-blur-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-800">
                    <div className="text-gray-300">
                      총 <span className="font-semibold text-blue-400">{filteredChallenges.length}</span>개의 문제
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="py-4 px-6 text-left font-semibold text-gray-300">문제</th>
                          <th className="py-4 px-6 text-left font-semibold text-gray-300">분야</th>
                          <th className="py-4 px-6 text-center font-semibold text-gray-300">레벨</th>
                          <th className="py-4 px-6 text-center font-semibold text-gray-300">풀이</th>
                          <th className="py-4 px-6 text-center font-semibold text-gray-300">점수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          Array(5)
                            .fill(0)
                            .map((_, index) => (
                              <tr key={index} className="border-b border-gray-800">
                                <td className="py-6 px-6">
                                  <div className="animate-pulse">
                                    <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
                                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                                  </div>
                                </td>
                                <td className="py-6 px-6">
                                  <div className="h-6 bg-gray-700 rounded w-20 animate-pulse"></div>
                                </td>
                                <td className="py-6 px-6 text-center">
                                  <div className="h-8 w-8 bg-gray-700 rounded-full mx-auto animate-pulse"></div>
                                </td>
                                <td className="py-6 px-6 text-center">
                                  <div className="h-6 bg-gray-700 rounded w-10 mx-auto animate-pulse"></div>
                                </td>
                                <td className="py-6 px-6 text-center">
                                  <div className="h-6 bg-gray-700 rounded w-16 mx-auto animate-pulse"></div>
                                </td>
                              </tr>
                            ))
                        ) : filteredChallenges.length > 0 ? (
                          filteredChallenges.map((challenge, index) => (
                            <motion.tr
                              key={challenge.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ backgroundColor: "rgba(55, 65, 81, 0.3)" }}
                              className="border-b border-gray-800 transition-colors duration-200"
                            >
                              <td className="py-6 px-6">
                                <Link href={`/wargame/${challenge.id}`} className="block group">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <div className="font-semibold text-white group-hover:text-blue-400 transition-colors duration-200">
                                        {challenge.title}
                                      </div>
                                      <div className="text-sm text-gray-400">{challenge.author || "관리자"}</div>
                                    </div>
                                    {user &&
                                      Array.isArray(challenge.solvedBy) &&
                                      challenge.solvedBy.includes(user.uid) && (
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                          ✓ 해결
                                        </Badge>
                                      )}
                                  </div>
                                </Link>
                              </td>
                              <td className="py-6 px-6">
                                <Badge className="bg-gray-800 text-gray-300 border-gray-700 flex items-center gap-1 w-fit">
                                  {getCategoryIcon(challenge.category)}
                                  {challenge.category}
                                </Badge>
                              </td>
                              <td className="py-6 px-6 text-center">
                                <Badge
                                  className={`${getLevelColor(challenge.level)} w-8 h-8 rounded-full flex items-center justify-center font-semibold border`}
                                >
                                  {challenge.level}
                                </Badge>
                              </td>
                              <td className="py-6 px-6 text-center">
                                <span className="font-semibold text-gray-300">{challenge.solvedCount || 0}</span>
                              </td>
                              <td className="py-6 px-6 text-center">
                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-semibold">
                                  {challenge.points} 점
                                </Badge>
                              </td>
                            </motion.tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-12 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <Target className="h-12 w-12 text-gray-600" />
                                <div>
                                  <p className="text-lg font-medium text-gray-400">문제를 찾을 수 없습니다</p>
                                  <p className="text-sm text-gray-500">필터를 변경해보세요</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* 사이드바 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-1 space-y-6"
            >
              {/* 활성 사용자 */}
              <Card className="p-6 bg-gray-900/30 border-gray-800 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <motion.div
                    className="p-2 rounded-lg bg-emerald-500/10"
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(34, 197, 94, 0.4)",
                        "0 0 0 10px rgba(34, 197, 94, 0)",
                        "0 0 0 0 rgba(34, 197, 94, 0.4)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <Users className="h-5 w-5 text-emerald-400" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white">활성 사용자</h3>
                  <motion.div
                    className="ml-auto flex items-center gap-1"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  >
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-xs text-emerald-400 font-medium">LIVE</span>
                  </motion.div>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  현재{" "}
                  <motion.span
                    className="font-semibold text-emerald-400 text-lg"
                    key={activeUsers.length}
                    initial={{ scale: 1.2, color: "#10b981" }}
                    animate={{ scale: 1, color: "#34d399" }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeUsers.length}
                  </motion.span>
                  명이 활동 중
                </p>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {activeUsers.slice(0, 12).map((user, index) => (
                      <motion.div
                        key={user.uid}
                        initial={{ opacity: 0, scale: 0, rotate: -180 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0, rotate: 180 }}
                        transition={{
                          duration: 0.5,
                          delay: index * 0.05,
                          type: "spring",
                          stiffness: 200,
                          damping: 20,
                        }}
                        whileHover={{
                          scale: 1.2,
                          y: -5,
                          transition: { duration: 0.2 },
                        }}
                        className="relative group"
                      >
                        <Avatar className="h-10 w-10 border-2 border-emerald-500/30 transition-all duration-200 group-hover:border-emerald-400">
                          <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.username} />
                          <AvatarFallback className="bg-gray-700 text-white text-xs font-semibold">
                            {user.username?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>

                        {/* 실시간 활성 표시 */}
                        <motion.div
                          className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-gray-900"
                          animate={{
                            scale: [1, 1.2, 1],
                            boxShadow: [
                              "0 0 0 0 rgba(34, 197, 94, 0.7)",
                              "0 0 0 6px rgba(34, 197, 94, 0)",
                              "0 0 0 0 rgba(34, 197, 94, 0.7)",
                            ],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                        />

                        {/* 호버 시 사용자 정보 툴팁 */}
                        <motion.div
                          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10"
                          initial={{ opacity: 0, y: 10 }}
                          whileHover={{ opacity: 1, y: 0 }}
                        >
                          {user.username}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {activeUsers.length > 12 && (
                    <motion.div
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-xs font-medium text-gray-300 border-2 border-gray-600"
                      whileHover={{ scale: 1.1, backgroundColor: "#4b5563" }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      +{activeUsers.length - 12}
                    </motion.div>
                  )}
                </div>

                {/* 최근 접속한 사용자 표시 */}
                {activeUsers.length > 0 && (
                  <motion.div
                    className="mt-4 pt-4 border-t border-gray-700"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="text-xs text-gray-500 mb-2">최근 접속</div>
                    <div className="space-y-1">
                      {activeUsers.slice(0, 3).map((user, index) => {
                        const timeAgo = Math.floor((Date.now() - user.lastActive.toDate().getTime()) / 1000)
                        const timeText =
                          timeAgo < 60
                            ? "방금 전"
                            : timeAgo < 3600
                              ? `${Math.floor(timeAgo / 60)}분 전`
                              : `${Math.floor(timeAgo / 3600)}시간 전`

                        return (
                          <motion.div
                            key={user.uid}
                            className="flex items-center gap-2 text-xs"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.9 + index * 0.1 }}
                          >
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                            <span className="text-gray-400 truncate flex-1">{user.username}</span>
                            <span className="text-gray-500">{timeText}</span>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </Card>

              {/* TOP 10 랭킹 */}
              <Card className="p-6 bg-gray-900/30 border-gray-800 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Trophy className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">TOP 10</h3>
                </div>
                <div className="space-y-3">
                  {isLoadingUsers ? (
                    Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <div key={index} className="flex items-center gap-3 animate-pulse">
                          <div className="w-6 h-6 bg-gray-700 rounded"></div>
                          <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-700 rounded w-3/4 mb-1"></div>
                            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                          </div>
                          <div className="h-4 bg-gray-700 rounded w-12"></div>
                        </div>
                      ))
                  ) : topUsers.length > 0 ? (
                    topUsers.map((user, index) => (
                      <motion.div
                        key={user.uid}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 5 }}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                          index < 3 ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-gray-800/50"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded ${
                            index === 0
                              ? "bg-amber-500 text-black"
                              : index === 1
                                ? "bg-gray-400 text-black"
                                : index === 2
                                  ? "bg-orange-500 text-white"
                                  : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.username} />
                          <AvatarFallback className="bg-gray-700 text-white">
                            {user.username?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">{user.username}</div>
                          <div className="text-xs text-gray-400">{user.solvedWargameProblems?.length || 0}문제</div>
                        </div>
                        <div className="font-bold text-blue-400">{user.wargameScore || 0}</div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>아직 참가자가 없습니다</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* 문제 제출 */}
              <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20 backdrop-blur-sm">
                <h3 className="font-semibold text-white mb-2">문제 제출하기</h3>
                <p className="text-sm text-gray-400 mb-4">여러분의 문제를 공유해주세요!</p>
                <Button
                  className="w-full bg-white text-black hover:bg-gray-200"
                  onClick={() => router.push("/wargame/submit")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  문제 제출
                </Button>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
