"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar,
  Users,
  ArrowLeft,
  Search,
  Plus,
  Edit,
  Trash2,
  Play,
  Settings,
  TrendingUp,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, deleteDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { Season, SeasonParticipant } from "@/lib/season-types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { isAdmin } from "@/lib/admin-utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function AdminSeasonsPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [seasons, setSeasons] = useState<Season[]>([])
  const [participants, setParticipants] = useState<SeasonParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("seasons")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [seasonToDelete, setSeasonToDelete] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newSeason, setNewSeason] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    isActive: false,
  })

  // 관리자 권한 확인
  useEffect(() => {
    if (!isAdmin(userProfile)) {
      router.push("/")
      return
    }
    fetchData()
  }, [userProfile, router])

  // 데이터 가져오기
  const fetchData = async () => {
    try {
      setIsLoading(true)

      // 시즌 가져오기
      const seasonsRef = collection(db, "seasons")
      const seasonsQuery = query(seasonsRef, orderBy("createdAt", "desc"))
      const seasonsSnapshot = await getDocs(seasonsQuery)

      const seasonsData: Season[] = []
      seasonsSnapshot.forEach((doc) => {
        const data = doc.data()
        seasonsData.push({
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
          startDate: data.startDate,
          endDate: data.endDate,
          isActive: data.isActive || false,
          isDefault: data.isDefault || false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          createdBy: data.createdBy || "",
          createdByName: data.createdByName || "",
          settings: data.settings || {
            allowWargameScoring: true,
            allowCtfScoring: true,
            allowCurriculumScoring: true,
            resetScoresOnStart: false,
            registrationRequired: false,
          },
          stats: data.stats || {
            totalParticipants: 0,
            totalChallenges: 0,
            totalSolves: 0,
            averageScore: 0,
            topScore: 0,
          },
        })
      })
      setSeasons(seasonsData)

      // 참가자 가져오기 (활성 시즌)
      const activeSeason = seasonsData.find((s) => s.isActive)
      if (activeSeason) {
        const participantsRef = collection(db, "season_participants")
        const participantsQuery = query(
          participantsRef,
          where("seasonId", "==", activeSeason.id),
          orderBy("totalScore", "desc"),
        )
        const participantsSnapshot = await getDocs(participantsQuery)

        const participantsData: SeasonParticipant[] = []
        participantsSnapshot.forEach((doc, index) => {
          const data = doc.data()
          participantsData.push({
            id: doc.id,
            seasonId: data.seasonId || "",
            userId: data.userId || "",
            userName: data.userName || "",
            userEmail: data.userEmail || "",
            joinedAt: data.joinedAt,
            totalScore: data.totalScore || 0,
            rank: index + 1,
            isActive: data.isActive || true,
          })
        })
        setParticipants(participantsData)
      }
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        title: "데이터 로딩 오류",
        description: `데이터를 불러오지 못했습니다: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 시즌 생성
  const handleCreateSeason = async () => {
    if (!newSeason.name.trim() || !newSeason.startDate || !newSeason.endDate) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 올바르게 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      await addDoc(collection(db, "seasons"), {
        name: newSeason.name,
        description: newSeason.description,
        startDate: new Date(newSeason.startDate),
        endDate: new Date(newSeason.endDate),
        isActive: newSeason.isActive,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user?.uid,
        createdByName: userProfile?.displayName || "관리자",
        settings: {
          allowWargameScoring: true,
          allowCtfScoring: true,
          allowCurriculumScoring: true,
          resetScoresOnStart: false,
          registrationRequired: false,
        },
        stats: {
          totalParticipants: 0,
          totalChallenges: 0,
          totalSolves: 0,
          averageScore: 0,
          topScore: 0,
        },
      })

      toast({
        title: "시즌 생성 완료",
        description: `${newSeason.name} 시즌이 생성되었습니다.`,
      })

      fetchData()
      setCreateDialogOpen(false)
      setNewSeason({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        isActive: false,
      })
    } catch (error: any) {
      console.error("Error creating season:", error)
      toast({
        title: "시즌 생성 오류",
        description: `시즌을 생성하지 못했습니다: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // 시즌 삭제
  const handleDeleteSeason = async () => {
    if (!seasonToDelete) return

    try {
      await deleteDoc(doc(db, "seasons", seasonToDelete))
      setSeasons(seasons.filter((s) => s.id !== seasonToDelete))

      toast({
        title: "시즌 삭제 완료",
        description: "시즌이 삭제되었습니다.",
      })
    } catch (error: any) {
      console.error("Error deleting season:", error)
      toast({
        title: "시즌 삭제 오류",
        description: `시즌을 삭제하지 못했습니다: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setSeasonToDelete(null)
    }
  }

  // 시즌 활성화/비활성화
  const toggleSeasonStatus = async (seasonId: string, currentStatus: boolean) => {
    try {
      // 다른 시즌들을 비활성화
      if (!currentStatus) {
        const batch = seasons.map((season) => {
          if (season.id !== seasonId && season.isActive) {
            return updateDoc(doc(db, "seasons", season.id), { isActive: false })
          }
          return Promise.resolve()
        })
        await Promise.all(batch)
      }

      // 현재 시즌 상태 변경
      await updateDoc(doc(db, "seasons", seasonId), {
        isActive: !currentStatus,
        updatedAt: new Date(),
      })

      toast({
        title: `시즌 ${!currentStatus ? "활성화" : "비활성화"} 완료`,
        description: `시즌이 ${!currentStatus ? "활성화" : "비활성화"}되었습니다.`,
      })

      fetchData()
    } catch (error: any) {
      console.error("Error toggling season status:", error)
      toast({
        title: "상태 변경 오류",
        description: `상태를 변경하지 못했습니다: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // 날짜 포맷
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 정보 없음"
    try {
      const date = timestamp.toDate()
      return format(date, "yyyy.MM.dd", { locale: ko })
    } catch (error) {
      return "날짜 정보 오류"
    }
  }

  // 시즌 상태 확인
  const getSeasonStatus = (season: Season) => {
    if (!season.startDate || !season.endDate) return "설정 필요"

    const now = new Date()
    const start = season.startDate.toDate()
    const end = season.endDate.toDate()

    if (now < start) return "예정"
    if (now > end) return "종료"
    return "진행중"
  }

  // 검색 필터링
  const filteredSeasons = seasons.filter(
    (season) =>
      season.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      season.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (!isAdmin(userProfile)) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">시즌 데이터를 불러오는 중입니다...</p>
              </div>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">시즌 관리</h1>
                <p className="text-muted-foreground mt-1">CTF 시즌을 생성하고 관리합니다.</p>
              </div>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />새 시즌 생성
            </Button>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="seasons">시즌 목록</TabsTrigger>
              <TabsTrigger value="participants">참가자</TabsTrigger>
              <TabsTrigger value="statistics">통계</TabsTrigger>
            </TabsList>

            <TabsContent value="seasons" className="space-y-4">
              {/* 검색 */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="시즌 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 시즌 목록 */}
              <Card>
                <CardHeader>
                  <CardTitle>시즌 목록</CardTitle>
                  <CardDescription>생성된 모든 시즌을 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredSeasons.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>시즌명</TableHead>
                          <TableHead>기간</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>참가자</TableHead>
                          <TableHead>활성화</TableHead>
                          <TableHead>생성일</TableHead>
                          <TableHead>작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSeasons.map((season) => (
                          <TableRow key={season.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{season.name}</div>
                                <div className="text-sm text-muted-foreground">{season.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{formatDate(season.startDate)}</div>
                                <div className="text-muted-foreground">~ {formatDate(season.endDate)}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  getSeasonStatus(season) === "진행중"
                                    ? "default"
                                    : getSeasonStatus(season) === "예정"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {getSeasonStatus(season)}
                              </Badge>
                            </TableCell>
                            <TableCell>{season.stats.totalParticipants}</TableCell>
                            <TableCell>
                              <Switch
                                checked={season.isActive}
                                onCheckedChange={() => toggleSeasonStatus(season.id, season.isActive)}
                              />
                            </TableCell>
                            <TableCell>{formatDate(season.createdAt)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>시즌 관리</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => router.push(`/admin/seasons/edit/${season.id}`)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    수정
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/admin/seasons/${season.id}/participants`)}
                                  >
                                    <Users className="mr-2 h-4 w-4" />
                                    참가자 관리
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => {
                                      setSeasonToDelete(season.id)
                                      setDeleteDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">시즌이 없습니다</h3>
                      <p className="text-muted-foreground mt-2">
                        {searchQuery
                          ? "검색 조건에 맞는 시즌이 없습니다. 다른 검색어로 시도해보세요."
                          : "아직 생성된 시즌이 없습니다."}
                      </p>
                      <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
                        <Plus className="mr-2 h-4 w-4" />새 시즌 생성
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="participants" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>시즌 참가자</CardTitle>
                  <CardDescription>현재 활성 시즌의 참가자 목록</CardDescription>
                </CardHeader>
                <CardContent>
                  {participants.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>순위</TableHead>
                          <TableHead>사용자</TableHead>
                          <TableHead>점수</TableHead>
                          <TableHead>참가일</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map((participant) => (
                          <TableRow key={participant.id}>
                            <TableCell className="font-medium">#{participant.rank}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{participant.userName}</div>
                                <div className="text-sm text-muted-foreground">{participant.userEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-bold">{participant.totalScore}</TableCell>
                            <TableCell>{formatDate(participant.joinedAt)}</TableCell>
                            <TableCell>
                              <Badge variant={participant.isActive ? "default" : "outline"}>
                                {participant.isActive ? "활성" : "비활성"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">참가자가 없습니다</h3>
                      <p className="text-muted-foreground mt-2">현재 활성 시즌에 참가한 사용자가 없습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4">
              {/* 통계 카드 */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 시즌</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{seasons.length}</div>
                    <p className="text-xs text-muted-foreground">생성된 시즌</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">활성 시즌</CardTitle>
                    <Play className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{seasons.filter((s) => s.isActive).length}</div>
                    <p className="text-xs text-muted-foreground">현재 진행중</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 참가자</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {seasons.reduce((sum, season) => sum + season.stats.totalParticipants, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">전체 참가자</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {participants.length > 0
                        ? Math.round(participants.reduce((sum, p) => sum + p.totalScore, 0) / participants.length)
                        : 0}
                    </div>
                    <p className="text-xs text-muted-foreground">현재 시즌</p>
                  </CardContent>
                </Card>
              </div>

              {/* 시즌별 통계 */}
              <Card>
                <CardHeader>
                  <CardTitle>시즌별 통계</CardTitle>
                  <CardDescription>각 시즌의 상세 통계</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시즌명</TableHead>
                        <TableHead>참가자</TableHead>
                        <TableHead>챌린지</TableHead>
                        <TableHead>해결</TableHead>
                        <TableHead>평균 점수</TableHead>
                        <TableHead>최고 점수</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seasons.map((season) => (
                        <TableRow key={season.id}>
                          <TableCell className="font-medium">{season.name}</TableCell>
                          <TableCell>{season.stats.totalParticipants}</TableCell>
                          <TableCell>{season.stats.totalChallenges}</TableCell>
                          <TableCell>{season.stats.totalSolves}</TableCell>
                          <TableCell>{Math.round(season.stats.averageScore)}</TableCell>
                          <TableCell>{season.stats.topScore}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* 시즌 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 시즌 생성</DialogTitle>
            <DialogDescription>새로운 CTF 시즌을 생성합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">시즌명</Label>
              <Input
                id="name"
                value={newSeason.name}
                onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                placeholder="시즌 이름을 입력하세요"
              />
            </div>
            <div>
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={newSeason.description}
                onChange={(e) => setNewSeason({ ...newSeason, description: e.target.value })}
                placeholder="시즌 설명을 입력하세요"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">시작일</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={newSeason.startDate}
                  onChange={(e) => setNewSeason({ ...newSeason, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">종료일</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={newSeason.endDate}
                  onChange={(e) => setNewSeason({ ...newSeason, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={newSeason.isActive}
                onCheckedChange={(checked) => setNewSeason({ ...newSeason, isActive: checked })}
              />
              <Label htmlFor="isActive">생성 후 즉시 활성화</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateSeason}>생성</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 시즌 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>시즌 삭제</DialogTitle>
            <DialogDescription>이 작업은 되돌릴 수 없습니다. 정말로 이 시즌을 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteSeason}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
