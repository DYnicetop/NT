"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { isAdmin, isSuperAdmin } from "@/lib/admin-utils"
import {
  Users,
  Flag,
  Trophy,
  FileText,
  Settings,
  Bell,
  Shield,
  User,
  UserCog,
  LogOut,
  Award,
  Calendar,
  BookOpen,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

export default function AdminPage() {
  const { user, userProfile, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!isAdmin(userProfile)) {
      toast({
        title: "접근 권한이 없습니다",
        description: "관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/")
    }
  }, [user, userProfile, router, toast])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("로그아웃 오류:", error)
    }
  }

  if (!isAdmin(userProfile)) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">관리자 대시보드</h1>
              <p className="text-muted-foreground mt-2">
                {isSuperAdmin(userProfile) ? "최고 관리자" : "관리자"} 계정으로 로그인되었습니다.
              </p>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </Button>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="dashboard">대시보드</TabsTrigger>
              <TabsTrigger value="management">콘텐츠 관리</TabsTrigger>
              <TabsTrigger value="settings">설정</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">사용자 관리</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">사용자</div>
                    <p className="text-xs text-muted-foreground">사용자 계정 관리</p>
                    <div className="mt-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/admin/users">
                          <User className="mr-2 h-4 w-4" />
                          사용자 목록
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">점수 관리</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">점수</div>
                    <p className="text-xs text-muted-foreground">유저 점수 및 랭킹 관리</p>
                    <div className="mt-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/admin/scores">
                          <TrendingUp className="mr-2 h-4 w-4" />
                          점수 관리
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">시즌 관리</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">시즌</div>
                    <p className="text-xs text-muted-foreground">CTF 시즌 및 기간 관리</p>
                    <div className="mt-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/admin/seasons">
                          <Calendar className="mr-2 h-4 w-4" />
                          시즌 관리
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">커리큘럼 관리</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">커리큘럼</div>
                    <p className="text-xs text-muted-foreground">교육 콘텐츠 관리</p>
                    <div className="mt-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/admin/curriculum">
                          <BookOpen className="mr-2 h-4 w-4" />
                          커리큘럼 관리
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 최고 관리자만 볼 수 있는 관리자 관리 카드 */}
                {isSuperAdmin(userProfile) && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">관리자 관리</CardTitle>
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">관리자</div>
                      <p className="text-xs text-muted-foreground">관리자 권한 관리</p>
                      <div className="mt-4">
                        <Button asChild variant="outline" size="sm">
                          <Link href="/admin/users">
                            <UserCog className="mr-2 h-4 w-4" />
                            관리자 지정
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">워게임 관리</CardTitle>
                    <Flag className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">워게임</div>
                    <p className="text-xs text-muted-foreground">워게임 문제 관리</p>
                    <div className="mt-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/admin/wargame">
                          <Flag className="mr-2 h-4 w-4" />
                          워게임 관리
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">CTF 관리</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">CTF</div>
                    <p className="text-xs text-muted-foreground">CTF 대회 관리</p>
                    <div className="mt-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/admin/ctf">
                          <Trophy className="mr-2 h-4 w-4" />
                          CTF 관리
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="management" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>점수 관리</CardTitle>
                    <CardDescription>유저 점수 및 랭킹을 관리합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button asChild className="w-full">
                      <Link href="/admin/scores">
                        <Award className="mr-2 h-4 w-4" />
                        점수 관리
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/admin/scores/bulk">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        일괄 점수 수정
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>시즌 관리</CardTitle>
                    <CardDescription>CTF 시즌을 관리합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button asChild className="w-full">
                      <Link href="/admin/seasons">
                        <Calendar className="mr-2 h-4 w-4" />
                        시즌 관리
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/admin/seasons/create">
                        <Calendar className="mr-2 h-4 w-4" />새 시즌 생성
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>커리큘럼 관리</CardTitle>
                    <CardDescription>교육 콘텐츠를 관리합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button asChild className="w-full">
                      <Link href="/admin/curriculum">
                        <BookOpen className="mr-2 h-4 w-4" />
                        커리큘럼 관리
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/admin/curriculum/create">
                        <BookOpen className="mr-2 h-4 w-4" />새 커리큘럼 작성
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>워게임 관리</CardTitle>
                    <CardDescription>워게임 문제를 관리합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button asChild className="w-full">
                      <Link href="/admin/wargame">
                        <Flag className="mr-2 h-4 w-4" />
                        워게임 관리
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/admin/wargame/create">
                        <Flag className="mr-2 h-4 w-4" />
                        워게임 문제 생성
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>CTF 관리</CardTitle>
                    <CardDescription>CTF 대회를 관리합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button asChild className="w-full">
                      <Link href="/admin/ctf">
                        <Trophy className="mr-2 h-4 w-4" />
                        CTF 관리
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/admin/ctf/create">
                        <Trophy className="mr-2 h-4 w-4" />
                        CTF 대회 생성
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>커뮤니티 관리</CardTitle>
                    <CardDescription>커뮤니티 게시글을 관리합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button asChild className="w-full">
                      <Link href="/admin/community">
                        <FileText className="mr-2 h-4 w-4" />
                        커뮤니티 관리
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/admin/community/create">
                        <FileText className="mr-2 h-4 w-4" />
                        공지사항 작성
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>관리자 설정</CardTitle>
                  <CardDescription>관리자 계정 및 시스템 설정을 관리합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isSuperAdmin(userProfile) && (
                    <Button asChild className="w-full">
                      <Link href="/admin/users">
                        <UserCog className="mr-2 h-4 w-4" />
                        관리자 권한 관리
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/admin/verifications">
                      <Bell className="mr-2 h-4 w-4" />
                      인증 요청 관리
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/admin/reservations">
                      <Settings className="mr-2 h-4 w-4" />
                      예약 관리
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
