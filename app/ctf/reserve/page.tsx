"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Shield, ArrowLeft, Calendar, Clock, AlertCircle, Loader2, Info, CheckCircle2 } from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

export default function ReserveCTFPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  // 관리자가 아닌 경우 접근 제한
  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "접근 권한이 없습니다",
        description: "관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/ctf")
    }
  }, [isAdmin, router, toast])

  // 폼 상태
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [teamSize, setTeamSize] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // 관리자가 아닌 경우 렌더링 중단
  if (!isAdmin) {
    return null
  }

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // 입력 검증
    if (!title.trim()) {
      setError("대회 제목을 입력해주세요.")
      return
    }
    if (!description.trim()) {
      setError("대회 설명을 입력해주세요.")
      return
    }
    if (!startDate || !startTime) {
      setError("시작 일시를 입력해주세요.")
      return
    }
    if (!endDate || !endTime) {
      setError("종료 일시를 입력해주세요.")
      return
    }

    // 시작 및 종료 시간 검증
    const startDateTime = new Date(`${startDate}T${startTime}:00`)
    const endDateTime = new Date(`${endDate}T${endTime}:00`)
    const now = new Date()

    if (startDateTime < now) {
      setError("시작 시간은 현재 시간 이후여야 합니다.")
      return
    }

    if (endDateTime <= startDateTime) {
      setError("종료 시간은 시작 시간 이후여야 합니다.")
      return
    }

    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "CTF 대회를 예약하려면 먼저 로그인해주세요.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setIsSubmitting(true)

    try {
      // Firestore에 예약 정보 저장
      await addDoc(collection(db, "ctf_reservations"), {
        title,
        description,
        startTime: startDateTime,
        endTime: endDateTime,
        teamSize: teamSize ? Number.parseInt(teamSize) : null,
        contactEmail: contactEmail || user.email,
        contactPhone,
        requesterId: user.uid,
        requesterName: userProfile?.username || user.displayName,
        requesterEmail: user.email,
        status: "pending", // pending, approved, rejected
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminComment: "",
      })

      setSuccess(true)

      // 폼 초기화
      setTitle("")
      setDescription("")
      setStartDate("")
      setStartTime("")
      setEndDate("")
      setEndTime("")
      setTeamSize("")
      setContactEmail("")
      setContactPhone("")
    } catch (error: any) {
      console.error("Error submitting CTF reservation:", error)
      setError("CTF 대회 예약 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/ctf")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              CTF 페이지로
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">CTF 대회 예약</h1>
            <p className="text-muted-foreground mt-2">CTF 대회 개최를 위한 예약 신청을 할 수 있습니다.</p>
          </div>

          {success ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-2xl">예약 신청 완료</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold">CTF 대회 예약 신청이 완료되었습니다</h2>
                  <p className="mt-2 text-center text-muted-foreground">
                    관리자 검토 후 승인 여부를 이메일로 알려드립니다. 승인 시 CTF 대회 페이지에 등록됩니다.
                  </p>
                </div>

                <div className="flex justify-center gap-4">
                  <Button onClick={() => setSuccess(false)}>새 예약 신청</Button>
                  <Button variant="outline" onClick={() => router.push("/ctf")}>
                    CTF 페이지로
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>CTF 대회 예약 안내</CardTitle>
                    <CardDescription>CTF 대회 예약 신청 전 아래 내용을 확인해주세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted p-4">
                      <h3 className="mb-2 font-semibold">CTF 대회 예약 절차</h3>
                      <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
                        <li>예약 신청 폼을 작성하여 제출합니다.</li>
                        <li>관리자가 신청 내용을 검토합니다. (1-2일 소요)</li>
                        <li>승인 시 이메일로 알림을 보내드립니다.</li>
                        <li>승인된 대회는 CTF 페이지에 자동으로 등록됩니다.</li>
                        <li>대회 시작 전 문제 등록 및 설정이 가능합니다.</li>
                      </ol>
                    </div>

                    <div className="rounded-lg bg-muted p-4">
                      <h3 className="mb-2 font-semibold">유의사항</h3>
                      <ul className="ml-4 list-disc space-y-2 text-sm text-muted-foreground">
                        <li>대회 시작 최소 3일 전에 예약 신청을 완료해주세요.</li>
                        <li>대회 내용은 보안 관련 주제여야 합니다.</li>
                        <li>부적절한 내용이나 목적의 대회는 승인되지 않습니다.</li>
                        <li>승인 후 대회 정보 수정은 관리자에게 문의해주세요.</li>
                        <li>대회 운영 중 문제가 발생할 경우 즉시 관리자에게 연락해주세요.</li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border p-4">
                      <Shield className="h-10 w-10 text-primary" />
                      <div>
                        <h3 className="font-semibold">관리자 연락처</h3>
                        <p className="text-sm text-muted-foreground">문의사항은 admin@ntctf.kr로 연락주세요.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>예약 신청</CardTitle>
                    <CardDescription>CTF 대회 정보를 입력해주세요.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">대회 제목 *</Label>
                        <Input
                          id="title"
                          placeholder="CTF 대회 제목"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">대회 설명 *</Label>
                        <Textarea
                          id="description"
                          placeholder="CTF 대회에 대한 설명을 입력하세요"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate">시작 날짜 *</Label>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="startDate"
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="startTime">시작 시간 *</Label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="startTime"
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="endDate">종료 날짜 *</Label>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="endDate"
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="endTime">종료 시간 *</Label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="endTime"
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="teamSize">팀 인원 제한 (선택사항)</Label>
                        <Input
                          id="teamSize"
                          type="number"
                          placeholder="예: 4 (팀당 최대 인원)"
                          min="1"
                          value={teamSize}
                          onChange={(e) => setTeamSize(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          <Info className="inline h-3 w-3 mr-1" />팀 단위 참가 시 팀당 최대 인원 수를 입력하세요. 개인
                          참가만 허용 시 1을 입력하세요.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">연락 이메일 (선택사항)</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          placeholder="name@example.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          <Info className="inline h-3 w-3 mr-1" />
                          입력하지 않을 경우 계정 이메일이 사용됩니다.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">연락처 (선택사항)</Label>
                        <Input
                          id="contactPhone"
                          type="tel"
                          placeholder="010-1234-5678"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                        />
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            제출 중...
                          </>
                        ) : (
                          "예약 신청하기"
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
