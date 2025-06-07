"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

export default function ContactPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [language, setLanguage] = useState("ko")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    toast({
      title: language === "ko" ? "문의가 제출되었습니다" : "Inquiry submitted",
      description:
        language === "ko" ? "빠른 시일 내에 답변 드리겠습니다" : "We will get back to you as soon as possible",
      variant: "default",
    })

    setIsSubmitting(false)
    // Reset form
    e.currentTarget.reset()
  }

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex justify-end mb-4">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ko">한국어</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="max-w-2xl mx-auto border border-primary/20 bg-black/60 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-primary">
            {language === "ko" ? "문의하기" : "Contact Us"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {language === "ko"
              ? "질문이나 문제가 있으신가요? 아래 양식을 작성해 주세요."
              : "Have a question or issue? Fill out the form below."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{language === "ko" ? "이름" : "Name"}</Label>
                <Input
                  id="name"
                  placeholder={language === "ko" ? "홍길동" : "John Doe"}
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{language === "ko" ? "이메일" : "Email"}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={language === "ko" ? "example@domain.com" : "example@domain.com"}
                  required
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{language === "ko" ? "문의 유형" : "Inquiry Type"}</Label>
              <Select defaultValue="general">
                <SelectTrigger id="category" className="bg-background/50">
                  <SelectValue placeholder={language === "ko" ? "문의 유형 선택" : "Select inquiry type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{language === "ko" ? "일반 문의" : "General Inquiry"}</SelectItem>
                  <SelectItem value="technical">{language === "ko" ? "기술적 문제" : "Technical Issue"}</SelectItem>
                  <SelectItem value="account">{language === "ko" ? "계정 관련" : "Account Related"}</SelectItem>
                  <SelectItem value="ctf">{language === "ko" ? "CTF 대회 관련" : "CTF Contest Related"}</SelectItem>
                  <SelectItem value="wargame">{language === "ko" ? "워게임 관련" : "Wargame Related"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">{language === "ko" ? "제목" : "Subject"}</Label>
              <Input
                id="subject"
                placeholder={language === "ko" ? "문의 제목을 입력하세요" : "Enter your inquiry subject"}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{language === "ko" ? "메시지" : "Message"}</Label>
              <Textarea
                id="message"
                placeholder={
                  language === "ko" ? "문의 내용을 자세히 작성해 주세요" : "Please describe your inquiry in detail"
                }
                required
                className="min-h-[150px] bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment">{language === "ko" ? "첨부 파일 (선택사항)" : "Attachment (Optional)"}</Label>
              <Input id="attachment" type="file" className="bg-background/50" />
              <p className="text-xs text-muted-foreground">
                {language === "ko"
                  ? "최대 파일 크기: 5MB (이미지, PDF, 텍스트 파일만 허용)"
                  : "Max file size: 5MB (Images, PDFs, and text files only)"}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? language === "ko"
                  ? "제출 중..."
                  : "Submitting..."
                : language === "ko"
                  ? "문의 제출하기"
                  : "Submit Inquiry"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 border-t border-primary/20 pt-4">
          <div className="text-sm text-muted-foreground">
            {language === "ko"
              ? "* 문의하신 내용은 영업일 기준 2일 이내에 답변 드리겠습니다."
              : "* We will respond to your inquiry within 2 business days."}
          </div>
          <div className="text-sm">
            {language === "ko" ? "다른 문의 방법:" : "Other ways to contact us:"}
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-primary">Email:</span>
              <span>support@ntctf.com</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
