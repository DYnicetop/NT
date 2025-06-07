"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User,
  AlertCircle,
  Loader2,
  Info,
  CheckCircle2,
  XCircle,
  Mail,
  Building,
  BadgeCheck,
  Plus,
  Trash2,
  Calendar,
  Edit,
  Save,
  Clock,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { doc, updateDoc, getFirestore, Timestamp, arrayUnion, arrayRemove } from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"
import type { Affiliation } from "@/lib/user-types"

export default function ProfilePage() {
  const { user, userProfile, updateUserProfile, checkUsernameExists, checkEmailExists } = useAuth()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 계정 정보 상태
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // 프로필 정보 상태
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [website, setWebsite] = useState("")

  // 소속 정보 관련 상태
  const [affiliations, setAffiliations] = useState<Affiliation[]>([])
  const [isRequestingVerification, setIsRequestingVerification] = useState(false)

  // 새 소속 추가 다이얼로그 상태
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newAffiliation, setNewAffiliation] = useState({
    name: "",
    department: "",
    startDate: "",
    endDate: "",
  })

  // 소속 편집 상태
  const [editingAffiliationId, setEditingAffiliationId] = useState<string | null>(null)
  const [editedAffiliation, setEditedAffiliation] = useState({
    name: "",
    department: "",
    startDate: "",
    endDate: "",
  })

  // 프로필 이미지 상태
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [photoURL, setPhotoURL] = useState("")

  // 유효성 검사 상태
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordFeedback, setPasswordFeedback] = useState("")

  // 사용자 정보가 변경될 때 상태 업데이트
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "")
      setEmail(user.email || "")
      setPreviewImage(user.photoURL || null)
      setPhotoURL(user.photoURL || "")
    }

    if (userProfile) {
      setBio(userProfile.bio || "")
      setLocation(userProfile.location || "")
      setWebsite(userProfile.website || "")
      setAffiliations(userProfile.affiliations || [])

      // photoURL이 있고 previewImage가 없는 경우에만 설정
      if (userProfile.photoURL && !user?.photoURL) {
        setPreviewImage(userProfile.photoURL)
        setPhotoURL(userProfile.photoURL)
      }
    }
  }, [user, userProfile])

  // 사용자 이름 유효성 검사 함수를 수정합니다
  const validateUsername = async (username: string) => {
    if (!username || username === user?.displayName) {
      setUsernameValid(null)
      return
    }

    // 사용자 이름 형식 검사
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    if (!usernameRegex.test(username)) {
      setUsernameValid(false)
      setError("사용자 이름은 3-20자의 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있습니다.")
      return
    }

    try {
      const exists = await checkUsernameExists(username)
      if (exists) {
        setUsernameValid(false)
        setError("이미 사용 중인 사용자 이름입니다. 다른 사용자 이름을 선택해주세요.")
        return
      }
      setUsernameValid(true)
      setError("") // 에러 메시지 초기화
    } catch (error) {
      console.error("Username validation error:", error)
      setUsernameValid(null)
    }
  }

  // 이메일 유효성 검사
  const validateEmail = async (email: string) => {
    if (!email || email === user?.email) {
      setEmailValid(null)
      return
    }

    // 이메일 형식 검사
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      setEmailValid(false)
      return
    }

    try {
      const exists = await checkEmailExists(email)
      setEmailValid(!exists)
    } catch (error) {
      console.error("Email validation error:", error)
      setEmailValid(null)
    }
  }

  // 비밀번호 강도 검사
  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(0)
      setPasswordFeedback("")
      return
    }

    let strength = 0
    let feedback = ""

    // 길이 검사
    if (password.length >= 8) strength += 1

    // 대문자 포함 검사
    if (/[A-Z]/.test(password)) strength += 1

    // 소문자 포함 검사
    if (/[a-z]/.test(password)) strength += 1

    // 숫자 포함 검사
    if (/[0-9]/.test(password)) strength += 1

    // 특수문자 포함 검사
    if (/[^A-Za-z0-9]/.test(password)) strength += 1

    // 피드백 설정
    if (strength === 0) {
      feedback = "비밀번호를 입력하세요"
    } else if (strength <= 2) {
      feedback = "매우 약한 비밀번호"
    } else if (strength === 3) {
      feedback = "보통 수준의 비밀번호"
    } else if (strength === 4) {
      feedback = "강한 비밀번호"
    } else {
      feedback = "매우 강한 비밀번호"
    }

    setPasswordStrength(strength)
    setPasswordFeedback(feedback)
  }

  // 프로필 정보 업데이트 핸들러
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      await updateUserProfile({
        bio,
        location,
        website,
        photoURL,
      })
      setSuccess("프로필 정보가 성공적으로 업데이트되었습니다.")
    } catch (error: any) {
      setError(error.message || "프로필 정보 업데이트 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 새 소속 추가 핸들러
  const handleAddAffiliation = async () => {
    if (!user || !newAffiliation.name) return

    setIsLoading(true)
    setError("")

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", user.uid)

      const newAffiliationData: Affiliation = {
        id: uuidv4(),
        name: newAffiliation.name,
        department: newAffiliation.department || undefined,
        startDate: newAffiliation.startDate || undefined,
        endDate: newAffiliation.endDate || undefined,
        isVerified: false,
      }

      await updateDoc(userRef, {
        affiliations: arrayUnion(newAffiliationData),
      })

      // 로컬 상태 업데이트
      setAffiliations([...affiliations, newAffiliationData])
      setSuccess("소속 정보가 추가되었습니다.")

      // 입력 필드 초기화
      setNewAffiliation({
        name: "",
        department: "",
        startDate: "",
        endDate: "",
      })

      // 다이얼로그 닫기
      setShowAddDialog(false)
    } catch (error: any) {
      setError(error.message || "소속 정보 추가 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 소속 삭제 핸들러
  const handleDeleteAffiliation = async (affiliationId: string) => {
    if (!user) return

    setIsLoading(true)
    setError("")

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", user.uid)

      // 삭제할 소속 찾기
      const affiliationToDelete = affiliations.find((aff) => aff.id === affiliationId)

      if (affiliationToDelete) {
        await updateDoc(userRef, {
          affiliations: arrayRemove(affiliationToDelete),
        })

        // 로컬 상태 업데이트
        setAffiliations(affiliations.filter((aff) => aff.id !== affiliationId))
        setSuccess("소속 정보가 삭제되었습니다.")
      }
    } catch (error: any) {
      setError(error.message || "소속 정보 삭제 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 소속 편집 시작 핸들러
  const handleStartEdit = (affiliation: Affiliation) => {
    setEditingAffiliationId(affiliation.id)
    setEditedAffiliation({
      name: affiliation.name,
      department: affiliation.department || "",
      startDate: affiliation.startDate || "",
      endDate: affiliation.endDate || "",
    })
  }

  // 소속 편집 저장 핸들러
  const handleSaveEdit = async () => {
    if (!user || !editingAffiliationId) return

    setIsLoading(true)
    setError("")

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", user.uid)

      // 기존 소속 배열에서 편집 중인 소속 찾기
      const updatedAffiliations = affiliations.map((aff) => {
        if (aff.id === editingAffiliationId) {
          return {
            ...aff,
            name: editedAffiliation.name,
            department: editedAffiliation.department || undefined,
            startDate: editedAffiliation.startDate || undefined,
            endDate: editedAffiliation.endDate || undefined,
            // 소속 이름이 변경되었다면 인증 상태 초기화
            isVerified: aff.name === editedAffiliation.name ? aff.isVerified : false,
            verificationRequestDate: aff.name === editedAffiliation.name ? aff.verificationRequestDate : undefined,
            verifiedBy: aff.name === editedAffiliation.name ? aff.verifiedBy : undefined,
            verifiedAt: aff.name === editedAffiliation.name ? aff.verifiedAt : undefined,
          }
        }
        return aff
      })

      // Firestore 업데이트
      await updateDoc(userRef, {
        affiliations: updatedAffiliations,
      })

      // 로컬 상태 업데이트
      setAffiliations(updatedAffiliations)
      setSuccess("소속 정보가 업데이트되었습니다.")

      // 편집 모드 종료
      setEditingAffiliationId(null)
    } catch (error: any) {
      setError(error.message || "소속 정보 업데이트 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 인증 요청 핸들러
  const handleVerificationRequest = async (affiliationId: string) => {
    if (!user) return

    setIsRequestingVerification(true)
    setError("")

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", user.uid)

      // 인증 요청할 소속 찾기 및 업데이트
      const updatedAffiliations = affiliations.map((aff) => {
        if (aff.id === affiliationId) {
          return {
            ...aff,
            verificationRequestDate: Timestamp.now(),
          }
        }
        return aff
      })

      // Firestore 업데이트
      await updateDoc(userRef, {
        affiliations: updatedAffiliations,
      })

      // 로컬 상태 업데이트
      setAffiliations(updatedAffiliations)
      setSuccess("인증 요청이 성공적으로 제출되었습니다. 관리자가 검토 후 인증을 완료할 것입니다.")

      // 관리자에게 알림 보내기
      try {
        const requestedAffiliation = affiliations.find((aff) => aff.id === affiliationId)
        if (requestedAffiliation) {
          // 관리자에게 알림 보내기
          import("@/lib/notification-utils").then(({ sendNotificationToAllAdmins }) => {
            sendNotificationToAllAdmins(
              "verification",
              "새로운 소속 인증 요청",
              `${user.displayName || "사용자"}님이 '${requestedAffiliation.name}' 소속 인증을 요청했습니다.`,
              "/admin/verifications",
              "high",
            )
          })
        }
      } catch (notificationError) {
        console.error("알림 전송 오류:", notificationError)
        // 알림 전송 실패해도 인증 요청은 성공한 것으로 처리
      }
    } catch (error: any) {
      setError(error.message || "인증 요청 중 오류가 발생했습니다.")
    } finally {
      setIsRequestingVerification(false)
    }
  }

  // 계정 정보 업데이트 핸들러
  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword && newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.")
      return
    }

    if (newPassword && passwordStrength < 3) {
      setError("더 강력한 비밀번호를 사용해주세요.")
      return
    }

    if (newPassword && !currentPassword) {
      setError("비밀번호를 변경하려면 현재 비밀번호를 입력해야 합니다.")
      return
    }

    setIsLoading(true)

    try {
      await updateUserProfile({
        displayName,
        currentPassword,
        newPassword,
      })
      setSuccess("계정 정보가 성공적으로 업데이트되었습니다.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      setError(error.message || "계정 정보 업데이트 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 인증 상태 텍스트 가져오기
  const getVerificationStatusText = (affiliation: Affiliation) => {
    if (affiliation.isVerified) {
      return "인증됨"
    } else if (affiliation.verificationRequestDate) {
      return "인증 요청 처리 중"
    } else {
      return "미인증"
    }
  }

  // 인증 상태 배지 색상 가져오기
  const getVerificationBadgeClass = (affiliation: Affiliation) => {
    if (affiliation.isVerified) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    } else if (affiliation.verificationRequestDate) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    } else {
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">프로필 관리</h1>
            <p className="text-muted-foreground mt-2">계정 정보와 프로필을 관리하고 업데이트하세요.</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="profile">프로필 정보</TabsTrigger>
              <TabsTrigger value="affiliations">경력 및 학력</TabsTrigger>
              <TabsTrigger value="account">계정 정보</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="grid gap-8 md:grid-cols-3">
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>프로필 사진</CardTitle>
                    <CardDescription>프로필 사진 URL을 입력하세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-muted bg-muted">
                      {previewImage ? (
                        <img
                          src={previewImage || "/placeholder.svg"}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-20 w-20 text-muted-foreground/60" />
                        </div>
                      )}
                    </div>
                    <div className="w-full mt-4 space-y-2">
                      <Label htmlFor="photoURL">이미지 URL</Label>
                      <Input
                        id="photoURL"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={photoURL}
                        onChange={(e) => {
                          setPhotoURL(e.target.value)
                          setPreviewImage(e.target.value)
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        <Info className="inline h-3 w-3 mr-1" />
                        이미지 URL을 입력하세요. (JPG, PNG, GIF, WEBP 형식 지원)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>프로필 정보</CardTitle>
                    <CardDescription>다른 사용자에게 표시될 프로필 정보를 업데이트하세요.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="mb-6 border-green-500 text-green-500">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="bio">자기소개</Label>
                        <Textarea
                          id="bio"
                          placeholder="자신에 대해 간단히 소개해주세요"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={4}
                          maxLength={500}
                        />
                        <p className="text-xs text-right text-muted-foreground">{bio.length}/500</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">위치</Label>
                        <Input
                          id="location"
                          placeholder="서울, 대한민국"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          maxLength={100}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">웹사이트</Label>
                        <Input
                          id="website"
                          placeholder="https://example.com"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          maxLength={100}
                        />
                        <p className="text-xs text-muted-foreground">
                          <Info className="inline h-3 w-3 mr-1" />
                          https:// 없이 입력하면 자동으로 추가됩니다.
                        </p>
                      </div>

                      <Button type="submit" className="mt-4" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            업데이트 중...
                          </>
                        ) : (
                          "프로필 업데이트"
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="affiliations">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>경력 및 학력</CardTitle>
                    <CardDescription>소속 기관, 학교, 회사 등의 정보를 관리하세요.</CardDescription>
                  </div>
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-1">
                        <Plus className="h-4 w-4" />
                        소속 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>소속 정보 추가</DialogTitle>
                        <DialogDescription>소속 기관, 학교, 회사 등의 정보를 입력하세요.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="affiliation-name">소속 이름 *</Label>
                          <Input
                            id="affiliation-name"
                            placeholder="예: 덕영고등학교"
                            value={newAffiliation.name}
                            onChange={(e) => setNewAffiliation({ ...newAffiliation, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="affiliation-department">부서/학과</Label>
                          <Input
                            id="affiliation-department"
                            placeholder="예: 정보보안소프트웨어과"
                            value={newAffiliation.department}
                            onChange={(e) => setNewAffiliation({ ...newAffiliation, department: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="affiliation-start">시작일</Label>
                            <Input
                              id="affiliation-start"
                              placeholder="예: 2024.3"
                              value={newAffiliation.startDate}
                              onChange={(e) => setNewAffiliation({ ...newAffiliation, startDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="affiliation-end">종료일</Label>
                            <Input
                              id="affiliation-end"
                              placeholder="예: 2027.2 (현재 진행 중이면 비워두세요)"
                              value={newAffiliation.endDate}
                              onChange={(e) => setNewAffiliation({ ...newAffiliation, endDate: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                          취소
                        </Button>
                        <Button onClick={handleAddAffiliation} disabled={!newAffiliation.name || isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              추가 중...
                            </>
                          ) : (
                            "추가하기"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="mb-6 border-green-500 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  {affiliations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium mb-1">등록된 소속 정보가 없습니다</p>
                      <p className="text-muted-foreground">소속 정보를 추가하여 프로필을 완성하세요.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {affiliations.map((affiliation) => (
                        <Card key={affiliation.id} className="overflow-hidden">
                          {editingAffiliationId === affiliation.id ? (
                            // 편집 모드
                            <CardContent className="p-4">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-name-${affiliation.id}`}>소속 이름 *</Label>
                                  <Input
                                    id={`edit-name-${affiliation.id}`}
                                    value={editedAffiliation.name}
                                    onChange={(e) =>
                                      setEditedAffiliation({ ...editedAffiliation, name: e.target.value })
                                    }
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-department-${affiliation.id}`}>부서/학과</Label>
                                  <Input
                                    id={`edit-department-${affiliation.id}`}
                                    value={editedAffiliation.department}
                                    onChange={(e) =>
                                      setEditedAffiliation({ ...editedAffiliation, department: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`edit-start-${affiliation.id}`}>시작일</Label>
                                    <Input
                                      id={`edit-start-${affiliation.id}`}
                                      value={editedAffiliation.startDate}
                                      onChange={(e) =>
                                        setEditedAffiliation({ ...editedAffiliation, startDate: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`edit-end-${affiliation.id}`}>종료일</Label>
                                    <Input
                                      id={`edit-end-${affiliation.id}`}
                                      value={editedAffiliation.endDate}
                                      onChange={(e) =>
                                        setEditedAffiliation({ ...editedAffiliation, endDate: e.target.value })
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                  <Button variant="outline" onClick={() => setEditingAffiliationId(null)}>
                                    취소
                                  </Button>
                                  <Button onClick={handleSaveEdit} disabled={!editedAffiliation.name || isLoading}>
                                    {isLoading ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        저장 중...
                                      </>
                                    ) : (
                                      <>
                                        <Save className="mr-2 h-4 w-4" />
                                        저장하기
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          ) : (
                            // 보기 모드
                            <>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center">
                                      <h3 className="text-lg font-semibold">{affiliation.name}</h3>
                                      {affiliation.isVerified && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <BadgeCheck className="ml-2 h-5 w-5 text-green-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>인증된 소속입니다</p>
                                              {affiliation.verifiedAt && (
                                                <p className="text-xs mt-1">
                                                  {new Date(affiliation.verifiedAt.toDate()).toLocaleDateString()}{" "}
                                                  인증됨
                                                </p>
                                              )}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </div>
                                    {affiliation.department && (
                                      <p className="text-muted-foreground">{affiliation.department}</p>
                                    )}
                                    {(affiliation.startDate || affiliation.endDate) && (
                                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                                        <Calendar className="h-3.5 w-3.5 mr-1" />
                                        <span>
                                          {affiliation.startDate || ""}
                                          {affiliation.startDate && affiliation.endDate ? " - " : ""}
                                          {affiliation.endDate || (affiliation.startDate ? " 현재" : "")}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleStartEdit(affiliation)}
                                      disabled={isLoading}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                      onClick={() => handleDeleteAffiliation(affiliation.id)}
                                      disabled={isLoading}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {/* 인증 상태 표시 - 항상 표시되도록 수정 */}
                                <div className="mt-3">
                                  <Badge variant="outline" className={getVerificationBadgeClass(affiliation)}>
                                    {affiliation.isVerified ? (
                                      <>
                                        <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                                        인증됨
                                      </>
                                    ) : affiliation.verificationRequestDate ? (
                                      <>
                                        <Clock className="mr-1 h-3.5 w-3.5" />
                                        인증 요청 처리 중
                                      </>
                                    ) : (
                                      <>미인증</>
                                    )}
                                  </Badge>

                                  {affiliation.isVerified && affiliation.verifiedAt && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {new Date(affiliation.verifiedAt.toDate()).toLocaleDateString()}에 인증됨
                                    </span>
                                  )}

                                  {affiliation.verificationRequestDate && !affiliation.isVerified && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {new Date(affiliation.verificationRequestDate.toDate()).toLocaleDateString()}에
                                      요청됨
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                              {!affiliation.isVerified && (
                                <CardFooter className="bg-muted/50 px-4 py-2 flex justify-between items-center">
                                  {affiliation.verificationRequestDate ? (
                                    <span className="text-xs text-amber-500 flex items-center">
                                      <Info className="h-3.5 w-3.5 mr-1" />
                                      관리자가 인증 요청을 검토 중입니다
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">인증되지 않은 소속입니다</span>
                                  )}
                                  {!affiliation.verificationRequestDate && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                      onClick={() => handleVerificationRequest(affiliation.id)}
                                      disabled={isRequestingVerification}
                                    >
                                      {isRequestingVerification ? (
                                        <>
                                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                          요청 중...
                                        </>
                                      ) : (
                                        <>
                                          <BadgeCheck className="mr-2 h-3.5 w-3.5" />
                                          인증 요청
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </CardFooter>
                              )}
                            </>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>계정 정보</CardTitle>
                  <CardDescription>이름, 이메일, 비밀번호와 같은 계정 정보를 업데이트하세요.</CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="mb-6 border-green-500 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleAccountUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">이름</Label>
                      <div className="relative">
                        <Input
                          id="displayName"
                          placeholder="이름"
                          value={displayName}
                          onChange={(e) => {
                            setDisplayName(e.target.value)
                            validateUsername(e.target.value)
                          }}
                          className={
                            usernameValid === false
                              ? "border-red-500 pr-10"
                              : usernameValid === true
                                ? "border-green-500 pr-10"
                                : ""
                          }
                          maxLength={20}
                        />
                        {usernameValid !== null && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            {usernameValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <Info className="inline h-3 w-3 mr-1" />
                        3-20자의 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있습니다.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">이메일</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          className="pl-10 rounded-lg bg-muted"
                          disabled={true}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <Info className="inline h-3 w-3 mr-1" />
                        이메일은 변경할 수 없습니다. 변경이 필요한 경우 관리자에게 문의하세요.
                      </p>
                    </div>

                    <Separator className="my-4" />

                    <div>
                      <h3 className="mb-4 text-sm font-medium">비밀번호 변경</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">현재 비밀번호</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            <Info className="inline h-3 w-3 mr-1" />
                            이메일 또는 비밀번호를 변경하려면 현재 비밀번호를 입력해야 합니다.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newPassword">새 비밀번호</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value)
                              checkPasswordStrength(e.target.value)
                            }}
                          />
                          {newPassword && (
                            <>
                              <Progress value={passwordStrength * 20} className="h-1" />
                              <p
                                className={`text-xs ${
                                  passwordStrength <= 2
                                    ? "text-red-500"
                                    : passwordStrength === 3
                                      ? "text-yellow-500"
                                      : "text-green-500"
                                }`}
                              >
                                {passwordFeedback}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <Info className="inline h-3 w-3 mr-1" />
                                비밀번호는 최소 8자 이상이며, 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.
                              </p>
                            </>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className={
                                confirmPassword && newPassword !== confirmPassword
                                  ? "border-red-500 pr-10"
                                  : confirmPassword && newPassword === confirmPassword
                                    ? "border-green-500 pr-10"
                                    : ""
                              }
                            />
                            {confirmPassword && (
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                {newPassword === confirmPassword ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            )}
                          </div>
                          {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="mt-4"
                      disabled={
                        isLoading ||
                        usernameValid === false ||
                        emailValid === false ||
                        (newPassword && newPassword !== confirmPassword)
                      }
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          업데이트 중...
                        </>
                      ) : (
                        "계정 정보 업데이트"
                      )}
                    </Button>
                  </form>
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
