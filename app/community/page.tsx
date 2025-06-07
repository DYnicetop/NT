"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  Plus,
  Search,
  Eye,
  MessageSquare,
  TrendingUp,
  Users,
  LucideTag,
  BarChart,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  onSnapshot,
  doc,
  type Timestamp,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"

// 간소화된 Post 타입 정의
type Post = {
  id: string
  title: string
  content: string
  author: string
  authorId: string
  authorPhotoURL?: string
  createdAt: Timestamp
  updatedAt?: Timestamp
  isPinned: boolean
  isNotice: boolean
  files?: string[]
  links?: {
    url: string
    title: string
  }[]
  tags?: string[]
  viewCount?: number
  commentCount?: number
  viewedBy?: string[] // 조회한 사용자 ID 배열 추가
}

// 사용자 타입 정의
type CommunityUser = {
  id: string
  name: string
  photoURL?: string
  postCount: number
}

// 태그 타입 정의
type Tag = {
  name: string
  count: number
}

// 통계 타입 정의
type CommunityStats = {
  totalPosts: number
  todayPosts: number
  activeUsers: number
  totalComments: number
}

export default function CommunityPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [posts, setPosts] = useState<Post[]>([])
  const [noticePosts, setNoticePosts] = useState<Post[]>([])
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([])
  const [activeUsers, setActiveUsers] = useState<CommunityUser[]>([])
  const [popularTags, setPopularTags] = useState<Tag[]>([])
  const [communityStats, setCommunityStats] = useState<CommunityStats>({
    totalPosts: 0,
    todayPosts: 0,
    activeUsers: 0,
    totalComments: 0,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 게시글 클릭 핸들러 추가
  const handlePostClick = (postId: string) => {
    router.push(`/community/${postId}`)
  }

  // 게시글 가져오기
  const fetchPosts = async (isInitial = true) => {
    try {
      if (isInitial) {
        setIsLoading(true)
        setError("")
      } else {
        setLoadingMore(true)
      }

      // 일반 게시글 쿼리 설정
      let postsQuery

      try {
        // 기본 쿼리 - 모든 게시글
        if (activeTab === "all") {
          postsQuery = isInitial
            ? query(collection(db, "community_posts"), orderBy("createdAt", "desc"), limit(20))
            : query(collection(db, "community_posts"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(20))
        } else {
          // 태그별 필터링 - 클라이언트 측에서 처리
          postsQuery = isInitial
            ? query(collection(db, "community_posts"), orderBy("createdAt", "desc"), limit(20))
            : query(collection(db, "community_posts"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(20))
        }

        const postsSnapshot = await getDocs(postsQuery)

        // 더 불러올 게시글이 있는지 확인
        if (postsSnapshot.empty) {
          setHasMore(false)
        } else {
          // 마지막으로 불러온 문서 저장
          setLastVisible(postsSnapshot.docs[postsSnapshot.docs.length - 1])
        }

        const postsData: Post[] = []

        postsSnapshot.forEach((doc) => {
          const data = doc.data()

          // 필요한 필드가 있는지 확인하고 기본값 설정
          if (data && data.title) {
            // 공지사항이 아닌 게시글만 필터링
            if (!data.isNotice) {
              // 태그 필터링 (activeTab이 'all'이 아닌 경우)
              if (activeTab === "all" || (data.tags && Array.isArray(data.tags) && data.tags.includes(activeTab))) {
                postsData.push({
                  id: doc.id,
                  title: data.title || "제목 없음",
                  content: data.content || "",
                  author: data.author || "작성자 미상",
                  authorId: data.authorId || "",
                  authorPhotoURL: data.authorPhotoURL,
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  isPinned: data.isPinned || false,
                  isNotice: data.isNotice || false,
                  files: data.files || [],
                  links: data.links || [],
                  tags: data.tags || [],
                  viewCount: data.viewCount || 0,
                  commentCount: data.commentCount || 0,
                })
              }
            }
          }
        })

        // 초기 로드인 경우 게시글 목록 설정, 아니면 기존 목록에 추가
        if (isInitial) {
          setPosts(postsData)
        } else {
          setPosts((prev) => [...prev, ...postsData])
        }
      } catch (queryError) {
        console.error("Error in posts query:", queryError)
        throw queryError
      }

      // 공지사항 가져오기 (초기 로드 시에만)
      if (isInitial) {
        try {
          const noticeQuery = query(
            collection(db, "community_posts"),
            where("isNotice", "==", true),
            orderBy("createdAt", "desc"),
            limit(5),
          )

          const noticeSnapshot = await getDocs(noticeQuery)

          const noticeData: Post[] = []

          noticeSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data && data.title) {
              noticeData.push({
                id: doc.id,
                title: data.title || "제목 없음",
                content: data.content || "",
                author: data.author || "작성자 미상",
                authorId: data.authorId || "",
                authorPhotoURL: data.authorPhotoURL,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                isPinned: data.isPinned || false,
                isNotice: true,
                files: data.files || [],
                links: data.links || [],
                tags: data.tags || [],
                viewCount: data.viewCount || 0,
                commentCount: data.commentCount || 0,
              })
            }
          })

          setNoticePosts(noticeData)
        } catch (noticeError) {
          console.error("Error fetching notices:", noticeError)
          setNoticePosts([])
        }
      }
    } catch (error: any) {
      console.error("Error fetching posts:", error)
      console.error("Error details:", error.code, error.message)

      // 오류 메시지 설정
      setError(
        `게시글을 불러오는 중 오류가 발생했습니다. (${error.code || "알 수 없는 오류"}) 잠시 후 다시 시도해주세요.`,
      )

      // 오류 알림
      toast({
        title: "데이터 로딩 오류",
        description: `게시글을 불러오지 못했습니다: ${error.message || "알 수 없는 오류"}. 새로고침을 시도해보세요.`,
        variant: "destructive",
      })
    } finally {
      if (isInitial) {
        setIsLoading(false)
      } else {
        setLoadingMore(false)
      }
    }
  }

  // 인기 게시글 가져오기
  const fetchTrendingPosts = async () => {
    try {
      const trendingQuery = query(collection(db, "community_posts"), orderBy("viewCount", "desc"), limit(3))

      const trendingSnapshot = await getDocs(trendingQuery)
      const trendingData: Post[] = []

      trendingSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data && data.title) {
          trendingData.push({
            id: doc.id,
            title: data.title || "제목 없음",
            content: data.content || "",
            author: data.author || "작성자 미상",
            authorId: data.authorId || "",
            authorPhotoURL: data.authorPhotoURL,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            isPinned: data.isPinned || false,
            isNotice: data.isNotice || false,
            files: data.files || [],
            links: data.links || [],
            tags: data.tags || [],
            viewCount: data.viewCount || 0,
            commentCount: data.commentCount || 0,
          })
        }
      })

      setTrendingPosts(trendingData)
    } catch (error) {
      console.error("Error fetching trending posts:", error)
    }
  }

  // 활발한 사용자 가져오기
  const fetchActiveUsers = async () => {
    try {
      const usersQuery = query(collection(db, "users"), orderBy("postCount", "desc"), limit(3))

      const usersSnapshot = await getDocs(usersQuery)
      const usersData: CommunityUser[] = []

      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data && data.name) {
          usersData.push({
            id: doc.id,
            name: data.name,
            photoURL: data.photoURL,
            postCount: data.postCount || 0,
          })
        }
      })

      setActiveUsers(usersData)
    } catch (error) {
      console.error("Error fetching active users:", error)
    }
  }

  // 인기 태그 가져오기
  const fetchPopularTags = async () => {
    try {
      const tagsQuery = query(collection(db, "community_tags"), orderBy("count", "desc"), limit(5))

      const tagsSnapshot = await getDocs(tagsQuery)
      const tagsData: Tag[] = []

      tagsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data && data.name) {
          tagsData.push({
            name: data.name,
            count: data.count || 0,
          })
        }
      })

      setPopularTags(tagsData)
    } catch (error) {
      console.error("Error fetching popular tags:", error)
      // 태그 데이터가 없을 경우 기본 태그 설정
      setPopularTags([
        { name: "질문", count: 42 },
        { name: "정보공유", count: 38 },
        { name: "웹해킹", count: 27 },
        { name: "포렌식", count: 19 },
        { name: "리버싱", count: 15 },
      ])
    }
  }

  // 커뮤니티 통계 실시간 계산 함수 추가
  const calculateCommunityStats = async () => {
    try {
      // 총 게시글 수 계산
      const totalPostsSnapshot = await getDocs(collection(db, "community_posts"))
      const totalPosts = totalPostsSnapshot.size

      // 오늘 작성된 게시글 수 계산
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayPostsQuery = query(
        collection(db, "community_posts"),
        where("createdAt", ">=", today),
        where("createdAt", "<", tomorrow),
      )
      const todayPostsSnapshot = await getDocs(todayPostsQuery)
      const todayPosts = todayPostsSnapshot.size

      // 총 댓글 수 계산
      let totalComments = 0
      const totalPostsSnapshot2 = await getDocs(collection(db, "community_posts"))
      totalPostsSnapshot2.forEach((doc) => {
        const data = doc.data()
        totalComments += data.commentCount || 0
      })

      // 활성 사용자 수 계산 (최근 7일간 활동한 사용자)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const recentPostsQuery = query(collection(db, "community_posts"), where("createdAt", ">=", weekAgo))
      const recentPostsSnapshot = await getDocs(recentPostsQuery)

      const activeUserIds = new Set()
      recentPostsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.authorId) {
          activeUserIds.add(data.authorId)
        }
      })

      setCommunityStats({
        totalPosts,
        todayPosts,
        activeUsers: activeUserIds.size,
        totalComments,
      })
    } catch (error) {
      console.error("Error calculating community stats:", error)
      // 오류 발생 시 기본값 유지
    }
  }

  // 실시간 데이터 리스너 설정
  const setupRealTimeListeners = () => {
    // 게시글 실시간 업데이트
    const postsQuery = query(collection(db, "community_posts"), orderBy("createdAt", "desc"), limit(20))

    const unsubscribePosts = onSnapshot(
      postsQuery,
      (snapshot) => {
        const postsData: Post[] = []
        const noticeData: Post[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data && data.title) {
            const post = {
              id: doc.id,
              title: data.title || "제목 없음",
              content: data.content || "",
              author: data.author || "작성자 미상",
              authorId: data.authorId || "",
              authorPhotoURL: data.authorPhotoURL,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              isPinned: data.isPinned || false,
              isNotice: data.isNotice || false,
              files: data.files || [],
              links: data.links || [],
              tags: data.tags || [],
              viewCount: data.viewCount || 0,
              commentCount: data.commentCount || 0,
            }

            if (data.isNotice) {
              noticeData.push(post)
            } else {
              postsData.push(post)
            }
          }
        })

        setPosts(postsData)
        setNoticePosts(noticeData)
      },
      (error) => {
        console.error("Error in real-time posts listener:", error)
        toast({
          title: "실시간 업데이트 오류",
          description: "게시글 실시간 업데이트에 문제가 발생했습니다. 페이지를 새로고침해 주세요.",
          variant: "destructive",
        })
      },
    )

    // 통계 실시간 업데이트
    const statsUnsubscribe = onSnapshot(
      doc(db, "community_stats", "general"),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          setCommunityStats({
            totalPosts: data.totalPosts || 0,
            todayPosts: data.todayPosts || 0,
            activeUsers: data.activeUsers || 0,
            totalComments: data.totalComments || 0,
          })
        }
      },
      (error) => {
        console.error("Error in real-time stats listener:", error)
      },
    )

    // 인기 게시글 실시간 업데이트
    const trendingQuery = query(collection(db, "community_posts"), orderBy("viewCount", "desc"), limit(3))

    const trendingUnsubscribe = onSnapshot(
      trendingQuery,
      (snapshot) => {
        const trendingData: Post[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data && data.title) {
            trendingData.push({
              id: doc.id,
              title: data.title || "제목 없음",
              content: data.content || "",
              author: data.author || "작성자 미상",
              authorId: data.authorId || "",
              authorPhotoURL: data.authorPhotoURL,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              isPinned: data.isPinned || false,
              isNotice: data.isNotice || false,
              files: data.files || [],
              links: data.links || [],
              tags: data.tags || [],
              viewCount: data.viewCount || 0,
              commentCount: data.commentCount || 0,
            })
          }
        })
        setTrendingPosts(trendingData)
      },
      (error) => {
        console.error("Error in real-time trending posts listener:", error)
      },
    )

    return () => {
      unsubscribePosts()
      statsUnsubscribe()
      trendingUnsubscribe()
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    fetchPosts()
    fetchTrendingPosts()
    fetchActiveUsers()
    fetchPopularTags()
    calculateCommunityStats() // 새로운 통계 계산 함수 호출

    // 실시간 리스너 설정
    const unsubscribe = setupRealTimeListeners()

    // 5분마다 통계 업데이트
    const statsInterval = setInterval(
      () => {
        calculateCommunityStats()
      },
      5 * 60 * 1000,
    )

    // 컴포넌트 언마운트 시 리스너 해제
    return () => {
      unsubscribe()
      clearInterval(statsInterval)
    }
  }, [])

  // 탭 변경 시 데이터 다시 불러오기
  useEffect(() => {
    setHasMore(true)
    setLastVisible(null)
    fetchPosts()
  }, [activeTab])

  // 날짜 포맷 함수
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "날짜 정보 없음"

    try {
      const now = new Date()
      const diff = now.getTime() - date.getTime()

      // 24시간 이내인 경우 "n시간 전" 형식으로 표시
      if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000))
        if (hours === 0) {
          const minutes = Math.floor(diff / (60 * 1000))
          if (minutes === 0) {
            return "방금 전"
          }
          return `${minutes}분 전`
        }
        return `${hours}시간 전`
      }

      // 그 외에는 날짜 형식으로 표시
      return format(date, "yyyy년 MM월 dd일", { locale: ko })
    } catch (error) {
      console.error("Date formatting error:", error)
      return "날짜 정보 오류"
    }
  }

  // 검색 필터링
  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.tags && post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))),
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-background/90">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-primary/70">
                  커뮤니티
                </h1>
                <p className="text-muted-foreground mt-1">
                  NT 보안 챌린지 커뮤니티에서 다양한 정보를 공유하고 소통하세요.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse"></div>
                  <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto relative" />
                </div>
                <p className="text-muted-foreground text-lg">게시글을 불러오는 중입니다...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error && posts.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-background/90">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-primary/70">
                  커뮤니티
                </h1>
                <p className="text-muted-foreground mt-1">
                  NT 보안 챌린지 커뮤니티에서 다양한 정보를 공유하고 소통하세요.
                </p>
              </div>
              {isAdmin && (
                <Link href="/admin/community/create">
                  <Button className="w-full md:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md transition-all duration-300">
                    <Plus className="mr-2 h-4 w-4" />새 게시글 작성
                  </Button>
                </Link>
              )}
            </div>

            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-pulse"></div>
                <AlertCircle className="h-24 w-24 text-amber-500 relative" />
              </div>
              <h3 className="text-2xl font-bold">{error}</h3>
              <p className="text-muted-foreground mt-2 max-w-md">서버 연결에 문제가 있을 수 있습니다.</p>
              <div className="flex gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => fetchPosts()}
                  className="border-2 hover:bg-muted/50 transition-all duration-300"
                >
                  다시 시도
                </Button>
                <Button
                  onClick={() => router.refresh()}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md transition-all duration-300"
                >
                  페이지 새로고침
                </Button>
              </div>
              {isAdmin && (
                <div className="mt-8 p-6 border-2 rounded-xl bg-muted/30 backdrop-blur-sm max-w-md mx-auto shadow-lg">
                  <h4 className="font-medium text-lg mb-2">관리자 옵션</h4>
                  <p className="text-sm text-muted-foreground mb-3">데이터베이스 연결에 문제가 있을 수 있습니다.</p>
                  <div className="flex gap-2">
                    <Link href="/admin/community/create" className="w-full">
                      <Button
                        variant="secondary"
                        size="lg"
                        className="w-full shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <Plus className="mr-2 h-4 w-4" />새 게시글 작성
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background via-background/95 to-background/90">
      {/* 상단 장식 요소 */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-primary/80"></div>

      <Navbar />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          {/* 헤더 섹션 */}
          {/* 헤더 섹션 - 개선된 버전 */}
          <div className="relative mb-12 overflow-hidden">
            {/* 배경 그라디언트 효과 */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"></div>
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>

            <div className="relative z-10 bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-xl p-8 rounded-3xl border border-primary/20 shadow-2xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-2 bg-gradient-to-b from-primary via-primary/80 to-primary/60 rounded-full"></div>
                    <div>
                      <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-primary/70">
                        커뮤니티
                      </h1>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-muted-foreground">실시간 업데이트</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                    NT 보안 챌린지 커뮤니티에서 다양한 정보를 공유하고 소통하세요. 실시간으로 업데이트되는 최신 보안
                    정보와 기술을 만나보세요.
                  </p>

                  {/* 실시간 통계 */}
                  <div className="flex flex-wrap gap-4 mt-6">
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">총 {communityStats.totalPosts}개 게시글</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full border border-green-500/20">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{communityStats.activeUsers}명 활성 사용자</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">{communityStats.totalComments}개 댓글</span>
                    </div>
                  </div>

                  {/* 인기 태그 */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {popularTags.slice(0, 5).map((tag, index) => (
                      <motion.div
                        key={tag.name}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge
                          variant="outline"
                          className="bg-background/50 hover:bg-primary/10 transition-all duration-300 border border-primary/30 hover:border-primary/50 cursor-pointer px-3 py-1.5"
                          onClick={() => setActiveTab(tag.name)}
                        >
                          <span className="text-primary">#</span>
                          {tag.name}
                          <span className="ml-1 text-xs text-muted-foreground bg-primary/20 px-1.5 py-0.5 rounded-full">
                            {tag.count}
                          </span>
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4 lg:items-end">
                  {/* 검색 박스 개선 */}
                  <div className="relative group w-full lg:w-80">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-primary/30 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative">
                      <div className="flex items-center h-12 rounded-xl bg-background/90 backdrop-blur-md border border-primary/30 pl-4 pr-2 shadow-xl group-hover:shadow-2xl transition-all duration-300">
                        <Search className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <Input
                          placeholder="게시글, 작성자, 태그 검색..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 text-base placeholder:text-muted-foreground/70"
                        />
                        <div className="bg-primary/20 text-primary text-sm font-bold px-3 py-1.5 rounded-lg border border-primary/30">
                          {filteredPosts.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 새 게시글 작성 버튼 개선 */}
                  {isAdmin && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Link href="/admin/community/create">
                        <Button className="w-full lg:w-auto h-12 px-8 bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl text-base font-semibold">
                          <Plus className="mr-2 h-5 w-5" />새 게시글 작성
                        </Button>
                      </Link>
                    </motion.div>
                  )}

                  {/* 실시간 활동 표시 */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                    <span>실시간 업데이트 활성</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 개선된 커뮤니티 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-blue-950/40 dark:via-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-800/30 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"></div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        총 게시글
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                          {communityStats.totalPosts.toLocaleString()}
                        </h3>
                        <span className="text-sm text-blue-500">개</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-blue-600/80">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>실시간 업데이트</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-2xl shadow-lg">
                        <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 via-green-100 to-green-200 dark:from-green-950/40 dark:via-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-800/30 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-green-500 to-green-600"></div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                        오늘 작성
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-green-700 dark:text-green-300">
                          {communityStats.todayPosts.toLocaleString()}
                        </h3>
                        <span className="text-sm text-green-500">개</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600/80">
                        <Clock className="h-3 w-3" />
                        <span>24시간 기준</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-2xl shadow-lg">
                        <Clock className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      {communityStats.todayPosts > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-bounce"></div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 dark:from-purple-950/40 dark:via-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-800/30 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600"></div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                        활성 사용자
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                          {communityStats.activeUsers.toLocaleString()}
                        </h3>
                        <span className="text-sm text-purple-500">명</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-purple-600/80">
                        <Users className="h-3 w-3" />
                        <span>최근 7일 기준</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-2xl shadow-lg">
                        <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-amber-800/20 border-amber-200 dark:border-amber-800/30 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600"></div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        총 댓글
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                          {communityStats.totalComments.toLocaleString()}
                        </h3>
                        <span className="text-sm text-amber-500">개</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-600/80">
                        <MessageSquare className="h-3 w-3" />
                        <span>전체 게시글 기준</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-2xl shadow-lg">
                        <MessageSquare className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-ping"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {error && posts.length > 0 && (
            <div className="mb-6 p-4 border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 rounded-xl backdrop-blur-sm shadow-md">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-400">일부 데이터 로딩 오류</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                    일부 게시글을 불러오지 못했습니다. 표시된 게시글만 확인 가능합니다.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    onClick={() => fetchPosts()}
                  >
                    다시 시도
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* 공지사항 */}
              {noticePosts.length > 0 && (
                <div className="mb-10 animate-fade-in">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center">
                      <div className="h-6 w-1 bg-red-500 rounded-full mr-2"></div>
                      <h2 className="text-2xl font-bold">공지사항</h2>
                    </div>
                    <Badge variant="default" className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                      {noticePosts.length}
                    </Badge>
                  </div>
                  <div className="grid gap-4">
                    {noticePosts.map((post, index) => (
                      <Card
                        key={post.id}
                        className="overflow-hidden border border-red-200 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-800/50 transition-all duration-300 hover:shadow-lg group backdrop-blur-sm bg-white/50 dark:bg-black/20"
                        onClick={() => handlePostClick(post.id)}
                      >
                        <CardContent className="p-0">
                          <div className="relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600"></div>
                            <div className="p-5">
                              <div className="flex items-start gap-3">
                                <Badge
                                  variant="default"
                                  className="bg-gradient-to-r from-red-500 to-red-600 text-white mt-1 shadow-sm"
                                >
                                  공지
                                </Badge>
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors duration-300">
                                    {post.title}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6 ring-2 ring-red-100 dark:ring-red-900/30">
                                        <AvatarImage
                                          src={post.authorPhotoURL || "/placeholder-user.jpg"}
                                          alt={post.author}
                                        />
                                        <AvatarFallback>{post.author.substring(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <span>{post.author}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>
                                        {post.createdAt ? formatDate(post.createdAt.toDate()) : "날짜 정보 없음"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>{post.viewCount || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MessageSquare className="h-3.5 w-3.5" />
                                      <span>{post.commentCount || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 게시글 탭 */}
              <Tabs defaultValue="all" className="mb-6">
                <TabsList className="mb-4 bg-background/50 backdrop-blur-sm border border-primary/10 p-1">
                  <TabsTrigger value="all" onClick={() => setActiveTab("all")}>
                    전체 게시글
                  </TabsTrigger>
                  {popularTags.slice(0, 3).map((tag) => (
                    <TabsTrigger key={tag.name} value={tag.name} onClick={() => setActiveTab(tag.name)}>
                      {tag.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  <div className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center">
                        <div className="h-6 w-1 bg-primary rounded-full mr-2"></div>
                        <h2 className="text-2xl font-bold">최신 게시글</h2>
                      </div>
                      <Badge variant="default" className="bg-gradient-to-r from-primary to-primary/80 text-white">
                        {filteredPosts.length}
                      </Badge>
                    </div>
                    <div className="grid gap-4">
                      {filteredPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ y: -4 }}
                        >
                          <Card
                            className="overflow-hidden border border-primary/10 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl group backdrop-blur-sm bg-gradient-to-br from-background/80 to-background/60 cursor-pointer"
                            onClick={() => handlePostClick(post.id)}
                          >
                            <CardContent className="p-0">
                              <div className="relative">
                                {/* 상단 그라디언트 라인 */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>

                                <div className="p-6">
                                  {/* 게시글 헤더 */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                                        <AvatarImage
                                          src={post.authorPhotoURL || "/placeholder-user.jpg"}
                                          alt={post.author}
                                        />
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                          {post.author.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                          {post.author}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {post.createdAt ? formatDate(post.createdAt.toDate()) : "날짜 정보 없음"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* 상호작용 통계 */}
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1 hover:text-primary transition-colors">
                                        <Eye className="h-4 w-4" />
                                        <span>{post.viewCount || 0}</span>
                                      </div>
                                      <div className="flex items-center gap-1 hover:text-primary transition-colors">
                                        <MessageSquare className="h-4 w-4" />
                                        <span>{post.commentCount || 0}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 게시글 제목 */}
                                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                                    {post.title}
                                  </h3>

                                  {/* 게시글 내용 미리보기 */}
                                  <p className="text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                                    {post.content.replace(/<[^>]*>/g, "").substring(0, 150)}...
                                  </p>

                                  {/* 태그 */}
                                  {post.tags && post.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                      {post.tags.slice(0, 3).map((tag) => (
                                        <Badge
                                          key={tag}
                                          variant="secondary"
                                          className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        >
                                          #{tag}
                                        </Badge>
                                      ))}
                                      {post.tags.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{post.tags.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  {/* 하단 메타 정보 */}
                                  <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Clock className="h-4 w-4" />
                                      <span>{post.createdAt ? formatDate(post.createdAt.toDate()) : ""}</span>
                                    </div>

                                    <motion.div
                                      className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300"
                                      whileHover={{ x: 5 }}
                                    >
                                      <span className="text-sm font-medium">자세히 보기</span>
                                      <ChevronRight className="h-4 w-4" />
                                    </motion.div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    {hasMore && (
                      <div className="mt-6 text-center">
                        <Button
                          variant="outline"
                          onClick={() => fetchPosts(false)}
                          disabled={loadingMore}
                          className="border-primary/20 hover:border-primary/40"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              불러오는 중...
                            </>
                          ) : (
                            "더 보기"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {popularTags.slice(0, 3).map((tag) => (
                  <TabsContent key={tag.name} value={tag.name} className="mt-0">
                    <div className="animate-fade-in">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center">
                          <div className="h-6 w-1 bg-primary rounded-full mr-2"></div>
                          <h2 className="text-2xl font-bold">{tag.name} 게시글</h2>
                        </div>
                        <Badge variant="default" className="bg-gradient-to-r from-primary to-primary/80 text-white">
                          {filteredPosts.length}
                        </Badge>
                      </div>
                      <div className="grid gap-4">
                        {filteredPosts.map((post, index) => (
                          <Card
                            key={post.id}
                            className="overflow-hidden border border-primary/10 hover:border-primary/20 transition-all duration-300 hover:shadow-lg group backdrop-blur-sm bg-white/50 dark:bg-black/20"
                            onClick={() => handlePostClick(post.id)}
                          >
                            <CardContent className="p-0">
                              <div className="relative">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/40"></div>
                                <div className="p-5">
                                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors duration-300">
                                    {post.title}
                                  </h3>
                                  <p className="line-clamp-2 mt-2 text-sm text-muted-foreground">{post.content}</p>
                                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6 ring-2 ring-primary/10">
                                        <AvatarImage
                                          src={post.authorPhotoURL || "/placeholder-user.jpg"}
                                          alt={post.author}
                                        />
                                        <AvatarFallback>{post.author.substring(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <span>{post.author}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>
                                        {post.createdAt ? formatDate(post.createdAt.toDate()) : "날짜 정보 없음"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>{post.viewCount || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MessageSquare className="h-3.5 w-3.5" />
                                      <span>{post.commentCount || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* 사이드바 */}
            <div className="space-y-8">
              {/* 인기 게시글 */}
              <Card className="border-primary/10 overflow-hidden">
                <CardHeader className="bg-primary/5 pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    인기 게시글
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {trendingPosts.length > 0 ? (
                    <div className="space-y-4">
                      {trendingPosts.map((post, index) => (
                        <div
                          key={post.id}
                          className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0 cursor-pointer hover:bg-primary/5 p-2 rounded-md transition-colors"
                          onClick={() => handlePostClick(post.id)}
                        >
                          <div className="flex items-center justify-center bg-primary/10 text-primary font-bold rounded-full w-6 h-6 text-sm mt-0.5">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium line-clamp-2 text-sm hover:text-primary transition-colors">
                              {post.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <span>{post.viewCount || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{post.commentCount || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>인기 게시글이 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 활발한 사용자 */}
              <Card className="border-primary/10 overflow-hidden">
                <CardHeader className="bg-primary/5 pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    활발한 사용자
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {activeUsers.length > 0 ? (
                    <div className="space-y-4">
                      {activeUsers.map((user, index) => (
                        <div key={user.id} className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <Avatar className="h-10 w-10 border-2 border-primary/10">
                              <AvatarImage src={user.photoURL || "/placeholder-user.jpg"} alt={user.name} />
                              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">게시글 {user.postCount}개</p>
                          </div>
                          <Badge variant="outline" className="bg-primary/5">
                            {index + 1}위
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>활발한 사용자가 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 인기 태그 */}
              <Card className="border-primary/10 overflow-hidden">
                <CardHeader className="bg-primary/5 pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LucideTag className="h-5 w-5 text-primary" />
                    인기 태그
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map((tag) => (
                      <Badge
                        key={tag.name}
                        variant="outline"
                        className="bg-background hover:bg-primary/5 transition-all duration-300 border border-primary/20 hover:border-primary/40 cursor-pointer px-3 py-1.5"
                        onClick={() => setActiveTab(tag.name)}
                      >
                        #{tag.name} <span className="ml-1 text-xs text-muted-foreground">{tag.count}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 커뮤니티 통계 */}
              <Card className="border-primary/10 overflow-hidden">
                <CardHeader className="bg-primary/5 pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-primary" />
                    커뮤니티 통계
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">총 게시글</span>
                      <span className="font-medium">{communityStats.totalPosts}개</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">오늘 작성</span>
                      <span className="font-medium">{communityStats.todayPosts}개</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">활성 사용자</span>
                      <span className="font-medium">{communityStats.activeUsers}명</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">총 댓글</span>
                      <span className="font-medium">{communityStats.totalComments}개</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
