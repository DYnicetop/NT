"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import {
  User,
  Calendar,
  Trophy,
  Terminal,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeftIcon,
  MapPin,
  Globe,
  FileText,
  Building,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Code,
  Cpu,
  Database,
  Lock,
  Puzzle,
  Server,
  Smartphone,
} from "lucide-react"
import {
  doc as firebaseDoc,
  getDoc as firebaseGetDoc,
  query,
  where,
  getDocs,
  Timestamp,
  collection,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { type UserProfile, type SolvedChallenge, normalizeUserProfileData } from "@/lib/user-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { calculateLevelFromExp } from "@/lib/level-system"
import { TIERS, getTierByPoints, getTierIcon, getNextTier, calculateTierProgress } from "@/lib/tier-system"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// 카테고리별 아이콘 매핑
const categoryIcons: Record<string, React.ReactNode> = {
  "웹 해킹": <Globe className="h-4 w-4" />,
  "시스템 해킹": <Terminal className="h-4 w-4" />,
  리버싱: <Cpu className="h-4 w-4" />,
  암호학: <Lock className="h-4 w-4" />,
  포렌식: <FileText className="h-4 w-4" />,
  네트워크: <Server className="h-4 w-4" />,
  모바일: <Smartphone className="h-4 w-4" />,
  기타: <Puzzle className="h-4 w-4" />,
  "코드 분석": <Code className="h-4 w-4" />,
  데이터베이스: <Database className="h-4 w-4" />,
}

// 난이도별 색상 매핑
const difficultyColors: Record<string, string> = {
  초급: "text-green-500",
  중급: "text-yellow-500",
  고급: "text-red-500",
}

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [solvedChallenges, setSolvedChallenges] = useState<SolvedChallenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [wargameCount, setWargameCount] = useState(0)
  const [ctfCount, setCtfCount] = useState(0)
  const [verifiedAffiliations, setVerifiedAffiliations] = useState<any[]>([])
  const [userLevel, setUserLevel] = useState({ level: 1, currentExp: 0, requiredExp: 100, totalExp: 0 })
  const [userTier, setUserTier] = useState(TIERS[0])
  const [nextTier, setNextTier] = useState(TIERS[1])
  const [tierProgress, setTierProgress] = useState(0)
  const [currentTab, setCurrentTab] = useState("profile")
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null)
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({})
  const [difficultyStats, setDifficultyStats] = useState<Record<string, number>>({})

  // 사용자 프로필 불러오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userRef = firebaseDoc(db, "users", params.id)
        const userSnap = await firebaseGetDoc(userRef)

        if (userSnap.exists()) {
          const userData = userSnap.data()
          const normalizedProfile = normalizeUserProfileData(userData, userSnap.id)
          setProfile(normalizedProfile)

          // 인증된 소속 정보 설정
          if (normalizedProfile.affiliations && Array.isArray(normalizedProfile.affiliations)) {
            const verified = normalizedProfile.affiliations.filter((aff) => aff.isVerified)
            setVerifiedAffiliations(verified)
          } else {
            setVerifiedAffiliations([])
          }

          // 레벨 계산
          const totalExp = userData.exp || 0
          const levelInfo = calculateLevelFromExp(totalExp)
          setUserLevel(levelInfo)

          // 티어 계산
          const totalPoints = userData.points || 0
          const tier = getTierByPoints(totalPoints)
          setUserTier(tier)

          // 다음 티어 및 진행률 계산
          const next = getNextTier(tier)
          setNextTier(next)
          if (next) {
            const progress = calculateTierProgress(totalPoints, tier)
            setTierProgress(progress)
          } else {
            setTierProgress(100) // 최고 티어인 경우
          }

          // 해결한 문제 불러오기
          await fetchSolvedChallenges(userSnap.id, normalizedProfile)
        } else {
          toast({
            title: "사용자를 찾을 수 없습니다",
            description: "요청하신 사용자 프로필이 존재하지 않습니다.",
            variant: "destructive",
          })
          router.push("/ranking")
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
        toast({
          title: "오류 발생",
          description: "사용자 프로필을 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchUserProfile()
    }
  }, [params.id, router, toast])

  // 해결한 문제 불러오기 - 모든 가능한 데이터 소스에서 통합 조회
  const fetchSolvedChallenges = async (userId: string, profileData: UserProfile | null) => {
    console.log("=== 사용자 활동 기록 수집 시작 ===")
    console.log("사용자 ID:", userId)

    try {
      const wargameChallenges: SolvedChallenge[] = []
      const ctfChallenges: SolvedChallenge[] = []

      // 1. 워게임 문제 컬렉션에서 직접 조회 (가장 정확한 방법)
      try {
        const wargameRef = collection(db, "wargame_challenges")
        const wargameSnapshot = await getDocs(wargameRef)

        console.log("워게임 문제 총 개수:", wargameSnapshot.size)

        wargameSnapshot.forEach((doc) => {
          const data = doc.data()

          // solvedBy 배열에 사용자 ID가 포함되어 있는지 확인
          if (data.solvedBy && Array.isArray(data.solvedBy)) {
            const isSolved = data.solvedBy.some((solver) => {
              // 문자열인 경우와 객체인 경우 모두 처리
              if (typeof solver === "string") {
                return solver === userId
              } else if (typeof solver === "object" && solver.userId) {
                return solver.userId === userId
              }
              return false
            })

            if (isSolved) {
              // 해결 시간 찾기
              let solvedAt = Timestamp.now()

              // solvedTimes 객체에서 해결 시간 찾기
              if (data.solvedTimes && data.solvedTimes[userId]) {
                solvedAt = data.solvedTimes[userId]
              }
              // solvedBy가 객체 배열인 경우 해결 시간 찾기
              else if (Array.isArray(data.solvedBy)) {
                const solverInfo = data.solvedBy.find(
                  (solver) => typeof solver === "object" && solver.userId === userId,
                )
                if (solverInfo && solverInfo.solvedAt) {
                  solvedAt = solverInfo.solvedAt
                }
              }

              // 레벨에 따른 점수 계산
              const level = data.level || 1
              const points = data.points || calculatePointsByLevel(level)

              wargameChallenges.push({
                id: doc.id,
                title: data.title || "워게임 문제",
                category: data.category || "기타",
                difficulty: data.difficulty || `레벨 ${level}`,
                points: points,
                solvedAt: solvedAt,
                type: "wargame",
              })
            }
          }
        })

        console.log("워게임 문제에서 찾은 해결 기록:", wargameChallenges.length)
      } catch (error) {
        console.error("워게임 문제 조회 오류:", error)
      }

      // 2. CTF 문제 해결 기록 조회
      try {
        const ctfContestsRef = collection(db, "ctf_contests")
        const ctfContestsSnapshot = await getDocs(ctfContestsRef)

        for (const contestDoc of ctfContestsSnapshot.docs) {
          const contestData = contestDoc.data()

          try {
            const ctfProblemsRef = collection(db, "ctf_problems")
            const ctfProblemsQuery = query(ctfProblemsRef, where("contestId", "==", contestDoc.id))
            const ctfProblemsSnapshot = await getDocs(ctfProblemsQuery)

            ctfProblemsSnapshot.forEach((problemDoc) => {
              const problemData = problemDoc.data()

              // solvedBy 배열에 사용자 ID가 포함되어 있는지 확인
              if (problemData.solvedBy && Array.isArray(problemData.solvedBy)) {
                const isSolved = problemData.solvedBy.some((solver) => {
                  if (typeof solver === "string") {
                    return solver === userId
                  } else if (typeof solver === "object" && solver.userId) {
                    return solver.userId === userId
                  }
                  return false
                })

                if (isSolved) {
                  // 해결 시간 찾기
                  let solvedAt = Timestamp.now()

                  if (problemData.solvedTimes && problemData.solvedTimes[userId]) {
                    solvedAt = problemData.solvedTimes[userId]
                  } else if (Array.isArray(problemData.solvedBy)) {
                    const solverInfo = problemData.solvedBy.find(
                      (solver) => typeof solver === "object" && solver.userId === userId,
                    )
                    if (solverInfo && solverInfo.solvedAt) {
                      solvedAt = solverInfo.solvedAt
                    }
                  }

                  ctfChallenges.push({
                    id: problemDoc.id,
                    title: problemData.title || "CTF 문제",
                    category: problemData.category || "CTF",
                    difficulty: problemData.difficulty || "중급",
                    points: problemData.points || 0,
                    solvedAt: solvedAt,
                    type: "ctf",
                    contestId: contestDoc.id,
                    contestTitle: contestData.title,
                  })
                }
              }
            })
          } catch (problemError) {
            console.error(`CTF 문제 조회 오류 (대회 ${contestDoc.id}):`, problemError)
          }
        }

        console.log("CTF 문제에서 찾은 해결 기록:", ctfChallenges.length)
      } catch (error) {
        console.error("CTF 문제 조회 오류:", error)
      }

      // 3. 해결 로그 컬렉션에서 추가 데이터 조회
      try {
        // 워게임 해결 로그
        const wargameSolveLogsRef = collection(db, "wargame_solve_logs")
        const wargameLogsQuery = query(wargameSolveLogsRef, where("userId", "==", userId))
        const wargameLogsSnapshot = await getDocs(wargameLogsQuery)

        wargameLogsSnapshot.forEach((doc) => {
          const data = doc.data()

          // 중복 체크
          if (!wargameChallenges.some((challenge) => challenge.id === data.challengeId)) {
            wargameChallenges.push({
              id: data.challengeId || doc.id,
              title: data.challengeTitle || data.title || "워게임 문제",
              category: data.category || "기타",
              difficulty: data.difficulty || data.level ? `레벨 ${data.level}` : "중급",
              points: data.points || 0,
              solvedAt: data.solvedAt || data.timestamp || Timestamp.now(),
              type: "wargame",
            })
          }
        })

        // CTF 해결 로그
        const ctfSolveLogsRef = collection(db, "ctf_solve_logs")
        const ctfLogsQuery = query(ctfSolveLogsRef, where("userId", "==", userId))
        const ctfLogsSnapshot = await getDocs(ctfLogsQuery)

        ctfLogsSnapshot.forEach((doc) => {
          const data = doc.data()

          // 중복 체크
          if (!ctfChallenges.some((challenge) => challenge.id === (data.problemId || data.challengeId))) {
            ctfChallenges.push({
              id: data.problemId || data.challengeId || doc.id,
              title: data.problemTitle || data.challengeTitle || "CTF 문제",
              category: data.category || "CTF",
              difficulty: data.difficulty || "중급",
              points: data.points || 0,
              solvedAt: data.solvedAt || data.timestamp || Timestamp.now(),
              type: "ctf",
              contestId: data.contestId,
              contestTitle: data.contestTitle,
            })
          }
        })

        console.log("해결 로그에서 추가로 찾은 워게임:", wargameChallenges.length)
        console.log("해결 로그에서 추가로 찾은 CTF:", ctfChallenges.length)
      } catch (error) {
        console.error("해결 로그 조회 오류:", error)
      }

      // 4. 통합 해결 로그에서 조회
      try {
        const userSolveLogsRef = collection(db, "user_solve_logs")
        const userLogsQuery = query(userSolveLogsRef, where("userId", "==", userId))
        const userLogsSnapshot = await getDocs(userLogsQuery)

        userLogsSnapshot.forEach((doc) => {
          const data = doc.data()

          if (data.type === "wargame") {
            if (!wargameChallenges.some((challenge) => challenge.id === data.challengeId)) {
              wargameChallenges.push({
                id: data.challengeId || doc.id,
                title: data.challengeTitle || data.title || "워게임 문제",
                category: data.category || "기타",
                difficulty: data.difficulty || "중급",
                points: data.points || 0,
                solvedAt: data.solvedAt || data.timestamp || Timestamp.now(),
                type: "wargame",
              })
            }
          } else if (data.type === "ctf") {
            if (!ctfChallenges.some((challenge) => challenge.id === (data.problemId || data.challengeId))) {
              ctfChallenges.push({
                id: data.problemId || data.challengeId || doc.id,
                title: data.problemTitle || data.challengeTitle || "CTF 문제",
                category: data.category || "CTF",
                difficulty: data.difficulty || "중급",
                points: data.points || 0,
                solvedAt: data.solvedAt || data.timestamp || Timestamp.now(),
                type: "ctf",
                contestId: data.contestId,
                contestTitle: data.contestTitle,
              })
            }
          }
        })

        console.log("통합 로그에서 최종 워게임:", wargameChallenges.length)
        console.log("통합 로그에서 최종 CTF:", ctfChallenges.length)
      } catch (error) {
        console.error("통합 해결 로그 조회 오류:", error)
      }

      // 5. 사용자 프로필의 solvedChallenges 배열 활용 (백업)
      if (profileData && profileData.solvedChallenges && Array.isArray(profileData.solvedChallenges)) {
        console.log("사용자 프로필에서 해결 문제 ID 목록:", profileData.solvedChallenges.length)

        for (const challengeId of profileData.solvedChallenges) {
          // 이미 추가되지 않은 경우에만 추가
          if (!wargameChallenges.some((challenge) => challenge.id === challengeId)) {
            try {
              const challengeRef = firebaseDoc(db, "wargame_challenges", challengeId)
              const challengeSnap = await firebaseGetDoc(challengeRef)

              if (challengeSnap.exists()) {
                const data = challengeSnap.data()
                const level = data.level || 1
                const points = data.points || calculatePointsByLevel(level)

                wargameChallenges.push({
                  id: challengeSnap.id,
                  title: data.title || "워게임 문제",
                  category: data.category || "기타",
                  difficulty: data.difficulty || `레벨 ${level}`,
                  points: points,
                  solvedAt: data.solvedTimes?.[userId] || data.createdAt || Timestamp.now(),
                  type: "wargame",
                })
              }
            } catch (err) {
              console.log("개별 문제 조회 실패:", challengeId, err)
            }
          }
        }
      }

      // 워게임과 CTF 개수 설정
      setWargameCount(wargameChallenges.length)
      setCtfCount(ctfChallenges.length)

      // 모든 문제 합치기 및 정렬
      const allChallenges = [...wargameChallenges, ...ctfChallenges]

      // 중복 제거 (ID 기준)
      const uniqueChallenges = allChallenges.filter(
        (challenge, index, self) => index === self.findIndex((c) => c.id === challenge.id),
      )

      // 해결 날짜 기준으로 정렬 (최신순)
      uniqueChallenges.sort((a, b) => {
        const dateA = a.solvedAt?.toDate ? a.solvedAt.toDate() : new Date()
        const dateB = b.solvedAt?.toDate ? b.solvedAt.toDate() : new Date()
        return dateB.getTime() - dateA.getTime()
      })

      setSolvedChallenges(uniqueChallenges)

      // 카테고리 및 난이도 통계 계산
      const categories: Record<string, number> = {}
      const difficulties: Record<string, number> = {
        초급: 0,
        중급: 0,
        고급: 0,
        대회: 0,
      }

      uniqueChallenges.forEach((challenge) => {
        categories[challenge.category] = (categories[challenge.category] || 0) + 1

        // 난이도 매핑
        if (
          challenge.difficulty.includes("레벨 1") ||
          challenge.difficulty.includes("레벨 2") ||
          challenge.difficulty === "초급"
        ) {
          difficulties["초급"]++
        } else if (
          challenge.difficulty.includes("레벨 3") ||
          challenge.difficulty.includes("레벨 4") ||
          challenge.difficulty === "중급"
        ) {
          difficulties["중급"]++
        } else if (challenge.difficulty.includes("레벨") || challenge.difficulty === "고급") {
          difficulties["고급"]++
        } else if (challenge.difficulty === "대회") {
          difficulties["대회"]++
        } else {
          difficulties["중급"]++ // 기본값
        }
      })

      setCategoryStats(categories)
      setDifficultyStats(difficulties)

      console.log("=== 최종 결과 ===")
      console.log("총 해결 문제:", uniqueChallenges.length)
      console.log("워게임:", wargameChallenges.length)
      console.log("CTF:", ctfChallenges.length)
      console.log("카테고리 통계:", categories)
      console.log("난이도 통계:", difficulties)
    } catch (error) {
      console.error("활동 기록 조회 중 전체 오류:", error)
      setSolvedChallenges([])
      setWargameCount(0)
      setCtfCount(0)
      setCategoryStats({})
      setDifficultyStats({ 초급: 0, 중급: 0, 고급: 0, 대회: 0 })
    }
  }

  // 레벨에 따른 점수 계산 함수 추가
  const calculatePointsByLevel = (level: number): number => {
    const basePoints = 100
    const weights = {
      1: 1, // 100점
      2: 1.5, // 150점
      3: 2, // 200점
      4: 2.5, // 250점
      5: 3, // 300점
      6: 4, // 400점
      7: 5, // 500점
      8: 6, // 600점
      9: 8, // 800점
      10: 10, // 1000점
    }

    const weight = weights[level as keyof typeof weights] || 1
    return Math.round(basePoints * weight)
  }

  // 날짜 포맷 함수
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // 문제 상세 정보 토글
  const toggleChallengeDetails = (id: string) => {
    if (expandedChallenge === id) {
      setExpandedChallenge(null)
    } else {
      setExpandedChallenge(id)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-background/80">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              뒤로 가기
            </Button>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ) : profile ? (
              <motion.div
                className="flex justify-between items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                    {profile.username}님의 프로필
                  </h1>
                  <p className="text-muted-foreground">
                    {profile.createdAt?.toDate ? formatDate(profile.createdAt.toDate()) : ""}부터 활동 중
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold">사용자를 찾을 수 없습니다</h3>
                <p className="text-muted-foreground mt-2">요청하신 사용자 프로필이 존재하지 않습니다.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/ranking")}>
                  랭킹 페이지로
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <Skeleton className="h-[400px] w-full" />
              </div>
              <div className="md:col-span-2">
                <Skeleton className="h-[400px] w-full" />
              </div>
            </div>
          ) : profile ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="backdrop-blur-sm bg-card/80 border-primary/10 shadow-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                    <CardHeader className="text-center relative z-10">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300, damping: 10 }}
                      >
                        <Avatar className="mx-auto h-24 w-24 border-2 border-primary/20 ring-4 ring-background">
                          <AvatarImage src={profile.photoURL || "/placeholder.svg"} alt={profile.username} />
                          <AvatarFallback>
                            <User className="h-12 w-12" />
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                      <CardTitle className="mt-4 text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                        {profile.username}
                      </CardTitle>
                      <div className="flex flex-col items-center gap-2 mt-2">
                        {profile.title && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {profile.title}
                          </Badge>
                        )}
                        {profile.rank > 0 && (
                          <Badge variant="outline" className="bg-primary/10">
                            {profile.rank}위
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                      {/* 레벨 정보 */}
                      <motion.div
                        className="space-y-2"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">레벨</span>
                          <motion.span
                            className="font-bold"
                            initial={{ color: "#FFFFFF" }}
                            animate={{ color: "#FFFFFF" }}
                            whileHover={{
                              color: ["#FFFFFF", "#FFD700", "#FFFFFF"],
                              transition: {
                                duration: 1.5,
                                repeat: Number.POSITIVE_INFINITY,
                              },
                            }}
                          >
                            Lv. {userLevel.level}
                          </motion.span>
                        </div>
                        <div className="relative">
                          <Progress value={(userLevel.currentExp / userLevel.requiredExp) * 100} className="h-2" />
                          <motion.div
                            className="absolute top-0 left-0 h-full bg-primary/30 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{
                              width: `${(userLevel.currentExp / userLevel.requiredExp) * 100}%`,
                              transition: { duration: 1.5, ease: "easeOut" },
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{userLevel.currentExp} EXP</span>
                          <span>{userLevel.requiredExp} EXP</span>
                        </div>
                      </motion.div>

                      {/* 티어 정보 */}
                      <motion.div
                        className="space-y-2"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">티어</span>
                          <div className="flex items-center gap-1">
                            <motion.div
                              style={{ color: userTier.color }}
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.8 }}
                            >
                              {getTierIcon(userTier.icon)}
                            </motion.div>
                            <span className="font-bold" style={{ color: userTier.color }}>
                              {userTier.name}
                            </span>
                          </div>
                        </div>
                        {nextTier && (
                          <>
                            <div className="relative">
                              <Progress
                                value={tierProgress}
                                className="h-2"
                                style={{
                                  background: `linear-gradient(to right, ${userTier.color}40, ${nextTier.color}40)`,
                                }}
                              />
                              <motion.div
                                className="absolute top-0 left-0 h-full rounded-full"
                                style={{
                                  background: `linear-gradient(to right, ${userTier.color}, ${nextTier.color})`,
                                  opacity: 0.6,
                                }}
                                initial={{ width: "0%" }}
                                animate={{
                                  width: `${tierProgress}%`,
                                  transition: { duration: 1.5, ease: "easeOut" },
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{profile.points} 점</span>
                              <span>
                                다음 티어: {nextTier.name} ({nextTier.minPoints} 점)
                              </span>
                            </div>
                          </>
                        )}
                      </motion.div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">총 점수</span>
                          <span className="font-bold">{profile.points} 점</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <motion.div
                          className="rounded-lg border p-3 bg-card/50 hover:bg-card/80 transition-colors"
                          whileHover={{
                            scale: 1.03,
                            boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <div className="flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">워게임</span>
                          </div>
                          <p className="mt-1 text-xl font-bold">{wargameCount} 문제</p>
                          <p className="text-sm text-muted-foreground">{profile.wargamePoints || 0} 점</p>
                        </motion.div>
                        <motion.div
                          className="rounded-lg border p-3 bg-card/50 hover:bg-card/80 transition-colors"
                          whileHover={{
                            scale: 1.03,
                            boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">CTF</span>
                          </div>
                          <p className="mt-1 text-xl font-bold">{ctfCount} 문제</p>
                          <p className="text-sm text-muted-foreground">{profile.ctfPoints || 0} 점</p>
                        </motion.div>
                      </div>

                      <Separator className="bg-primary/10" />

                      {profile.bio && (
                        <div>
                          <h3 className="mb-2 text-sm font-medium">자기소개</h3>
                          <p className="text-sm text-muted-foreground">{profile.bio}</p>
                        </div>
                      )}

                      {/* 인증된 소속 정보 표시 */}
                      {verifiedAffiliations.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-sm font-medium">인증된 소속</h3>
                          <div className="space-y-2">
                            {verifiedAffiliations.map((aff) => (
                              <motion.div
                                key={aff.id}
                                className="flex items-center gap-2 text-sm"
                                whileHover={{ x: 5 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                              >
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <div className="flex items-center">
                                  <span>{aff.name}</span>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.8 }}>
                                          <BadgeCheck className="ml-1 h-4 w-4 text-green-500" />
                                        </motion.div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>인증된 소속</p>
                                        {aff.verifiedAt && (
                                          <p className="text-xs mt-1">
                                            {new Date(aff.verifiedAt.toDate()).toLocaleDateString()} 인증됨
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                {aff.department && <span className="text-muted-foreground">({aff.department})</span>}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {profile.location && (
                          <motion.div
                            className="flex items-center gap-2 text-sm"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{profile.location}</span>
                          </motion.div>
                        )}
                        {profile.website && (
                          <motion.div
                            className="flex items-center gap-2 text-sm"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {profile.website.replace(/^https?:\/\//, "")}
                            </a>
                          </motion.div>
                        )}
                        <motion.div
                          className="flex items-center gap-2 text-sm"
                          whileHover={{ x: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{profile.createdAt?.toDate ? formatDate(profile.createdAt.toDate()) : ""}에 가입</span>
                        </motion.div>
                        {profile.lastLogin?.toDate && (
                          <motion.div
                            className="flex items-center gap-2 text-sm"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(profile.lastLogin.toDate())}에 마지막 로그인</span>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <div className="md:col-span-2">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                    <TabsList className="mb-4 w-full justify-start bg-background/50 backdrop-blur-sm p-1">
                      <TabsTrigger
                        value="profile"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        프로필
                      </TabsTrigger>
                      <TabsTrigger
                        value="solved"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        해결한 문제
                      </TabsTrigger>
                      <TabsTrigger
                        value="stats"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                      >
                        통계
                      </TabsTrigger>
                    </TabsList>

                    {/* 프로필 탭 */}
                    <TabsContent value="profile">
                      <Card className="backdrop-blur-sm bg-card/80 border-primary/10 shadow-lg overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                        <CardHeader className="relative z-10">
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            프로필 요약
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="grid gap-6 md:grid-cols-2">
                            {/* 레벨 및 경험치 카드 */}
                            <motion.div
                              whileHover={{
                                scale: 1.02,
                                boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                              }}
                              transition={{ type: "spring", stiffness: 300, damping: 10 }}
                            >
                              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-background/0 pointer-events-none" />
                                <CardHeader className="pb-2 relative z-10">
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-blue-500" />
                                    레벨 및 경험치
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <motion.p
                                        className="text-3xl font-bold"
                                        animate={{
                                          color: ["#FFFFFF", "#3B82F6", "#FFFFFF"],
                                          transition: {
                                            duration: 3,
                                            repeat: Number.POSITIVE_INFINITY,
                                            repeatType: "reverse",
                                          },
                                        }}
                                      >
                                        Lv. {userLevel.level}
                                      </motion.p>
                                      <p className="text-sm text-muted-foreground">총 {userLevel.totalExp} EXP</p>
                                    </div>
                                    <motion.div
                                      className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30"
                                      animate={{
                                        boxShadow: [
                                          "0 0 0 rgba(59, 130, 246, 0)",
                                          "0 0 20px rgba(59, 130, 246, 0.5)",
                                          "0 0 0 rgba(59, 130, 246, 0)",
                                        ],
                                      }}
                                      transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                                    >
                                      <BookOpen className="h-8 w-8 text-blue-500" />
                                    </motion.div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span>다음 레벨까지</span>
                                      <span className="font-medium">
                                        {userLevel.currentExp}/{userLevel.requiredExp} EXP
                                      </span>
                                    </div>
                                    <div className="relative">
                                      <Progress
                                        value={(userLevel.currentExp / userLevel.requiredExp) * 100}
                                        className="h-2"
                                      />
                                      <motion.div
                                        className="absolute top-0 left-0 h-full bg-blue-500/30 rounded-full"
                                        initial={{ width: "0%" }}
                                        animate={{
                                          width: `${(userLevel.currentExp / userLevel.requiredExp) * 100}%`,
                                          transition: { duration: 1.5, ease: "easeOut" },
                                        }}
                                      />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>

                            {/* 티어 카드 */}
                            <motion.div
                              whileHover={{
                                scale: 1.02,
                                boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                              }}
                              transition={{ type: "spring", stiffness: 300, damping: 10 }}
                            >
                              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
                                <div
                                  className="absolute inset-0 bg-gradient-to-br"
                                  style={{
                                    background: `linear-gradient(to bottom right, ${userTier.color}10, transparent)`,
                                  }}
                                />
                                <CardHeader className="pb-2 relative z-10">
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Layers className="h-5 w-5" style={{ color: userTier.color }} />
                                    티어 정보
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <motion.p
                                        className="text-3xl font-bold"
                                        style={{ color: userTier.color }}
                                        animate={{
                                          textShadow: [
                                            "0 0 0px rgba(255, 255, 255, 0)",
                                            "0 0 10px rgba(255, 255, 255, 0.5)",
                                            "0 0 0px rgba(255, 255, 255, 0)",
                                          ],
                                        }}
                                        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                                      >
                                        {userTier.name}
                                      </motion.p>
                                      <p className="text-sm text-muted-foreground">{userTier.description}</p>
                                    </div>
                                    <motion.div
                                      className="flex h-16 w-16 items-center justify-center rounded-full border"
                                      style={{
                                        backgroundColor: `${userTier.color}20`,
                                        borderColor: `${userTier.color}50`,
                                      }}
                                      animate={{
                                        boxShadow: [
                                          `0 0 0 rgba(${userTier.color}, 0)`,
                                          `0 0 20px ${userTier.color}50`,
                                          `0 0 0 rgba(${userTier.color}, 0)`,
                                        ],
                                      }}
                                      transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                                    >
                                      <motion.div
                                        style={{ color: userTier.color, transform: "scale(1.5)" }}
                                        whileHover={{ rotate: 360 }}
                                        transition={{ duration: 0.8 }}
                                      >
                                        {getTierIcon(userTier.icon)}
                                      </motion.div>
                                    </motion.div>
                                  </div>
                                  {nextTier ? (
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-sm">
                                        <span>다음 티어: {nextTier.name}</span>
                                        <span className="font-medium">
                                          {profile.points}/{nextTier.minPoints} 점
                                        </span>
                                      </div>
                                      <div className="relative">
                                        <Progress
                                          value={tierProgress}
                                          className="h-2"
                                          style={{
                                            background: `linear-gradient(to right, ${userTier.color}40, ${nextTier.color}40)`,
                                          }}
                                        />
                                        <motion.div
                                          className="absolute top-0 left-0 h-full rounded-full"
                                          style={{
                                            background: `linear-gradient(to right, ${userTier.color}, ${nextTier.color})`,
                                            opacity: 0.6,
                                          }}
                                          initial={{ width: "0%" }}
                                          animate={{
                                            width: `${tierProgress}%`,
                                            transition: { duration: 1.5, ease: "easeOut" },
                                          }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <motion.div
                                      className="mt-4 p-3 bg-primary/10 rounded-md text-center"
                                      animate={{
                                        boxShadow: [
                                          "0 0 0px rgba(255, 255, 255, 0)",
                                          "0 0 10px rgba(255, 255, 255, 0.2)",
                                          "0 0 0px rgba(255, 255, 255, 0)",
                                        ],
                                      }}
                                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                                    >
                                      <p className="text-sm">최고 티어에 도달했습니다!</p>
                                    </motion.div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>

                            {/* 최근 활동 카드 */}
                            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm md:col-span-2 overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                              <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Clock className="h-5 w-5 text-primary" />
                                  최근 활동
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="relative z-10">
                                {solvedChallenges.length > 0 ? (
                                  <div className="space-y-4">
                                    {solvedChallenges.slice(0, 5).map((challenge, index) => (
                                      <motion.div
                                        key={challenge.id}
                                        className="flex items-center justify-between"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1, duration: 0.5 }}
                                        whileHover={{
                                          scale: 1.02,
                                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                                          borderRadius: "0.5rem",
                                          padding: "0.5rem",
                                        }}
                                      >
                                        <div className="flex items-center gap-3">
                                          <motion.div
                                            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"
                                            whileHover={{ rotate: 360 }}
                                            transition={{ duration: 0.8 }}
                                          >
                                            {challenge.type === "wargame" ? (
                                              <Terminal className="h-5 w-5 text-primary" />
                                            ) : (
                                              <Shield className="h-5 w-5 text-primary" />
                                            )}
                                          </motion.div>
                                          <div>
                                            <p className="font-medium">{challenge.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {challenge.type === "wargame" ? "워게임" : "CTF"} | {challenge.category} |{" "}
                                              {challenge.difficulty}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-medium">{challenge.points} 점</p>
                                          <p className="text-xs text-muted-foreground">
                                            {challenge.solvedAt?.toDate ? formatDate(challenge.solvedAt.toDate()) : ""}
                                          </p>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-bold">활동 기록을 불러오는 중입니다</h3>
                                    <p className="text-muted-foreground mt-2">
                                      데이터베이스에서 사용자의 활동 기록을 검색하고 있습니다.
                                    </p>
                                    <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-dashed max-w-md">
                                      <p className="text-sm text-muted-foreground mb-2">디버그 정보:</p>
                                      <div className="text-xs space-y-1">
                                        <p>워게임 문제: {wargameCount}개</p>
                                        <p>CTF 문제: {ctfCount}개</p>
                                        <p>총 해결 문제: {solvedChallenges.length}개</p>
                                        <p>사용자 ID: {params.id}</p>
                                      </div>
                                    </div>
                                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                                      새로고침하여 다시 시도
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                              <CardFooter className="relative z-10">
                                <Button
                                  variant="outline"
                                  className="w-full group hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                  onClick={() => setCurrentTab("solved")}
                                >
                                  모든 활동 보기
                                  <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                              </CardFooter>
                            </Card>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="solved">
                      <Card className="backdrop-blur-sm bg-card/80 border-primary/10 shadow-lg overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                        <CardHeader className="relative z-10">
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            해결한 문제 ({solvedChallenges.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          {solvedChallenges.length === 0 ? (
                            <motion.div
                              className="flex flex-col items-center justify-center py-8 text-center"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.5 }}
                            >
                              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                              <h3 className="text-xl font-bold">해결한 문제가 없습니다</h3>
                              <p className="text-muted-foreground mt-2">
                                아직 해결한 문제가 없거나 데이터를 불러올 수 없습니다.
                              </p>
                            </motion.div>
                          ) : (
                            <div className="space-y-4">
                              {solvedChallenges.map((challenge, index) => (
                                <motion.div
                                  key={challenge.id}
                                  className="rounded-lg border p-4 bg-card/50 hover:bg-card/80 transition-colors"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05, duration: 0.5 }}
                                  whileHover={{
                                    scale: 1.01,
                                    boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                                  }}
                                >
                                  <Collapsible
                                    open={expandedChallenge === challenge.id}
                                    onOpenChange={() => toggleChallengeDetails(challenge.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="flex items-center gap-1">
                                          {challenge.type === "wargame" ? (
                                            <Terminal className="h-3.5 w-3.5" />
                                          ) : (
                                            <Shield className="h-3.5 w-3.5" />
                                          )}
                                          <span>{challenge.type === "wargame" ? "워게임" : "CTF"}</span>
                                        </Badge>
                                        <Badge
                                          variant="secondary"
                                          className="bg-muted text-muted-foreground flex items-center gap-1"
                                        >
                                          {categoryIcons[challenge.category] || <Puzzle className="h-3.5 w-3.5" />}
                                          <span>{challenge.category}</span>
                                        </Badge>
                                        <Badge
                                          variant="secondary"
                                          className={`bg-muted ${difficultyColors[challenge.difficulty] || "text-muted-foreground"}`}
                                        >
                                          {challenge.difficulty}
                                        </Badge>
                                      </div>
                                      {challenge.points > 0 && (
                                        <div className="flex items-center gap-2">
                                          <Trophy className="h-4 w-4 text-yellow-500" />
                                          <span className="font-bold">{challenge.points} 점</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <h3 className="text-lg font-bold">{challenge.title}</h3>
                                      <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                                          {expandedChallenge === challenge.id ? (
                                            <ChevronUp className="h-4 w-4" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </CollapsibleTrigger>
                                    </div>
                                    {challenge.contestTitle && (
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {challenge.contestTitle} 대회
                                      </p>
                                    )}
                                    <CollapsibleContent>
                                      <div className="mt-4 space-y-3 pt-3 border-t">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">카테고리</p>
                                            <p className="text-sm font-medium flex items-center gap-1">
                                              {categoryIcons[challenge.category] || <Puzzle className="h-4 w-4" />}
                                              {challenge.category}
                                            </p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">난이도</p>
                                            <p
                                              className={`text-sm font-medium ${difficultyColors[challenge.difficulty] || ""}`}
                                            >
                                              {challenge.difficulty}
                                            </p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">획득 점수</p>
                                            <p className="text-sm font-medium">{challenge.points} 점</p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">해결 날짜</p>
                                            <p className="text-sm font-medium">
                                              {challenge.solvedAt?.toDate
                                                ? formatDate(challenge.solvedAt.toDate())
                                                : ""}
                                            </p>
                                          </div>
                                        </div>
                                        {challenge.type === "ctf" && challenge.contestTitle && (
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">대회 정보</p>
                                            <p className="text-sm font-medium">{challenge.contestTitle}</p>
                                          </div>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="stats">
                      <Card className="backdrop-blur-sm bg-card/80 border-primary/10 shadow-lg overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 pointer-events-none" />
                        <CardHeader className="relative z-10">
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            통계
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="grid gap-6 md:grid-cols-2">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5 }}
                              whileHover={{
                                scale: 1.02,
                                boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                              }}
                            >
                              <Card className="border-primary/20 bg-card/50">
                                <CardHeader>
                                  <CardTitle className="text-lg">카테고리별 해결 문제</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {solvedChallenges.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-4 text-center">
                                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                      <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {Object.entries(categoryStats).map(([category, count], index) => (
                                        <motion.div
                                          key={category}
                                          className="space-y-1"
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: index * 0.1, duration: 0.5 }}
                                        >
                                          <div className="flex justify-between text-sm">
                                            <div className="flex items-center gap-1">
                                              {categoryIcons[category] || <Puzzle className="h-3.5 w-3.5" />}
                                              <span>{category}</span>
                                            </div>
                                            <span className="font-medium">{count}문제</span>
                                          </div>
                                          <div className="relative">
                                            <Progress value={(count / solvedChallenges.length) * 100} className="h-2" />
                                            <motion.div
                                              className="absolute top-0 left-0 h-full bg-primary/30 rounded-full"
                                              initial={{ width: "0%" }}
                                              animate={{
                                                width: `${(count / solvedChallenges.length) * 100}%`,
                                                transition: { duration: 1, ease: "easeOut", delay: index * 0.1 },
                                              }}
                                            />
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>

                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              whileHover={{
                                scale: 1.02,
                                boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                              }}
                            >
                              <Card className="border-primary/20 bg-card/50">
                                <CardHeader>
                                  <CardTitle className="text-lg">난이도별 해결 문제</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {solvedChallenges.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-4 text-center">
                                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                      <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {Object.entries(difficultyStats)
                                        .filter(([_, count]) => count > 0)
                                        .map(([difficulty, count], index) => {
                                          const difficultyColor =
                                            {
                                              초급: "bg-green-500",
                                              중급: "bg-yellow-500",
                                              고급: "bg-red-500",
                                            }[difficulty] || "bg-primary"

                                          return (
                                            <motion.div
                                              key={difficulty}
                                              className="space-y-1"
                                              initial={{ opacity: 0, x: -20 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              transition={{ delay: index * 0.1, duration: 0.5 }}
                                            >
                                              <div className="flex justify-between text-sm">
                                                <span className={difficultyColors[difficulty] || ""}>{difficulty}</span>
                                                <span className="font-medium">{count}문제</span>
                                              </div>
                                              <div className="relative h-2 w-full rounded-full bg-muted">
                                                <motion.div
                                                  className={`h-2 rounded-full ${difficultyColor}`}
                                                  initial={{ width: "0%" }}
                                                  animate={{
                                                    width: `${(count / solvedChallenges.length) * 100}%`,
                                                    transition: { duration: 1, ease: "easeOut", delay: index * 0.1 },
                                                  }}
                                                ></motion.div>
                                              </div>
                                            </motion.div>
                                          )
                                        })}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          </div>

                          {/* CTF 대회 참여 정보 추가 */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            whileHover={{
                              scale: 1.01,
                              boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                            }}
                          >
                            <Card className="mt-6 border-primary/20 bg-card/50">
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Trophy className="h-5 w-5 text-yellow-500" />
                                  CTF 대회 참여 기록
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {solvedChallenges.filter((c) => c.type === "ctf" && c.contestTitle).length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-4 text-center">
                                    <Trophy className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">아직 CTF 대회 참여 기록이 없습니다</p>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {(() => {
                                      // CTF 대회별로 그룹화
                                      const contests: Record<
                                        string,
                                        { title: string; problems: number; points: number }
                                      > = {}

                                      solvedChallenges
                                        .filter((c) => c.type === "ctf" && c.contestId && c.contestTitle)
                                        .forEach((challenge) => {
                                          const contestId = challenge.contestId as string
                                          if (!contests[contestId]) {
                                            contests[contestId] = {
                                              title: challenge.contestTitle as string,
                                              problems: 0,
                                              points: 0,
                                            }
                                          }
                                          contests[contestId].problems++
                                          contests[contestId].points += challenge.points
                                        })

                                      return Object.entries(contests).map(([contestId, data], index) => (
                                        <motion.div
                                          key={contestId}
                                          className="rounded-lg border p-4 bg-card/50 hover:bg-card/80 transition-colors"
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: index * 0.1, duration: 0.5 }}
                                          whileHover={{
                                            scale: 1.02,
                                            boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.3)",
                                          }}
                                        >
                                          <h3 className="text-lg font-bold">{data.title}</h3>
                                          <div className="mt-2 flex flex-wrap gap-4">
                                            <div className="flex items-center gap-1">
                                              <FileText className="h-4 w-4 text-muted-foreground" />
                                              <span className="text-sm">{data.problems}문제 해결</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Trophy className="h-4 w-4 text-yellow-500" />
                                              <span className="text-sm font-medium">{data.points}점 획득</span>
                                            </div>
                                          </div>
                                        </motion.div>
                                      ))
                                    })()}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  )
}
