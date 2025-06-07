"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, Search, Shield, User, UserCheck, UserX, AlertCircle, Loader2 } from "lucide-react"
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { UserProfile } from "@/lib/user-types"

// 임포트 섹션에 추가할 컴포넌트들
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Affiliation } from "@/lib/user-types"
import { AlertTriangle, Ban, Clock, UserCog } from "lucide-react"
import { Label } from "@/components/ui/label"
import { getDoc } from "firebase/firestore"
import { isSuperAdmin } from "@/lib/admin-utils"

// 최고 관리자 이메일 (하드코딩)
const SUPER_ADMIN_EMAIL = "mistarcodm@gmail.com"

// 최고 관리자 체크 함수
// function isSuperAdmin(userProfile?: UserProfile | null): boolean {
//   if (!userProfile) return false
//   return userProfile.email === SUPER_ADMIN_EMAIL
// }

export default function UserManagementPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [admins, setAdmins] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isPromoting, setIsPromoting] = useState(false)
  const [isDemoting, setIsDemoting] = useState(false)
  const [showPromoteDialog, setShowPromoteDialog] = useState(false)
  const [showDemoteDialog, setShowDemoteDialog] = useState(false)
  const [currentTab, setCurrentTab] = useState("all")

  // UserManagementPage 컴포넌트 내부에 추가할 상태 변수들
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false)
  const [showTitleDialog, setShowTitleDialog] = useState(false)
  const [showAffiliationDialog, setShowAffiliationDialog] = useState(false)
  const [showSanctionDialog, setShowSanctionDialog] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [availableTitles, setAvailableTitles] = useState<string[]>([
    "해킹 마스터",
    "CTF 챔피언",
    "문제 해결사",
    "신입 해커",
    "커뮤니티 기여자",
    "관리자",
    "모더레이터",
    "베테랑",
    "전문가",
    "초보자",
  ])
  const [newAffiliation, setNewAffiliation] = useState<Partial<Affiliation>>({
    name: "",
    department: "",
    isVerified: false,
  })
  const [sanctionType, setSanctionType] = useState<string>("warning")
  const [sanctionReason, setSanctionReason] = useState("")
  const [sanctionDuration, setSanctionDuration] = useState("7")
  const [sanctionPermanent, setSanctionPermanent] = useState(false)

  // 페이지 접근 권한 확인
  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!isSuperAdmin(userProfile)) {
      toast({
        title: "접근 권한 없음",
        description: "최고 관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/admin")
      return
    }

    fetchUsers()
  }, [user, userProfile, router, toast])

  // 사용자 목록 불러오기
  const fetchUsers = async (searchTerm = "") => {
    try {
      setIsLoading(true)
      const db = getFirestore()

      // 관리자 목록 먼저 불러오기
      const adminsRef = collection(db, "users")
      const adminsQuery = query(adminsRef, where("role", "==", "admin"))

      const adminsSnapshot = await getDocs(adminsQuery)
      const adminsList: UserProfile[] = []

      adminsSnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile
        // 최고 관리자는 제외
        if (userData.email !== SUPER_ADMIN_EMAIL) {
          adminsList.push({
            ...userData,
            uid: doc.id,
          })
        }
      })

      setAdmins(adminsList)

      // 일반 사용자 목록 불러오기
      const usersRef = collection(db, "users")
      let usersQuery

      if (searchTerm) {
        // 검색어가 있는 경우 - 사용자 이름으로 검색
        usersQuery = query(
          usersRef,
          where("username", ">=", searchTerm),
          where("username", "<=", searchTerm + "\uf8ff"),
          limit(20),
        )
      } else {
        // 검색어가 없는 경우 - 최근 가입 순으로 정렬
        usersQuery = query(usersRef, orderBy("createdAt", "desc"), limit(20))
      }

      const usersSnapshot = await getDocs(usersQuery)
      const usersList: UserProfile[] = []

      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile
        usersList.push({
          ...userData,
          uid: doc.id,
        })
      })

      setUsers(usersList)

      if (usersSnapshot.docs.length > 0) {
        setLastVisible(usersSnapshot.docs[usersSnapshot.docs.length - 1])
        setHasMore(usersSnapshot.docs.length === 20)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "사용자 목록 로딩 실패",
        description: "사용자 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsSearching(false)
    }
  }

  // 더 많은 사용자 불러오기
  const loadMoreUsers = async () => {
    if (!lastVisible || isLoadingMore) return

    try {
      setIsLoadingMore(true)
      const db = getFirestore()

      const usersRef = collection(db, "users")
      const usersQuery = query(usersRef, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(20))

      const usersSnapshot = await getDocs(usersQuery)
      const newUsers: UserProfile[] = []

      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile
        newUsers.push({
          ...userData,
          uid: doc.id,
        })
      })

      setUsers([...users, ...newUsers])

      if (usersSnapshot.docs.length > 0) {
        setLastVisible(usersSnapshot.docs[usersSnapshot.docs.length - 1])
        setHasMore(usersSnapshot.docs.length === 20)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error loading more users:", error)
      toast({
        title: "추가 사용자 로딩 실패",
        description: "더 많은 사용자를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    fetchUsers(searchQuery)
  }

  // 관리자 권한 부여
  const promoteToAdmin = async () => {
    if (!selectedUser) return

    setIsPromoting(true)

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", selectedUser.uid)

      await updateDoc(userRef, {
        role: "admin",
        updatedAt: Timestamp.now(),
      })

      toast({
        title: "관리자 권한 부여 완료",
        description: `${selectedUser.username} 사용자에게 관리자 권한을 부여했습니다.`,
        variant: "default",
      })

      // 사용자 목록 업데이트
      const updatedUsers = users.map((user) => {
        if (user.uid === selectedUser.uid) {
          return { ...user, role: "admin" }
        }
        return user
      })

      setUsers(updatedUsers)

      // 관리자 목록에 추가
      setAdmins([...admins, { ...selectedUser, role: "admin" }])
    } catch (error) {
      console.error("Error promoting user:", error)
      toast({
        title: "권한 부여 실패",
        description: "관리자 권한을 부여하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsPromoting(false)
      setShowPromoteDialog(false)
      setSelectedUser(null)
    }
  }

  // 관리자 권한 해제
  const demoteFromAdmin = async () => {
    if (!selectedUser) return

    setIsDemoting(true)

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", selectedUser.uid)

      await updateDoc(userRef, {
        role: "user",
        updatedAt: Timestamp.now(),
      })

      toast({
        title: "관리자 권한 해제 완료",
        description: `${selectedUser.username} 사용자의 관리자 권한을 해제했습니다.`,
        variant: "default",
      })

      // 사용자 목록 업데이트
      const updatedUsers = users.map((user) => {
        if (user.uid === selectedUser.uid) {
          return { ...user, role: "user" }
        }
        return user
      })

      setUsers(updatedUsers)

      // 관리자 목록에서 제거
      setAdmins(admins.filter((admin) => admin.uid !== selectedUser.uid))
    } catch (error) {
      console.error("Error demoting user:", error)
      toast({
        title: "권한 해제 실패",
        description: "관리자 권한을 해제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDemoting(false)
      setShowDemoteDialog(false)
      setSelectedUser(null)
    }
  }

  // 관리자 권한 부여 다이얼로그 열기
  const openPromoteDialog = (user: UserProfile) => {
    setSelectedUser(user)
    setShowPromoteDialog(true)
  }

  // 관리자 권한 해제 다이얼로그 열기
  const openDemoteDialog = (user: UserProfile) => {
    setSelectedUser(user)
    setShowDemoteDialog(true)
  }

  // 사용자 선택 핸들러 함수 수정
  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user)
    setEditDisplayName(user.username || "")
    setEditBio(user.bio || "")
    setEditTitle(user.title || "none") // 빈 칭호를 "none"으로 설정
  }

  // 프로필 수정 다이얼로그 열기 함수
  const openEditProfileDialog = (user: UserProfile) => {
    handleSelectUser(user)
    setShowEditProfileDialog(true)
  }

  // 칭호 관리 다이얼로그 열기 함수
  const openTitleDialog = (user: UserProfile) => {
    handleSelectUser(user)
    setShowTitleDialog(true)
  }

  // 소속 관리 다이얼로그 열기 함수
  const openAffiliationDialog = (user: UserProfile) => {
    handleSelectUser(user)
    setShowAffiliationDialog(true)
  }

  // 제재 관리 다이얼로그 열기 함수
  const openSanctionDialog = (user: UserProfile) => {
    handleSelectUser(user)
    setShowSanctionDialog(true)
  }

  // 프로필 업데이트 함수
  const updateUserProfile = async () => {
    if (!selectedUser) return

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", selectedUser.uid)

      const updates = {
        username: editDisplayName,
        bio: editBio,
        updatedAt: Timestamp.now(),
      }

      await updateDoc(userRef, updates)

      // 사용자 목록 업데이트
      const updatedUsers = users.map((user) => {
        if (user.uid === selectedUser.uid) {
          return { ...user, ...updates }
        }
        return user
      })

      setUsers(updatedUsers)

      toast({
        title: "프로필 업데이트 완료",
        description: `${selectedUser.username} 사용자의 프로필이 업데이트되었습니다.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating user profile:", error)
      toast({
        title: "프로필 업데이트 실패",
        description: "사용자 프로필을 업데이트하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setShowEditProfileDialog(false)
    }
  }

  // 칭호 업데이트 함수
  const updateUserTitle = async () => {
    if (!selectedUser) return

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", selectedUser.uid)

      // "none" 값을 빈 문자열로 변환하여 칭호를 제거
      const titleToSave = editTitle === "none" ? "" : editTitle

      await updateDoc(userRef, {
        title: titleToSave,
        updatedAt: Timestamp.now(),
      })

      // 사용자 목록 업데이트
      const updatedUsers = users.map((user) => {
        if (user.uid === selectedUser.uid) {
          return { ...user, title: titleToSave }
        }
        return user
      })

      setUsers(updatedUsers)

      toast({
        title: "칭호 업데이트 완료",
        description: `${selectedUser.username} 사용자의 칭호가 업데이트되었습니다.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating user title:", error)
      toast({
        title: "칭호 업데이트 실패",
        description: "사용자 칭호를 업데이트하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setShowTitleDialog(false)
    }
  }

  // 소속 추가 함수
  const addUserAffiliation = async () => {
    if (!selectedUser || !newAffiliation.name) return

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", selectedUser.uid)

      const newAffiliationData: Affiliation = {
        id: `aff_${Date.now()}`,
        name: newAffiliation.name,
        department: newAffiliation.department || "",
        isVerified: false,
        verificationRequestDate: Timestamp.now(),
      }

      const currentAffiliations = selectedUser.affiliations || []

      await updateDoc(userRef, {
        affiliations: [...currentAffiliations, newAffiliationData],
        updatedAt: Timestamp.now(),
      })

      // 사용자 목록 업데이트
      const updatedUsers = users.map((user) => {
        if (user.uid === selectedUser.uid) {
          return {
            ...user,
            affiliations: [...(user.affiliations || []), newAffiliationData],
          }
        }
        return user
      })

      setUsers(updatedUsers)

      toast({
        title: "소속 추가 완료",
        description: `${selectedUser.username} 사용자에게 새 소속이 추가되었습니다.`,
        variant: "default",
      })

      // 입력 필드 초기화
      setNewAffiliation({
        name: "",
        department: "",
        isVerified: false,
      })
    } catch (error) {
      console.error("Error adding user affiliation:", error)
      toast({
        title: "소속 추가 실패",
        description: "사용자 소속을 추가하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setShowAffiliationDialog(false)
    }
  }

  // 소속 삭제 함수
  const removeAffiliation = async (affiliationId: string) => {
    if (!selectedUser) return

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", selectedUser.uid)

      const updatedAffiliations = (selectedUser.affiliations || []).filter((aff) => aff.id !== affiliationId)

      await updateDoc(userRef, {
        affiliations: updatedAffiliations,
        updatedAt: Timestamp.now(),
      })

      // 사용자 목록 업데이트
      const updatedUsers = users.map((user) => {
        if (user.uid === selectedUser.uid) {
          return {
            ...user,
            affiliations: updatedAffiliations,
          }
        }
        return user
      })

      setUsers(updatedUsers)

      toast({
        title: "소속 삭제 완료",
        description: `${selectedUser.username} 사용자의 소속이 삭제되었습니다.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error removing user affiliation:", error)
      toast({
        title: "소속 삭제 실패",
        description: "사용자 소속을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 소속 인증 함수
  const verifyAffiliation = async (affiliationId: string) => {
    if (!selectedUser) return

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", selectedUser.uid)

      const updatedAffiliations = (selectedUser.affiliations || []).map((aff) => {
        if (aff.id === affiliationId) {
          return {
            ...aff,
            isVerified: true,
            verifiedBy: userProfile?.uid,
            verifiedAt: Timestamp.now(),
          }
        }
        return aff
      })

      await updateDoc(userRef, {
        affiliations: updatedAffiliations,
        updatedAt: Timestamp.now(),
      })

      // 사용자 목록 업데이트
      const updatedUsers = users.map((user) => {
        if (user.uid === selectedUser.uid) {
          return {
            ...user,
            affiliations: updatedAffiliations,
          }
        }
        return user
      })

      setUsers(updatedUsers)

      toast({
        title: "소속 인증 완료",
        description: `${selectedUser.username} 사용자의 소속이 인증되었습니다.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error verifying user affiliation:", error)
      toast({
        title: "소속 인증 실패",
        description: "사용자 소속을 인증하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 제재 적용 함수
  const applySanction = async () => {
    if (!selectedUser || !sanctionReason) return

    try {
      const db = getFirestore()
      const userRef = doc(db, "users", selectedUser.uid)

      // 제재 정보 생성
      const now = Timestamp.now()
      let expiresAt = null

      if (!sanctionPermanent) {
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + Number.parseInt(sanctionDuration))
        expiresAt = Timestamp.fromDate(expiryDate)
      }

      const sanctionData = {
        id: `sanction_${Date.now()}`,
        type: sanctionType,
        reason: sanctionReason,
        appliedBy: userProfile?.uid,
        appliedAt: now,
        expiresAt: expiresAt,
        isActive: true,
      }

      // 사용자 상태 업데이트
      let newStatus = "active"
      if (sanctionType === "ban") {
        newStatus = "banned"
      } else if (sanctionType === "suspension") {
        newStatus = "suspended"
      } else if (sanctionType === "restriction") {
        newStatus = "restricted"
      }

      // 현재 제재 목록 가져오기
      const userDoc = await getDoc(userRef)
      const userData = userDoc.data()
      const currentSanctions = userData?.sanctions || []

      // 업데이트 적용
      await updateDoc(userRef, {
        sanctions: [...currentSanctions, sanctionData],
        status: newStatus,
        updatedAt: now,
      })

      toast({
        title: "제재 적용 완료",
        description: `${selectedUser.username} 사용자에게 제재가 적용되었습니다.`,
        variant: "default",
      })

      // 입력 필드 초기화
      setSanctionReason("")
      setSanctionType("warning")
      setSanctionDuration("7")
      setSanctionPermanent(false)

      // 사용자 목록 새로고침
      fetchUsers()
    } catch (error) {
      console.error("Error applying sanction:", error)
      toast({
        title: "제재 적용 실패",
        description: "사용자에게 제재를 적용하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setShowSanctionDialog(false)
    }
  }

  // 사용자 역할 표시 배지
  const renderRoleBadge = (role: string, email: string) => {
    if (email === SUPER_ADMIN_EMAIL) {
      return <Badge className="bg-purple-500 text-white">최고 관리자</Badge>
    } else if (role === "admin") {
      return <Badge className="bg-blue-500 text-white">관리자</Badge>
    } else {
      return <Badge variant="outline">일반 사용자</Badge>
    }
  }

  // 날짜 포맷팅 함수
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 없음"

    try {
      let date
      if (typeof timestamp === "string") {
        date = new Date(timestamp)
      } else if (timestamp.toDate) {
        date = timestamp.toDate()
      } else {
        date = new Date(timestamp)
      }

      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.error("Date formatting error:", error)
      return "날짜 형식 오류"
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/admin")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              관리자 대시보드로 돌아가기
            </Button>

            <h1 className="text-3xl font-bold tracking-tight">사용자 관리</h1>
            <p className="text-muted-foreground mt-2">
              사용자 목록을 확인하고 관리자 권한을 부여하거나 해제할 수 있습니다.
            </p>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">모든 사용자</TabsTrigger>
              <TabsTrigger value="admins">관리자 목록</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>사용자 목록</CardTitle>
                  <CardDescription>전체 사용자 목록을 확인하고 관리자 권한을 부여할 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSearch} className="flex items-center space-x-2 mb-6">
                    <Input
                      placeholder="사용자 이름으로 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isSearching}>
                      {isSearching ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-4 w-4" />
                      )}
                      검색
                    </Button>
                  </form>

                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-bold">사용자를 찾을 수 없습니다</h3>
                      <p className="text-muted-foreground mt-2">
                        {searchQuery ? "검색 조건에 맞는 사용자가 없습니다." : "사용자 목록을 불러올 수 없습니다."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>사용자</TableHead>
                              <TableHead>이메일</TableHead>
                              <TableHead>역할</TableHead>
                              <TableHead>가입일</TableHead>
                              <TableHead className="text-right">작업</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((user) => (
                              <TableRow key={user.uid}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarImage src={user.photoURL || ""} alt={user.username} />
                                      <AvatarFallback>
                                        {user.username ? (
                                          user.username.charAt(0).toUpperCase()
                                        ) : (
                                          <User className="h-5 w-5" />
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{user.username}</p>
                                      <p className="text-xs text-muted-foreground">ID: {user.uid.substring(0, 8)}...</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{user.email || "이메일 없음"}</TableCell>
                                <TableCell>{renderRoleBadge(user.role || "user", user.email)}</TableCell>
                                <TableCell>{formatDate(user.createdAt)}</TableCell>
                                <TableCell className="text-right">
                                  {user.email === SUPER_ADMIN_EMAIL ? (
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
                                      최고 관리자
                                    </Badge>
                                  ) : user.role === "admin" ? (
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" size="sm" onClick={() => openEditProfileDialog(user)}>
                                        <UserCog className="mr-2 h-4 w-4" />
                                        정보 수정
                                      </Button>
                                      <Button variant="destructive" size="sm" onClick={() => openDemoteDialog(user)}>
                                        <UserX className="mr-2 h-4 w-4" />
                                        관리자 해제
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" size="sm" onClick={() => openEditProfileDialog(user)}>
                                        <UserCog className="mr-2 h-4 w-4" />
                                        정보 수정
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => openPromoteDialog(user)}>
                                        <Shield className="mr-2 h-4 w-4" />
                                        관리자 지정
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {hasMore && (
                        <div className="mt-4 flex justify-center">
                          <Button variant="outline" onClick={loadMoreUsers} disabled={isLoadingMore}>
                            {isLoadingMore ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                로딩 중...
                              </>
                            ) : (
                              "더 보기"
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admins">
              <Card>
                <CardHeader>
                  <CardTitle>관리자 목록</CardTitle>
                  <CardDescription>현재 관리자 권한을 가진 사용자 목록입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>관리자</TableHead>
                            <TableHead>이메일</TableHead>
                            <TableHead>역할</TableHead>
                            <TableHead>가입일</TableHead>
                            <TableHead className="text-right">작업</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* 최고 관리자 먼저 표시 */}
                          {userProfile && userProfile.email === SUPER_ADMIN_EMAIL && (
                            <TableRow>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarImage src={userProfile?.photoURL || ""} alt="최고 관리자" />
                                    <AvatarFallback>
                                      {userProfile?.username ? (
                                        userProfile.username.charAt(0).toUpperCase()
                                      ) : (
                                        <User className="h-5 w-5" />
                                      )}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{userProfile?.username || "최고 관리자"}</p>
                                    <p className="text-xs text-muted-foreground">ID: {user?.uid.substring(0, 8)}...</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{SUPER_ADMIN_EMAIL}</TableCell>
                              <TableCell>
                                <Badge className="bg-purple-500 text-white">최고 관리자</Badge>
                              </TableCell>
                              <TableCell>{formatDate(userProfile?.createdAt)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
                                  시스템 지정
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )}

                          {/* 일반 관리자 목록 */}
                          {admins.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                  <Shield className="h-8 w-8 text-muted-foreground mb-2" />
                                  <p className="text-muted-foreground">지정된 관리자가 없습니다</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            admins.map((admin) => (
                              <TableRow key={admin.uid}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarImage src={admin.photoURL || ""} alt={admin.username} />
                                      <AvatarFallback>
                                        {admin.username ? (
                                          admin.username.charAt(0).toUpperCase()
                                        ) : (
                                          <User className="h-5 w-5" />
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{admin.username}</p>
                                      <p className="text-xs text-muted-foreground">
                                        ID: {admin.uid.substring(0, 8)}...
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{admin.email || "이메일 없음"}</TableCell>
                                <TableCell>
                                  <Badge className="bg-blue-500 text-white">관리자</Badge>
                                </TableCell>
                                <TableCell>{formatDate(admin.createdAt)}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="destructive" size="sm" onClick={() => openDemoteDialog(admin)}>
                                    <UserX className="mr-2 h-4 w-4" />
                                    관리자 해제
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* 관리자 권한 부여 다이얼로그 */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관리자 권한 부여</DialogTitle>
            <DialogDescription>
              이 사용자에게 관리자 권한을 부여하시겠습니까? 관리자는 문제 관리, CTF 대회 관리 등의 권한을 갖게 됩니다.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="flex items-center gap-3 py-4">
              <Avatar>
                <AvatarImage src={selectedUser.photoURL || ""} alt={selectedUser.username} />
                <AvatarFallback>
                  {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedUser.username}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email || "이메일 없음"}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoteDialog(false)} disabled={isPromoting}>
              취소
            </Button>
            <Button onClick={promoteToAdmin} disabled={isPromoting}>
              {isPromoting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  관리자 지정
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 관리자 권한 해제 다이얼로그 */}
      <Dialog open={showDemoteDialog} onOpenChange={setShowDemoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관리자 권한 해제</DialogTitle>
            <DialogDescription>
              이 사용자의 관리자 권한을 해제하시겠습니까? 관리자 권한이 해제되면 더 이상 관리자 기능을 사용할 수 없게
              됩니다.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="flex items-center gap-3 py-4">
              <Avatar>
                <AvatarImage src={selectedUser.photoURL || ""} alt={selectedUser.username} />
                <AvatarFallback>
                  {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedUser.username}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email || "이메일 없음"}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDemoteDialog(false)} disabled={isDemoting}>
              취소
            </Button>
            <Button variant="destructive" onClick={demoteFromAdmin} disabled={isDemoting}>
              {isDemoting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  관리자 해제
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 사용자 정보 수정 다이얼로그 */}
      <Dialog open={showEditProfileDialog} onOpenChange={setShowEditProfileDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>사용자 정보 수정</DialogTitle>
            <DialogDescription>사용자의 기본 정보를 수정하고 추가 관리 옵션을 선택할 수 있습니다.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">프로필</TabsTrigger>
                <TabsTrigger value="title">칭호</TabsTrigger>
                <TabsTrigger value="affiliation">소속</TabsTrigger>
                <TabsTrigger value="sanction">제재</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 py-4">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.photoURL || ""} alt={selectedUser.username} />
                    <AvatarFallback>
                      {selectedUser.username ? (
                        selectedUser.username.charAt(0).toUpperCase()
                      ) : (
                        <User className="h-6 w-6" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium">{selectedUser.username}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    {selectedUser.title && (
                      <Badge variant="outline" className="mt-1">
                        {selectedUser.title}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">사용자명</Label>
                    <Input
                      id="username"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="사용자명 입력"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">자기소개</Label>
                    <Textarea
                      id="bio"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="자기소개 입력"
                      rows={4}
                    />
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setShowEditProfileDialog(false)}>
                    취소
                  </Button>
                  <Button onClick={updateUserProfile}>저장</Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="title" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">칭호 선택</Label>
                    <Select value={editTitle} onValueChange={setEditTitle}>
                      <SelectTrigger>
                        <SelectValue placeholder="칭호 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">칭호 없음</SelectItem>
                        {availableTitles.map((title) => (
                          <SelectItem key={title} value={title}>
                            {title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4">
                    <h4 className="text-sm font-medium mb-2">미리보기:</h4>
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <Avatar>
                        <AvatarImage src={selectedUser.photoURL || ""} alt={selectedUser.username} />
                        <AvatarFallback>
                          {selectedUser.username ? (
                            selectedUser.username.charAt(0).toUpperCase()
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{selectedUser.username}</div>
                        {editTitle && (
                          <Badge variant="outline" className="mt-1">
                            {editTitle}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setShowTitleDialog(false)}>
                    취소
                  </Button>
                  <Button onClick={updateUserTitle}>저장</Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="affiliation" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">현재 소속:</h4>
                    {selectedUser.affiliations && selectedUser.affiliations.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUser.affiliations.map((aff) => (
                          <div key={aff.id} className="flex items-center justify-between p-2 border rounded-md">
                            <div>
                              <div className="font-medium">{aff.name}</div>
                              {aff.department && <div className="text-sm text-muted-foreground">{aff.department}</div>}
                              <div className="flex items-center mt-1">
                                {aff.isVerified ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    인증됨
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    인증 대기중
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!aff.isVerified && (
                                <Button variant="outline" size="sm" onClick={() => verifyAffiliation(aff.id)}>
                                  인증
                                </Button>
                              )}
                              <Button variant="destructive" size="sm" onClick={() => removeAffiliation(aff.id)}>
                                삭제
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">소속 정보가 없습니다.</div>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">새 소속 추가:</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="affiliation-name">소속명</Label>
                        <Input
                          id="affiliation-name"
                          value={newAffiliation.name}
                          onChange={(e) => setNewAffiliation({ ...newAffiliation, name: e.target.value })}
                          placeholder="소속 기관명 입력"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="affiliation-department">부서/학과</Label>
                        <Input
                          id="affiliation-department"
                          value={newAffiliation.department}
                          onChange={(e) => setNewAffiliation({ ...newAffiliation, department: e.target.value })}
                          placeholder="부서 또는 학과명 입력 (선택사항)"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="verified"
                          checked={newAffiliation.isVerified}
                          onCheckedChange={(checked) => setNewAffiliation({ ...newAffiliation, isVerified: checked })}
                        />
                        <Label htmlFor="verified">즉시 인증</Label>
                      </div>

                      <Button onClick={addUserAffiliation} disabled={!newAffiliation.name} className="w-full">
                        소속 추가
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sanction" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sanction-type">제재 유형</Label>
                    <RadioGroup
                      value={sanctionType}
                      onValueChange={setSanctionType}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="warning" id="warning" />
                        <Label htmlFor="warning" className="flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                          경고 (계정 상태 변경 없음)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="restriction" id="restriction" />
                        <Label htmlFor="restriction" className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-blue-500" />
                          제한 (일부 기능 제한)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="suspension" id="suspension" />
                        <Label htmlFor="suspension" className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-amber-500" />
                          일시 정지 (로그인 불가)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ban" id="ban" />
                        <Label htmlFor="ban" className="flex items-center">
                          <Ban className="h-4 w-4 mr-2 text-red-500" />
                          영구 정지 (계정 완전 차단)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sanction-reason">제재 사유</Label>
                    <Textarea
                      id="sanction-reason"
                      value={sanctionReason}
                      onChange={(e) => setSanctionReason(e.target.value)}
                      placeholder="제재 사유를 입력하세요"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="permanent" checked={sanctionPermanent} onCheckedChange={setSanctionPermanent} />
                      <Label htmlFor="permanent">영구적 제재</Label>
                    </div>
                  </div>

                  {!sanctionPermanent && (
                    <div className="space-y-2">
                      <Label htmlFor="duration">제재 기간 (일)</Label>
                      <Select value={sanctionDuration} onValueChange={setSanctionDuration}>
                        <SelectTrigger>
                          <SelectValue placeholder="제재 기간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1일</SelectItem>
                          <SelectItem value="3">3일</SelectItem>
                          <SelectItem value="7">7일</SelectItem>
                          <SelectItem value="14">14일</SelectItem>
                          <SelectItem value="30">30일</SelectItem>
                          <SelectItem value="90">90일</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setShowSanctionDialog(false)}>
                    취소
                  </Button>
                  <Button variant="destructive" onClick={applySanction} disabled={!sanctionReason}>
                    제재 적용
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UserManagementSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[200px]" />
      </div>
      <Skeleton className="h-[450px] w-full" />
    </div>
  )
}
