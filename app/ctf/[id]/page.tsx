"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  type Timestamp,
  serverTimestamp,
  setDoc,
  onSnapshot,
  addDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Clock,
  Trophy,
  Users,
  AlertCircle,
  Calendar,
  ArrowLeft,
  CheckCircle,
  Lock,
  Timer,
  User,
  FileText,
  Server,
  Braces,
  Layers,
  Cpu,
  Download,
  ExternalLink,
  RefreshCw,
  Key,
  ShieldCheck,
  Loader2,
} from "lucide-react"

// 워게임용 구문 강조
const highlightCodeForWargame = (code: string, language: string): string => {
  if (language === "javascript") {
    return code.replace(/console\.log/g, '<span style="color: lightblue;">console.log</span>')
  } else if (language === "python") {
    return code.replace(/print\(/g, '<span style="color: lightgreen;">print(</span>')
  }
  return code
}

// 레벨 계산 함수
const calculateLevelFromExp = (exp: number) => {
  const level = Math.floor(exp / 1000) + 1
  const currentExp = exp % 1000
  const requiredExp = 1000
  return { level, currentExp, requiredExp, totalExp: exp }
}

// 노션 스타일 마크다운 파서 (CTF용) - 복사 가능하도록 수정
const parseNotionMarkdown = (markdown: string): string => {
  if (!markdown) return ""

  let html = markdown

  // 1. 코드 블록 처리 (복사 가능하도록 수정)
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || "plain"
    const codeContent = code.trim()

    return `<div class="notion-code-block my-6 select-text">
      <div class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">${language}</span>
          </div>
          <button class="copy-btn text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" onclick="copyCtfCode(this)" data-code="${encodeURIComponent(codeContent)}">
            복사
          </button>
        </div>
        <div class="relative">
          <pre class="bg-gray-900 text-gray-100 p-4 overflow-x-auto m-0 font-mono text-sm leading-relaxed select-text"><code class="language-${language} select-text">${highlightCodeForCtf(codeContent, language)}</code></pre>
        </div>
      </div>
    </div>`
  })

  // 2. 인라인 코드 처리 (복사 가능하도록 수정)
  html = html.replace(/`([^`\n]+)`/g, (match, code) => {
    return `<span class="inline-flex items-center px-2 py-1 mx-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm font-mono border border-red-200 dark:border-red-800 shadow-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors select-text">${code}</span>`
  })

  // 3. 헤딩 처리
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3 select-text">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-8 mb-4 select-text">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-6 select-text">$1</h1>')

  // 4. 텍스트 스타일링
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold select-text">$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em class="italic select-text">$1</em>')

  // 5. 링크 처리
  html = html.replace(
    /\[([^\]]+)\]$$([^)]+)$$/g,
    '<a href="$2" class="text-blue-500 hover:text-blue-700 underline select-text" target="_blank" rel="noopener noreferrer">$1</a>',
  )

  // 6. 목록 처리
  html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc select-text">$1</li>')
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc select-text">$1</li>')

  // 7. 단락 처리
  html = html.replace(/\n\n/g, '</p><p class="mb-4 select-text">')
  html = `<p class="mb-4 select-text">${html}</p>`

  return html
}

// CTF용 구문 강조
const highlightCodeForCtf = (code: string, language: string): string => {
  return highlightCodeForWargame(code, language)
}

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
  status: "upcoming" | "active" | "ended"
  tags?: string[]
  isPasswordProtected?: boolean
  authorizedUsers?: string[]
  password?: string
  bannerImage?: string
}

// CTF 문제 타입 정의
type CTFProblem = {
  id: string
  contestId: string
  title: string
  description: string
  category: string
  difficulty: string
  points: number
  files?: string[]
  port?: number
  flag: string
  solvedBy: string[]
  solvedCount: number
  order: number
}

// 참가자 타입 정의
type Participant = {
  uid: string
  username: string
  photoURL?: string
  score: number
  solvedProblems: string[]
  lastSolveTime?: Timestamp
  rank?: number
}

// 점수 이벤트 타입 정의
type ScoreEvent = {
  timestamp: Timestamp
  userId: string
  username: string
  problemId: string
  problemTitle: string
  points: number
}

// 차트 데이터 타입 정의
type ChartData = {
  name: string
  score: number
  color: string
}

// 시간별 점수 데이터 타입
type TimeSeriesData = {
  time: string
  [key: string]: string | number
}

export default function CTFContestPage({ params }: { params: { id: string } }) {
  const { user, userProfile, updateUserProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [contest, setContest] = useState<CTFContest | null>(null)
  const [problems, setProblems] = useState<CTFProblem[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [flagInput, setFlagInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentProblem, setCurrentProblem] = useState<CTFProblem | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [isRefreshingChart, setIsRefreshingChart] = useState(false)

  // 비밀번호 관련 상태
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)

  // 색상 배열 (참가자별 차트 색상)
  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#a4de6c",
    "#d0ed57",
    "#83a6ed",
    "#8dd1e1",
    "#a4add3",
    "#d85858",
    "#82ca9d",
    "#ffc658",
  ]

  // 카테고리 아이콘 매핑
  const categoryIcons: Record<string, React.ReactNode> = {
    "웹 해킹": <Braces className="h-5 w-5" />,
    "시스템 해킹": <Server className="h-5 w-5" />,
    리버싱: <Cpu className="h-5 w-5" />,
    암호학: <Lock className="h-5 w-5" />,
    포렌식: <FileText className="h-5 w-5" />,
    기타: <Layers className="h-5 w-5" />,
  }

  // 난이도 색상 매핑
  const difficultyColors: Record<string, string> = {
    초급: "bg-green-500/10 text-green-500",
    중급: "bg-yellow-500/10 text-yellow-500",
    고급: "bg-red-500/10 text-red-500",
  }

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 로컬 스토리지 함수들
  const saveAuthStateToLocalStorage = (contestId: string, isAuthorized: boolean) => {
    if (typeof window !== "undefined" && user) {
      try {
        localStorage.setItem(`ctf_auth_${contestId}_${user.uid}`, isAuthorized ? "true" : "false")
        const expiryTime = new Date()
        expiryTime.setDate(expiryTime.getDate() + 7)
        localStorage.setItem(`ctf_auth_${contestId}_${user.uid}_expiry`, expiryTime.toISOString())
      } catch (e) {
        console.error("Failed to save auth state to localStorage:", e)
      }
    }
  }

  const getAuthStateFromLocalStorage = (contestId: string): boolean => {
    if (typeof window !== "undefined" && user) {
      try {
        const expiryTimeStr = localStorage.getItem(`ctf_auth_${contestId}_${user.uid}_expiry`)
        if (expiryTimeStr) {
          const expiryTime = new Date(expiryTimeStr)
          if (expiryTime < new Date()) {
            localStorage.removeItem(`ctf_auth_${contestId}_${user.uid}`)
            localStorage.removeItem(`ctf_auth_${contestId}_${user.uid}_expiry`)
            return false
          }
        }
        return localStorage.getItem(`ctf_auth_${contestId}_${user.uid}`) === "true"
      } catch (e) {
        console.error("Failed to get auth state from localStorage:", e)
        return false
      }
    }
    return false
  }

  const saveParticipationState = (contestId: string, hasJoined: boolean) => {
    if (typeof window !== "undefined" && user) {
      try {
        localStorage.setItem(`ctf_joined_${contestId}_${user.uid}`, hasJoined ? "true" : "false")
      } catch (e) {
        console.error("Failed to save participation state:", e)
      }
    }
  }

  const getParticipationState = (contestId: string): boolean => {
    if (typeof window !== "undefined" && user) {
      try {
        return localStorage.getItem(`ctf_joined_${contestId}_${user.uid}`) === "true"
      } catch (e) {
        console.error("Failed to get participation state:", e)
        return false
      }
    }
    return false
  }

  // 대회 정보 불러오기
  useEffect(() => {
    const fetchContest = async () => {
      try {
        const contestRef = doc(db, "ctf_contests", params.id)
        const contestSnap = await getDoc(contestRef)

        if (contestSnap.exists()) {
          const contestData = contestSnap.data()
          const now = new Date()
          const startTime = contestData.startTime?.toDate() || new Date()
          const endTime = contestData.endTime?.toDate() || new Date()

          let status: "upcoming" | "active" | "ended" = "upcoming"
          if (now < startTime) {
            status = "upcoming"
          } else if (now >= startTime && now <= endTime) {
            status = "active"
          } else {
            status = "ended"
          }

          const contestWithStatus = {
            id: contestSnap.id,
            ...contestData,
            status,
          } as CTFContest

          setContest(contestWithStatus)

          // 비밀번호 보호 대회인 경우 권한 확인
          if (contestData.isPasswordProtected) {
            if (isAdmin) {
              setIsAuthorized(true)
              saveAuthStateToLocalStorage(params.id, true)
            } else if (user && contestData.authorizedUsers?.includes(user.uid)) {
              setIsAuthorized(true)
              saveAuthStateToLocalStorage(params.id, true)
            } else if (user && getAuthStateFromLocalStorage(params.id)) {
              setIsAuthorized(true)
              try {
                const contestRef = doc(db, "ctf_contests", params.id)
                updateDoc(contestRef, {
                  authorizedUsers: arrayUnion(user.uid),
                }).catch((err) => console.log("Auth sync error:", err))
              } catch (e) {
                console.log("Failed to sync auth state with server")
              }
            } else {
              setIsAuthorized(false)
              if (user) {
                setIsPasswordDialogOpen(true)
              } else {
                toast({
                  title: "로그인이 필요합니다",
                  description: "비밀번호 보호 대회에 참가하려면 먼저 로그인해주세요.",
                  variant: "destructive",
                })
              }
            }
          } else {
            setIsAuthorized(true)
          }

          // 사용자가 이미 참가했는지 확인
          if (user) {
            if (contestData.participants?.includes(user.uid) || getParticipationState(contestSnap.id)) {
              setHasJoined(true)
              saveParticipationState(contestSnap.id, true)
            }
          }

          // 문제 불러오기 (인증된 경우에만)
          if (
            isAdmin ||
            !contestData.isPasswordProtected ||
            (user && contestData.authorizedUsers?.includes(user.uid))
          ) {
            if (status !== "upcoming" || isAdmin) {
              await fetchProblems(contestSnap.id)
            }
            await fetchParticipants(contestSnap.id)
            fetchScoreEvents(contestSnap.id)
          }
        } else {
          toast({
            title: "대회를 찾을 수 없습니다",
            description: "요청하신 CTF 대회가 존재하지 않습니다.",
            variant: "destructive",
          })
          router.push("/ctf")
        }
      } catch (error) {
        console.error("Error fetching contest:", error)
        toast({
          title: "오류 발생",
          description: "대회 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })

        if (params.id && getAuthStateFromLocalStorage(params.id)) {
          setIsAuthorized(true)
          fetchProblems(params.id)
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchContest()
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [params.id, router, toast, user, isAdmin])

  // 문제 불러오기
  const fetchProblems = async (contestId: string) => {
    try {
      const problemsRef = collection(db, "ctf_problems")
      const q = query(problemsRef, where("contestId", "==", contestId))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setProblems([])
        return
      }

      const problemsData: CTFProblem[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data() as any
        problemsData.push({
          id: doc.id,
          ...data,
          solvedBy: data.solvedBy || [],
          solvedCount: data.solvedCount || 0,
          order: data.order || 0,
        } as CTFProblem)
      })

      problemsData.sort((a, b) => a.points - b.points)
      setProblems(problemsData)

      if (problemsData.length > 0 && !currentProblem) {
        setCurrentProblem(problemsData[0])
      }
    } catch (error) {
      console.error("Error fetching problems:", error)
      toast({
        title: "문제 로딩 실패",
        description: "문제를 불러오는 중 오류가 발생했습니다. 새로고침을 시도해보세요.",
        variant: "destructive",
      })
    }
  }

  // 참가자 불러오기
  const fetchParticipants = async (contestId: string) => {
    try {
      const participantsRef = collection(db, "ctf_participants")
      const basicQuery = query(participantsRef, where("contestId", "==", contestId))
      const querySnapshot = await getDocs(basicQuery)

      const participantsData: Participant[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Participant
        participantsData.push(data)
      })

      participantsData.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (!a.lastSolveTime) return 1
        if (!b.lastSolveTime) return -1
        return a.lastSolveTime.toMillis() - b.lastSolveTime.toMillis()
      })

      participantsData.forEach((participant, index) => {
        participant.rank = index + 1
      })

      setParticipants(participantsData)
      updateChartData(participantsData)
    } catch (error) {
      console.error("Error fetching participants:", error)
      toast({
        title: "참가자 정보 로딩 실패",
        description: "참가자 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 점수 이벤트 불러오기
  const fetchScoreEvents = (contestId: string) => {
    try {
      const eventsRef = collection(db, "ctf_solve_logs")
      const q = query(eventsRef, where("contestId", "==", contestId), orderBy("solvedAt", "asc"))

      const unsubscribe = onSnapshot(
        q,
        { includeMetadataChanges: true },
        (snapshot) => {
          const events: ScoreEvent[] = []
          snapshot.forEach((doc) => {
            const data = doc.data()
            events.push({
              timestamp: data.solvedAt,
              userId: data.userId,
              username: data.username,
              problemId: data.problemId,
              problemTitle: data.problemTitle,
              points: data.points,
            })
          })

          setScoreEvents(events)
          updateTimeSeriesData(events)

          if (contest) {
            fetchParticipants(contest.id)
          }
        },
        (error) => {
          console.error("Error in score events listener:", error)
        },
      )

      return () => {
        unsubscribe()
      }
    } catch (error) {
      console.error("Error setting up score events listener:", error)
      return () => {}
    }
  }

  // 차트 데이터 업데이트
  const updateChartData = (participantsData: Participant[]) => {
    try {
      if (!participantsData || participantsData.length === 0) {
        setChartData([])
        return
      }

      const sortedData = [...participantsData].sort((a, b) => b.score - a.score)
      const topParticipants = sortedData.slice(0, 15)

      const data = topParticipants.map((participant, index) => ({
        name: participant.username || `참가자 ${index + 1}`,
        score: participant.score || 0,
        color: colors[index % colors.length],
      }))

      setChartData(data)
    } catch (error) {
      console.error("Error updating chart data:", error)
      setChartData([])
    }
  }

  // 시간별 점수 데이터 업데이트
  const updateTimeSeriesData = (events: ScoreEvent[]) => {
    if (events.length === 0) {
      setTimeSeriesData([])
      return
    }

    try {
      const userScores: Record<string, { username: string; scores: { time: Date; score: number }[] }> = {}

      events.forEach((event) => {
        if (!userScores[event.userId]) {
          userScores[event.userId] = {
            username: event.username,
            scores: [],
          }
        }

        const lastScore =
          userScores[event.userId].scores.length > 0
            ? userScores[event.userId].scores[userScores[event.userId].scores.length - 1].score
            : 0

        userScores[event.userId].scores.push({
          time: event.timestamp.toDate(),
          score: lastScore + event.points,
        })
      })

      if (Object.keys(userScores).length === 0) {
        setTimeSeriesData([])
        return
      }

      const startTime = events[0].timestamp.toDate()
      const endTime = new Date()
      const timePoints: Date[] = []

      const totalDuration = endTime.getTime() - startTime.getTime()
      const interval = Math.max(5 * 60000, Math.floor(totalDuration / 20))

      let currentTime = new Date(startTime)
      while (currentTime <= endTime) {
        timePoints.push(new Date(currentTime))
        currentTime = new Date(currentTime.getTime() + interval)
      }

      if (timePoints.length > 0 && timePoints[timePoints.length - 1].getTime() !== endTime.getTime()) {
        timePoints.push(endTime)
      }

      const timeSeriesData: TimeSeriesData[] = timePoints.map((timePoint) => {
        const dataPoint: TimeSeriesData = {
          time: timePoint.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        }

        Object.entries(userScores).forEach(([userId, userData]) => {
          const lastScoreBeforeTime = [...userData.scores].filter((score) => score.time <= timePoint).pop()
          dataPoint[userData.username] = lastScoreBeforeTime ? lastScoreBeforeTime.score : 0
        })

        return dataPoint
      })

      const topUsers = Object.values(userScores)
        .sort((a, b) => {
          const aLastScore = a.scores.length > 0 ? a.scores[a.scores.length - 1].score : 0
          const bLastScore = b.scores.length > 0 ? b.scores[b.scores.length - 1].score : 0
          return bLastScore - aLastScore
        })
        .slice(0, 10)
        .map((userData) => userData.username)

      const filteredData = timeSeriesData.map((dataPoint) => {
        const filteredPoint: TimeSeriesData = { time: dataPoint.time }

        topUsers.forEach((username) => {
          if (dataPoint[username] !== undefined) {
            filteredPoint[username] = dataPoint[username]
          }
        })

        return filteredPoint
      })

      setTimeSeriesData(filteredData)
    } catch (error) {
      console.error("Error updating time series data:", error)
      setTimeSeriesData([])
    }
  }

  // 남은 시간 계산
  useEffect(() => {
    if (!contest) return

    const updateTimeRemaining = () => {
      const now = new Date()
      let targetTime: Date

      if (contest.status === "upcoming") {
        targetTime = contest.startTime.toDate()
      } else if (contest.status === "active") {
        targetTime = contest.endTime.toDate()
      } else {
        setTimeRemaining("대회 종료")
        return
      }

      const total = targetTime.getTime() - now.getTime()

      if (total <= 0) {
        if (contest.status === "upcoming") {
          setContest({ ...contest, status: "active" })
          setTimeRemaining("대회 시작됨")
        } else if (contest.status === "active") {
          setContest({ ...contest, status: "ended" })
          setTimeRemaining("대회 종료")
        }
        return
      }

      const seconds = Math.floor((total / 1000) % 60)
      const minutes = Math.floor((total / 1000 / 60) % 60)
      const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
      const days = Math.floor(total / (1000 * 60 * 60 * 24))

      let timeString = ""

      if (days > 0) {
        timeString = `${days}일 ${hours}시간 ${minutes}분`
      } else if (hours > 0) {
        timeString = `${hours}시간 ${minutes}분 ${seconds}초`
      } else {
        timeString = `${minutes}분 ${seconds}초`
      }

      setTimeRemaining(timeString)
    }

    updateTimeRemaining()
    timerRef.current = setInterval(updateTimeRemaining, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [contest])

  // 대회 참가 처리
  const handleJoinContest = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "대회에 참가하려면 먼저 로그인해주세요.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!contest) return

    setIsJoining(true)

    try {
      if (contest.participants?.includes(user.uid)) {
        setHasJoined(true)
        toast({
          title: "이미 참가 중입니다",
          description: "이미 이 대회에 참가하셨습니다.",
          variant: "default",
        })
        setIsJoining(false)
        return
      }

      try {
        const contestRef = doc(db, "ctf_contests", contest.id)
        await updateDoc(contestRef, {
          participants: arrayUnion(user.uid),
        })
      } catch (updateError) {
        console.error("대회 참가자 목록 업데이트 실패:", updateError)
        toast({
          title: "참가자 목록 업데이트 실패",
          description: "대회 참가는 가능하지만 참가자 목록에 즉시 반영되지 않을 수 있습니다.",
          variant: "destructive",
        })
      }

      try {
        const participantId = `${contest.id}_${user.uid}`
        const participantRef = doc(db, "ctf_participants", participantId)
        const participantSnap = await getDoc(participantRef)

        if (!participantSnap.exists()) {
          await setDoc(participantRef, {
            uid: user.uid,
            username: userProfile?.username || user.displayName || "참가자",
            photoURL: user.photoURL || null,
            contestId: contest.id,
            score: 0,
            solvedProblems: [],
            joinedAt: serverTimestamp(),
          })
        }
      } catch (docError) {
        console.error("참가자 문서 생성 실패:", docError)
        toast({
          title: "참가자 정보 저장 실패",
          description: "참가자 정보를 저장하는 중 오류가 발생했습니다. 기능에 일부 제한이 있을 수 있습니다.",
          variant: "destructive",
        })
      }

      setHasJoined(true)
      saveParticipationState(contest.id, true)

      const updatedParticipants = [...(contest.participants || []), user.uid]
      setContest({
        ...contest,
        participants: updatedParticipants,
      })

      toast({
        title: "대회 참가 완료",
        description: "CTF 대회에 성공적으로 참가했습니다.",
        variant: "default",
      })

      const newParticipant: Participant = {
        uid: user.uid,
        username: userProfile?.username || user.displayName || "참가자",
        photoURL: user.photoURL || undefined,
        score: 0,
        solvedProblems: [],
        rank: participants.length + 1,
      }

      setParticipants([...participants, newParticipant])

      try {
        await fetchParticipants(contest.id)
      } catch (fetchError) {
        console.error("참가자 목록 새로고침 실패:", fetchError)
      }
    } catch (error) {
      console.error("대회 참가 중 오류:", error)
      toast({
        title: "오류 발생",
        description: "대회 참가 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  // 플래그 제출 처리
  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "문제를 풀려면 먼저 로그인해주세요.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!contest) {
      toast({
        title: "대회 정보 오류",
        description: "대회 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!hasJoined) {
      toast({
        title: "대회 참가 필요",
        description: "문제를 풀려면 먼저 대회에 참가해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!currentProblem) {
      toast({
        title: "문제를 선택해주세요",
        description: "플래그를 제출할 문제를 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!flagInput.trim()) {
      toast({
        title: "플래그를 입력해주세요",
        description: "플래그를 입력한 후 제출해주세요.",
        variant: "destructive",
      })
      return
    }

    if (currentProblem.solvedBy?.includes(user.uid)) {
      toast({
        title: "이미 해결한 문제입니다",
        description: "이 문제는 이미 해결하셨습니다.",
        variant: "default",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const problemRef = doc(db, "ctf_problems", currentProblem.id)
      const problemSnap = await getDoc(problemRef)

      if (!problemSnap.exists()) {
        throw new Error("문제를 찾을 수 없습니다")
      }

      const freshProblemData = problemSnap.data()
      const correctFlag = freshProblemData.flag

      if (flagInput.trim().toLowerCase() === correctFlag.trim().toLowerCase()) {
        try {
          if (!contest.participants?.includes(user.uid)) {
            const contestRef = doc(db, "ctf_contests", contest.id)
            await updateDoc(contestRef, {
              participants: arrayUnion(user.uid),
            })

            setHasJoined(true)
            saveParticipationState(contest.id, true)
          }
        } catch (joinError) {
          console.error("대회 참가자 목록 업데이트 실패:", joinError)
        }

        const participantId = `${contest.id}_${user.uid}`

        try {
          const participantRef = doc(db, "ctf_participants", participantId)
          const participantSnap = await getDoc(participantRef)

          if (!participantSnap.exists()) {
            await setDoc(participantRef, {
              uid: user.uid,
              username: userProfile?.username || user.displayName || "참가자",
              photoURL: user.photoURL || null,
              contestId: contest.id,
              score: currentProblem.points,
              solvedProblems: [currentProblem.id],
              lastSolveTime: serverTimestamp(),
              joinedAt: serverTimestamp(),
            })
          } else {
            await updateDoc(participantRef, {
              score: increment(currentProblem.points),
              solvedProblems: arrayUnion(currentProblem.id),
              lastSolveTime: serverTimestamp(),
            })
          }
        } catch (participantError) {
          console.error("참가자 문서 처리 오류:", participantError)
          toast({
            title: "참가자 정보 업데이트 오류",
            description: "점수는 반영되지만 순위표에 즉시 반영되지 않을 수 있습니다.",
            variant: "destructive",
          })
        }

        try {
          await updateDoc(problemRef, {
            solvedCount: increment(1),
            solvedBy: arrayUnion(user.uid),
          })
        } catch (problemUpdateError) {
          console.error("문제 업데이트 오류:", problemUpdateError)
        }

        try {
          const solveLogId = `${contest.id}_${user.uid}_${currentProblem.id}`
          const solveLogRef = doc(db, "ctf_solve_logs", solveLogId)
          await setDoc(solveLogRef, {
            userId: user.uid,
            username: userProfile?.username || user.displayName || "참가자",
            contestId: contest.id,
            problemId: currentProblem.id,
            problemTitle: currentProblem.title,
            category: currentProblem.category,
            difficulty: currentProblem.difficulty,
            points: currentProblem.points,
            solvedAt: serverTimestamp(),
          })

          const userSolveLogRef = doc(db, "user_solve_logs", `${user.uid}_${currentProblem.id}`)
          await setDoc(userSolveLogRef, {
            userId: user.uid,
            username: userProfile?.username || user.displayName || "참가자",
            challengeId: currentProblem.id,
            challengeTitle: currentProblem.title,
            type: "ctf",
            contestId: contest.id,
            contestTitle: contest.title,
            category: currentProblem.category,
            difficulty: currentProblem.difficulty,
            points: currentProblem.points,
            solvedAt: serverTimestamp(),
          })
        } catch (logError) {
          console.error("해결 기록 추가 오류:", logError)
        }

        try {
          const userRef = doc(db, "users", user.uid)
          await updateDoc(userRef, {
            points: increment(currentProblem.points),
            ctfPoints: increment(currentProblem.points),
          })
        } catch (userUpdateError) {
          console.error("사용자 점수 업데이트 오류:", userUpdateError)
        }

        const expAmount = Math.floor(currentProblem.points * 0.5)

        try {
          const userRef = doc(db, "users", user.uid)
          const userSnap = await getDoc(userRef)

          if (userSnap.exists()) {
            const userData = userSnap.data()
            const currentExp = userData.exp || 0
            const newTotalExp = currentExp + expAmount

            const currentLevelInfo = calculateLevelFromExp(currentExp)
            const newLevelInfo = calculateLevelFromExp(newTotalExp)

            await updateDoc(userRef, {
              exp: newTotalExp,
              level: newLevelInfo.level,
            })

            if (newLevelInfo.level > currentLevelInfo.level) {
              toast({
                title: "레벨 업!",
                description: `축하합니다! 레벨 ${newLevelInfo.level}에 도달했습니다!`,
                variant: "default",
              })
            }
          }
        } catch (expError) {
          console.error("경험치 업데이트 오류:", expError)
        }

        try {
          const expEventRef = collection(db, "exp_events")
          await addDoc(expEventRef, {
            userId: user.uid,
            username: userProfile?.username || user.displayName,
            amount: expAmount,
            reason: `CTF 문제 해결: ${currentProblem.title} (${contest.title})`,
            timestamp: serverTimestamp(),
            category: "ctf",
            challengeId: currentProblem.id,
            challengeTitle: currentProblem.title,
            contestId: contest.id,
            contestTitle: contest.title,
          })
        } catch (logError) {
          console.error("경험치 로그 추가 오류:", logError)
        }

        if (userProfile && typeof updateUserProfile === "function") {
          try {
            const updatedProfile = {
              ...userProfile,
              points: (userProfile.points || 0) + currentProblem.points,
              ctfPoints: (userProfile.ctfPoints || 0) + currentProblem.points,
            }
            updateUserProfile(updatedProfile)
          } catch (profileUpdateError) {
            console.error("프로필 업데이트 오류:", profileUpdateError)
          }
        }

        setProblems(
          problems.map((p) =>
            p.id === currentProblem.id
              ? {
                  ...p,
                  solvedCount: p.solvedCount + 1,
                  solvedBy: [...(p.solvedBy || []), user.uid],
                }
              : p,
          ),
        )

        setCurrentProblem({
          ...currentProblem,
          solvedCount: currentProblem.solvedCount + 1,
          solvedBy: [...(currentProblem.solvedBy || []), user.uid],
        })

        toast({
          title: "정답입니다!",
          description: `축하합니다! ${currentProblem.points}점이 즉시 반영되었습니다!`,
          variant: "default",
        })

        try {
          await fetchParticipants(contest.id)
        } catch (fetchError) {
          console.error("참가자 목록 새로고침 오류:", fetchError)
        }

        setFlagInput("")
      } else {
        toast({
          title: "오답입니다",
          description: "제출한 플래그가 정확하지 않습니다. 다시 시도해주세요.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("플래그 제출 중 오류:", error)
      toast({
        title: "오류 발생",
        description: "플래그 제출 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 비밀번호 제출 처리
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    if (!passwordInput.trim()) {
      setPasswordError("비밀번호를 입력해주세요.")
      return
    }

    if (!contest || !user) {
      toast({
        title: "로그인이 필요합니다",
        description: "비밀번호 보호 대회에 참가하려면 먼저 로그인해주세요.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setIsPasswordSubmitting(true)

    try {
      const contestRef = doc(db, "ctf_contests", contest.id)
      const contestSnap = await getDoc(contestRef)

      if (!contestSnap.exists()) {
        setPasswordError("대회를 찾을 수 없습니다.")
        setIsPasswordSubmitting(false)
        return
      }

      const contestData = contestSnap.data()

      if (passwordInput === contestData.password) {
        try {
          await updateDoc(contestRef, {
            authorizedUsers: arrayUnion(user.uid),
          })

          setIsAuthorized(true)
          setIsPasswordDialogOpen(false)
          saveAuthStateToLocalStorage(contest.id, true)

          await fetchProblems(contest.id)
          await fetchParticipants(contest.id)
          fetchScoreEvents(contest.id)

          toast({
            title: "인증 성공",
            description: "비밀번호가 확인되었습니다. 대회에 접근할 수 있습니다.",
            variant: "default",
          })
        } catch (updateError) {
          console.error("Error updating authorized users:", updateError)
          setIsAuthorized(true)
          setIsPasswordDialogOpen(false)
          saveAuthStateToLocalStorage(contest.id, true)

          toast({
            title: "인증 성공",
            description: "비밀번호가 확인되었습니다. 대회에 접근할 수 있습니다.",
            variant: "default",
          })

          await fetchProblems(contest.id)
          await fetchParticipants(contest.id)
          fetchScoreEvents(contest.id)
        }
      } else {
        setPasswordError("비밀번호가 일치하지 않습니다.")
      }
    } catch (error) {
      console.error("Error verifying password:", error)
      setPasswordError("비밀번호 확인 중 오류가 발생했습니다.")
    } finally {
      setIsPasswordSubmitting(false)
    }
  }

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

  // 커스텀 툴팁 컴포넌트
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded p-2 shadow-md">
          <p className="font-bold">{`시간: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value} 점`}
            </p>
          ))}
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex min-h-screen flex-col select-text">
      <Navbar />
      <main className="flex-1 py-12 select-text">
        <div className="container mx-auto px-4 md:px-6 select-text">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/ctf")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              대회 목록으로
            </Button>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/5" />
              </div>
            ) : contest ? (
              <div className="space-y-4">
                {/* 배너 이미지 표시 */}
                {contest.bannerImage && (
                  <div className="w-full h-64 rounded-lg overflow-hidden shadow-lg mb-6">
                    <img
                      src={contest.bannerImage || "/placeholder.svg"}
                      alt={`${contest.title} 배너`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {contest.status === "active" ? (
                      <Badge variant="default" className="bg-green-500 text-white">
                        진행 중
                      </Badge>
                    ) : contest.status === "upcoming" ? (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                        예정됨
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        종료됨
                      </Badge>
                    )}

                    {contest.isPasswordProtected && (
                      <Badge variant="outline" className="flex items-center gap-1 bg-amber-500/10 text-amber-500">
                        <Lock className="h-3.5 w-3.5" />
                        <span>비밀번호 보호</span>
                      </Badge>
                    )}

                    <Badge variant="outline" className="flex items-center gap-1">
                      {contest.status === "upcoming" ? (
                        <>
                          <Timer className="h-3.5 w-3.5" />
                          <span>시작까지 {timeRemaining}</span>
                        </>
                      ) : contest.status === "active" ? (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          <span>종료까지 {timeRemaining}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>대회 종료</span>
                        </>
                      )}
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight select-text">{contest.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span className="select-text">
                        {formatDate(contest.startTime.toDate())} ~ {formatDate(contest.endTime.toDate())}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="select-text">{problems.length}문제</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="select-text">{contest.participants?.length || 0}명 참가</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold">대회를 찾을 수 없습니다</h3>
                <p className="text-muted-foreground mt-2">요청하신 CTF 대회가 존재하지 않습니다.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/ctf")}>
                  대회 목록으로
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <Skeleton className="h-[400px] w-full" />
              </div>
              <div>
                <Skeleton className="h-[200px] w-full" />
              </div>
            </div>
          ) : contest && isAuthorized ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>대회 정보</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose dark:prose-invert max-w-none notion-content select-text"
                      dangerouslySetInnerHTML={{ __html: parseNotionMarkdown(contest.description) }}
                    />

                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">대회 일정</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">시작 시간</span>
                          <span className="select-text">{formatDate(contest.startTime.toDate())}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">종료 시간</span>
                          <span className="select-text">{formatDate(contest.endTime.toDate())}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">상태</span>
                          <span>
                            {contest.status === "active" ? (
                              <Badge variant="default" className="bg-green-500 text-white">
                                진행 중
                              </Badge>
                            ) : contest.status === "upcoming" ? (
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                                예정됨
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                종료됨
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">관리자 옵션</h3>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/ctf/edit/${contest.id}`}>
                            <Button variant="outline">대회 수정</Button>
                          </Link>
                          <Link href={`/admin/ctf/problems/${contest.id}`}>
                            <Button variant="outline">문제 관리</Button>
                          </Link>
                          <Link href={`/admin/ctf/problems/${contest.id}/create`}>
                            <Button variant="outline">문제 추가</Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Tabs defaultValue="problems" className="mt-6">
                  <TabsList>
                    <TabsTrigger value="problems">문제</TabsTrigger>
                    <TabsTrigger value="scoreboard">순위표</TabsTrigger>
                    <TabsTrigger value="chart">실시간 차트</TabsTrigger>
                  </TabsList>

                  <TabsContent value="problems" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>CTF 문제</CardTitle>
                        <CardDescription>
                          {contest.status === "upcoming"
                            ? "대회가 시작되면 문제를 볼 수 있습니다. 순위표와 차트 탭에서 참가자 현황을 확인해보세요."
                            : "문제를 선택하여 풀어보세요."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {contest.status === "upcoming" ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-xl font-bold">대회 시작 전입니다</h3>
                            <p className="text-muted-foreground mt-2">대회가 시작되면 문제를 볼 수 있습니다.</p>
                            <div className="mt-4 text-lg font-bold">{timeRemaining} 후 시작</div>
                          </div>
                        ) : !hasJoined ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-xl font-bold">대회 참가 필요</h3>
                            <p className="text-muted-foreground mt-2">문제를 보려면 먼저 대회에 참가해야 합니다.</p>
                            <Button
                              className="mt-4"
                              onClick={handleJoinContest}
                              disabled={isJoining || contest.status === "ended"}
                            >
                              {isJoining ? "참가 중..." : "대회 참가하기"}
                            </Button>
                          </div>
                        ) : problems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-xl font-bold">문제가 없습니다</h3>
                            <p className="text-muted-foreground mt-2">아직 등록된 문제가 없습니다.</p>
                            {isAdmin && (
                              <Link href={`/admin/ctf/problems/${contest.id}/create`} className="mt-4">
                                <Button>문제 추가하기</Button>
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {problems.map((problem) => (
                              <div
                                key={problem.id}
                                className={`rounded-lg border p-4 transition-colors cursor-pointer select-text ${
                                  currentProblem?.id === problem.id
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-muted/50"
                                }`}
                                onClick={() => setCurrentProblem(problem)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="flex items-center gap-1">
                                      {categoryIcons[problem.category] || <Layers className="h-4 w-4" />}
                                      <span>{problem.category}</span>
                                    </Badge>
                                    <Badge
                                      variant="secondary"
                                      className={
                                        difficultyColors[problem.difficulty] || "bg-muted text-muted-foreground"
                                      }
                                    >
                                      {problem.difficulty}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-yellow-500" />
                                    <span className="font-bold select-text">{problem.points} 점</span>
                                  </div>
                                </div>
                                <h3 className="mt-2 text-lg font-bold select-text">{problem.title}</h3>
                                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                                  <span className="select-text">{problem.solvedCount || 0}명 해결</span>
                                  {problem.solvedBy?.includes(user?.uid || "") ? (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                                      해결함
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                                      미해결
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="scoreboard" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>순위표</CardTitle>
                        <CardDescription>
                          {contest.status === "upcoming"
                            ? "대회 시작 전입니다. 참가자 목록을 실시간으로 확인할 수 있습니다."
                            : "참가자들의 현재 점수와 순위를 확인하세요."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {participants.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Users className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-xl font-bold">참가자가 없습니다</h3>
                            <p className="text-muted-foreground mt-2">
                              {contest.status === "upcoming"
                                ? "아직 대회에 참가 신청한 사용자가 없습니다. 대회 시작 전에 미리 참가 신청할 수 있습니다."
                                : "아직 대회에 참가한 사용자가 없습니다."}
                            </p>
                            {contest.status === "upcoming" && !hasJoined && (
                              <Button className="mt-4" onClick={handleJoinContest} disabled={isJoining}>
                                {isJoining ? "참가 중..." : "대회 참가 신청하기"}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16 text-center">순위</TableHead>
                                  <TableHead>참가자</TableHead>
                                  <TableHead className="text-center">해결한 문제</TableHead>
                                  <TableHead className="text-right">점수</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {participants.map((participant) => (
                                  <TableRow key={participant.uid}>
                                    <TableCell className="text-center font-medium">{participant.rank}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {participant.photoURL ? (
                                          <img
                                            src={participant.photoURL || "/placeholder.svg"}
                                            alt={participant.username}
                                            className="h-6 w-6 rounded-full"
                                          />
                                        ) : (
                                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                            <User className="h-3 w-3 text-muted-foreground" />
                                          </div>
                                        )}
                                        <span className="font-medium select-text">
                                          {participant.username}
                                          {participant.uid === user?.uid && " (나)"}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {participant.solvedProblems?.length || 0} / {problems.length}
                                    </TableCell>
                                    <TableCell className="text-right font-bold select-text">
                                      {participant.score} 점
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="chart" className="mt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>실시간 점수 차트</CardTitle>
                            <CardDescription>
                              {contest.status === "upcoming"
                                ? "대회 시작 전입니다. 참가자 현황을 실시간으로 확인할 수 있습니다."
                                : "참가자들의 점수 변화를 실시간으로 확인하세요."}
                            </CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchParticipants(contest.id)}
                            disabled={isRefreshingChart}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingChart ? "animate-spin" : ""}`} />
                            새로고침
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-lg font-semibold mb-4">현재 순위</h3>
                            {chartData.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-bold">데이터가 없습니다</h3>
                                <p className="text-muted-foreground mt-2">아직 점수 데이터가 없습니다.</p>
                              </div>
                            ) : (
                              <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={chartData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="score" name="점수" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                      {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-4">시간별 점수 변화</h3>
                            {!timeSeriesData || timeSeriesData.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-bold">데이터가 없습니다</h3>
                                <p className="text-muted-foreground mt-2">아직 시간별 점수 데이터가 없습니다.</p>
                                <p className="text-muted-foreground mt-1">문제를 해결하면 차트에 표시됩니다.</p>
                              </div>
                            ) : (
                              <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    {Object.keys(timeSeriesData[0] || {})
                                      .filter((key) => key !== "time")
                                      .map((key, index) => (
                                        <Line
                                          key={key}
                                          type="monotone"
                                          dataKey={key}
                                          name={key}
                                          stroke={colors[index % colors.length]}
                                          activeDot={{ r: 8 }}
                                          strokeWidth={2}
                                        />
                                      ))}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-4">최근 해결 기록</h3>
                            {scoreEvents.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-bold">데이터가 없습니다</h3>
                                <p className="text-muted-foreground mt-2">아직 해결 기록이 없습니다.</p>
                              </div>
                            ) : (
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>시간</TableHead>
                                      <TableHead>참가자</TableHead>
                                      <TableHead>문제</TableHead>
                                      <TableHead className="text-right">점수</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {scoreEvents
                                      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
                                      .slice(0, 10)
                                      .map((event, index) => (
                                        <TableRow key={index}>
                                          <TableCell className="select-text">
                                            {event.timestamp.toDate().toLocaleTimeString("ko-KR")}
                                          </TableCell>
                                          <TableCell>
                                            <span className="font-medium select-text">
                                              {event.username}
                                              {event.userId === user?.uid && " (나)"}
                                            </span>
                                          </TableCell>
                                          <TableCell className="select-text">{event.problemTitle}</TableCell>
                                          <TableCell className="text-right font-bold select-text">
                                            +{event.points} 점
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                {!hasJoined && contest.status !== "ended" ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>대회 참가</CardTitle>
                      <CardDescription>CTF 대회에 참가하여 문제를 풀고 점수를 획득하세요.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!user ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            대회에 참가하려면 먼저{" "}
                            <Link href="/login" className="font-bold underline">
                              로그인
                            </Link>
                            해주세요.
                          </AlertDescription>
                        </Alert>
                      ) : contest.status === "upcoming" ? (
                        <div className="text-center py-4">
                          <p className="mb-4">대회 시작 전에 미리 참가 신청을 할 수 있습니다.</p>
                          <Button className="w-full" onClick={handleJoinContest} disabled={isJoining}>
                            {isJoining ? "참가 중..." : "대회 참가 신청하기"}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="mb-4">대회가 진행 중입니다. 지금 참가하여 문제를 풀어보세요!</p>
                          <Button className="w-full" onClick={handleJoinContest} disabled={isJoining}>
                            {isJoining ? "참가 중..." : "대회 참가하기"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : currentProblem ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="flex items-center gap-1">
                          {categoryIcons[currentProblem.category] || <Layers className="h-4 w-4" />}
                          <span>{currentProblem.category}</span>
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={difficultyColors[currentProblem.difficulty] || "bg-muted text-muted-foreground"}
                        >
                          {currentProblem.difficulty}
                        </Badge>
                      </div>
                      <CardTitle className="mt-2 select-text">{currentProblem.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="select-text">{currentProblem.points} 점</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {contest.status === "upcoming" ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-xl font-bold">대회 시작 전입니다</h3>
                          <p className="text-muted-foreground mt-2">대회가 시작되면 문제 내용을 볼 수 있습니다.</p>
                          <div className="mt-4 text-lg font-bold">{timeRemaining} 후 시작</div>
                        </div>
                      ) : (
                        <>
                          <div
                            className="prose dark:prose-invert max-w-none notion-content select-text"
                            dangerouslySetInnerHTML={{ __html: parseNotionMarkdown(currentProblem.description) }}
                          />

                          {contest.status !== "upcoming" && currentProblem.files && currentProblem.files.length > 0 && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold mb-2">첨부 파일</h3>
                              <div className="space-y-2">
                                {currentProblem.files.map((file, index) => (
                                  <a
                                    key={index}
                                    href={file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 rounded-lg border bg-card p-3 text-card-foreground transition-colors hover:bg-muted"
                                  >
                                    <Download className="h-4 w-4" />
                                    <span className="flex-1 truncate select-text">
                                      {file.split("/").pop() || `파일 ${index + 1}`}
                                    </span>
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {contest.status !== "upcoming" && currentProblem.port && (
                            <div className="mt-6">
                              <h3 className="text-lg font-semibold mb-2">서버 정보</h3>
                              <div className="rounded-lg border bg-card p-3 text-card-foreground">
                                <div className="flex items-center gap-2">
                                  <Server className="h-4 w-4 text-primary" />
                                  <span className="font-mono select-text">
                                    nc challenge.ntctf.kr {currentProblem.port}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {contest.status !== "upcoming" && (
                            <>
                              <Separator className="my-6" />

                              <div className="space-y-4">
                                <h3 className="text-lg font-semibold">플래그 제출</h3>

                                {contest.status === "ended" ? (
                                  <Alert className="bg-muted text-muted-foreground">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                      대회가 종료되어 더 이상 플래그를 제출할 수 없습니다.
                                    </AlertDescription>
                                  </Alert>
                                ) : currentProblem.solvedBy?.includes(user?.uid || "") ? (
                                  <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>축하합니다! 이 문제를 성공적으로 해결했습니다.</AlertDescription>
                                  </Alert>
                                ) : (
                                  <form onSubmit={handleSubmitFlag}>
                                    <div className="space-y-4">
                                      <Input
                                        placeholder="NTCTF{flag_format}"
                                        value={flagInput}
                                        onChange={(e) => setFlagInput(e.target.value)}
                                        disabled={
                                          isSubmitting ||
                                          contest.status === "ended" ||
                                          currentProblem.solvedBy?.includes(user?.uid || "")
                                        }
                                        className="select-text"
                                      />
                                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            제출 중...
                                          </>
                                        ) : (
                                          "플래그 제출"
                                        )}
                                      </Button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>대회 정보</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {contest.status === "upcoming" ? (
                        <div className="space-y-4">
                          <div className="rounded-lg bg-muted p-4 text-center">
                            <h3 className="text-lg font-bold mb-2">대회 시작 전</h3>
                            <p className="text-muted-foreground mb-4">대회가 시작되면 문제를 볼 수 있습니다.</p>
                            <div className="text-2xl font-bold select-text">{timeRemaining}</div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-medium">참가 상태</span>
                            <Badge variant="outline" className="bg-green-500/10 text-green-500">
                              참가 신청 완료
                            </Badge>
                          </div>
                        </div>
                      ) : contest.status === "active" ? (
                        <div className="space-y-4">
                          <div className="rounded-lg bg-muted p-4 text-center">
                            <h3 className="text-lg font-bold mb-2">대회 진행 중</h3>
                            <p className="text-muted-foreground mb-4">왼쪽에서 문제를 선택하여 풀어보세요.</p>
                            <div className="text-2xl font-bold select-text">{timeRemaining} 남음</div>
                          </div>

                          <Progress
                            value={
                              ((new Date().getTime() - contest.startTime.toDate().getTime()) /
                                (contest.endTime.toDate().getTime() - contest.startTime.toDate().getTime())) *
                              100
                            }
                            className="h-2"
                          />

                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span className="select-text">{formatDate(contest.startTime.toDate())}</span>
                            <span className="select-text">{formatDate(contest.endTime.toDate())}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-lg bg-muted p-4 text-center">
                            <h3 className="text-lg font-bold mb-2">대회 종료</h3>
                            <p className="text-muted-foreground">
                              이 CTF 대회는 종료되었습니다. 순위표에서 최종 결과를 확인하세요.
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-medium">최종 순위</span>
                            {participants.find((p) => p.uid === user?.uid)?.rank ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary">
                                {participants.find((p) => p.uid === user?.uid)?.rank}위
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted text-muted-foreground">
                                순위 없음
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-medium">획득 점수</span>
                            <span className="font-bold select-text">
                              {participants.find((p) => p.uid === user?.uid)?.score || 0} 점
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-medium">해결한 문제</span>
                            <span className="select-text">
                              {participants.find((p) => p.uid === user?.uid)?.solvedProblems?.length || 0} /{" "}
                              {problems.length}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : contest && !isAuthorized ? (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <Lock className="h-12 w-12 text-amber-500" />
                </div>
                <CardTitle className="text-center">비밀번호 보호 대회</CardTitle>
                <CardDescription className="text-center">
                  이 CTF 대회는 비밀번호로 보호되어 있습니다. 계속하려면 비밀번호를 입력하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-4">
                    {passwordError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{passwordError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="password">비밀번호</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="대회 비밀번호 입력"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        disabled={isPasswordSubmitting}
                        className="select-text"
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isPasswordSubmitting}>
                      {isPasswordSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          확인 중...
                        </>
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          비밀번호 확인
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center border-t pt-4">
                <Button variant="ghost" onClick={() => router.push("/ctf")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  대회 목록으로 돌아가기
                </Button>
              </CardFooter>
            </Card>
          ) : null}
        </div>
      </main>
      <Footer />

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 입력</DialogTitle>
            <DialogDescription>
              이 CTF 대회는 비밀번호로 보호되어 있습니다. 계속하려면 비밀번호를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4">
              {passwordError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="dialog-password">비밀번호</Label>
                <Input
                  id="dialog-password"
                  type="password"
                  placeholder="대회 비밀번호 입력"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  disabled={isPasswordSubmitting}
                  className="select-text"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/ctf")}
                disabled={isPasswordSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isPasswordSubmitting}>
                {isPasswordSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    확인 중...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    확인
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CTF 코드 복사 스크립트 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
      window.copyCtfCode = function(button) {
        const code = decodeURIComponent(button.dataset.code);
        navigator.clipboard.writeText(code).then(() => {
          button.textContent = '복사됨!';
          setTimeout(() => {
            button.textContent = '복사';
          }, 2000);
        }).catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = code;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          button.textContent = '복사됨!';
          setTimeout(() => {
            button.textContent = '복사';
          }, 2000);
        });
      }
    `,
        }}
      />

      {/* 텍스트 복사 가능하도록 CSS 추가 */}
      <style jsx global>{`
        .select-text {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
        
        .notion-content * {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
        
        pre, code {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
      `}</style>
    </div>
  )
}
