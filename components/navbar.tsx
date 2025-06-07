"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Shield,
  Menu,
  XIcon,
  User,
  LogOut,
  Terminal,
  Trophy,
  Code,
  Settings,
  Home,
  SearchIcon,
  Bell,
  X,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useSearch } from "@/components/search-provider"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { NotificationCenter } from "@/components/notification-center"
import { useNotificationStore } from "@/lib/notification-store"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const { user, userProfile, signOut } = useAuth()
  const router = useRouter()

  const [searchOpen, setSearchOpen] = useState(false)
  const { query: searchQuery, setQuery: setSearchQuery, performSearch } = useSearch()
  const [searchResults, setSearchResults] = useState<any[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Zustand 스토어에서 알림 상태 가져오기
  const { unreadCount, newNotification, notificationsOpen, setNotificationsOpen } = useNotificationStore()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  const handleClearSearch = () => {
    setSearchQuery("")
  }

  // navItems 배열에 커리큘럼 항목 추가 (Trophy 앞에 추가)
  const navItems = [
    { title: "워게임", href: "/wargame", icon: Terminal },
    { title: "CTF", href: "/ctf", icon: Shield },
    { title: "커뮤니티", href: "/community", icon: User },
    { title: "커리큘럼", href: "/curriculum", icon: FileText },
    { title: "랭킹", href: "/ranking", icon: Trophy },
    { title: "제작자", href: "/creators", icon: Code },
  ]

  const isAdmin = userProfile?.role === "admin"

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full backdrop-blur-md transition-all duration-300",
        isScrolled ? "bg-background/90 border-b shadow-sm" : "bg-transparent",
      )}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-3" onClick={closeMenu}>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/70 shadow-lg">
              <Shield className="h-5 w-5 text-primary-foreground" />
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-primary to-primary/70 opacity-30 blur-sm"></div>
            </div>
            <span className="text-xl font-bold tracking-tight">NT-SecurityChallenges</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.title}>
                <Link href={item.href} legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent transition-colors",
                      pathname === item.href ? "text-primary" : "text-foreground/80 hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </span>
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full transition-all duration-200 hover:bg-muted relative",
                newNotification && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
              onClick={() => setNotificationsOpen(true)}
              aria-label="Notifications"
            >
              <AnimatePresence>
                {newNotification && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 w-full h-full rounded-full bg-primary/20"
                  />
                )}
              </AnimatePresence>

              <Bell className="h-[1.2rem] w-[1.2rem]" />

              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>

              <span className="sr-only">Notifications</span>
            </Button>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full transition-all duration-200 hover:bg-muted"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <SearchIcon className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Search</span>
            </Button>
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full p-0 overflow-hidden border border-border"
                >
                  <Image
                    src={user.photoURL || "/placeholder.svg"}
                    alt={user.displayName || "사용자"}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: "center" }}
                    priority
                    onError={(e) => {
                      // 이미지 로딩 실패 시 기본 이미지로 대체
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg"
                    }}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || "사용자"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Home className="mr-2 h-4 w-4" />
                  <Link href="/mypage">마이페이지</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <Link href="/profile">프로필 설정</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <Link href="/admin">관리자 대시보드</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-full h-9 px-4 text-sm font-medium">
                  로그인
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="rounded-full h-9 px-4 text-sm font-medium bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  회원가입
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-full transition-all duration-200 hover:bg-muted relative",
              newNotification && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
            onClick={() => setNotificationsOpen(true)}
            aria-label="Notifications"
          >
            <Bell className="h-[1.2rem] w-[1.2rem]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full transition-all duration-200 hover:bg-muted"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <SearchIcon className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Search</span>
          </Button>
          <button className="flex items-center justify-center" onClick={toggleMenu} aria-label="Toggle menu">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="fixed inset-0 top-20 z-50 bg-background/95 backdrop-blur-md md:hidden">
          <nav className="container mx-auto flex flex-col gap-4 p-6">
            {navItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 text-lg font-medium py-3 border-b border-border/30 transition-colors",
                  pathname === item.href ? "text-primary" : "text-foreground/80",
                )}
                onClick={closeMenu}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            ))}
            <div className="mt-6 flex flex-col gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 py-3">
                    <Image
                      src={user.photoURL || "/placeholder.svg"}
                      alt={user.displayName || "사용자"}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                      style={{ objectPosition: "center" }}
                      priority
                    />
                    <div>
                      <p className="font-medium">{user.displayName || "사용자"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Link href="/mypage" onClick={closeMenu}>
                    <Button variant="outline" className="w-full rounded-full justify-start">
                      <Home className="mr-2 h-4 w-4" />
                      마이페이지
                    </Button>
                  </Link>
                  <Link href="/profile" onClick={closeMenu}>
                    <Button variant="outline" className="w-full rounded-full justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      프로필 설정
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={closeMenu}>
                      <Button variant="outline" className="w-full rounded-full justify-start">
                        <Settings className="mr-2 h-4 w-4" />
                        관리자 대시보드
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full rounded-full justify-start"
                    onClick={() => {
                      signOut()
                      closeMenu()
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    로그아웃
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={closeMenu}>
                    <Button variant="outline" className="w-full rounded-full">
                      로그인
                    </Button>
                  </Link>
                  <Link href="/register" onClick={closeMenu}>
                    <Button className="w-full rounded-full">회원가입</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>검색</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSearch} className="mt-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="워게임, CTF, 커뮤니티 검색..."
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button type="button" onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <XIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button type="submit" className="w-full mt-4">
              검색
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-medium">검색 결과</h3>
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <Link
                    key={result.id}
                    href={result.url}
                    className="block p-3 rounded-md hover:bg-accent transition-colors"
                    onClick={() => setSearchOpen(false)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{result.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.type === "wargame" && "워게임"}
                          {result.type === "ctf" && "CTF 대회"}
                          {result.type === "community" && "커뮤니티 게시글"}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        바로가기
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="mt-6 text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <SearchIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">검색 결과가 없습니다</h3>
              <p className="text-sm text-muted-foreground mt-2">다른 검색어로 시도해보세요.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 새로운 알림 센터 컴포넌트 */}
      <NotificationCenter open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </header>
  )
}
