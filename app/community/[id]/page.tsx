"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Clock,
  Pin,
  FileText,
  LinkIcon,
  ExternalLink,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  Download,
  MessageSquare,
  Send,
  ThumbsUp,
  Eye,
} from "lucide-react"
import Link from "next/link"
import {
  doc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  collection,
  addDoc,
  query,
  where,
  increment,
  getDocs,
  type Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { motion } from "framer-motion"
import { parseMarkdown, generateCopyScript } from "@/lib/markdown-parser"

// 게시글 타입 정의
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
  viewCount: number
  commentCount: number
  viewedBy?: string[]
}

// 댓글 타입 정의
type Comment = {
  id: string
  postId: string
  content: string
  author: string
  authorId: string
  authorPhotoURL?: string
  createdAt: Timestamp | null
  likes: number
  likedBy?: string[]
}

export default function CommunityPostPage() {
  const params = useParams()
  const postId = params.id as string
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [error, setError] = useState("")
  const [commentError, setCommentError] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [viewCountUpdated, setViewCountUpdated] = useState(false)
  const [showDeleteCommentDialog, setShowDeleteCommentDialog] = useState<string | null>(null)

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"
  // 게시글 작성자 여부
  const isAuthor = user?.uid === post?.authorId

  // 게시글 데이터 가져오기 및 조회수 업데이트
  useEffect(() => {
    const fetchPost = async () => {
      try {
        console.log("Fetching post with ID:", postId)
        const postRef = doc(db, "community_posts", postId)
        const postSnap = await getDoc(postRef)

        if (postSnap.exists()) {
          const postData = postSnap.data()
          console.log("Post data:", postData)

          if (postData) {
            const postWithId = {
              id: postSnap.id,
              ...postData,
              title: postData.title || "제목 없음",
              content: postData.content || "",
              author: postData.author || "익명",
              authorId: postData.authorId || "",
              createdAt: postData.createdAt || serverTimestamp(),
              isPinned: postData.isPinned || false,
              isNotice: postData.isNotice || false,
              viewCount: postData.viewCount || 0,
              commentCount: postData.commentCount || 0,
              viewedBy: postData.viewedBy || [],
            } as Post

            setPost(postWithId)

            // 조회수 업데이트
            if (user && !viewCountUpdated && (!postData.viewedBy || !postData.viewedBy.includes(user.uid))) {
              updateViewCount(postRef, postWithId, user.uid)
            }
          } else {
            setError("게시글 데이터가 올바르지 않습니다.")
          }
        } else {
          console.log("Post not found")
          setError("게시글을 찾을 수 없습니다.")
        }
      } catch (error) {
        console.error("Error fetching post:", error)
        setError("게시글을 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    if (postId) {
      fetchPost()
    }
  }, [postId, user, viewCountUpdated])

  // 댓글 새로고침 함수
  const refreshComments = async () => {
    if (!postId) return

    setIsLoadingComments(true)
    setCommentError("")

    try {
      console.log("댓글 새로고침 시작:", postId)

      // 단순한 where 쿼리만 사용 (orderBy 제거)
      const commentsRef = collection(db, "community_comments")
      const commentsQuery = query(commentsRef, where("postId", "==", postId))

      const snapshot = await getDocs(commentsQuery)
      console.log("댓글 조회 결과:", snapshot.size, "개")

      const commentsData: Comment[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        if (data && data.postId === postId) {
          commentsData.push({
            id: doc.id,
            postId: data.postId,
            content: data.content || "",
            author: data.author || "익명",
            authorId: data.authorId || "",
            authorPhotoURL: data.authorPhotoURL || null,
            createdAt: data.createdAt || null,
            likes: data.likes || 0,
            likedBy: data.likedBy || [],
          })
        }
      })

      // 클라이언트에서 정렬 (인덱스 불필요)
      commentsData.sort((a, b) => {
        if (!a.createdAt) return 1
        if (!b.createdAt) return -1
        return b.createdAt.toMillis() - a.createdAt.toMillis()
      })

      console.log("정렬된 댓글:", commentsData.length, "개")
      setComments(commentsData)
      setCommentError("")
    } catch (error: any) {
      console.error("댓글 조회 오류:", error)

      let errorMessage = "댓글을 불러올 수 없습니다."
      if (error.code === "permission-denied") {
        errorMessage = "댓글을 읽을 권한이 없습니다."
      } else if (error.code === "unavailable") {
        errorMessage = "서버에 연결할 수 없습니다."
      }

      setCommentError(errorMessage)
    } finally {
      setIsLoadingComments(false)
    }
  }

  // 댓글 데이터 가져오기 useEffect
  useEffect(() => {
    if (postId) {
      refreshComments()
    }
  }, [postId])

  // 조회수 업데이트 함수
  const updateViewCount = async (postRef: any, post: Post, userId: string) => {
    try {
      await updateDoc(postRef, {
        viewCount: increment(1),
        viewedBy: arrayUnion(userId),
      })
      setViewCountUpdated(true)
      console.log("View count updated")
    } catch (error) {
      console.error("Error updating view count:", error)
    }
  }

  // 게시글 삭제 핸들러
  const handleDeletePost = async () => {
    if (!user || (!isAdmin && !isAuthor)) return

    setIsDeleting(true)

    try {
      console.log("Deleting post:", postId)
      await deleteDoc(doc(db, "community_posts", postId))

      toast({
        title: "게시글이 삭제되었습니다",
        variant: "default",
      })

      router.push("/community")
    } catch (error) {
      console.error("Error deleting post:", error)
      toast({
        title: "게시글 삭제 중 오류가 발생했습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "댓글을 작성하려면 로그인해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!newComment.trim()) {
      toast({
        title: "댓글 내용을 입력해주세요",
        variant: "destructive",
      })
      return
    }

    if (newComment.length > 1000) {
      toast({
        title: "댓글이 너무 깁니다",
        description: "댓글은 1000자 이내로 작성해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingComment(true)

    try {
      const commentData = {
        postId: postId,
        content: newComment.trim(),
        author: user.displayName || userProfile?.username || "익명",
        authorId: user.uid,
        authorPhotoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
      }

      console.log("댓글 작성 시도:", commentData)

      // 댓글 추가
      const commentRef = await addDoc(collection(db, "community_comments"), commentData)
      console.log("댓글 추가 성공:", commentRef.id)

      // 게시글의 댓글 수 증가
      if (post) {
        const postRef = doc(db, "community_posts", postId)
        await updateDoc(postRef, {
          commentCount: increment(1),
        })
      }

      setNewComment("")

      toast({
        title: "댓글이 작성되었습니다",
        variant: "default",
      })

      // 댓글 목록 새로고침
      await refreshComments()
    } catch (error: any) {
      console.error("댓글 작성 오류:", error)

      let errorMessage = "댓글 작성 중 오류가 발생했습니다."
      if (error.code === "permission-denied") {
        errorMessage = "댓글을 작성할 권한이 없습니다."
      }

      toast({
        title: "댓글 작성 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string, commentAuthorId: string) => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        variant: "destructive",
      })
      return
    }

    if (!isAdmin && user.uid !== commentAuthorId) {
      toast({
        title: "권한이 없습니다",
        description: "본인이 작성한 댓글만 삭제할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("댓글 삭제 시도:", commentId)

      await deleteDoc(doc(db, "community_comments", commentId))
      console.log("댓글 삭제 완료")

      if (post) {
        const postRef = doc(db, "community_posts", postId)
        await updateDoc(postRef, {
          commentCount: increment(-1),
        })
      }

      toast({
        title: "댓글이 삭제되었습니다",
        variant: "default",
      })

      setShowDeleteCommentDialog(null)

      // 댓글 목록 새로고침
      await refreshComments()
    } catch (error) {
      console.error("댓글 삭제 오류:", error)
      toast({
        title: "댓글 삭제 실패",
        description: "댓글 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleLikeComment = async (commentId: string, likedBy: string[] = []) => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "좋아요를 누르려면 로그인해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const commentRef = doc(db, "community_comments", commentId)
      const alreadyLiked = likedBy.includes(user.uid)

      if (alreadyLiked) {
        await updateDoc(commentRef, {
          likes: increment(-1),
          likedBy: likedBy.filter((uid) => uid !== user.uid),
        })
      } else {
        await updateDoc(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid),
        })
      }

      // 댓글 목록 새로고침
      await refreshComments()
    } catch (error) {
      console.error("좋아요 처리 오류:", error)
      toast({
        title: "좋아요 처리 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      })
    }
  }

  // 날짜 포맷 함수
  const formatDate = (date: Date | null) => {
    if (!date) return "날짜 정보 없음"
    try {
      return format(date, "yyyy년 MM월 dd일 HH:mm", { locale: ko })
    } catch (error) {
      console.error("Error formatting date:", error)
      return "날짜 형식 오류"
    }
  }

  // 외부 링크 열기
  const openExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  // 파일 다운로드
  const handleDownloadFile = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename || "download"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-bold">{error || "게시글을 찾을 수 없습니다"}</h3>
              <p className="text-muted-foreground mt-2">요청하신 게시글을 찾을 수 없거나 접근할 수 없습니다.</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/community")}>
                커뮤니티로 돌아가기
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/community")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              커뮤니티로
            </Button>
          </div>

          <Card className="mb-8">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {post.isNotice && (
                  <Badge variant="default" className="bg-red-500 text-white">
                    공지
                  </Badge>
                )}
                {post.isPinned && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Pin className="h-3.5 w-3.5" />
                    고정됨
                  </Badge>
                )}
                {post.files && post.files.length > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    첨부파일
                  </Badge>
                )}
                {post.links && post.links.length > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <LinkIcon className="h-3.5 w-3.5" />
                    링크
                  </Badge>
                )}
                {post.tags &&
                  post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                    </Badge>
                  ))}
              </div>
              <CardTitle className="text-2xl md:text-3xl">{post.title}</CardTitle>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={post.authorPhotoURL || "/placeholder-user.jpg"} alt={post.author} />
                    <AvatarFallback>{post.author.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{post.author}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(post.createdAt?.toDate() || null)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>조회 {post.viewCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>댓글 {comments.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {(isAdmin || isAuthor) && (
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/community/edit/${post.id}`}>
                      <Button variant="outline" size="sm" className="h-8">
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        수정
                      </Button>
                    </Link>

                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-8">
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          삭제
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            정말로 이 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeletePost}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                삭제 중...
                              </>
                            ) : (
                              "삭제"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }} />
              </div>

              {post.files && post.files.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-2">첨부 파일</h3>
                  <div className="space-y-2">
                    {post.files.map((file, index) => {
                      const fileName = file.split("/").pop() || `첨부파일 ${index + 1}`
                      return (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-muted-foreground mr-2" />
                            <a
                              href={file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {fileName}
                            </a>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadFile(file, fileName)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            <span>다운로드</span>
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {post.links && post.links.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-2">관련 링크</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.links.map((link, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => openExternalLink(link.url)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {link.title || "링크"}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 댓글 섹션 */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              댓글 ({comments.length})
            </h3>

            {/* 댓글 작성 폼 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card className="mb-6 border border-primary/20 shadow-xl bg-gradient-to-br from-background/90 to-background/70 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {user && (
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                          <AvatarImage
                            src={user.photoURL || "/placeholder-user.jpg"}
                            alt={user.displayName || "사용자"}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {(user.displayName || "익명").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.displayName || "익명"}</p>
                          <p className="text-sm text-muted-foreground">댓글 작성 중...</p>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <Textarea
                        ref={commentInputRef}
                        placeholder={
                          user ? "이 게시글에 대한 의견을 남겨주세요..." : "댓글을 작성하려면 로그인해주세요."
                        }
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={!user || isSubmittingComment}
                        className="min-h-[120px] resize-none border-primary/20 focus:border-primary/40 transition-all duration-300 text-base leading-relaxed"
                      />

                      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                        {newComment.length}/1000
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>Markdown 문법을 지원합니다</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {newComment.trim() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewComment("")}
                            disabled={isSubmittingComment}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            취소
                          </Button>
                        )}

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={handleSubmitComment}
                            disabled={!user || isSubmittingComment || !newComment.trim() || newComment.length > 1000}
                            className="px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            {isSubmittingComment ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                작성 중...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                댓글 작성
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    {!user && (
                      <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">로그인이 필요합니다</p>
                            <p className="text-sm text-muted-foreground">댓글을 작성하려면 로그인해주세요.</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
                            로그인
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 댓글 목록 */}
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">댓글을 불러오는 중...</span>
              </div>
            ) : commentError ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-destructive font-medium mb-2">{commentError}</p>
                <p className="text-sm text-muted-foreground mb-4">인덱스 문제가 해결되었습니다. 다시 시도해주세요.</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={refreshComments} disabled={isLoadingComments}>
                    {isLoadingComments ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        로딩 중...
                      </>
                    ) : (
                      "다시 시도"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log("Firebase 상태:", {
                        db: !!db,
                        user: !!user,
                        postId: postId,
                      })
                      toast({
                        title: "시스템 상태",
                        description: `DB: ${!!db}, 사용자: ${!!user}, 게시글ID: ${postId}`,
                      })
                    }}
                  >
                    상태 확인
                  </Button>
                </div>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4 }}
                  >
                    <Card className="border border-primary/10 hover:border-primary/20 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <motion.div whileHover={{ scale: 1.05 }}>
                            <Avatar className="h-12 w-12 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300">
                              <AvatarImage
                                src={comment.authorPhotoURL || "/placeholder-user.jpg"}
                                alt={comment.author}
                              />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {comment.author.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <p className="font-semibold text-foreground">{comment.author}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>
                                    {comment.createdAt ? formatDate(comment.createdAt.toDate()) : "날짜 정보 없음"}
                                  </span>
                                </div>
                              </div>

                              {user && (isAdmin || user.uid === comment.authorId) && (
                                <AlertDialog
                                  open={showDeleteCommentDialog === comment.id}
                                  onOpenChange={(open) => setShowDeleteCommentDialog(open ? comment.id : null)}
                                >
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="border border-destructive/20">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-destructive">댓글 삭제</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        정말로 이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>취소</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteComment(comment.id, comment.authorId)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        삭제
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>

                            <div className="mb-4 p-4 bg-muted/20 rounded-lg border border-muted/30">
                              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                            </div>

                            <div className="flex items-center gap-4">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLikeComment(comment.id, comment.likedBy)}
                                  className={`h-9 flex items-center gap-2 transition-all duration-300 ${
                                    user && comment.likedBy?.includes(user.uid)
                                      ? "text-primary bg-primary/10 hover:bg-primary/20"
                                      : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  }`}
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                  <span className="font-medium">{comment.likes || 0}</span>
                                  {user && comment.likedBy?.includes(user.uid) && (
                                    <span className="text-xs">좋아요함</span>
                                  )}
                                </Button>
                              </motion.div>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 text-muted-foreground hover:text-primary transition-colors"
                                disabled
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                답글
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium">아직 댓글이 없습니다</h4>
                <p className="text-muted-foreground mt-1">첫 번째 댓글을 작성해보세요!</p>
                {user ? (
                  <Button
                    onClick={() => commentInputRef.current?.focus()}
                    className="mt-4 bg-primary/10 hover:bg-primary/20 text-primary"
                  >
                    댓글 작성하기
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push("/login")}
                    className="mt-4 bg-primary/10 hover:bg-primary/20 text-primary"
                  >
                    로그인하고 댓글 작성하기
                  </Button>
                )}
              </div>
            )}
          </div>
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
