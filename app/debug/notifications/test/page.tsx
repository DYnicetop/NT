"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { createNotification } from "@/lib/notification-utils"
import { toast } from "@/hooks/use-toast"

export default function NotificationTestPage() {
  const { user } = useAuth()
  const [title, setTitle] = useState("테스트 알림")
  const [message, setMessage] = useState("이것은 테스트 알림입니다.")
  const [type, setType] = useState("system")
  const [link, setLink] = useState("/")
  const [loading, setLoading] = useState(false)

  const handleSendNotification = async () => {
    if (!user) {
      toast({
        title: "오류",
        description: "로그인이 필요합니다.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const result = await createNotification({
        userId: user.uid,
        title,
        message,
        type: type as any,
        link: link || undefined,
      })

      if (result.success) {
        toast({
          title: "성공",
          description: "알림이 성공적으로 전송되었습니다.",
        })

        // 폼 초기화
        setTitle("테스트 알림")
        setMessage("이것은 테스트 알림입니다.")
        setType("system")
        setLink("/")
      } else {
        toast({
          title: "오류",
          description: "알림 전송에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending notification:", error)
      toast({
        title: "오류",
        description: "알림 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>알림 테스트</CardTitle>
            <CardDescription>로그인이 필요합니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>알림 테스트</CardTitle>
          <CardDescription>실시간 알림 시스템을 테스트합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">알림 제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="알림 제목을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">알림 내용</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="알림 내용을 입력하세요"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">알림 유형</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="알림 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">공지사항</SelectItem>
                <SelectItem value="affiliation">소속 인증</SelectItem>
                <SelectItem value="ctf">CTF 관련</SelectItem>
                <SelectItem value="wargame">워게임 관련</SelectItem>
                <SelectItem value="system">시스템 알림</SelectItem>
                <SelectItem value="message">메시지</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">링크 (선택사항)</Label>
            <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="클릭 시 이동할 링크" />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSendNotification} disabled={loading || !title || !message} className="w-full">
            {loading ? "전송 중..." : "알림 전송"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
