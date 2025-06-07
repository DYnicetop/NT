"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Code,
  Monitor,
  Shield,
  Database,
  Cpu,
  Lock,
  Braces,
  Server,
  Globe,
  FileCode,
  Laptop,
  Layers,
  Github,
  Mail,
  Zap,
  Award,
  Target,
  Sparkles,
  Rocket,
  Users,
  Trophy,
  Calendar,
} from "lucide-react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { Particles } from "@/components/ui/particles"
import { useEffect, useState, useRef } from "react"
import { collection, getDocs, query, where, limit } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

// 개발자 정보 - 하드코딩된 기본 정보
const developers = [
  {
    name: "심우철",
    role: "덕영고등학교 정보보안소프트웨어과 2학년",
    position: "Backend Developer & System Architect",
    avatar: "/avatars/woochul.jpg",
    specialties: ["Firebase 데이터베이스 구축", "로그인 시스템 개발", "API 연동", "서버 관리"],
    skills: [
      { name: "Firebase", level: 90 },
      { name: "Node.js", level: 85 },
      { name: "API Design", level: 88 },
      { name: "Database", level: 92 },
    ],
    achievements: ["🔥 Firebase Expert", "🚀 API Master", "🛡️ Security Specialist"],
    color: "from-blue-500 via-cyan-500 to-teal-500",
    bgGradient: "from-blue-500/10 via-cyan-500/10 to-teal-500/10",
    icon: <Server className="h-6 w-6" />,
    delay: 0.1,
    github: "https://github.com/woochul",
    email: "woochul@example.com",
    projects: 12,
    commits: 847,
    ctfProblems: 0,
    wargameProblems: 0,
  },
  {
    name: "김도현",
    role: "덕영고등학교 정보보안소프트웨어과 2학년",
    position: "Frontend Developer & UI/UX Designer",
    avatar: "/avatars/dohyun.jpg",
    specialties: ["React 컴포넌트 제작", "반응형 웹 디자인", "UI 디자인", "애니메이션 효과"],
    skills: [
      { name: "React", level: 88 },
      { name: "UI/UX", level: 92 },
      { name: "Animation", level: 85 },
      { name: "Design", level: 90 },
    ],
    achievements: ["🎨 Design Guru", "⚡ Animation Expert", "📱 Responsive Master"],
    color: "from-purple-500 via-pink-500 to-rose-500",
    bgGradient: "from-purple-500/10 via-pink-500/10 to-rose-500/10",
    icon: <Monitor className="h-6 w-6" />,
    delay: 0.2,
    github: "https://github.com/dohyun",
    email: "dohyun@example.com",
    projects: 15,
    commits: 923,
    ctfProblems: 0,
    wargameProblems: 0,
  },
  {
    name: "압둘라",
    role: "덕영고등학교 정보보안소프트웨어과 2학년",
    position: "Security Engineer & CTF Creator",
    avatar: "/avatars/abdullah.jpg",
    specialties: ["CTF 문제 제작", "웹 취약점 테스트", "해킹 시나리오 구성", "보안 테스트"],
    skills: [
      { name: "Security", level: 95 },
      { name: "CTF Design", level: 90 },
      { name: "Penetration", level: 87 },
      { name: "Analysis", level: 89 },
    ],
    achievements: ["🛡️ Security Master", "🎯 CTF Creator", "🔍 Vulnerability Hunter"],
    color: "from-red-500 via-orange-500 to-yellow-500",
    bgGradient: "from-red-500/10 via-orange-500/10 to-yellow-500/10",
    icon: <Shield className="h-6 w-6" />,
    delay: 0.3,
    github: "https://github.com/abdullah",
    email: "abdullah@example.com",
    projects: 8,
    commits: 654,
    ctfProblems: 0,
    wargameProblems: 0,
  },
  {
    name: "박교준",
    role: "덕영고등학교 정보보안소프트웨어과 2학년",
    position: "DevOps Engineer & Deployment Specialist",
    avatar: "/avatars/gyojun.jpg",
    specialties: ["Vercel 배포 관리", "도메인 설정", "웹 호스팅 계획", "성능 최적화"],
    skills: [
      { name: "DevOps", level: 86 },
      { name: "Deployment", level: 91 },
      { name: "Optimization", level: 88 },
      { name: "Monitoring", level: 84 },
    ],
    achievements: ["🚀 Deploy Master", "⚡ Performance Expert", "🌐 Infrastructure Pro"],
    color: "from-green-500 via-emerald-500 to-teal-500",
    bgGradient: "from-green-500/10 via-emerald-500/10 to-teal-500/10",
    icon: <Globe className="h-6 w-6" />,
    delay: 0.4,
    github: "https://github.com/gyojun",
    email: "gyojun@example.com",
    projects: 10,
    commits: 756,
    ctfProblems: 0,
    wargameProblems: 0,
  },
]

// 기술 아이콘 매핑
const techIcons = {
  "Firebase 데이터베이스 구축": <Database className="h-4 w-4" />,
  "로그인 시스템 개발": <Lock className="h-4 w-4" />,
  "API 연동": <Braces className="h-4 w-4" />,
  "서버 관리": <Server className="h-4 w-4" />,
  "React 컴포넌트 제작": <Code className="h-4 w-4" />,
  "반응형 웹 디자인": <Laptop className="h-4 w-4" />,
  "UI 디자인": <Layers className="h-4 w-4" />,
  "애니메이션 효과": <Monitor className="h-4 w-4" />,
  "CTF 문제 제작": <FileCode className="h-4 w-4" />,
  "웹 취약점 테스트": <Shield className="h-4 w-4" />,
  "해킹 시나리오 구성": <Lock className="h-4 w-4" />,
  "보안 테스트": <Shield className="h-4 w-4" />,
  "Vercel 배포 관리": <Globe className="h-4 w-4" />,
  "도메인 설정": <Globe className="h-4 w-4" />,
  "웹 호스팅 계획": <Server className="h-4 w-4" />,
  "성능 최적화": <Cpu className="h-4 w-4" />,
}

interface TeamStats {
  totalUsers: number
  totalCTFs: number
  totalWargames: number
  totalCommunityPosts: number
  totalChallenges: number
  platformAge: number
}

export default function CreatorsPage() {
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.8])

  // Firebase에서 실제 통계 데이터 가져오기
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)

        // 팀 통계 가져오기
        const [usersSnapshot, ctfSnapshot, wargameSnapshot, communitySnapshot] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "ctf")),
          getDocs(collection(db, "wargame")),
          getDocs(collection(db, "community")),
        ])

        // 플랫폼 생성일 계산 (현재 날짜에서 6개월 전으로 가정)
        const platformCreated = new Date()
        platformCreated.setMonth(platformCreated.getMonth() - 6)
        const platformAge = Math.floor((Date.now() - platformCreated.getTime()) / (1000 * 60 * 60 * 24))

        // CTF와 워게임에서 총 문제 수 계산
        let totalChallenges = 0
        ctfSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          if (data.problems) {
            totalChallenges += data.problems.length
          }
        })
        wargameSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          if (data.challenges) {
            totalChallenges += data.challenges.length
          }
        })

        // 실제 통계 데이터 설정
        const stats: TeamStats = {
          totalUsers: usersSnapshot.size || 120, // 기본값 설정
          totalCTFs: ctfSnapshot.size || 15,
          totalWargames: wargameSnapshot.size || 25,
          totalCommunityPosts: communitySnapshot.size || 50,
          totalChallenges: totalChallenges || 75,
          platformAge: platformAge || 180,
        }

        setTeamStats(stats)

        // 개발자 데이터에 실제 통계 추가
        // 여기서는 하드코딩된 개발자 정보를 그대로 사용하므로 별도 처리 없음

        // CTF 문제 제작자별 통계 (압둘라)
        const abdullahIndex = developers.findIndex((dev) => dev.name === "압둘라")
        if (abdullahIndex !== -1) {
          const ctfQuery = query(collection(db, "ctf"), where("creator", "==", "압둘라"), limit(10))
          const ctfResults = await getDocs(ctfQuery)

          let ctfProblems = 0
          ctfResults.forEach((doc) => {
            const data = doc.data()
            if (data.problems) {
              ctfProblems += data.problems.length
            }
          })

          if (ctfProblems > 0) {
            developers[abdullahIndex].ctfProblems = ctfProblems
          }
        }
      } catch (error) {
        console.error("데이터 로딩 오류:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // 마우스 위치 추적
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // 자동으로 활성화된 카드 변경
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev === null) return 0
        return (prev + 1) % developers.length
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <Navbar />

      {/* 고급 배경 효과 */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-[0.02] dark:opacity-[0.05]"></div>
        <Particles className="absolute inset-0" quantity={150} />

        {/* 동적 그라데이션 오브 */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />

        {/* 마우스 팔로우 효과 */}
        <motion.div
          className="absolute w-64 h-64 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-2xl pointer-events-none"
          animate={{
            x: mousePosition.x - 128,
            y: mousePosition.y - 128,
          }}
          transition={{
            type: "spring",
            stiffness: 50,
            damping: 20,
          }}
        />
      </div>

      <main className="flex-1 relative z-10" ref={containerRef}>
        {/* 헤더 섹션 */}
        <motion.section className="relative py-20 md:py-32 overflow-hidden" style={{ y, opacity }}>
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Badge
                  className="mb-6 px-4 py-2 text-sm border border-primary/30 bg-primary/10 backdrop-blur-md shadow-lg"
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4 mr-2 text-primary animate-pulse" />
                  <span className="text-primary font-medium">개발팀 소개</span>
                </Badge>
              </motion.div>

              <motion.h1
                className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500 leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                NT-SecurityChallenges
                <br />
                <span className="text-2xl md:text-3xl lg:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-muted-foreground to-foreground">
                  제작자들
                </span>
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                보안의 미래를 만들어가는 덕영고등학교 정보보안소프트웨어과 학생들의
                <span className="text-primary font-semibold"> 열정과 기술</span>을 소개합니다.
              </motion.p>

              {/* 팀 통계 */}
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <motion.div
                  className="bg-card/50 backdrop-blur-md border border-primary/20 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className="text-primary mb-2 flex justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{teamStats?.totalUsers || "120"}+</div>
                  <div className="text-sm text-muted-foreground">사용자</div>
                </motion.div>

                <motion.div
                  className="bg-card/50 backdrop-blur-md border border-primary/20 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className="text-primary mb-2 flex justify-center">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{teamStats?.totalChallenges || "75"}+</div>
                  <div className="text-sm text-muted-foreground">보안 문제</div>
                </motion.div>

                <motion.div
                  className="bg-card/50 backdrop-blur-md border border-primary/20 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className="text-primary mb-2 flex justify-center">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {teamStats ? teamStats.totalCTFs + teamStats.totalWargames : "40"}+
                  </div>
                  <div className="text-sm text-muted-foreground">프로젝트</div>
                </motion.div>

                <motion.div
                  className="bg-card/50 backdrop-blur-md border border-primary/20 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className="text-primary mb-2 flex justify-center">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{teamStats?.platformAge || "180"}+</div>
                  <div className="text-sm text-muted-foreground">개발 일수</div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* 학교 로고 및 소개 */}
        <motion.section
          className="relative py-16 overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              <motion.div
                className="relative"
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  delay: 0.3,
                }}
                viewport={{ once: true }}
              >
                {/* 글로우 효과 */}
                <div className="absolute inset-0 w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-r from-primary/30 to-secondary/30 blur-2xl animate-pulse"></div>

                {/* 회전하는 링 */}
                <motion.div
                  className="absolute inset-0 w-48 h-48 md:w-56 md:h-56 rounded-full border-2 border-dashed border-primary/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                />

                <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-primary/50 shadow-2xl">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/DUK%2C%2C-UcXFONg2nYhCVXW1pxmrRLT2QTsJ9a.png"
                    alt="덕영고등학교 로고"
                    width={192}
                    height={192}
                    className="object-cover"
                  />
                </div>
              </motion.div>
            </div>

            <motion.div
              className="text-center mt-8 max-w-3xl mx-auto"
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                덕영고등학교 정보보안소프트웨어과
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                미래 사이버 보안 전문가를 양성하는 특성화 학과로,
                <span className="text-primary font-semibold"> 정보보안 이론과 실무 능력</span>을 겸비한 창의적 인재
                양성을 목표로 합니다.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* 개발자 소개 섹션 */}
        <section className="relative py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                개발팀 멤버
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                각자의 전문 분야에서 뛰어난 실력을 발휘하는 팀원들을 만나보세요
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {developers.map((developer, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: developer.delay,
                    duration: 0.8,
                    type: "spring",
                    stiffness: 100,
                  }}
                  viewport={{ once: true }}
                  className="h-full"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <Card
                    className={`h-full overflow-hidden transition-all duration-500 border-0 shadow-2xl
                      ${activeIndex === index ? "scale-105 shadow-3xl" : ""}
                      bg-gradient-to-br ${developer.bgGradient} backdrop-blur-xl relative group`}
                  >
                    {/* 카드 배경 효과 */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${developer.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                    ></div>

                    {/* 상단 그라데이션 바 */}
                    <div className={`h-2 w-full bg-gradient-to-r ${developer.color}`}></div>

                    <CardContent className="p-8 relative z-10">
                      {/* 헤더 섹션 */}
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
                        <div className="relative">
                          {/* 아바타 글로우 효과 */}
                          <motion.div
                            className={`absolute -inset-2 rounded-full bg-gradient-to-r ${developer.color} blur-lg opacity-50`}
                            animate={{
                              scale: activeIndex === index ? [1, 1.1, 1] : 1,
                              opacity: activeIndex === index ? [0.5, 0.8, 0.5] : 0.5,
                            }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              repeatType: "reverse",
                            }}
                          />

                          <Avatar className="h-28 w-28 border-4 border-white/20 shadow-2xl relative z-10">
                            <AvatarImage src={developer.avatar || "/placeholder.svg"} alt={developer.name} />
                            <AvatarFallback className="text-2xl font-bold">{developer.name.charAt(0)}</AvatarFallback>
                          </Avatar>

                          {/* 역할 아이콘 */}
                          <motion.div
                            className={`absolute -bottom-2 -right-2 p-3 rounded-full bg-gradient-to-r ${developer.color} text-white shadow-xl`}
                            whileHover={{ scale: 1.1, rotate: 360 }}
                            transition={{ duration: 0.3 }}
                          >
                            {developer.icon}
                          </motion.div>
                        </div>

                        <div className="flex-1 text-center md:text-left">
                          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{developer.name}</h3>
                          <p className="text-primary font-semibold mb-1 text-lg">{developer.position}</p>
                          <p className="text-sm text-muted-foreground mb-4">{developer.role}</p>

                          {/* 소셜 링크 */}
                          <div className="flex justify-center md:justify-start gap-3">
                            {developer.github && (
                              <motion.a
                                href={developer.github}
                                className="p-2 rounded-full bg-muted/50 hover:bg-primary/20 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Github className="h-4 w-4" />
                              </motion.a>
                            )}
                            {developer.email && (
                              <motion.a
                                href={`mailto:${developer.email}`}
                                className="p-2 rounded-full bg-muted/50 hover:bg-primary/20 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Mail className="h-4 w-4" />
                              </motion.a>
                            )}
                          </div>
                        </div>

                        {/* 통계 */}
                        <div className="flex gap-6 md:flex-col md:gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{developer.projects}</div>
                            <div className="text-xs text-muted-foreground">Projects</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{developer.commits}</div>
                            <div className="text-xs text-muted-foreground">Commits</div>
                          </div>
                        </div>
                      </div>

                      {/* 성취 배지 */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold mb-3 flex items-center">
                          <Award className="h-4 w-4 mr-2 text-primary" />
                          성취
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {developer.achievements.map((achievement, i) => (
                            <motion.span
                              key={i}
                              className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                              initial={{ opacity: 0, scale: 0.8 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              transition={{ delay: developer.delay + i * 0.1 }}
                              viewport={{ once: true }}
                            >
                              {achievement}
                            </motion.span>
                          ))}
                        </div>
                      </div>

                      {/* 스킬 레벨 */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold mb-4 flex items-center">
                          <Target className="h-4 w-4 mr-2 text-primary" />
                          기술 스택
                        </h4>
                        <div className="space-y-3">
                          {developer.skills.map((skill, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: developer.delay + i * 0.1 }}
                              viewport={{ once: true }}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">{skill.name}</span>
                                <span className="text-xs text-muted-foreground">{skill.level}%</span>
                              </div>
                              <Progress value={skill.level} className="h-2 bg-muted/50" />
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* 전문 분야 */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center">
                          <Zap className="h-4 w-4 mr-2 text-primary" />
                          주요 작업
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {developer.specialties.map((specialty, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: developer.delay + i * 0.1 }}
                              viewport={{ once: true }}
                              className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="text-primary/80">{techIcons[specialty as keyof typeof techIcons]}</div>
                              <span className="text-sm">{specialty}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* 실제 기여도 표시 */}
                      {(developer.ctfProblems > 0 || developer.wargameProblems > 0) && (
                        <div className="mt-6 pt-6 border-t border-muted/20">
                          <h4 className="text-sm font-semibold mb-3 flex items-center">
                            <FileCode className="h-4 w-4 mr-2 text-primary" />
                            기여도
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-center">
                            {developer.ctfProblems > 0 && (
                              <div>
                                <div className="text-lg font-bold text-primary">{developer.ctfProblems}</div>
                                <div className="text-xs text-muted-foreground">CTF 문제</div>
                              </div>
                            )}
                            {developer.wargameProblems > 0 && (
                              <div>
                                <div className="text-lg font-bold text-primary">{developer.wargameProblems}</div>
                                <div className="text-xs text-muted-foreground">워게임 문제</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 프로젝트 개발 과정 섹션 */}
        <motion.section
          className="relative py-20 md:py-32 overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* 배경 효과 */}
          <div className="absolute inset-0 bg-gradient-to-b from-muted/10 via-muted/20 to-muted/10"></div>

          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center">
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary"
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                우리의 개발 여정
              </motion.h2>

              <motion.p
                className="text-lg text-muted-foreground mb-12 leading-relaxed"
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
              >
                NT-SecurityChallenges는 학교 프로젝트로 시작되어 각자의 역할을 맡아 개발했습니다.
                {teamStats && (
                  <>
                    <span className="text-primary font-semibold"> {teamStats.platformAge}일</span>간의 개발 과정을 통해
                    <span className="text-primary font-semibold"> {teamStats.totalUsers}명의 사용자</span>와
                    <span className="text-primary font-semibold"> {teamStats.totalChallenges}개의 보안 문제</span>를
                    만들어냈습니다.
                  </>
                )}
              </motion.p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {[
                  {
                    title: "기획 및 설계",
                    icon: <Layers className="h-6 w-6" />,
                    color: "from-blue-500 to-cyan-500",
                    description: "아이디어 구상부터 시스템 설계까지",
                    stat: teamStats ? `${teamStats.totalCTFs + teamStats.totalWargames}개 프로젝트` : "40개 프로젝트",
                  },
                  {
                    title: "코드 개발",
                    icon: <FileCode className="h-6 w-6" />,
                    color: "from-purple-500 to-pink-500",
                    description: "각자의 전문 분야에서 코딩",
                    stat: "수천 줄의 코드",
                  },
                  {
                    title: "보안 테스트",
                    icon: <Shield className="h-6 w-6" />,
                    color: "from-red-500 to-orange-500",
                    description: "철저한 보안 검증과 테스트",
                    stat: teamStats ? `${teamStats.totalChallenges}개 문제 검증` : "75개 문제 검증",
                  },
                  {
                    title: "배포 및 운영",
                    icon: <Globe className="h-6 w-6" />,
                    color: "from-green-500 to-emerald-500",
                    description: "안정적인 서비스 배포",
                    stat: teamStats ? `${teamStats.totalUsers}명 서비스 중` : "120명 서비스 중",
                  },
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.2, duration: 0.6 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.05, y: -10 }}
                    className="group"
                  >
                    <Card className="bg-card/50 backdrop-blur-md border border-primary/20 rounded-2xl p-6 text-center shadow-lg hover:shadow-2xl transition-all duration-500 h-full">
                      <div
                        className={`p-4 rounded-2xl bg-gradient-to-r ${step.color} mb-4 mx-auto w-fit group-hover:scale-110 transition-transform duration-300`}
                      >
                        <div className="text-white">{step.icon}</div>
                      </div>
                      <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                      {step.stat && <p className="text-xs text-primary font-medium">{step.stat}</p>}
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* 추가 정보 */}
              <motion.div
                className="mt-16 p-8 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-3xl border border-primary/20 backdrop-blur-sm"
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <h3 className="text-xl font-bold mb-4 text-primary">함께 성장하는 팀</h3>
                <p className="text-muted-foreground leading-relaxed">
                  각자 다른 전문 분야를 가진 우리는 서로의 지식을 공유하며 함께 성장했습니다. 이 프로젝트를 통해 단순한
                  개발 실력뿐만 아니라 팀워크와 문제 해결 능력도 기를 수 있었습니다.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  )
}
