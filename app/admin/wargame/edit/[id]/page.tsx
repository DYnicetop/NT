"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import MarkdownEditor from "@/components/markdown-editor"
import { Skeleton } from "@/components/ui/skeleton"
import { FileUploader } from "@/components/file-uploader"
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { calculatePointsByLevel } from "@/lib/wargame-types"

export default function EditChallengePage({ params }: { params: { id: string } }) {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // 폼 상태
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const [level, setLevel] = useState(5)
  const [port, setPort] = useState("")
  const [flag, setFlag] = useState("")
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [newFileUrl, setNewFileUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // 계산된 점수
  const calculatedPoints = calculatePointsByLevel(level)

  // 관리자 권한 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  useEffect(() => {
    if (user && userProfile && !isAdmin) {
      toast({
        title: "접근 권한이 없습니다",
        description: "관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      })
      router.push("/")
    }
  }, [user, userProfile, isAdmin, router, toast])

  // 문제 정보 불러오기
  useEffect(() => {
    const fetchChallenge = async () => {
      if (!params.id) {
        setIsLoading(false)
        setError("유효하지 않은 문제 ID입니다.")
        return
      }

      try {
        const challengeRef = doc(db, "wargame_challenges", params.id)
        const challengeSnap = await getDoc(challengeRef)

        if (challengeSnap.exists()) {
          const data = challengeSnap.data()

          // 폼 상태 초기화
          setTitle(data.title || "")
          setDescription(data.description || "")
          setCategory(data.category || "")
          setDifficulty(data.difficulty || "")
          setLevel(data.level || 5)
          setPort(data.port?.toString() || "")
          setFlag(data.flag || "")
          setFileUrls(data.files || [])

          // 기존 파일 URL을 업로드된 파일 형식으로 변환
          if (data.files && Array.isArray(data.files)) {
            const formattedFiles = data.files
              .map((file: any) => {
                // 파일이 객체인 경우 (name과 url 속성이 있는 경우)
                if (typeof file === "object" && file.url) {
                  return { name: file.name || file.url.split("/").pop() || "file", url: file.url }
                }
                // 파일이 문자열(URL)인 경우
                else if (typeof file === "string") {
                  const fileName = file.split("/").pop() || "file"
                  return { name: fileName, url: file }
                }
                return { name: "file", url: "" }
              })
              .filter((file) => file.url) // 유효한 URL만 포함

            setUploadedFiles(formattedFiles)
          }
        } else {
          setError("요청하신 문제가 존재하지 않습니다.")
          toast({
            title: "문제를 찾을 수 없습니다",
            description: "요청하신 문제가 존재하지 않습니다.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching challenge:", error)
        setError("문제를 불러오는 중 오류가 발생했습니다.")
        toast({
          title: "오류 발생",
          description: "문제를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id && isAdmin) {
      fetchChallenge()
    }
  }, [params.id, isAdmin, toast])

  // 파일 URL 추가 핸들러
  const handleAddFileUrl = () => {
    if (newFileUrl.trim()) {
      setFileUrls([...fileUrls, newFileUrl.trim()])
      setNewFileUrl("")
    }
  }
  // 파일 URL 제거 핸들러
  const handleRemoveFileUrl = (index: number) => {
    setFileUrls(fileUrls.filter((_, i) => i !== index))
  }

  // 파일 업로드 핸들러 함수 추가 (handleRemoveFileUrl 함수 아래에)
  const handleFileUpload = async (files: File[]) => {
    if (!user) return

    setIsUploading(true)
    const storage = getStorage()
    const newUploadedFiles = [...uploadedFiles]

    try {
      for (const file of files) {
        const fileName = `wargame/${params.id}/${Date.now()}_${file.name}`
        const storageRef = ref(storage, fileName)

        await uploadBytes(storageRef, file)
        const downloadUrl = await getDownloadURL(storageRef)

        newUploadedFiles.push({
          name: file.name,
          url: downloadUrl,
        })
      }

      setUploadedFiles(newUploadedFiles)
      // 파일 URL 배열도 업데이트
      setFileUrls(newUploadedFiles.map((file) => file.url))

      toast({
        title: "파일 업로드 완료",
        description: `${files.length}개의 파일이 업로드되었습니다.`,
      })
    } catch (error) {
      console.error("Error uploading files:", error)
      toast({
        title: "파일 업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // 업로드된 파일 삭제 핸들러 추가
  const handleRemoveUploadedFile = async (index: number) => {
    try {
      const fileToRemove = uploadedFiles[index]
      const storage = getStorage()

      // URL에서 경로 추출 시도
      try {
        const url = new URL(fileToRemove.url)
        const pathMatch = url.pathname.match(/\/o\/(.+?)(?:\?|$)/)
        if (pathMatch && pathMatch[1]) {
          const decodedPath = decodeURIComponent(pathMatch[1])
          const fileRef = ref(storage, decodedPath)
          await deleteObject(fileRef).catch(() => {
            console.log("파일이 스토리지에 없거나 삭제할 수 없습니다.")
          })
        }
      } catch (e) {
        console.log("외부 URL이거나 경로를 추출할 수 없습니다.")
      }

      // 상태에서 파일 제거
      const newUploadedFiles = uploadedFiles.filter((_, i) => i !== index)
      setUploadedFiles(newUploadedFiles)
      setFileUrls(newUploadedFiles.map((file) => file.url))

      toast({
        title: "파일 삭제 완료",
        description: "파일이 삭제되었습니다.",
      })
    } catch (error) {
      console.error("Error removing file:", error)
      toast({
        title: "파일 삭제 실패",
        description: "파일 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // 입력 검증
    if (!title.trim()) {
      setError("제목을 입력해주세요.")
      return
    }
    if (!description.trim()) {
      setError("문제 설명을 입력해주세요.")
      return
    }
    if (!category) {
      setError("카테고리를 선택해주세요.")
      return
    }
    if (!difficulty) {
      setError("난이도를 선택해주세요.")
      return
    }
    if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
      setError("유효한 포트 번호를 입력해주세요 (1-65535).")
      return
    }
    if (!flag.trim()) {
      setError("플래그를 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      // 문제 데이터 업데이트
      const challengeData = {
        title,
        description,
        category,
        difficulty,
        level: Number(level),
        points: calculatedPoints, // 레벨에 따라 자동 계산된 점수 사용
        port: port ? Number(port) : null,
        flag,
        files: uploadedFiles.map((file) => ({ name: file.name, url: file.url })),
        updatedAt: serverTimestamp(),
      }

      // Firestore 문제 업데이트
      await updateDoc(doc(db, "wargame_challenges", params.id), challengeData)

      toast({
        title: "문제가 수정되었습니다",
        description: "워게임 문제가 성공적으로 수정되었습니다.",
        variant: "default",
      })

      // 문제 목록 페이지로 이동
      router.push("/admin/wargame")
    } catch (error) {
      console.error("Error updating challenge:", error)
      setError("문제 수정 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/admin/wargame")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              문제 목록으로
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">워게임 문제 수정</h1>
            <p className="text-muted-foreground mt-2">기존 워게임 문제를 수정합니다.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <Skeleton className="h-[400px] w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-[400px] w-full" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>기본 정보</CardTitle>
                      <CardDescription>문제의 기본 정보를 수정해주세요.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">제목</Label>
                        <Input
                          id="title"
                          placeholder="문제 제목"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">카테고리</Label>
                          <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                            <SelectTrigger id="category">
                              <SelectValue placeholder="카테고리 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="웹 해킹">웹 해킹</SelectItem>
                              <SelectItem value="시스템 해킹">시스템 해킹</SelectItem>
                              <SelectItem value="리버싱">리버싱</SelectItem>
                              <SelectItem value="암호학">암호학</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="difficulty">난이도</Label>
                          <Select value={difficulty} onValueChange={setDifficulty} disabled={isSubmitting}>
                            <SelectTrigger id="difficulty">
                              <SelectValue placeholder="난이도 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="초급">초급</SelectItem>
                              <SelectItem value="중급">중급</SelectItem>
                              <SelectItem value="고급">고급</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="level">레벨 (1-10)</Label>
                        <Select
                          value={level.toString()}
                          onValueChange={(value) => setLevel(Number.parseInt(value))}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger id="level">
                            <SelectValue placeholder="레벨 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
                              <SelectItem key={lvl} value={lvl.toString()}>
                                레벨 {lvl}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="port">포트 번호 (선택사항)</Label>
                          <Input
                            id="port"
                            type="number"
                            placeholder="예: 1337"
                            min="1"
                            max="65535"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="flag">플래그</Label>
                          <Input
                            id="flag"
                            placeholder="NTCTF{flag_format}"
                            value={flag}
                            onChange={(e) => setFlag(e.target.value)}
                            disabled={isSubmitting}
                          />
                          <p className="text-xs text-muted-foreground">플래그 형식: NT{"{flag}"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>파일 업로드</CardTitle>
                      <CardDescription>문제에 필요한 파일을 업로드하거나 URL을 추가하세요.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FileUploader
                        onFilesSelected={handleFileUpload}
                        isUploading={isUploading}
                        maxFiles={5}
                        maxSize={50} // MB 단위
                        acceptedFileTypes=".zip,.rar,.7z,.tar,.gz,.pdf,.txt,.png,.jpg,.jpeg"
                      />

                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="https://example.com/file.zip"
                          value={newFileUrl}
                          onChange={(e) => setNewFileUrl(e.target.value)}
                          disabled={isSubmitting}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddFileUrl}
                          disabled={isSubmitting || !newFileUrl.trim()}
                        >
                          URL 추가
                        </Button>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">업로드된 파일 ({uploadedFiles.length}개)</p>
                          <div className="max-h-60 overflow-y-auto rounded-md border p-2">
                            {uploadedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                              >
                                <div className="truncate text-sm flex items-center gap-2">
                                  <span className="bg-muted rounded px-2 py-1 text-xs">{file.name}</span>
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline text-xs"
                                  >
                                    다운로드
                                  </a>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveUploadedFile(index)}
                                  disabled={isSubmitting}
                                >
                                  삭제
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>문제 설명</CardTitle>
                      <CardDescription>문제에 대한 상세한 설명을 수정해주세요.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="min-h-[400px]">
                        <MarkdownEditor
                          value={description}
                          onChange={setDescription}
                          placeholder="문제 설명을 입력하세요..."
                          minHeight="400px"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/wargame")}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      수정 중...
                    </>
                  ) : (
                    "문제 수정"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
