"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Navbar } from "@/components/navbar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  Trophy,
  Medal,
  Search,
  User,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Minus,
  Shield,
  Terminal,
  Crown,
  Award,
  Star,
  Sparkles,
  Flame,
  Zap,
  Rocket,
  Target,
  Layers,
  Cpu,
  Lock,
  FileText,
  Lightbulb,
  Code,
  Globe,
  Swords,
  Brain,
} from "lucide-react"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { motion } from "framer-motion"
import { Particles } from "@/components/ui/particles"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// 사용자 타입 정의
type UserRanking = {
  uid: string
  username: string
  photoURL?: string
  points: number
  wargamePoints: number
  ctfPoints: number
  solvedChallenges: string[]
  rank?: number
  previousRank?: number
  title?: string
  achievements?: string[]
  level?: number
  joinDate?: any
  lastActive?: any
  streak?: number
  badges?: string[]
  tier?: string
}

// 업적 정의
type Achievement = {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  category: "wargame" | "ctf" | "community" | "general"
}

// 티어 정의
type Tier = {
  name: string
  minPoints: number
  color: string
  icon: React.ReactNode
}

// 시즌 정의
type Season = {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isActive: boolean
}

export default function RankingPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentTab, setCurrentTab] = useState("ctf")
  const [currentView, setCurrentView] = useState("leaderboard")
  const [currentSeason, setCurrentSeason] = useState("current")
  const [showTierInfo, setShowTierInfo] = useState(false)
  const [showAchievementInfo, setShowAchievementInfo] = useState(false)
  const [sortBy, setSortBy] = useState("ctf")
  const [filterTier, setFilterTier] = useState("all")
  const statsRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalChallenges, setTotalChallenges] = useState(0)
  const [totalCtfs, setTotalCtfs] = useState(0)

  // 마우스 위치 추적
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // 티어 정의
  const tiers: Tier[] = [
    { name: "Bronze", minPoints: 0, color: "#CD7F32", icon: <Shield className="h-4 w-4" /> },
    { name: "Silver", minPoints: 500, color: "#C0C0C0", icon: <Shield className="h-4 w-4" /> },
    { name: "Gold", minPoints: 1500, color: "#FFD700", icon: <Shield className="h-4 w-4" /> },
    { name: "Platinum", minPoints: 3000, color: "#E5E4E2", icon: <Shield className="h-4 w-4" /> },
    { name: "Diamond", minPoints: 5000, color: "#B9F2FF", icon: <Shield className="h-4 w-4" /> },
    { name: "Master", minPoints: 8000, color: "#9370DB", icon: <Crown className="h-4 w-4" /> },
    { name: "Grandmaster", minPoints: 12000, color: "#FF4500", icon: <Sparkles className="h-4 w-4" /> },
    { name: "Legend", minPoints: 20000, color: "#FF0000", icon: <Flame className="h-4 w-4" /> },
  ]

  // 업적 정의
  const achievements: Achievement[] = [
    {
      id: "first_blood",
      name: "First Blood",
      description: "첫 번째로 문제를 해결한 사용자",
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      rarity: "rare",
      category: "wargame",
    },
    {
      id: "challenge_master",
      name: "Challenge Master",
      description: "모든 카테고리에서 최소 1개 이상의 문제 해결",
      icon: <Star className="h-5 w-5 text-yellow-500" />,
      rarity: "uncommon",
      category: "wargame",
    },
    {
      id: "ctf_champion",
      name: "CTF Champion",
      description: "CTF 대회에서 1위 달성",
      icon: <Trophy className="h-5 w-5 text-yellow-500" />,
      rarity: "epic",
      category: "ctf",
    },
    {
      id: "consistent_solver",
      name: "Consistent Solver",
      description: "7일 연속으로 문제 해결",
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      rarity: "rare",
      category: "general",
    },
    {
      id: "web_expert",
      name: "Web Hacking Expert",
      description: "웹 해킹 카테고리의 모든 문제 해결",
      icon: <Globe className="h-5 w-5 text-blue-500" />,
      rarity: "epic",
      category: "wargame",
    },
    {
      id: "crypto_wizard",
      name: "Crypto Wizard",
      description: "암호학 카테고리의 모든 문제 해결",
      icon: <Lock className="h-5 w-5 text-purple-500" />,
      rarity: "epic",
      category: "wargame",
    },
    {
      id: "reverse_engineer",
      name: "Reverse Engineer",
      description: "리버싱 카테고리의 모든 문제 해결",
      icon: <Cpu className="h-5 w-5 text-green-500" />,
      rarity: "epic",
      category: "wargame",
    },
    {
      id: "forensics_detective",
      name: "Forensics Detective",
      description: "포렌식 카테고리의 모든 문제 해결",
      icon: <FileText className="h-5 w-5 text-indigo-500" />,
      rarity: "epic",
      category: "wargame",
    },
    {
      id: "pwn_master",
      name: "Pwn Master",
      description: "시스템 해킹 카테고리의 모든 문제 해결",
      icon: <Terminal className="h-5 w-5 text-red-500" />,
      rarity: "epic",
      category: "wargame",
    },
    {
      id: "early_bird",
      name: "Early Bird",
      description: "플랫폼 초기 사용자",
      icon: <Rocket className="h-5 w-5 text-blue-500" />,
      rarity: "legendary",
      category: "general",
    },
    {
      id: "helpful_hacker",
      name: "Helpful Hacker",
      description: "커뮤니티에 10개 이상의 유용한 게시글 작성",
      icon: <Lightbulb className="h-5 w-5 text-amber-500" />,
      rarity: "uncommon",
      category: "community",
    },
    {
      id: "perfect_score",
      name: "Perfect Score",
      description: "CTF 대회에서 만점 획득",
      icon: <Target className="h-5 w-5 text-red-500" />,
      rarity: "legendary",
      category: "ctf",
    },
  ]

  // 시즌 정의
  const seasons: Season[] = [
    {
      id: "current",
      name: "시즌 1: 새로운 시작",
      startDate: new Date(2023, 8, 1), // 2023년 9월 1일
      endDate: new Date(2023, 11, 31), // 2023년 12월 31일
      isActive: true,
    },
    {
      id: "upcoming",
      name: "시즌 2: 보안의 진화",
      startDate: new Date(2024, 0, 1), // 2024년 1월 1일
      endDate: new Date(2024, 2, 31), // 2024년 3월 31일
      isActive: false,
    },
    {
      id: "past",
      name: "베타 시즌",
      startDate: new Date(2023, 5, 1), // 2023년 6월 1일
      endDate: new Date(2023, 7, 31), // 2023년 8월 31일
      isActive: false,
    },
  ]

  // 사용자 랭킹 불러오기
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Store previous users for rank change comparison
        const previousUsers = [...users]

        const usersRef = collection(db, "users")
        const q = query(usersRef, orderBy("ctfPoints", "desc"), limit(100))
        const querySnapshot = await getDocs(q)

        const usersData: UserRanking[] = []
        let rank = 1

        // 워게임 문제 포인트 정보 가져오기
        const wargameChallengesRef = collection(db, "wargame_challenges")
        const wargameChallengesQuery = query(wargameChallengesRef)
        const wargameChallengesSnapshot = await getDocs(wargameChallengesQuery)

        // 문제 ID를 키로, 포인트를 값으로 하는 맵 생성
        const challengePointsMap: Record<string, number> = {}
        wargameChallengesSnapshot.forEach((doc) => {
          const data = doc.data()
          challengePointsMap[doc.id] = data.points || 0
        })

        // 각 사용자의 데이터 처리
        for (const docSnapshot of querySnapshot.docs) {
          const userData = docSnapshot.data()

          // 워게임 포인트 계산
          let calculatedWargamePoints = 0
          if (userData.solvedChallenges && Array.isArray(userData.solvedChallenges)) {
            userData.solvedChallenges.forEach((challengeId) => {
              if (challengePointsMap[challengeId]) {
                calculatedWargamePoints += challengePointsMap[challengeId]
              }
            })
          }

          // 사용자 데이터에 워게임 포인트가 없거나 계산된 값이 더 크면 계산된 값 사용
          const wargamePoints = Math.max(userData.wargamePoints || 0, calculatedWargamePoints)

          // 티어 계산
          const tier = getTierByPoints(userData.points || 0)

          // 가상의 업적 및 배지 생성 (실제로는 DB에서 가져와야 함)
          const mockAchievements = generateMockAchievements(userData)
          const mockBadges = generateMockBadges(userData)

          usersData.push({
            uid: docSnapshot.id,
            username: userData.username || "사용자",
            photoURL: userData.photoURL,
            points: userData.points || 0,
            wargamePoints: wargamePoints,
            ctfPoints: userData.ctfPoints || 0,
            solvedChallenges: userData.solvedChallenges || [],
            rank,
            previousRank: userData.previousRank || rank,
            title: userData.title,
            achievements: mockAchievements,
            level: calculateLevel(userData.points || 0),
            joinDate: userData.createdAt,
            lastActive: userData.lastLogin,
            streak: Math.floor(Math.random() * 30), // 가상 데이터
            badges: mockBadges,
            tier: tier.name,
          })
          rank++
        }

        setUsers(usersData)

        // 총 사용자 수 가져오기
        const totalUsersQuery = query(collection(db, "users"))
        const totalUsersSnapshot = await getDocs(totalUsersQuery)
        setTotalUsers(totalUsersSnapshot.size)

        // 총 문제 수 가져오기
        const totalChallengesQuery = query(collection(db, "wargame_challenges"))
        const totalChallengesSnapshot = await getDocs(totalChallengesQuery)
        setTotalChallenges(totalChallengesSnapshot.size)

        // 총 CTF 수 가져오기
        const totalCtfsQuery = query(collection(db, "ctf_contests"))
        const totalCtfsSnapshot = await getDocs(totalCtfsQuery)
        setTotalCtfs(totalCtfsSnapshot.size)

        // Send notifications for rank changes
        if (previousUsers.length > 0) {
          sendRankChangeNotifications(previousUsers, usersData)
        }
      } catch (error) {
        console.error("Error fetching users:", error)
        toast({
          title: "오류 발생",
          description: "랭킹 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [toast, users])

  // 티어 계산 함수
  const getTierByPoints = (points: number): Tier => {
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (points >= tiers[i].minPoints) {
        return tiers[i]
      }
    }
    return tiers[0] // 기본 티어
  }

  // 레벨 계산 함수
  const calculateLevel = (points: number): number => {
    return Math.floor(Math.sqrt(points / 10)) + 1
  }

  // 가상의 업적 생성 함수 (실제로는 DB에서 가져와야 함)
  const generateMockAchievements = (userData: any): string[] => {
    const mockAchievements: string[] = []

    // 포인트에 따라 업적 부여
    if (userData.points > 1000) mockAchievements.push("challenge_master")
    if (userData.points > 3000) mockAchievements.push("consistent_solver")
    if (userData.points > 5000) mockAchievements.push("helpful_hacker")

    // 랜덤 업적 추가
    const randomAchievements = [
      "first_blood",
      "web_expert",
      "crypto_wizard",
      "reverse_engineer",
      "forensics_detective",
      "pwn_master",
    ]
    const randomCount = Math.min(Math.floor(userData.points / 2000) + 1, randomAchievements.length)

    for (let i = 0; i < randomCount; i++) {
      mockAchievements.push(randomAchievements[i])
    }

    // 특별 업적
    if (userData.username === "admin" || userData.email === "mistarcodm@gmail.com") {
      mockAchievements.push("early_bird")
      mockAchievements.push("perfect_score")
      mockAchievements.push("ctf_champion")
    }

    return [...new Set(mockAchievements)] // 중복 제거
  }

  // 가상의 배지 생성 함수 (실제로는 DB에서 가져와야 함)
  const generateMockBadges = (userData: any): string[] => {
    const mockBadges: string[] = []

    // 포인트에 따라 배지 부여
    if (userData.points > 500) mockBadges.push("beginner")
    if (userData.points > 2000) mockBadges.push("intermediate")
    if (userData.points > 5000) mockBadges.push("advanced")
    if (userData.points > 10000) mockBadges.push("expert")

    // 특별 배지
    if (userData.username === "admin" || userData.email === "mistarcodm@gmail.com") {
      mockBadges.push("founder")
      mockBadges.push("developer")
    }

    return mockBadges
  }

  // 업적 아이콘 가져오기
  const getAchievementIcon = (achievementId: string) => {
    const achievement = achievements.find((a) => a.id === achievementId)
    return achievement?.icon || <Award className="h-5 w-5" />
  }

  // 업적 정보 가져오기
  const getAchievementInfo = (achievementId: string) => {
    return achievements.find((a) => a.id === achievementId)
  }

  // 희귀도 색상 가져오기
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "text-gray-400"
      case "uncommon":
        return "text-green-500"
      case "rare":
        return "text-blue-500"
      case "epic":
        return "text-purple-500"
      case "legendary":
        return "text-orange-500"
      default:
        return "text-gray-400"
    }
  }

  // 배지 아이콘 가져오기
  const getBadgeIcon = (badgeId: string) => {
    switch (badgeId) {
      case "beginner":
        return <Shield className="h-5 w-5 text-green-500" />
      case "intermediate":
        return <Shield className="h-5 w-5 text-blue-500" />
      case "advanced":
        return <Shield className="h-5 w-5 text-purple-500" />
      case "expert":
        return <Shield className="h-5 w-5 text-orange-500" />
      case "founder":
        return <Crown className="h-5 w-5 text-yellow-500" />
      case "developer":
        return <Code className="h-5 w-5 text-cyan-500" />
      default:
        return <Badge className="h-5 w-5" />
    }
  }

  // 배지 이름 가져오기
  const getBadgeName = (badgeId: string) => {
    switch (badgeId) {
      case "beginner":
        return "초보자"
      case "intermediate":
        return "중급자"
      case "advanced":
        return "고급자"
      case "expert":
        return "전문가"
      case "founder":
        return "창립자"
      case "developer":
        return "개발자"
      default:
        return badgeId
    }
  }

  // 검색 필터링
  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(searchQuery.toLowerCase()))

  // 티어 필터링
  const tierFilteredUsers =
    filterTier === "all" ? filteredUsers : filteredUsers.filter((user) => user.tier === filterTier)

  // 정렬
  const sortedUsers = [...tierFilteredUsers].sort((a, b) => {
    if (sortBy === "ctf") {
      return (b.ctfPoints || 0) - (a.ctfPoints || 0)
    } else if (sortBy === "solved") {
      return (b.solvedChallenges?.length || 0) - (a.solvedChallenges?.length || 0)
    } else if (sortBy === "level") {
      return (b.level || 0) - (a.level || 0)
    } else if (sortBy === "streak") {
      return (b.streak || 0) - (a.streak || 0)
    } else {
      return (b.ctfPoints || 0) - (a.ctfPoints || 0)
    }
  })

  // 현재 사용자 랭킹 찾기
  const currentUserRanking = user ? users.find((u) => u.uid === user.uid) : null

  // 랭킹 변동 표시 컴포넌트
  const RankChange = ({ current, previous }: { current: number; previous: number }) => {
    if (current < previous) {
      return (
        <div className="flex items-center text-green-500">
          <ChevronUp className="h-4 w-4" />
          <span>{previous - current}</span>
        </div>
      )
    } else if (current > previous) {
      return (
        <div className="flex items-center text-red-500">
          <ChevronDown className="h-4 w-4" />
          <span>{current - previous}</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center text-muted-foreground">
          <Minus className="h-4 w-4" />
        </div>
      )
    }
  }

  // 티어 배지 컴포넌트
  const TierBadge = ({ tier }: { tier: string }) => {
    const tierInfo = tiers.find((t) => t.name === tier)
    if (!tierInfo) return null

    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1 border-none"
        style={{ backgroundColor: `${tierInfo.color}20`, color: tierInfo.color }}
      >
        {tierInfo.icon}
        <span>{tier}</span>
      </Badge>
    )
  }

  // 날짜 포맷 함수
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // 통계 섹션으로 스크롤
  const scrollToStats = () => {
    if (statsRef.current) {
      statsRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  // 애니메이션 변수
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  }

  // 카테고리 아이콘 매핑
  const categoryIcons = {
    "웹 해킹": <Globe className="h-5 w-5 text-blue-500" />,
    "시스템 해킹": <Terminal className="h-5 w-5 text-red-500" />,
    리버싱: <Cpu className="h-5 w-5 text-green-500" />,
    암호학: <Lock className="h-5 w-5 text-purple-500" />,
    포렌식: <FileText className="h-5 w-5 text-indigo-500" />,
    기타: <Layers className="h-5 w-5 text-gray-500" />,
  }

  // Add a function to send rank change notifications
  const sendRankChangeNotifications = (oldUsers: UserRanking[], newUsers: UserRanking[]) => {
    if (!oldUsers.length || !newUsers.length) return

    // Create a map of old rankings for quick lookup
    const oldRankMap = new Map()
    oldUsers.forEach((user) => {
      oldRankMap.set(user.uid, user.rank)
    })

    // Check for significant rank changes (more than 2 positions)
    newUsers.forEach((user) => {
      const oldRank = oldRankMap.get(user.uid)
      if (oldRank && user.rank && Math.abs(oldRank - user.rank) > 2) {
        // Send notification for significant rank changes
        import("@/lib/notification-utils")
          .then(({ sendEventNotification }) => {
            sendEventNotification("rank_change", user.uid, {
              oldRank,
              newRank: user.rank,
            })
          })
          .catch(console.error)
      }
    })
  }

  // 랭킹 카드 컴포넌트
  const RankingCard = ({ user, rank }: { user: UserRanking; rank: number }) => {
    const colors = {
      1: {
        border: "border-[#FFD700]",
        bg: "from-[#FFD700]/10 to-[#FFD700]/5",
        text: "text-[#FFD700]",
        icon: <Crown className="h-10 w-10 text-[#FFD700]" />,
        shadow: "shadow-[#FFD700]/20",
      },
      2: {
        border: "border-[#C0C0C0]",
        bg: "from-[#C0C0C0]/10 to-[#C0C0C0]/5",
        text: "text-[#C0C0C0]",
        icon: <Medal className="h-8 w-8 text-[#C0C0C0]" />,
        shadow: "shadow-[#C0C0C0]/20",
      },
      3: {
        border: "border-[#CD7F32]",
        bg: "from-[#CD7F32]/10 to-[#CD7F32]/5",
        text: "text-[#CD7F32]",
        icon: <Award className="h-8 w-8 text-[#CD7F32]" />,
        shadow: "shadow-[#CD7F32]/20",
      },
    }

    const color = colors[rank as keyof typeof colors] || {
      border: "border-primary/20",
      bg: "from-primary/10 to-primary/5",
      text: "text-primary",
      icon: <Trophy className="h-6 w-6 text-primary" />,
      shadow: "shadow-primary/20",
    }

    return (
      <motion.div whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
        <Link href={`/user/${user.uid}`}>
          <Card
            className={`relative overflow-hidden border-2 ${color.border} hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm hover:${color.shadow} group`}
          >
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${color.bg}`}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-card/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-background/80 to-background/40 border border-primary/20 group-hover:scale-105 transition-transform duration-300">
                {color.icon}
              </div>
              <CardTitle className={`text-2xl ${color.text} group-hover:text-white transition-colors duration-300`}>
                {rank}등
              </CardTitle>
            </CardHeader>

            <CardContent className="text-center pb-2">
              <Avatar className="mx-auto h-20 w-20 border-2 border-primary/30 ring-2 ring-primary/10 group-hover:ring-4 transition-all duration-300">
                <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.username} />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-xl font-bold group-hover:text-primary transition-colors duration-300">
                {user.username}
              </h3>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <TierBadge tier={user.tier || "Bronze"} />
                {user.title && (
                  <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary backdrop-blur-sm">
                    {user.title}
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <RankChange current={rank} previous={user.previousRank || rank} />
              </div>
            </CardContent>

            <CardFooter className="flex justify-center pt-2">
              <div className="text-center">
                <p className={`text-3xl font-bold ${color.text}`}>{user.points}</p>
                <p className="text-sm text-muted-foreground">포인트</p>
              </div>
            </CardFooter>
          </Card>
        </Link>
      </motion.div>
    )
  }

  // 스켈레톤 로딩 컴포넌트
  const SkeletonCard = () => (
    <Card className="border border-primary/10 bg-card/30 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="mx-auto h-16 w-16 rounded-full bg-muted/50 animate-pulse"></div>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="h-20 w-20 rounded-full bg-muted/50 animate-pulse"></div>
        <div className="h-6 w-24 bg-muted/50 animate-pulse rounded"></div>
        <div className="h-4 w-16 bg-muted/50 animate-pulse rounded"></div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <div className="h-8 w-16 bg-muted/50 animate-pulse rounded"></div>
      </CardFooter>
    </Card>
  )

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-background/80">
      <Navbar />
      {/* 동적 배경 효과 */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* 그라데이션 오브 */}
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-3xl opacity-30"
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px) rotate(${scrollY * 0.02}deg)`,
            transition: "transform 0.5s ease-out",
          }}
        ></div>
        <div
          className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 blur-3xl opacity-20"
          style={{
            transform: `translate(${-mousePosition.x * 0.01}px, ${-mousePosition.y * 0.01}px) rotate(${-scrollY * 0.01}deg)`,
            transition: "transform 0.7s ease-out",
          }}
        ></div>
        <div
          className="absolute top-2/3 left-1/3 w-[300px] h-[300px] rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 blur-3xl opacity-20"
          style={{
            transform: `translate(${mousePosition.x * 0.015}px, ${-mousePosition.y * 0.015}px) rotate(${scrollY * 0.015}deg)`,
            transition: "transform 0.6s ease-out",
          }}
        ></div>

        {/* 파티클 효과 */}
        <Particles className="absolute inset-0" quantity={40} />

        {/* 그리드 패턴 */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,black,rgba(0,0,0,0))]"></div>
      </div>
      <main className="flex-1 relative">
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 m-4 z-10 relative backdrop-blur-sm"
          >
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                이 페이지는 로그인이 필요합니다.{" "}
                <Link href="/login" className="font-medium underline hover:text-yellow-800 dark:hover:text-yellow-100">
                  로그인
                </Link>{" "}
                또는{" "}
                <Link
                  href="/register"
                  className="font-medium underline hover:text-yellow-800 dark:hover:text-yellow-100"
                >
                  회원가입
                </Link>
                을 해주세요.
              </p>
            </div>
          </motion.div>
        )}

        {/* 헤더 섹션 */}
        <section className="relative py-20 md:py-24 lg:py-28 overflow-hidden">
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-[800px] text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Badge
                  className="mb-4 px-3 py-1 text-sm border border-primary/20 bg-primary/10 backdrop-blur-sm shadow-lg"
                  variant="outline"
                >
                  <Trophy className="h-3.5 w-3.5 mr-1 text-primary" />
                  <span className="text-primary">보안 전문가 순위</span>
                </Badge>
              </motion.div>

              <motion.h1
                className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                랭킹 & 업적 시스템
              </motion.h1>

              <motion.p
                className="text-xl text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                워게임과 CTF 대회에서 획득한 점수를 기반으로 한 사용자 순위와 업적을 확인하세요.
              </motion.p>

              <motion.div
                className="flex flex-wrap justify-center gap-4 mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Button
                  size="lg"
                  className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                  onClick={() => setCurrentView("leaderboard")}
                >
                  <Trophy className="mr-2 h-5 w-5" />
                  랭킹 보기
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-primary/20 bg-background/30 backdrop-blur-sm"
                  onClick={() => {
                    setCurrentView("achievements")
                    scrollToStats()
                  }}
                >
                  <Star className="mr-2 h-5 w-5" />
                  업적 시스템
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-primary/20 bg-background/30 backdrop-blur-sm"
                  onClick={() => {
                    setShowTierInfo(!showTierInfo)
                    scrollToStats()
                  }}
                >
                  <Layers className="mr-2 h-5 w-5" />
                  티어 시스템
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 플랫폼 통계 섹션 */}
        <motion.section
          className="py-8 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-primary/20 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <User className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold">{totalUsers || 120}</h3>
                  <p className="text-sm text-muted-foreground">등록된 사용자</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                    <Swords className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-bold">{totalChallenges || 85}</h3>
                  <p className="text-sm text-muted-foreground">보안 문제</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                    <Trophy className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold">{totalCtfs || 12}</h3>
                  <p className="text-sm text-muted-foreground">CTF 대회</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                    <Brain className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-bold">
                    {users.reduce((acc, user) => acc + (user.solvedChallenges?.length || 0), 0) || 1240}
                  </h3>
                  <p className="text-sm text-muted-foreground">해결된 문제</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.section>

        {/* 상위 랭킹 섹션 */}
        <section className="py-16 md:py-20 relative z-10">
          <div className="container mx-auto px-4 md:px-6">
            {isLoading ? (
              <motion.div className="grid gap-6 md:grid-cols-3" variants={container} initial="hidden" animate="show">
                {[...Array(3)].map((_, i) => (
                  <motion.div key={i} variants={item}>
                    <SkeletonCard />
                  </motion.div>
                ))}
              </motion.div>
            ) : users.length > 0 ? (
              <motion.div variants={container} initial="hidden" animate="show">
                {/* 상위 3명 */}
                <motion.div className="grid gap-6 md:grid-cols-3 mb-12" variants={item}>
                  {/* 2등 */}
                  {users.length > 1 && <RankingCard user={users[1]} rank={2} />}

                  {/* 1등 */}
                  {users.length > 0 && (
                    <div className="md:-mt-6">
                      <RankingCard user={users[0]} rank={1} />
                    </div>
                  )}

                  {/* 3등 */}
                  {users.length > 2 && <RankingCard user={users[2]} rank={3} />}
                </motion.div>

                {/* 내 랭킹 */}
                {currentUserRanking && (
                  <motion.div variants={item}>
                    <Card className="mb-8 border-primary/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50"></div>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />내 랭킹
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 font-bold border border-primary/30 text-2xl">
                              {currentUserRanking.rank}
                            </div>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                                <AvatarImage
                                  src={currentUserRanking.photoURL || "/placeholder.svg"}
                                  alt={currentUserRanking.username}
                                />
                                <AvatarFallback>
                                  <User className="h-6 w-6" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-lg">{currentUserRanking.username}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <TierBadge tier={currentUserRanking.tier || "Bronze"} />
                                  {currentUserRanking.title && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs bg-primary/10 text-primary backdrop-blur-sm"
                                    >
                                      {currentUserRanking.title}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <RankChange
                                    current={currentUserRanking.rank || 0}
                                    previous={currentUserRanking.previousRank || 0}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right md:border-l md:pl-4 md:border-primary/20 flex flex-col items-center md:items-end">
                            <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                              {currentUserRanking.points}
                            </p>
                            <p className="text-sm text-muted-foreground">포인트</p>
                          </div>
                        </div>
                        <div className="mt-6 grid grid-cols-1 gap-4">
                          <div className="rounded-lg border border-primary/20 p-4 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors duration-300">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="h-5 w-5 text-purple-500" />
                              <span className="text-sm font-medium">CTF 포인트</span>
                            </div>
                            <p className="text-2xl font-bold text-purple-500">{currentUserRanking.ctfPoints || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* 시즌 선택 및 뷰 선택 */}
                <motion.div
                  className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                  variants={item}
                >
                  <div className="flex flex-wrap gap-2">
                    <Select value={currentSeason} onValueChange={setCurrentSeason}>
                      <SelectTrigger className="w-[180px] rounded-lg border-primary/20 bg-card/50 backdrop-blur-sm">
                        <SelectValue placeholder="시즌 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map((season) => (
                          <SelectItem key={season.id} value={season.id}>
                            {season.name}
                            {season.isActive && " (현재)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={currentView} onValueChange={setCurrentView}>
                      <SelectTrigger className="w-[180px] rounded-lg border-primary/20 bg-card/50 backdrop-blur-sm">
                        <SelectValue placeholder="보기 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leaderboard">랭킹 보드</SelectItem>
                        <SelectItem value="achievements">업적 시스템</SelectItem>
                        <SelectItem value="statistics">통계</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full md:w-auto">
                      <TabsList className="backdrop-blur-sm bg-background/50 border border-primary/20 p-1">
                        <TabsTrigger
                          value="overall"
                          className="data-[state=active]:bg-primary/20 data-[state=active]:backdrop-blur-md transition-all duration-300"
                        >
                          전체
                        </TabsTrigger>
                        <TabsTrigger
                          value="ctf"
                          className="data-[state=active]:bg-primary/20 data-[state=active]:backdrop-blur-md transition-all duration-300"
                        >
                          CTF
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </motion.div>

                {/* 랭킹 보드 뷰 */}
                {currentView === "leaderboard" && (
                  <motion.div variants={item}>
                    <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="사용자 검색..."
                          className="pl-10 rounded-lg border-primary/20 bg-card/50 backdrop-blur-sm focus:border-primary/50 transition-all duration-300"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Select value={filterTier} onValueChange={setFilterTier}>
                          <SelectTrigger className="w-[150px] rounded-lg border-primary/20 bg-card/50 backdrop-blur-sm">
                            <SelectValue placeholder="티어 필터" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">모든 티어</SelectItem>
                            {tiers.map((tier) => (
                              <SelectItem key={tier.name} value={tier.name}>
                                {tier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-[150px] rounded-lg border-primary/20 bg-card/50 backdrop-blur-sm">
                            <SelectValue placeholder="정렬 기준" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ctf">CTF 점수</SelectItem>
                            <SelectItem value="solved">해결한 문제</SelectItem>
                            <SelectItem value="level">레벨</SelectItem>
                            <SelectItem value="streak">연속 해결</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Card className="rounded-lg border border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden shadow-lg">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-primary/5 border-b border-primary/10">
                            <TableHead className="w-16 text-center font-medium text-primary/80">순위</TableHead>
                            <TableHead className="font-medium text-primary/80">사용자</TableHead>
                            <TableHead className="text-center font-medium text-primary/80">레벨</TableHead>
                            <TableHead className="text-center font-medium text-primary/80">티어</TableHead>
                            <TableHead className="text-center font-medium text-primary/80">해결한 문제</TableHead>
                            <TableHead className="text-right font-medium text-primary/80">CTF 점수</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedUsers.map((user, index) => (
                            <TableRow
                              key={user.uid}
                              className={`cursor-pointer hover:bg-primary/10 transition-colors duration-200 ${
                                user.uid === currentUserRanking?.uid ? "bg-primary/10" : ""
                              }`}
                              onClick={() => router.push(`/user/${user.uid}`)}
                            >
                              <TableCell className="text-center font-medium">
                                {index < 3 && (
                                  <span
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full 
                                    ${
                                      index === 0
                                        ? "bg-[#FFD700]/10 text-[#FFD700]"
                                        : index === 1
                                          ? "bg-[#A8A9AD]/10 text-[#A8A9AD]"
                                          : "bg-[#CD7F32]/10 text-[#CD7F32]"
                                    }`}
                                  >
                                    {currentTab === "overall" ? user.rank : index + 1}
                                  </span>
                                )}
                                {index >= 3 && (
                                  <span className="font-medium">
                                    {currentTab === "overall" ? user.rank : index + 1}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 ring-1 ring-primary/20 transition-all duration-300 hover:ring-2">
                                    <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.username} />
                                    <AvatarFallback>
                                      <User className="h-5 w-5" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">
                                        {user.username}
                                        {user.uid === currentUserRanking?.uid && (
                                          <span className="ml-1 text-primary">(나)</span>
                                        )}
                                      </p>
                                      {user.title && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs bg-primary/10 text-primary backdrop-blur-sm"
                                        >
                                          {user.title}
                                        </Badge>
                                      )}
                                    </div>
                                    {currentTab === "overall" && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <RankChange current={user.rank || 0} previous={user.previousRank || 0} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                  Lv.{user.level || 1}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <TierBadge tier={user.tier || "Bronze"} />
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                  {user.solvedChallenges?.length || 0}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                <span
                                  className="bg-clip-text text-transparent bg-gradient-to-r 
                                  from-blue-500 to-purple-500 text-lg"
                                >
                                  {user.ctfPoints || 0}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </motion.div>
                )}

                {/* 업적 시스템 뷰 */}
                {currentView === "achievements" && (
                  <motion.div variants={item} ref={statsRef}>
                    <Card className="mb-8 border-primary/20 bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500" />
                          업적 시스템
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {achievements.map((achievement) => (
                            <Card
                              key={achievement.id}
                              className={`border border-${getRarityColor(achievement.rarity).replace("text-", "")} bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all duration-300 hover:shadow-lg group`}
                            >
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant="outline"
                                    className={`${getRarityColor(achievement.rarity)} border-${getRarityColor(achievement.rarity).replace("text-", "")}/30 bg-${getRarityColor(achievement.rarity).replace("text-", "")}/10`}
                                  >
                                    {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                                  </Badge>
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                    {achievement.category === "wargame" && "워게임"}
                                    {achievement.category === "ctf" && "CTF"}
                                    {achievement.category === "community" && "커뮤니티"}
                                    {achievement.category === "general" && "일반"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-primary/20 to-blue-500/20">
                                    {achievement.icon}
                                  </div>
                                  <h3 className="font-bold">{achievement.name}</h3>
                                </div>
                              </CardHeader>
                              <CardContent className="pb-2">
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                              </CardContent>
                              <CardFooter className="pt-0">
                                {currentUserRanking?.achievements?.includes(achievement.id) ? (
                                  <Badge className="bg-green-500 text-white">획득함</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    미획득
                                  </Badge>
                                )}
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* 통계 뷰 */}
                {currentView === "statistics" && (
                  <motion.div variants={item} ref={statsRef}>
                    <Card className="mb-8 border-primary/20 bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          통계
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* 카테고리별 해결 문제 */}
                          <Card className="border-primary/20 bg-card/30 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">카테고리별 해결 문제</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {Object.entries(categoryIcons).map(([category, icon]) => (
                                  <div key={category} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {icon}
                                        <span>{category}</span>
                                      </div>
                                      <span className="font-medium">{Math.floor(Math.random() * 20)}문제</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          {/* 티어 분포 */}
                          <Card className="border-primary/20 bg-card/30 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">티어 분포</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {tiers.map((tier) => (
                                  <div key={tier.name} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div style={{ color: tier.color }}>{tier.icon}</div>
                                        <span>{tier.name}</span>
                                      </div>
                                      <span className="font-medium">{Math.floor(Math.random() * 30)}명</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* 티어 시스템 정보 */}
                {showTierInfo && (
                  <motion.div
                    variants={item}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    ref={statsRef}
                  >
                    <Card className="mb-8 border-primary/20 bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-primary" />
                          티어 시스템
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-6 text-muted-foreground">
                          티어 시스템은 사용자의 실력과 활동을 기반으로 등급을 부여합니다. 더 높은 티어에 도달하기 위해
                          문제를 해결하고 포인트를 획득하세요.
                        </p>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          {tiers.map((tier) => (
                            <Card
                              key={tier.name}
                              className="border border-primary/20 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all duration-300 hover:shadow-lg"
                              style={{ borderColor: `${tier.color}40` }}
                            >
                              <CardHeader className="pb-2 text-center">
                                <div
                                  className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2"
                                  style={{ borderColor: tier.color, backgroundColor: `${tier.color}20` }}
                                >
                                  <div style={{ color: tier.color, transform: "scale(1.5)" }}>{tier.icon}</div>
                                </div>
                                <CardTitle style={{ color: tier.color }}>{tier.name}</CardTitle>
                              </CardHeader>
                              <CardContent className="text-center pb-2">
                                <p className="text-sm text-muted-foreground mb-2">필요 포인트</p>
                                <p className="text-2xl font-bold" style={{ color: tier.color }}>
                                  {tier.minPoints}+
                                </p>
                              </CardContent>
                              <CardFooter className="justify-center pt-0">
                                <Badge
                                  variant="outline"
                                  className="border-none"
                                  style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                                >
                                  {tier.name === "Bronze" && "시작"}
                                  {tier.name === "Silver" && "초급"}
                                  {tier.name === "Gold" && "중급"}
                                  {tier.name === "Platinum" && "고급"}
                                  {tier.name === "Diamond" && "전문가"}
                                  {tier.name === "Master" && "마스터"}
                                  {tier.name === "Grandmaster" && "그랜드마스터"}
                                  {tier.name === "Legend" && "레전드"}
                                </Badge>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                className="flex flex-col items-center justify-center py-16 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-28 h-28 mb-6 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <AlertCircle className="h-14 w-14 text-primary opacity-70" />
                </div>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                  랭킹 정보가 없습니다
                </h3>
                <p className="text-muted-foreground mt-3 max-w-md">
                  아직 랭킹 정보가 없습니다. 워게임과 CTF에 참여하여 점수를 획득해보세요.
                </p>
              </motion.div>
            )}
          </div>
        </section>
      </main>
      {/* 필요한 전역 변수 및 함수 */}
      <Globe className="hidden" /> {/* 아이콘 참조를 위한 숨겨진 요소 */}
      <Code className="hidden" /> {/* 아이콘 참조를 위한 숨겨진 요소 */}
    </div>
  )
}
