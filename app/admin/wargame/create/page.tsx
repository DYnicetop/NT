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
import { AlertCircle, ArrowLeft, Loader2, Upload, X, FileText } from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import MarkdownEditor from "@/components/markdown-editor"
import { uploadFile } from "@/lib/file-upload"
import { sendNewWargameChallengeNotification } from "@/lib/notification-utils"
import { calculatePointsByLevel } from "@/lib/wargame-types"

export default function CreateChallengePage() {
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
  const [error, setError] = useState("")

  // 계산된 점수
  const calculatedPoints = calculatePointsByLevel(level)

  // 파일 관련 상태
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})

  // 관리자 권한 확인
  useEffect(() => {
    if (user && userProfile) {
      const isAdmin = userProfile.role === "admin" || userProfile.email === "mistarcodm@gmail.com"
      if (!isAdmin) {
        toast({
          title: "접근 권한이 없습니다",
          description: "관리자만 접근할 수 있는 페이지입니다.",
          variant: "destructive",
        })
        router.push("/")
      }
    }
  }, [user, userProfile, router, toast])

  // 파일 선택 핸들러
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("=== File selection event triggered ===")
    const selectedFiles = Array.from(event.target.files || [])

    console.log(
      "Selected files:",
      selectedFiles.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified,
      })),
    )

    if (selectedFiles.length > 0) {
      // 파일 유효성 검사
      const validFiles = selectedFiles.filter((file) => {
        const isValid = file && file.size > 0 && file.name.trim() !== ""
        console.log(`File ${file.name} validation:`, {
          exists: !!file,
          hasSize: file.size > 0,
          hasName: file.name.trim() !== "",
          isValid,
        })
        return isValid
      })

      console.log("Valid files:", validFiles.length, "out of", selectedFiles.length)

      if (validFiles.length > 0) {
        setFiles([...files, ...validFiles])
        console.log(
          "Files added to state:",
          validFiles.map((f) => f.name),
        )
      } else {
        setError("선택된 파일이 유효하지 않습니다.")
      }
    }

    // 입력 필드 초기화
    event.target.value = ""
  }

  // 파일 제거 핸들러
  const handleRemoveFile = (index: number) => {
    console.log("Removing file at index:", index)
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    console.log(
      "Remaining files:",
      newFiles.map((f) => f.name),
    )
  }

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

  // 개별 파일 업로드 테스트
  const testFileUpload = async (file: File) => {
    console.log("=== Testing individual file upload ===")
    console.log("File to test:", {
      name: file.name,
      size: file.size,
      type: file.type,
      constructor: file.constructor.name,
    })

    try {
      const result = await uploadFile(file, "wargame")
      console.log("Test upload result:", result)
      return result
    } catch (error) {
      console.error("Test upload error:", error)
      return { success: false, error: "Test failed" }
    }
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    console.log("=== Form submission started ===")
    console.log(
      "Files to upload:",
      files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    )

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
    setIsUploading(files.length > 0)

    try {
      // 파일 업로드 처리
      const uploadedFileUrls: { name: string; url: string }[] = []

      if (files.length > 0) {
        console.log(`Starting upload of ${files.length} files...`)

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          console.log(`\n=== Uploading file ${i + 1}/${files.length}: ${file.name} ===`)

          try {
            // 파일 재검증
            if (!file || file.size === 0) {
              throw new Error(`File ${file?.name || "unknown"} is invalid or empty`)
            }

            setUploadProgress({ ...uploadProgress, [file.name]: 0 })

            console.log("Calling uploadFile function...")
            const uploadResult = await uploadFile(file, "wargame")
            console.log("Upload result:", uploadResult)

            if (uploadResult.success && uploadResult.fileUrl) {
              uploadedFileUrls.push({
                name: file.name,
                url: uploadResult.fileUrl,
              })
              setUploadProgress({ ...uploadProgress, [file.name]: 100 })
              console.log(`✅ File ${file.name} uploaded successfully`)
            } else {
              throw new Error(uploadResult.error || "Upload failed")
            }
          } catch (uploadError) {
            console.error(`❌ File upload error for ${file.name}:`, uploadError)
            setError(
              `파일 업로드 실패: ${file.name} - ${uploadError instanceof Error ? uploadError.message : "알 수 없는 오류"}`,
            )
            setIsSubmitting(false)
            setIsUploading(false)
            return
          }
        }
      }

      // 기존 URL 파일도 추가
      fileUrls.forEach((url) => {
        const fileName = url.split("/").pop() || "file"
        uploadedFileUrls.push({
          name: fileName,
          url: url,
        })
      })

      console.log("All files processed:", uploadedFileUrls)

      // 문제 데이터 생성
      const challengeData = {
        title,
        description,
        category,
        difficulty,
        level: Number(level),
        points: calculatedPoints,
        port: port ? Number(port) : null,
        flag,
        files: uploadedFileUrls.map((file) => ({ name: file.name, url: file.url })),
        author: userProfile?.username || user?.displayName || "관리자",
        authorId: user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        solvedCount: 0,
        solvedBy: [],
      }

      console.log("Creating challenge with data:", challengeData)

      // Firestore에 문제 추가
      const docRef = await addDoc(collection(db, "wargame_challenges"), challengeData)
      console.log("Challenge created with ID:", docRef.id)

      // 새 문제 추가 알림 전송
      try {
        await sendNewWargameChallengeNotification(docRef.id, title, category, difficulty)
        console.log("워게임 문제 추가 알림 전송 완료")
      } catch (notificationError) {
        console.error("알림 전송 오류:", notificationError)
      }

      toast({
        title: "문제가 생성되었습니다",
        description: "새로운 워게임 문제가 성공적으로 생성되었습니다.",
        variant: "default",
      })

      router.push("/wargame")
    } catch (error) {
      console.error("Error creating challenge:", error)
      setError("문제 생성 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push("/wargame")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              문제 목록으로
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">워게임 문제 생성</h1>
            <p className="text-muted-foreground mt-2">새로운 워게임 문제를 생성합니다.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>기본 정보</CardTitle>
                    <CardDescription>문제의 기본 정보를 입력해주세요.</CardDescription>
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
                            <SelectItem value="포렌식">포렌식</SelectItem>
                            <SelectItem value="네트워크">네트워크</SelectItem>
                            <SelectItem value="기타">기타</SelectItem>
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
                              레벨 {lvl} ({calculatePointsByLevel(lvl)}점)
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
                          placeholder="NT{flag}"
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
                    <CardDescription>
                      문제에 필요한 파일을 업로드하세요. (선택사항)
                      <br />
                      <span className="text-xs text-muted-foreground">
                        지원 파일: .zip, .rar, .7z, .exe, .bin, .txt, .py, .c, .cpp, .java, .pdf, .jpg, .png 등
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="file-upload">파일 선택</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="file-upload"
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          disabled={isSubmitting}
                          className="cursor-pointer"
                          accept="*/*"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => {
                            const input = document.getElementById("file-upload") as HTMLInputElement
                            if (input) {
                              input.click()
                            }
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          파일 선택
                        </Button>
                      </div>
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">선택된 파일 ({files.length}개)</p>
                        <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                          {files.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                            >
                              <div className="flex items-center gap-2 truncate text-sm">
                                <FileText className="h-4 w-4 flex-shrink-0" />
                                <div className="truncate">
                                  <span className="font-medium">{file.name}</span>
                                  <span className="text-muted-foreground ml-2">
                                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFile(index)}
                                disabled={isSubmitting}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 pt-4">
                      <Label htmlFor="fileUrl">외부 파일 URL (선택사항)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="fileUrl"
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
                          추가
                        </Button>
                      </div>
                    </div>

                    {fileUrls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">추가된 파일 URL ({fileUrls.length}개)</p>
                        <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                          {fileUrls.map((url, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                            >
                              <div className="truncate text-sm">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {url}
                                </a>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFileUrl(index)}
                                disabled={isSubmitting}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isUploading && (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <p>파일 업로드 중...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>문제 설명</CardTitle>
                    <CardDescription>문제에 대한 상세한 설명을 작성해주세요.</CardDescription>
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
              <Button type="button" variant="outline" onClick={() => router.push("/wargame")} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "문제 생성"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
