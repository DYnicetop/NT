"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Calendar, AlertCircle, CheckCircle, XCircle, User, Mail, Phone, ArrowLeft } from "lucide-react"
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// 예약 타입 정의
type Reservation = {
  id: string
  title: string
  description: string
  startTime: any
  endTime: any
  teamSize: number | null
  contactEmail: string
  contactPhone: string
  requesterId: string
  requesterName: string
  requesterEmail: string
  status: "pending" | "approved" | "rejected"
  createdAt: any
  updatedAt: any
  adminComment: string
}

export default function AdminReservationsPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState("pending")
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [adminComment, setAdminComment] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 예약 목록 불러오기
  useEffect(() => {
    const fetchReservations = async () => {
      if (!isAdmin) {
        router.push("/")
        return
      }

      try {
        const reservationsRef = collection(db, "ctf_reservations")
        const q = query(reservationsRef, orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(q)

        const reservationsData: Reservation[] = []
        querySnapshot.forEach((doc) => {
          reservationsData.push({ id: doc.id, ...doc.data() } as Reservation)
        })

        setReservations(reservationsData)
      } catch (error) {
        console.error("Error fetching reservations:", error)
        toast({
          title: "오류 발생",
          description: "예약 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchReservations()
  }, [isAdmin, router, toast])

  // 예약 상태 변경 처리
  const handleStatusChange = async (id: string, status: "approved" | "rejected") => {
    if (!selectedReservation) return

    setIsProcessing(true)

    try {
      const reservationRef = doc(db, "ctf_reservations", id)
      await updateDoc(reservationRef, {
        status,
        adminComment,
        updatedAt: serverTimestamp(),
      })

      // 승인된 경우 CTF 대회 생성
      if (status === "approved") {
        // CTF 대회 컬렉션에 추가
        const ctfRef = collection(db, "ctf_contests")
        await addDoc(ctfRef, {
          title: selectedReservation.title,
          description: selectedReservation.description,
          startTime: selectedReservation.startTime,
          endTime: selectedReservation.endTime,
          problemCount: 0,
          participants: [],
          author: selectedReservation.requesterName,
          authorId: selectedReservation.requesterId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      // 상태 업데이트
      setReservations(
        reservations.map((reservation) =>
          reservation.id === id ? { ...reservation, status, adminComment, updatedAt: new Date() } : reservation,
        ),
      )

      toast({
        title: status === "approved" ? "예약이 승인되었습니다" : "예약이 거부되었습니다",
        description: status === "approved" ? "CTF 대회가 생성되었습니다." : "예약이 거부되었습니다.",
        variant: "default",
      })

      setSelectedReservation(null)
      setAdminComment("")
    } catch (error) {
      console.error("Error updating reservation status:", error)
      toast({
        title: "오류 발생",
        description: "예약 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
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

  // 상태별 필터링
  const filteredReservations = reservations.filter((reservation) => {
    if (currentTab === "all") return true
    return reservation.status === currentTab
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/admin")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              관리자 페이지로
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">CTF 대회 예약 관리</h1>
            <p className="text-muted-foreground mt-2">사용자들의 CTF 대회 예약 신청을 관리합니다.</p>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="pending">대기 중</TabsTrigger>
              <TabsTrigger value="approved">승인됨</TabsTrigger>
              <TabsTrigger value="rejected">거부됨</TabsTrigger>
              <TabsTrigger value="all">전체</TabsTrigger>
            </TabsList>

            <TabsContent value={currentTab}>
              {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {[...Array(2)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader className="h-32 bg-muted"></CardHeader>
                      <CardContent className="h-40 bg-muted mt-4"></CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredReservations.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {filteredReservations.map((reservation) => (
                    <Card key={reservation.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          {reservation.status === "pending" ? (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                              대기 중
                            </Badge>
                          ) : reservation.status === "approved" ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500">
                              승인됨
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500">
                              거부됨
                            </Badge>
                          )}
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {reservation.createdAt?.toDate ? formatDate(reservation.createdAt.toDate()) : "날짜 없음"}
                            </span>
                          </Badge>
                        </div>
                        <CardTitle className="mt-3 text-xl">{reservation.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{reservation.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{reservation.requesterName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{reservation.requesterEmail}</span>
                          </div>
                          {reservation.contactPhone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{reservation.contactPhone}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">시작 시간:</span>
                            <span>
                              {reservation.startTime?.toDate ? formatDate(reservation.startTime.toDate()) : "날짜 없음"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">종료 시간:</span>
                            <span>
                              {reservation.endTime?.toDate ? formatDate(reservation.endTime.toDate()) : "날짜 없음"}
                            </span>
                          </div>
                          {reservation.teamSize && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">팀 인원 제한:</span>
                              <span>{reservation.teamSize}명</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        {reservation.status === "pending" ? (
                          <div className="flex w-full gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="default"
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setSelectedReservation(reservation)
                                    setAdminComment("")
                                  }}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  승인
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>CTF 대회 예약 승인</DialogTitle>
                                  <DialogDescription>
                                    이 예약을 승인하시겠습니까? 승인 시 CTF 대회가 자동으로 생성됩니다.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <h4 className="font-medium">관리자 코멘트 (선택사항)</h4>
                                    <Textarea
                                      placeholder="승인 관련 코멘트를 입력하세요"
                                      value={adminComment}
                                      onChange={(e) => setAdminComment(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setSelectedReservation(null)}>
                                    취소
                                  </Button>
                                  <Button
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleStatusChange(reservation.id, "approved")}
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? "처리 중..." : "승인하기"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  className="flex-1"
                                  onClick={() => {
                                    setSelectedReservation(reservation)
                                    setAdminComment("")
                                  }}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  거부
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>CTF 대회 예약 거부</DialogTitle>
                                  <DialogDescription>
                                    이 예약을 거부하시겠습니까? 거부 사유를 입력해주세요.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <h4 className="font-medium">거부 사유 (필수)</h4>
                                    <Textarea
                                      placeholder="거부 사유를 입력하세요"
                                      value={adminComment}
                                      onChange={(e) => setAdminComment(e.target.value)}
                                      required
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setSelectedReservation(null)}>
                                    취소
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleStatusChange(reservation.id, "rejected")}
                                    disabled={isProcessing || !adminComment.trim()}
                                  >
                                    {isProcessing ? "처리 중..." : "거부하기"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        ) : (
                          <div className="w-full">
                            {reservation.adminComment && (
                              <div className="rounded-lg bg-muted p-3 text-sm">
                                <p className="font-medium">관리자 코멘트:</p>
                                <p className="text-muted-foreground">{reservation.adminComment}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-bold">예약이 없습니다</h3>
                  <p className="text-muted-foreground mt-2">
                    {currentTab === "pending"
                      ? "대기 중인 예약이 없습니다."
                      : currentTab === "approved"
                        ? "승인된 예약이 없습니다."
                        : currentTab === "rejected"
                          ? "거부된 예약이 없습니다."
                          : "등록된 예약이 없습니다."}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
