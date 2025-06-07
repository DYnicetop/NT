"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Shield, User, Mail, Lock, AlertCircle, Info, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { Progress } from "@/components/ui/progress"

export default function RegisterPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { signUp, checkUsernameExists, checkEmailExists } = useAuth()

  // 컴포넌트 마운트 상태 추적
  const isMounted = useRef(true)

  // 유효성 검사 상태
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordFeedback, setPasswordFeedback] = useState("")

  // 컴포넌트 마운트/언마운트 처리
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // 사용자 이름 유효성 검사
  const validateUsername = async (username: string) => {
    if (!username) {
      if (isMounted.current) setUsernameValid(null)
      return
    }

    // 사용자 이름 형식 검사
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    if (!usernameRegex.test(username)) {
      if (isMounted.current) {
        setUsernameValid(false)
        setError("사용자 이름은 3-20자의 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있습니다.")
      }
      return
    }

    try {
      const exists = await checkUsernameExists(username)
      if (!isMounted.current) return

      if (exists) {
        setUsernameValid(false)
        setError("이미 사용 중인 사용자 이름입니다. 다른 사용자 이름을 선택해주세요.")
      } else {
        setUsernameValid(true)
        setError("") // 에러 메시지 초기화
      }
    } catch (error) {
      console.error("Username validation error:", error)
      if (isMounted.current) setUsernameValid(null)
    }
  }

  // 이메일 유효성 검사
  const validateEmail = async (email: string) => {
    if (!email) {
      if (isMounted.current) setEmailValid(null)
      return
    }

    // 이메일 형식 검사
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      if (isMounted.current) setEmailValid(false)
      return
    }

    try {
      const exists = await checkEmailExists(email)
      if (!isMounted.current) return

      if (isMounted.current) setEmailValid(!exists)
    } catch (error) {
      console.error("Email validation error:", error)
      if (isMounted.current) setEmailValid(null)
    }
  }

  // 비밀번호 강도 검사 함수 수정
  const checkPasswordStrength = (password: string) => {
    if (!password) {
      if (isMounted.current) {
        setPasswordStrength(0)
        setPasswordFeedback("")
      }
      return
    }

    // 8자 이상인 경우에만 강도를 높게 설정
    if (password.length >= 8) {
      if (isMounted.current) {
        setPasswordStrength(5) // 최대 강도로 설정
        setPasswordFeedback("사용 가능한 비밀번호")
      }
    } else {
      // 8자 미만인 경우 강도를 낮게 설정
      const strength = Math.min(Math.floor(password.length / 2), 2)
      if (isMounted.current) {
        setPasswordStrength(strength)
        setPasswordFeedback("비밀번호는 8자 이상이어야 합니다")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    // handleSubmit 함수에서 비밀번호 강도 검사 조건 수정
    if (passwordStrength < 5) {
      setError("비밀번호는 8자 이상이어야 합니다.")
      return
    }

    // 이메일과 사용자 이름 유효성 검사는 기본적인 형식 검사만 수행합니다
    // 중복 검사는 Firebase Auth에 맡깁니다
    if (!email || !email.includes("@") || !email.includes(".")) {
      setError("유효한 이메일 주소를 입력해주세요.")
      return
    }

    if (!username || username.length < 3) {
      setError("사용자 이름은 최소 3자 이상이어야 합니다.")
      return
    }

    setIsLoading(true)

    try {
      await signUp(email, password, username)
      if (isMounted.current) {
        router.push("/")
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      // Firebase Auth 오류 메시지를 더 자세히 처리합니다
      if (!isMounted.current) return

      if (error.code === "auth/email-already-in-use") {
        setError("이미 사용 중인 이메일입니다.")
      } else if (error.code === "auth/invalid-email") {
        setError("유효하지 않은 이메일 형식입니다.")
      } else if (error.code === "auth/weak-password") {
        setError("비밀번호가 너무 약합니다. 더 강력한 비밀번호를 사용해주세요.")
      } else {
        setError(error.message || "회원가입 중 오류가 발생했습니다.")
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }

  // 입력 변경 핸들러 - 디바운스 적용
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUsername(value)

    // 디바운스 적용
    const timeoutId = setTimeout(() => {
      if (isMounted.current) {
        validateUsername(value)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)

    // 디바운스 적용
    const timeoutId = setTimeout(() => {
      if (isMounted.current) {
        validateEmail(value)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    checkPasswordStrength(value)
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4 md:px-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 cyber-grid opacity-20"></div>
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl animate-pulse-slow opacity-20"></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse-slow opacity-20"></div>

        <div className="w-full max-w-md z-10">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-black/40 p-1 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 animate-gradient-slow"></div>
            <div className="absolute inset-px rounded-xl bg-gradient-to-br from-primary/5 to-blue-500/5 opacity-50"></div>
            <div className="relative rounded-xl bg-black/60 p-8">
              <div className="mb-8 flex flex-col items-center justify-center space-y-2 text-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-blue-500/70 shadow-lg">
                  <Shield className="h-8 w-8 text-primary-foreground" />
                  <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-primary to-blue-500/70 opacity-30 blur-sm animate-pulse"></div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  회원가입
                </h1>
                <p className="text-sm text-gray-400">계정을 만들고 보안 도전에 참여하세요</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 bg-red-900/20 border border-red-500/50 backdrop-blur-sm">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-gray-300">
                    사용자 이름
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-70 blur group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-black/80 rounded-lg border border-white/10 transition-all duration-300 group-hover:border-white/20">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="사용자 이름"
                        className={`pl-10 rounded-lg bg-transparent border-0 text-white focus:ring-1 focus:ring-primary/50 h-12 ${
                          usernameValid === false
                            ? "border-red-500 pr-10"
                            : usernameValid === true
                              ? "border-green-500 pr-10"
                              : ""
                        }`}
                        value={username}
                        onChange={handleUsernameChange}
                        required
                        maxLength={20}
                      />
                      {usernameValid !== null && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {usernameValid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    <Info className="inline h-3 w-3 mr-1" />
                    3-20자의 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있습니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                    이메일
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-70 blur group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-black/80 rounded-lg border border-white/10 transition-all duration-300 group-hover:border-white/20">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        className={`pl-10 rounded-lg bg-transparent border-0 text-white focus:ring-1 focus:ring-primary/50 h-12 ${
                          emailValid === false
                            ? "border-red-500 pr-10"
                            : emailValid === true
                              ? "border-green-500 pr-10"
                              : ""
                        }`}
                        value={email}
                        onChange={handleEmailChange}
                        required
                      />
                      {emailValid !== null && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {emailValid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                    비밀번호
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-70 blur group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-black/80 rounded-lg border border-white/10 transition-all duration-300 group-hover:border-white/20">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        className="pl-10 rounded-lg bg-transparent border-0 text-white focus:ring-1 focus:ring-primary/50 h-12"
                        value={password}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                  </div>
                  {password && (
                    <>
                      <div className="relative mt-2">
                        <Progress
                          value={passwordStrength * 20}
                          className="h-1.5 rounded-full overflow-hidden bg-gray-800"
                        >
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength <= 2
                                ? "bg-red-500"
                                : passwordStrength === 3
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${passwordStrength * 20}%` }}
                          />
                        </Progress>
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          passwordStrength <= 2
                            ? "text-red-400"
                            : passwordStrength === 3
                              ? "text-yellow-400"
                              : "text-green-400"
                        }`}
                      >
                        {passwordFeedback}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        <Info className="inline h-3 w-3 mr-1" />
                        비밀번호는 8자 이상이어야 합니다.
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-300">
                    비밀번호 확인
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-70 blur group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-black/80 rounded-lg border border-white/10 transition-all duration-300 group-hover:border-white/20">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        className={`pl-10 rounded-lg bg-transparent border-0 text-white focus:ring-1 focus:ring-primary/50 h-12 ${
                          confirmPassword && password !== confirmPassword
                            ? "border-red-500 pr-10"
                            : confirmPassword && password === confirmPassword
                              ? "border-green-500 pr-10"
                              : ""
                        }`}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      {confirmPassword && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {password === confirmPassword ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">비밀번호가 일치하지 않습니다.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 rounded-lg text-white font-medium text-lg shadow-lg shadow-blue-900/20 transition-all duration-300 hover:shadow-blue-900/40"
                  disabled={
                    isLoading ||
                    usernameValid === false ||
                    emailValid === false ||
                    passwordStrength < 3 ||
                    password !== confirmPassword
                  }
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      회원가입 중...
                    </div>
                  ) : (
                    "회원가입"
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center text-sm">
                <span className="text-gray-400">이미 계정이 있으신가요?</span>{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary/90 underline-offset-4 hover:text-primary transition-colors"
                >
                  로그인
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
