"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  AlertCircle,
  ArrowLeft,
  Download,
  ExternalLink,
  Flag,
  Clock,
  Trophy,
  User,
  CheckCircle,
  Server,
  Layers,
  Cpu,
  Globe,
  Lock,
  Users,
} from "lucide-react"
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
  limit,
  serverTimestamp,
  setDoc,
  addDoc,
  Timestamp,
  onSnapshot,
  getDocs,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { WargameChallenge } from "@/lib/wargame-types"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ActiveChallengeUsers } from "@/components/active-challenge-users"
import { parseMarkdown, generateCopyScript } from "@/lib/markdown-parser"

// 기존 import에서 calculatePointsByLevel을 제거하고 직접 정의
const calculatePointsByLevel = (level: number): number => {
  const basePoints = 100
  const weights = {
    1: 1,
    2: 1.5,
    3: 2,
    4: 2.5,
    5: 3,
    6: 4,
    7: 5,
    8: 6,
    9: 8,
    10: 10,
  }
  const weight = weights[level as keyof typeof weights] || 1
  return Math.round(basePoints * weight)
}

// 고급 구문 강조 함수
const highlightCode = (code: string, language: string): string => {
  // HTML 이스케이프
  let highlighted = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

  // 언어별 키워드 정의
  const languageKeywords: { [key: string]: { keywords: string[]; types: string[]; operators: string[] } } = {
    javascript: {
      keywords: [
        "const",
        "let",
        "var",
        "function",
        "return",
        "if",
        "else",
        "for",
        "while",
        "class",
        "import",
        "export",
        "async",
        "await",
        "try",
        "catch",
        "finally",
        "throw",
        "new",
        "this",
        "super",
        "extends",
        "static",
        "typeof",
        "instanceof",
        "in",
        "of",
        "delete",
        "void",
        "null",
        "undefined",
        "true",
        "false",
      ],
      types: ["String", "Number", "Boolean", "Array", "Object", "Date", "RegExp", "Promise", "Map", "Set"],
      operators: [
        "===",
        "!==",
        "==",
        "!=",
        ">=",
        "<=",
        ">",
        "<",
        "&&",
        "||",
        "!",
        "+",
        "-",
        "*",
        "/",
        "%",
        "++",
        "--",
        "+=",
        "-=",
        "*=",
        "/=",
        "=>",
        "?.",
        "??",
      ],
    },
    typescript: {
      keywords: [
        "const",
        "let",
        "var",
        "function",
        "return",
        "if",
        "else",
        "for",
        "while",
        "class",
        "import",
        "export",
        "async",
        "await",
        "try",
        "catch",
        "finally",
        "throw",
        "new",
        "this",
        "super",
        "extends",
        "static",
        "typeof",
        "instanceof",
        "in",
        "of",
        "delete",
        "void",
        "null",
        "undefined",
        "true",
        "false",
        "interface",
        "type",
        "enum",
        "namespace",
        "declare",
        "readonly",
        "public",
        "private",
        "protected",
        "abstract",
        "implements",
      ],
      types: [
        "string",
        "number",
        "boolean",
        "any",
        "void",
        "never",
        "unknown",
        "object",
        "Array",
        "Promise",
        "Record",
        "Partial",
        "Required",
      ],
      operators: [
        "===",
        "!==",
        "==",
        "!=",
        ">=",
        "<=",
        ">",
        "<",
        "&&",
        "||",
        "!",
        "+",
        "-",
        "*",
        "/",
        "%",
        "++",
        "--",
        "+=",
        "-=",
        "*=",
        "/=",
        "=>",
        "?.",
        "??",
        "?:",
        "as",
        "is",
      ],
    },
    python: {
      keywords: [
        "def",
        "class",
        "import",
        "from",
        "return",
        "if",
        "else",
        "elif",
        "for",
        "while",
        "try",
        "except",
        "finally",
        "with",
        "as",
        "lambda",
        "yield",
        "global",
        "nonlocal",
        "pass",
        "break",
        "continue",
        "and",
        "or",
        "not",
        "in",
        "is",
        "assert",
        "del",
        "raise",
        "True",
        "False",
        "None",
      ],
      types: ["int", "float", "str", "bool", "list", "dict", "tuple", "set", "frozenset", "bytes", "bytearray"],
      operators: ["==", "!=", ">=", "<=", ">", "<", "and", "or", "not", "+", "-", "*", "/", "//", "%", "**"],
    },
    c: {
      keywords: [
        "int",
        "char",
        "float",
        "double",
        "void",
        "if",
        "else",
        "for",
        "while",
        "do",
        "switch",
        "case",
        "default",
        "break",
        "continue",
        "return",
        "struct",
        "union",
        "enum",
        "typedef",
        "static",
        "extern",
        "auto",
        "register",
        "const",
        "volatile",
        "sizeof",
        "goto",
      ],
      types: ["int", "char", "float", "double", "void", "short", "long", "signed", "unsigned"],
      operators: [
        "==",
        "!=",
        ">=",
        "<=",
        ">",
        "<",
        "&&",
        "||",
        "!",
        "+",
        "-",
        "*",
        "/",
        "%",
        "++",
        "--",
        "+=",
        "-=",
        "*=",
        "/=",
      ],
    },
    cpp: {
      keywords: [
        "int",
        "char",
        "float",
        "double",
        "void",
        "if",
        "else",
        "for",
        "while",
        "do",
        "switch",
        "case",
        "default",
        "break",
        "continue",
        "return",
        "class",
        "struct",
        "union",
        "enum",
        "typedef",
        "static",
        "extern",
        "auto",
        "register",
        "const",
        "volatile",
        "sizeof",
        "goto",
        "public",
        "private",
        "protected",
        "virtual",
        "inline",
        "friend",
        "template",
        "namespace",
        "using",
        "new",
        "delete",
        "this",
        "try",
        "catch",
        "throw",
      ],
      types: ["int", "char", "float", "double", "void", "bool", "string", "vector", "map", "set", "pair"],
      operators: [
        "==",
        "!=",
        ">=",
        "<=",
        ">",
        "<",
        "&&",
        "||",
        "!",
        "+",
        "-",
        "*",
        "/",
        "%",
        "++",
        "--",
        "+=",
        "-=",
        "*=",
        "/=",
        "::",
      ],
    },
    java: {
      keywords: [
        "public",
        "private",
        "protected",
        "static",
        "final",
        "abstract",
        "class",
        "interface",
        "extends",
        "implements",
        "import",
        "package",
        "if",
        "else",
        "for",
        "while",
        "do",
        "switch",
        "case",
        "default",
        "break",
        "continue",
        "return",
        "try",
        "catch",
        "finally",
        "throw",
        "throws",
        "new",
        "this",
        "super",
      ],
      types: ["int", "char", "float", "double", "boolean", "byte", "short", "long", "String", "Object", "void"],
      operators: [
        "==",
        "!=",
        ">=",
        "<=",
        ">",
        "<",
        "&&",
        "||",
        "!",
        "+",
        "-",
        "*",
        "/",
        "%",
        "++",
        "--",
        "+=",
        "-=",
        "*=",
        "/=",
      ],
    },
    bash: {
      keywords: [
        "if",
        "then",
        "else",
        "elif",
        "fi",
        "for",
        "while",
        "do",
        "done",
        "case",
        "esac",
        "function",
        "return",
        "exit",
      ],
      types: [],
      operators: ["-eq", "-ne", "-lt", "-le", "-gt", "-ge", "-z", "-n", "&&", "||", "|", "&", ";"],
    },
    sql: {
      keywords: [
        "SELECT",
        "FROM",
        "WHERE",
        "INSERT",
        "UPDATE",
        "DELETE",
        "CREATE",
        "DROP",
        "ALTER",
        "TABLE",
        "INDEX",
        "VIEW",
        "DATABASE",
        "SCHEMA",
        "JOIN",
        "INNER",
        "LEFT",
        "RIGHT",
        "FULL",
        "OUTER",
        "ON",
        "GROUP",
        "BY",
        "ORDER",
        "HAVING",
        "UNION",
        "DISTINCT",
        "AS",
        "AND",
        "OR",
        "NOT",
        "NULL",
      ],
      types: ["INT", "VARCHAR", "CHAR", "TEXT", "DATE", "DATETIME", "TIMESTAMP", "BOOLEAN", "DECIMAL", "FLOAT"],
      operators: ["=", "!=", "<>", ">=", "<=", ">", "<", "LIKE", "IN", "BETWEEN", "IS", "EXISTS"],
    },
  }

  const langConfig = languageKeywords[language.toLowerCase()] || { keywords: [], types: [], operators: [] }

  // 1. 주석 강조 (가장 먼저)
  if (language === "python") {
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
  } else if (["javascript", "typescript", "c", "cpp", "java"].includes(language.toLowerCase())) {
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
    highlighted = highlighted.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>',
    )
  } else if (language === "bash") {
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
  } else if (language === "sql") {
    highlighted = highlighted.replace(/(--.*$)/gm, '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
  }

  // 2. 문자열 강조
  if (["javascript", "typescript"].includes(language.toLowerCase())) {
    // 템플릿 리터럴
    highlighted = highlighted.replace(/(`[^`]*`)/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    // 일반 문자열
    highlighted = highlighted.replace(/("[^"]*")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    highlighted = highlighted.replace(/('[^']*')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
  } else {
    highlighted = highlighted.replace(/("[^"]*")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    highlighted = highlighted.replace(/('[^']*')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
  }

  // 3. 키워드 강조
  langConfig.keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")
    highlighted = highlighted.replace(
      regex,
      `<span class="text-purple-400 dark:text-purple-300 font-semibold">${keyword}</span>`,
    )
  })

  // 4. 타입 강조
  langConfig.types.forEach((type) => {
    const regex = new RegExp(`\\b${type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")
    highlighted = highlighted.replace(
      regex,
      `<span class="text-blue-400 dark:text-blue-300 font-medium">${type}</span>`,
    )
  })

  // 5. 숫자 강조
  highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="text-orange-400 dark:text-orange-300">$&</span>')

  // 6. 함수 호출 강조
  highlighted = highlighted.replace(
    /(\w+)(\s*\()/g,
    '<span class="text-yellow-400 dark:text-yellow-300 font-medium">$1</span>$2',
  )

  // 7. 괄호 강조
  highlighted = highlighted.replace(
    /([{}[\]()])/g,
    '<span class="text-gray-300 dark:text-gray-500 font-bold">$1</span>',
  )

  return highlighted
}

// 카테고리 아이콘 매핑
const categoryIcons: Record<string, React.ReactNode> = {
  "웹 해킹": <Globe className="h-5 w-5" />,
  "시스템 해킹": <Server className="h-5 w-5" />,
  리버싱: <Cpu className="h-5 w-5" />,
  암호학: <Lock className="h-5 w-5" />,
}

// 난이도 색상 매핑
const difficultyColors: Record<number, string> = {
  1: "bg-green-500/10 text-green-500",
  2: "bg-green-500/10 text-green-500",
  3: "bg-green-500/10 text-green-500",
  4: "bg-yellow-500/10 text-yellow-500",
  5: "bg-yellow-500/10 text-yellow-500",
  6: "bg-yellow-500/10 text-yellow-500",
  7: "bg-orange-500/10 text-orange-500",
  8: "bg-orange-500/10 text-orange-500",
  9: "bg-red-500/10 text-red-500",
  10: "bg-red-500/10 text-red-500",
}

// 최근 해결자 타입 정의
type RecentSolver = {
  uid: string
  username: string
  photoURL?: string
  solvedAt: Timestamp
}

export default function ChallengePage({ params }: { params: { id: string } }) {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [challenge, setChallenge] = useState<WargameChallenge | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [flagInput, setFlagInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSolved, setHasSolved] = useState(false)
  const [recentSolvers, setRecentSolvers] = useState<RecentSolver[]>([])

  // 사용자 활성 상태 업데이트
  useEffect(() => {
    if (!user || !params.id) return

    const updateUserActivity = async () => {
      try {
        const challengeRef = doc(db, "wargame_challenges", params.id)
        const challengeSnap = await getDoc(challengeRef)

        if (challengeSnap.exists()) {
          const challengeData = challengeSnap.data() as WargameChallenge

          const activityRef = doc(db, "active_users", user.uid)
          await setDoc(
            activityRef,
            {
              uid: user.uid,
              username: userProfile?.username || user.displayName || "사용자",
              photoURL: user.photoURL,
              lastActive: Timestamp.now(),
              page: "wargame",
              challengeId: params.id,
              challengeName: challengeData.title,
            },
            { merge: true },
          )
        }
      } catch (error) {
        console.error("Error updating user activity:", error)
      }
    }

    // 초기 업데이트
    updateUserActivity()

    // 2분마다 활성 상태 업데이트
    const interval = setInterval(updateUserActivity, 2 * 60 * 1000)

    return () => {
      clearInterval(interval)

      // 페이지 나갈 때 challengeId 제거
      if (user) {
        const activityRef = doc(db, "active_users", user.uid)
        setDoc(
          activityRef,
          {
            lastActive: Timestamp.now(),
            page: "wargame",
            challengeId: null,
            challengeName: null,
          },
          { merge: true },
        ).catch(console.error)
      }
    }
  }, [user, userProfile, params.id])

  // 문제 정보 가져오기
  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const challengeRef = doc(db, "wargame_challenges", params.id)
        const challengeSnap = await getDoc(challengeRef)

        if (challengeSnap.exists()) {
          const challengeData = challengeSnap.data() as WargameChallenge
          setChallenge({
            id: challengeSnap.id,
            ...challengeData,
            solvedBy: challengeData.solvedBy || [],
            solvedCount: challengeData.solvedCount || 0,
          })

          // 사용자가 이미 해결했는지 확인
          if (
            user &&
            challengeData.solvedBy &&
            Array.isArray(challengeData.solvedBy) &&
            challengeData.solvedBy.includes(user.uid)
          ) {
            setHasSolved(true)
          }
        } else {
          toast({
            title: "문제를 찾을 수 없습니다",
            description: "요청하신 문제가 존재하지 않습니다.",
            variant: "destructive",
          })
          router.push("/wargame")
        }
      } catch (error) {
        console.error("Error fetching challenge:", error)
        toast({
          title: "오류 발생",
          description: "문제 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchChallenge()
    }
  }, [params.id, router, toast, user])

  // 최근 해결자 가져오기 - 올바른 순서로 정렬
  useEffect(() => {
    if (!params.id) return

    const fetchRecentSolvers = async () => {
      try {
        // wargame_solve_logs에서 해결자 정보 가져오기 (해결 시간 순)
        const solveLogsRef = collection(db, "wargame_solve_logs")
        const q = query(
          solveLogsRef,
          where("challengeId", "==", params.id),
          orderBy("solvedAt", "asc"), // 가장 먼저 푼 사람부터
          limit(10),
        )

        // 실시간 리스너 설정
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const solversData: RecentSolver[] = []
            snapshot.forEach((doc) => {
              const data = doc.data()
              solversData.push({
                uid: data.userId,
                username: data.username || "익명",
                photoURL: data.photoURL,
                solvedAt: data.solvedAt,
              })
            })
            setRecentSolvers(solversData)
          },
          (error) => {
            console.error("Error getting recent solvers:", error)
            // 실시간 리스너 실패 시 일반 쿼리로 시도
            fetchSolversWithQuery()
          },
        )

        return unsubscribe
      } catch (error) {
        console.error("Error setting up recent solvers listener:", error)
        fetchSolversWithQuery()
      }
    }

    // 대체 방법: 일반 쿼리
    const fetchSolversWithQuery = async () => {
      try {
        const solveLogsRef = collection(db, "wargame_solve_logs")
        const q = query(solveLogsRef, where("challengeId", "==", params.id), orderBy("solvedAt", "asc"), limit(10))

        const querySnapshot = await getDocs(q)
        const solversData: RecentSolver[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          solversData.push({
            uid: data.userId,
            username: data.username || "익명",
            photoURL: data.photoURL,
            solvedAt: data.solvedAt,
          })
        })

        setRecentSolvers(solversData)
      } catch (error) {
        console.error("Error fetching recent solvers with query:", error)
      }
    }

    fetchRecentSolvers()
  }, [params.id])

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

    if (!challenge) {
      toast({
        title: "문제 정보 오류",
        description: "문제 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요.",
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

    // 이미 해결했는지 확인
    if (hasSolved) {
      toast({
        title: "이미 해결한 문제입니다",
        description: "이 문제는 이미 해결하셨습니다.",
        variant: "default",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 플래그 검증 전에 문제 정보 다시 가져오기
      const challengeRef = doc(db, "wargame_challenges", challenge.id)
      const challengeSnap = await getDoc(challengeRef)

      if (!challengeSnap.exists()) {
        throw new Error("문제를 찾을 수 없습니다")
      }

      const freshChallengeData = challengeSnap.data()
      const correctFlag = freshChallengeData.flag

      // 플래그 검증 - 대소문자 구분 없이 공백 제거 후 비교
      if (flagInput.trim().toLowerCase() === correctFlag.trim().toLowerCase()) {
        try {
          // 레벨에 따른 점수 계산
          const points = calculatePointsByLevel(challenge.level)

          // 1. 문제 해결 처리 - solvedBy 배열에 사용자 추가 및 solvedCount 증가
          await updateDoc(challengeRef, {
            solvedCount: increment(1),
            solvedBy: arrayUnion(user.uid),
          })

          // 2. 사용자 점수 업데이트
          const userRef = doc(db, "users", user.uid)
          await updateDoc(userRef, {
            points: increment(points),
            wargameScore: increment(points),
            solvedWargameProblems: arrayUnion(challenge.id),
          })

          // 3. 해결 기록 추가
          const solveLogRef = collection(db, "wargame_solve_logs")
          await addDoc(solveLogRef, {
            userId: user.uid,
            username: userProfile?.username || user.displayName || "사용자",
            photoURL: user.photoURL,
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            category: challenge.category,
            level: challenge.level,
            points: points,
            solvedAt: serverTimestamp(),
          })

          // 4. 사용자별 해결 로그에도 추가 (마이페이지에서 사용)
          const userSolveLogRef = doc(db, "user_solve_logs", `${user.uid}_${challenge.id}`)
          await setDoc(userSolveLogRef, {
            userId: user.uid,
            username: userProfile?.username || user.displayName || "사용자",
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            type: "wargame",
            category: challenge.category,
            level: challenge.level,
            points: points,
            solvedAt: serverTimestamp(),
          })

          // 5. UI 상태 업데이트
          setHasSolved(true)
          setChallenge({
            ...challenge,
            solvedCount: challenge.solvedCount + 1,
            solvedBy: Array.isArray(challenge.solvedBy) ? [...challenge.solvedBy, user.uid] : [user.uid],
          })

          toast({
            title: "정답입니다!",
            description: "축하합니다! 문제를 성공적으로 해결했습니다!",
            variant: "default",
          })

          // 6. 입력 초기화
          setFlagInput("")
        } catch (error) {
          console.error("플래그 제출 처리 중 오류 발생:", error)
          toast({
            title: "처리 중 오류 발생",
            description: "플래그는 정답이지만 처리 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.",
            variant: "destructive",
          })
        }
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

  // 카테고리 아이콘 가져오기
  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || <Layers className="h-5 w-5" />
  }

  // 난이도 색상 가져오기
  const getDifficultyColor = (level: number) => {
    return difficultyColors[level] || "bg-muted text-muted-foreground"
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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 md:px-6">
          <Button variant="ghost" onClick={() => router.push("/wargame")} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            워게임 목록으로
          </Button>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : challenge ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-6">
                {/* 문제 정보 카드 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getCategoryIcon(challenge.category)}
                          <span>{challenge.category}</span>
                        </Badge>
                        <Badge variant="secondary" className={getDifficultyColor(challenge.level)}>
                          레벨 {challenge.level}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{challenge.author || "관리자"}</span>
                      </div>
                    </div>
                    <CardTitle className="text-2xl mt-2">{challenge.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{challenge.createdAt ? formatDate(challenge.createdAt.toDate()) : "날짜 정보 없음"}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose dark:prose-invert max-w-none notion-content"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(challenge.description) }}
                    />

                    {/* 활성 사용자 표시 */}
                    <ActiveChallengeUsers challengeId={challenge.id} />

                    {challenge.files && challenge.files.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">첨부 파일</h3>
                        <div className="space-y-2">
                          {challenge.files.map((file, index) => (
                            <a
                              key={index}
                              href={typeof file === "string" ? file : file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg border bg-card p-3 text-card-foreground transition-colors hover:bg-muted"
                            >
                              <Download className="h-4 w-4" />
                              <span className="flex-1 truncate">
                                {typeof file === "string"
                                  ? file.split("/").pop() || `파일 ${index + 1}`
                                  : file.name || `파일 ${index + 1}`}
                              </span>
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {challenge.port && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">서버 정보</h3>
                        <div className="rounded-lg border bg-card p-3 text-card-foreground">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-primary" />
                            <span className="font-mono">nc challenge.ntctf.kr {challenge.port}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 플래그 제출 카드 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flag className="h-5 w-5 text-primary" />
                      플래그 제출
                    </CardTitle>
                    <CardDescription>문제를 해결한 후 플래그를 제출하세요.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!user ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          문제를 풀려면 먼저{" "}
                          <Link href="/login" className="font-bold underline">
                            로그인
                          </Link>
                          해주세요.
                        </AlertDescription>
                      </Alert>
                    ) : hasSolved ? (
                      <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>축하합니다! 이 문제를 성공적으로 해결했습니다.</AlertDescription>
                      </Alert>
                    ) : (
                      <form onSubmit={handleSubmitFlag}>
                        <div className="flex gap-2">
                          <Input
                            placeholder="NT{flag}"
                            value={flagInput}
                            onChange={(e) => setFlagInput(e.target.value)}
                            disabled={isSubmitting}
                          />
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "제출 중..." : "제출"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {/* 문제 통계 카드 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      문제 통계
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">해결한 사용자</span>
                        <span className="font-bold">{challenge.solvedCount}명</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">카테고리</span>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getCategoryIcon(challenge.category)}
                          <span>{challenge.category}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">레벨</span>
                        <Badge variant="secondary" className={getDifficultyColor(challenge.level)}>
                          레벨 {challenge.level}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">출제자</span>
                        <span className="font-medium">{challenge.author || "관리자"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 최근 해결자 카드 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      최근 해결자
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentSolvers.length === 0 ? (
                      <div className="px-6 py-4 text-center text-muted-foreground">
                        <p>아직 이 문제를 해결한 사용자가 없습니다.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>사용자</TableHead>
                            <TableHead className="text-right">해결 시간</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentSolvers.map((solver, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={solver.photoURL || "/placeholder.svg"} alt={solver.username} />
                                    <AvatarFallback>
                                      <User className="h-3 w-3" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">
                                    {solver.username}
                                    {solver.uid === user?.uid && " (나)"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {solver.solvedAt.toDate().toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold">문제를 찾을 수 없습니다</h3>
              <p className="text-muted-foreground mt-2">요청하신 문제가 존재하지 않습니다.</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/wargame")}>
                워게임 목록으로
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* 마크다운 코드 복사 스크립트 */}
      <script
        dangerouslySetInnerHTML={{
          __html: generateCopyScript(),
        }}
      />
    </div>
  )
}
