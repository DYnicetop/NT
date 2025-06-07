"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { FileUploader } from "@/components/file-uploader"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase-config"
import { X, Plus, Link2, Tag } from "lucide-react"
import MarkdownEditor from "@/components/markdown-editor"
// import { NotionLikeEditor, type Block } from "@/components/notion-like-editor"

export default function CreateCommunityPostPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  // const [editorBlocks, setEditorBlocks] = useState<Block[]>([
  //   {
  //     id: "initial-paragraph",
  //     type: "paragraph",
  //     content: "",
  //   },
  // ])
  const [isPinned, setIsPinned] = useState(false)
  const [isNotice, setIsNotice] = useState(false)
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [links, setLinks] = useState<{ url: string; title: string }[]>([])
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [newLinkTitle, setNewLinkTitle] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  // 관리자 여부 확인
  const isAdmin = userProfile?.role === "admin" || userProfile?.email === "mistarcodm@gmail.com"

  useEffect(() => {
    // 관리자가 아니면 접근 제한
    if (!isAdmin) {
      toast({
        title: "접근 제한",
        description: "관리자만 접근할 수 있습니다.",
        variant: "destructive",
      })
      router.push("/community")
    }
  }, [isAdmin, router, toast])

  // // 에디터 블록 변경 핸들러
  // const handleEditorChange = (blocks: Block[]) => {
  //   setEditorBlocks(blocks)

  //   // HTML로 변환
  //   const htmlContent = blocks
  //     .map((block) => {
  //       switch (block.type) {
  //         case "paragraph":
  //           return `<p>${block.content}</p>`
  //         case "heading1":
  //           return `<h1>${block.content}</h1>`
  //         case "heading2":
  //           return `<h2>${block.content}</h2>`
  //         case "image":
  //           return `<figure>
  //             <img src="${block.imageUrl}" alt="${block.content}" />
  //             ${block.content ? `<figcaption>${block.content}</figcaption>` : ""}
  //           </figure>`
  //         case "code":
  //           return `<pre><code class="language-${block.language}">${block.content}</code></pre>`
  //         case "bulletList":
  //           return `<ul>
  //             ${(block.items || []).map((item) => `<li>${item}</li>`).join("")}
  //           </ul>`
  //         case "numberedList":
  //           return `<ol>
  //             ${(block.items || []).map((item) => `<li>${item}</li>`).join("")}
  //           </ol>`
  //         case "divider":
  //           return `<hr />`
  //         default:
  //           return ""
  //       }
  //     })
  //     .join("\n")

  //   setContent(htmlContent)
  // }

  // 파일 업로드 처리
  const handleFileUpload = async (files: File[]) => {
    if (!user) return

    setIsUploading(true)
    const urls: string[] = []

    try {
      for (const file of files) {
        const storageRef = ref(storage, `community_files/${user.uid}/${Date.now()}_${file.name}`)
        await uploadBytes(storageRef, file)
        const downloadUrl = await getDownloadURL(storageRef)
        urls.push(downloadUrl)
      }

      setFileUrls((prev) => [...prev, ...urls])
      setUploadedFiles((prev) => [...prev, ...files])
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

  // 파일 삭제
  const handleRemoveFile = (index: number) => {
    setFileUrls((prev) => prev.filter((_, i) => i !== index))
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 링크 추가
  const handleAddLink = () => {
    if (newLinkUrl.trim()) {
      // URL 형식 검증
      try {
        // URL이 유효한지 확인 (프로토콜이 없으면 추가)
        const url = newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`
        new URL(url)

        setLinks([...links, { url, title: newLinkTitle.trim() || url }])
        setNewLinkUrl("")
        setNewLinkTitle("")
      } catch (error) {
        toast({
          title: "유효하지 않은 URL",
          description: "올바른 URL 형식을 입력해주세요.",
          variant: "destructive",
        })
      }
    }
  }

  // 링크 삭제
  const handleRemoveLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  // 태그 추가
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  // 태그 삭제
  const handleRemoveTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  // 게시글 작성 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "로그인 필요",
        description: "게시글을 작성하려면 로그인이 필요합니다.",
        variant: "destructive",
      })
      return
    }

    if (!title.trim()) {
      toast({
        title: "제목 필요",
        description: "게시글 제목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!content.trim()) {
      toast({
        title: "내용 필요",
        description: "게시글 내용을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 게시글 데이터 구성
      const postData = {
        title: title.trim(),
        content,
        author: userProfile?.displayName || user.displayName || "익명",
        authorId: user.uid,
        authorPhotoURL: userProfile?.photoURL || user.photoURL || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        viewCount: 0,
        commentCount: 0,
        likes: [],
        isPinned,
        isNotice,
        files: fileUrls.length > 0 ? fileUrls : [],
        links: links.length > 0 ? links : [],
        tags: tags.length > 0 ? tags : [],
      }

      console.log("Creating post with data:", postData)

      // Firestore에 게시글 추가
      const docRef = await addDoc(collection(db, "community_posts"), postData)

      console.log("Post created with ID:", docRef.id)

      toast({
        title: "게시글 작성 완료",
        description: isNotice
          ? "공지사항이 성공적으로 작성되었습니다. 메인 페이지와 커뮤니티에 표시됩니다."
          : "게시글이 성공적으로 작성되었습니다.",
        variant: "default",
      })

      // 게시글 목록 페이지로 이동
      router.push("/community")
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "게시글 작성 실패",
        description: "게시글 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">커뮤니티 게시글 작성</h1>
            <p className="text-muted-foreground mt-2">보안 커뮤니티에 새로운 게시글을 작성합니다.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>게시글 정보</CardTitle>
                <CardDescription>게시글의 기본 정보를 입력해주세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">제목</Label>
                  <Input
                    id="title"
                    placeholder="게시글 제목을 입력하세요"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>게시글 옵션</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isPinned"
                        checked={isPinned}
                        onCheckedChange={(checked) => setIsPinned(checked as boolean)}
                      />
                      <Label htmlFor="isPinned">상단 고정</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isNotice"
                        checked={isNotice}
                        onCheckedChange={(checked) => setIsNotice(checked as boolean)}
                      />
                      <Label htmlFor="isNotice">공지사항</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>게시글 내용</CardTitle>
                <CardDescription>마크다운으로 게시글 내용을 작성해주세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="마크다운으로 게시글 내용을 작성하세요..."
                  minHeight="500px"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>첨부 파일</CardTitle>
                <CardDescription>게시글에 첨부할 파일을 업로드해주세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileUploader onFilesSelected={handleFileUpload} isUploading={isUploading} />

                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">업로드된 파일 ({uploadedFiles.length})</h3>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center">
                            <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>링크 및 태그</CardTitle>
                <CardDescription>게시글에 관련 링크와 태그를 추가해주세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 링크 추가 */}
                <div className="space-y-4">
                  <Label>관련 링크</Label>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="linkUrl" className="text-xs">
                        URL
                      </Label>
                      <Input
                        id="linkUrl"
                        placeholder="https://example.com"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="linkTitle" className="text-xs">
                        링크 제목 (선택사항)
                      </Label>
                      <Input
                        id="linkTitle"
                        placeholder="링크 제목"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                      />
                    </div>
                    <Button type="button" onClick={handleAddLink} className="flex items-center gap-1">
                      <Plus className="h-4 w-4" />
                      추가
                    </Button>
                  </div>

                  {links.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-2">
                        {links.map((link, index) => (
                          <div key={index} className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm">
                            <Link2 className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[200px]">{link.title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveLink(index)}
                              className="h-5 w-5 p-0 ml-1"
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 태그 추가 */}
                <div className="space-y-4">
                  <Label>태그</Label>
                  <div className="flex gap-2 items-end">
                    <div className="space-y-2 flex-1">
                      <Input
                        id="tag"
                        placeholder="태그 입력"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                      />
                    </div>
                    <Button type="button" onClick={handleAddTag} className="flex items-center gap-1">
                      <Plus className="h-4 w-4" />
                      추가
                    </Button>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full text-sm"
                          >
                            <Tag className="h-3.5 w-3.5" />
                            <span>{tag}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTag(index)}
                              className="h-5 w-5 p-0 ml-1"
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push("/community")} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting || !title.trim() || !content.trim()}>
                {isSubmitting ? "게시 중..." : "게시하기"}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
