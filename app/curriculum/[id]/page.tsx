"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  Loader2,
  Lock,
  Play,
  Star,
  Users,
  Award,
  Target,
  Globe,
  Video,
  LinkIcon,
  FileText,
  BookmarkPlus,
} from "lucide-react"
import Link from "next/link"
import { doc, getDoc, updateDoc, increment, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Curriculum, CurriculumCategory, UserCurriculumProgress } from "@/lib/curriculum-types"
import { PasswordModal } from "@/components/password-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CurriculumDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
  const [category, setCategory] = useState<CurriculumCategory | null>(null)
  const [userProgress, setUserProgress] = useState<UserCurriculumProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState("curriculum")

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin"

  // 진행률 계산
  const completedSteps = userProgress?.completedSteps?.length || 0
  const totalSteps = curriculum?.steps?.length || 0
  const progressPercentage = totalSteps > 0 ? Math.min((completedSteps / totalSteps) * 100, 100) : 0

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-900/50 text-green-300 border-green-700"
      case "Medium":
        return "bg-yellow-900/50 text-yellow-300 border-yellow-700"
      case "Hard":
        return "bg-orange-900/50 text-orange-300 border-orange-700"
      case "Expert":
        return "bg-red-900/50 text-red-300 border-red-700"
      default:
        return "bg-gray-900/50 text-gray-300 border-gray-700"
    }
  }

  // 데이터 가져오기
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError("")

      const curriculumRef = doc(db, "curriculums", params.id)
      const curriculumSnap = await getDoc(curriculumRef)

      if (!curriculumSnap.exists()) {
        setError("존재하지 않는 커리큘럼입니다.")
        return
      }

      const curriculumData = curriculumSnap.data()

      if (!curriculumData.isPublished && !isAdmin) {
        setError("접근 권한이 없습니다.")
        return
      }

      const steps = curriculumData.steps || []
      const curriculum: Curriculum = {
        id: curriculumSnap.id,
        title: curriculumData.title || "",
        description: curriculumData.description || "",
        content: curriculumData.content || "",
        category: curriculumData.category || "",
        thumbnailUrl: curriculumData.thumbnailUrl,
        createdAt: curriculumData.createdAt || { toDate: () => new Date() },
        updatedAt: curriculumData.updatedAt || { toDate: () => new Date() },
        createdBy: curriculumData.createdBy || "",
        createdByName: curriculumData.createdByName || "",
        isPublished: curriculumData.isPublished || false,
        viewCount: curriculumData.viewCount || 0,
        tags: curriculumData.tags || [],
        password: curriculumData.password || "",
        isPasswordProtected: curriculumData.isPasswordProtected || false,
        steps: steps,
        totalSteps: steps.length,
        difficulty: curriculumData.difficulty || "Easy",
        estimatedTime: curriculumData.estimatedTime || "",
        prerequisites: curriculumData.prerequisites || [],
        learningObjectives: curriculumData.learningObjectives || [],
        instructor: curriculumData.instructor || "",
        courseType: curriculumData.courseType || "Skill Path",
        rating: curriculumData.rating || 4.5,
        enrollmentCount: curriculumData.enrollmentCount || 0,
      }

      setCurriculum(curriculum)

      // 카테고리 정보 가져오기
      if (curriculum.category) {
        try {
          const categoryRef = doc(db, "curriculum_categories", curriculum.category)
          const categorySnap = await getDoc(categoryRef)
          if (categorySnap.exists()) {
            setCategory({
              id: categorySnap.id,
              name: categorySnap.data().name || "",
              description: categorySnap.data().description || "",
              order: categorySnap.data().order || 0,
              createdAt: categorySnap.data().createdAt || { toDate: () => new Date() },
              updatedAt: categorySnap.data().updatedAt || { toDate: () => new Date() },
              createdBy: categorySnap.data().createdBy || "",
            })
          }
        } catch (categoryError) {
          console.error("Error fetching category:", categoryError)
        }
      }

      // 사용자 진행상황 가져오기
      if (user?.uid) {
        try {
          const progressRef = doc(db, "user_curriculum_progress", `${user.uid}_${params.id}`)
          const progressSnap = await getDoc(progressRef)

          if (progressSnap.exists()) {
            const progressData = progressSnap.data()
            setUserProgress({
              userId: progressData.userId,
              curriculumId: progressData.curriculumId,
              currentStep: progressData.currentStep || 0,
              completedSteps: progressData.completedSteps || [],
              lastAccessedAt: progressData.lastAccessedAt,
              startedAt: progressData.startedAt,
              completedAt: progressData.completedAt,
            })
          }
        } catch (progressError) {
          console.error("Error fetching progress:", progressError)
        }
      }

      // 조회수 증가
      if (user?.uid) {
        try {
          const userViewsRef = doc(db, "user_curriculum_views", user.uid)
          const userViewsSnap = await getDoc(userViewsRef)

          let viewedCurriculums = []
          let shouldIncrement = false

          if (userViewsSnap.exists()) {
            viewedCurriculums = userViewsSnap.data().viewedCurriculums || []
            if (!viewedCurriculums.includes(params.id)) {
              shouldIncrement = true
              viewedCurriculums.push(params.id)
            }
          } else {
            shouldIncrement = true
            viewedCurriculums = [params.id]
          }

          if (shouldIncrement) {
            await setDoc(
              userViewsRef,
              {
                viewedCurriculums,
                updatedAt: new Date(),
              },
              { merge: true },
            )

            await updateDoc(curriculumRef, {
              viewCount: increment(1),
            })
          }
        } catch (viewError) {
          console.error("Error updating view count:", viewError)
        }
      }
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError("데이터를 불러오는 중 오류가 발생했습니다.")
      toast({
        title: "데이터 로딩 오류",
        description: `커리큘럼을 불러오지 못했습니다: ${error.message || "알 수 없는 오류"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 비밀번호 확인
  const verifyPassword = (enteredPassword: string) => {
    if (curriculum && curriculum.password === enteredPassword) {
      setPasswordVerified(true)
      setShowPasswordModal(false)
      sessionStorage.setItem(`curriculum_${params.id}_verified`, "true")
    } else {
      setPasswordError("비밀번호가 일치하지 않습니다.")
    }
  }

  // 단계 시작
  const startStep = (stepIndex: number) => {
    router.push(`/curriculum/${params.id}/step/${stepIndex}`)
  }

  // 단위 확장/축소 토글
  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits)
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId)
    } else {
      newExpanded.add(unitId)
    }
    setExpandedUnits(newExpanded)
  }

  // 모든 단계 확장/축소
  const toggleAllUnits = (expand: boolean) => {
    if (expand) {
      const allIds = curriculum?.steps?.map((step) => step.id) || []
      setExpandedUnits(new Set(allIds))
    } else {
      setExpandedUnits(new Set())
    }
  }

  const handleGoBack = () => {
    router.push("/curriculum")
  }

  // 등록하기 기능
  const enrollCurriculum = async () => {
    if (!user?.uid || !curriculum) return

    try {
      const progressRef = doc(db, "user_curriculum_progress", `${user.uid}_${params.id}`)
      const progressSnap = await getDoc(progressRef)

      const now = new Date()

      if (!progressSnap.exists()) {
        await setDoc(progressRef, {
          userId: user.uid,
          curriculumId: params.id,
          currentStep: 0,
          completedSteps: [],
          lastAccessedAt: now,
          startedAt: now,
        })

        // 등록자 수 증가
        await updateDoc(doc(db, "curriculums", params.id), {
          enrollmentCount: increment(1),
        })

        setUserProgress({
          userId: user.uid,
          curriculumId: params.id,
          currentStep: 0,
          completedSteps: [],
          lastAccessedAt: { toDate: () => now },
          startedAt: { toDate: () => now },
        })

        toast({
          title: "등록 완료",
          description: "커리큘럼에 성공적으로 등록되었습니다.",
        })
      }
    } catch (error: any) {
      console.error("Error enrolling:", error)
      toast({
        title: "등록 오류",
        description: "커리큘럼 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchData()
  }, [params.id, isAdmin, user])

  // 비밀번호 확인
  useEffect(() => {
    if (curriculum && curriculum.isPasswordProtected) {
      const isVerified = sessionStorage.getItem(`curriculum_${params.id}_verified`) === "true"

      if (isVerified) {
        setPasswordVerified(true)
      } else {
        if (isAdmin) {
          setPasswordVerified(true)
        } else {
          setShowPasswordModal(true)
        }
      }
    }
  }, [curriculum, params.id, isAdmin])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">커리큘럼을 불러오는 중입니다...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !curriculum) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-red-400 mb-2">{error || "커리큘럼을 찾을 수 없습니다."}</p>
            <div className="flex gap-4 mt-6 justify-center">
              <Button
                variant="outline"
                onClick={handleGoBack}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                뒤로 가기
              </Button>
              <Button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700">
                다시 시도
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {showPasswordModal && curriculum?.isPasswordProtected && (
        <PasswordModal onSubmit={verifyPassword} error={passwordError} />
      )}

      <Navbar />

      {curriculum.isPasswordProtected && !passwordVerified ? (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 mx-auto">
              <Lock className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">비밀번호 보호됨</h2>
            <p className="text-gray-400 text-center mt-2 mb-4">이 커리큘럼은 비밀번호로 보호되어 있습니다.</p>
            <Button onClick={() => setShowPasswordModal(true)} className="bg-blue-600 hover:bg-blue-700">
              비밀번호 입력하기
            </Button>
          </div>
        </main>
      ) : (
        <main className="flex-1">
          {/* 헤더 */}
          <div className="bg-gradient-to-b from-gray-900 to-black border-b border-gray-800">
            <div className="container mx-auto px-4 md:px-6 py-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                {/* 왼쪽: 커리큘럼 정보 */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleGoBack}
                      className="hover:bg-gray-800 text-gray-400 hover:text-white"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                      {category && <div className="text-sm text-blue-400 mb-1">{category.name}</div>}
                      <h1 className="text-3xl md:text-4xl font-bold text-white">{curriculum.title}</h1>
                    </div>
                  </div>

                  <p className="text-gray-300 text-lg mb-4">{curriculum.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={`${getDifficultyColor(curriculum.difficulty || "Easy")}`}>
                      {curriculum.difficulty || "Easy"}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-900/50 text-blue-300 border-blue-700">
                      {curriculum.courseType || "Skill Path"}
                    </Badge>
                    {curriculum.tags?.map((tag, index) => (
                      <Badge key={index} variant="outline" className="bg-gray-900/50 text-gray-300 border-gray-700">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 mb-6">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{curriculum.enrollmentCount || 0}명 수강</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span>{curriculum.rating || 4.5}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{curriculum.estimatedTime || `${curriculum.totalSteps}단계`}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{curriculum.totalSteps}개 단계</span>
                    </div>
                    {curriculum.instructor && (
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        <span>강사: {curriculum.instructor}</span>
                      </div>
                    )}
                  </div>

                  {/* 진행률 */}
                  {userProgress && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-200">학습 진행률</span>
                        <span className="text-sm text-gray-400">
                          {completedSteps} / {totalSteps} 완료 ({Math.round(progressPercentage)}%)
                        </span>
                      </div>
                      <div className="relative h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-4">
                    {userProgress ? (
                      <Button
                        onClick={() => startStep(userProgress.currentStep || 0)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {completedSteps > 0 ? "계속 학습하기" : "학습 시작하기"}
                      </Button>
                    ) : (
                      <Button
                        onClick={enrollCurriculum}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        <BookmarkPlus className="mr-2 h-4 w-4" />
                        등록하기
                      </Button>
                    )}
                    {isAdmin && (
                      <Link href={`/admin/curriculum/edit/${curriculum.id}`}>
                        <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                          <Edit className="mr-2 h-4 w-4" />
                          편집
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* 오른쪽: 썸네일 */}
                <div className="md:w-1/3 lg:w-1/4">
                  <div className="rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                    <img
                      src={curriculum.thumbnailUrl || "/placeholder.svg?height=200&width=400"}
                      alt={curriculum.title}
                      className="w-full h-auto object-cover aspect-video"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=200&width=400"
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 탭 메뉴 */}
          <div className="container mx-auto px-4 md:px-6 py-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-gray-900 border border-gray-800 mb-6">
                <TabsTrigger
                  value="curriculum"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  커리큘럼
                </TabsTrigger>
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  개요
                </TabsTrigger>
              </TabsList>

              <TabsContent value="curriculum" className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white">커리큘럼 내용</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAllUnits(true)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <ChevronDown className="mr-1 h-4 w-4" />
                      모두 펼치기
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAllUnits(false)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <ChevronUp className="mr-1 h-4 w-4" />
                      모두 접기
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {curriculum.steps?.map((step, index) => {
                    const isCompleted = userProgress?.completedSteps?.includes(index.toString()) || false
                    const isExpanded = expandedUnits.has(step.id)
                    const isCurrentStep = userProgress?.currentStep === index

                    return (
                      <Card
                        key={step.id}
                        className={`bg-gray-900 border-gray-800 overflow-hidden transition-all duration-200 ${
                          isCurrentStep ? "ring-2 ring-blue-500 ring-opacity-50" : ""
                        }`}
                      >
                        <div className="flex">
                          {/* 왼쪽: 상태 표시 */}
                          <div className="w-20 bg-gray-800 flex flex-col items-center justify-center p-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2">
                              {isCompleted ? (
                                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                                  <CheckCircle className="h-5 w-5 text-white" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                                  <span className="text-lg font-bold text-gray-300">{index + 1}</span>
                                </div>
                              )}
                            </div>
                            {isCompleted && (
                              <Badge className="bg-green-900/50 text-green-300 border-green-700">완료</Badge>
                            )}
                            {isCurrentStep && !isCompleted && (
                              <Badge className="bg-blue-900/50 text-blue-300 border-blue-700">현재</Badge>
                            )}
                          </div>

                          {/* 오른쪽: 내용 */}
                          <div className="flex-1 p-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xl font-bold text-white">{step.title}</h3>
                              <div className="flex items-center gap-2">
                                {step.duration && (
                                  <div className="text-sm text-gray-400 flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {step.duration}
                                  </div>
                                )}
                                <Collapsible open={isExpanded} onOpenChange={() => toggleUnit(step.id)}>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="hover:bg-gray-800">
                                      <ChevronDown
                                        className={`h-5 w-5 transition-transform text-gray-400 ${
                                          isExpanded ? "rotate-180" : ""
                                        }`}
                                      />
                                    </Button>
                                  </CollapsibleTrigger>
                                </Collapsible>
                              </div>
                            </div>

                            <Collapsible open={isExpanded} onOpenChange={() => toggleUnit(step.id)}>
                              <CollapsibleContent className="mt-4 space-y-4">
                                {/* 단계 내용 미리보기 */}
                                <div className="text-gray-300 line-clamp-3">
                                  {step.content ? (
                                    <div className="prose prose-invert max-w-none">
                                      {/* 내용 미리보기 - 실제 내용은 단계 페이지에서 보여줌 */}
                                      <p>이 단계에서는 {step.title}에 대해 학습합니다.</p>
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 italic">내용이 없습니다.</p>
                                  )}
                                </div>

                                {/* 비디오 및 리소스 */}
                                <div className="space-y-3">
                                  {step.videoUrl && (
                                    <div className="flex items-center gap-2 text-sm text-blue-400">
                                      <Video className="h-4 w-4" />
                                      <span>비디오 강의 포함</span>
                                    </div>
                                  )}

                                  {step.resources && step.resources.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium text-gray-300">추가 자료:</p>
                                      <ul className="space-y-1">
                                        {step.resources.map((resource, idx) => (
                                          <li key={idx} className="flex items-center gap-2 text-sm text-blue-400">
                                            <LinkIcon className="h-3 w-3" />
                                            <a
                                              href={resource}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="hover:underline"
                                            >
                                              {resource.length > 50 ? resource.substring(0, 50) + "..." : resource}
                                            </a>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                <div className="flex justify-end pt-2">
                                  <Button
                                    onClick={() => startStep(index)}
                                    className={`${
                                      isCompleted ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        다시 학습하기
                                      </>
                                    ) : (
                                      <>
                                        <Play className="mr-2 h-4 w-4" />
                                        학습하기
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 왼쪽: 학습 목표 및 선수 과목 */}
                  <div className="md:col-span-2 space-y-6">
                    {/* 학습 목표 */}
                    {curriculum.learningObjectives && curriculum.learningObjectives.length > 0 && (
                      <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-6">
                          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Target className="h-5 w-5 text-green-500" />
                            학습 목표
                          </h3>
                          <ul className="space-y-3">
                            {curriculum.learningObjectives.map((objective, index) => (
                              <li key={index} className="flex items-start gap-2 text-gray-300">
                                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{objective}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* 커리큘럼 내용 */}
                    {curriculum.content && (
                      <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-6">
                          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            커리큘럼 소개
                          </h3>
                          <div className="prose prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: curriculum.content }} />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* 오른쪽: 사이드바 정보 */}
                  <div className="space-y-6">
                    {/* 선수 과목 */}
                    {curriculum.prerequisites && curriculum.prerequisites.length > 0 && (
                      <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <Globe className="h-5 w-5 text-orange-500" />
                            선수 과목
                          </h3>
                          <div className="space-y-2">
                            {curriculum.prerequisites.map((prereq, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 rounded-md bg-gray-800 border border-gray-700"
                              >
                                <BookOpen className="h-4 w-4 text-orange-400" />
                                <span className="text-gray-300">{prereq}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* 태그 */}
                    {curriculum.tags && curriculum.tags.length > 0 && (
                      <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-bold text-white mb-3">태그</h3>
                          <div className="flex flex-wrap gap-2">
                            {curriculum.tags.map((tag, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="bg-gray-800 text-gray-300 border-gray-700"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* 강사 정보 */}
                    {curriculum.instructor && (
                      <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <Award className="h-5 w-5 text-yellow-500" />
                            강사 정보
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                              <Award className="h-6 w-6 text-yellow-500" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{curriculum.instructor}</p>
                              <p className="text-sm text-gray-400">전문 강사</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      )}
      <Footer />
    </div>
  )
}
