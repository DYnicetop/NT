"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Terminal,
  Shield,
  User,
  Clock,
  AlertCircle,
  Filter,
  ChevronDown,
  Code,
  FileText,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useSearch } from "@/components/search-provider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Categories for filtering
const categories = [
  { value: "웹 해킹", label: "웹 해킹" },
  { value: "리버싱", label: "리버싱" },
  { value: "포렌식", label: "포렌식" },
  { value: "암호학", label: "암호학" },
  { value: "pwnable", label: "Pwnable" },
  { value: "네트워크", label: "네트워크" },
  { value: "기타", label: "기타" },
]

// Difficulty levels
const difficultyLevels = [
  { value: "초급", label: "초급" },
  { value: "중급", label: "중급" },
  { value: "고급", label: "고급" },
]

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""
  const initialCategory = searchParams.get("category") || "all"

  const {
    query,
    setQuery,
    performSearch,
    searchResults,
    isSearching,
    searchCategory,
    setSearchCategory,
    searchFilters,
    setSearchFilters,
  } = useSearch()

  const [activeTab, setActiveTab] = useState(initialCategory === "all" ? "all" : initialCategory)

  // Set initial query and category from URL params
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery)
    }

    if (initialCategory && initialCategory !== searchCategory) {
      setSearchCategory(initialCategory)
    }

    // Trigger search if coming from URL with query
    if (initialQuery) {
      setTimeout(performSearch, 100)
    }
  }, [initialQuery, initialCategory, query, searchCategory, setQuery, setSearchCategory, performSearch])

  const { wargames, ctfContests, ctfProblems, community, users } = searchResults

  const totalResults = wargames.length + ctfContests.length + ctfProblems.length + community.length + users.length

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  const handleFilterChange = (type: string, value: string) => {
    setSearchFilters({
      ...searchFilters,
      [type]: value,
    })

    // Re-run search with new filters
    setTimeout(performSearch, 100)
  }

  const clearFilters = () => {
    setSearchFilters({})
    setTimeout(performSearch, 100)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* 검색 헤더 섹션 */}
        <section className="relative py-12 md:py-16 border-b">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-[800px]">
              <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">검색 결과</h1>

              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="워게임, CTF, 커뮤니티 검색..."
                  className="pl-10 py-6 text-lg rounded-lg"
                />
                <Button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md">
                  검색
                </Button>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground">
                  <strong>"{query}"</strong>에 대한 검색 결과 {totalResults}개를 찾았습니다.
                </p>

                <div className="flex gap-2">
                  {/* Category filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Filter className="h-4 w-4" />
                        카테고리
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {categories.map((category) => (
                        <DropdownMenuItem
                          key={category.value}
                          onClick={() => handleFilterChange("category", category.value)}
                          className={searchFilters.category === category.value ? "bg-accent" : ""}
                        >
                          {category.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Difficulty filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Filter className="h-4 w-4" />
                        난이도
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {difficultyLevels.map((level) => (
                        <DropdownMenuItem
                          key={level.value}
                          onClick={() => handleFilterChange("difficulty", level.value)}
                          className={searchFilters.difficulty === level.value ? "bg-accent" : ""}
                        >
                          {level.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Clear filters button */}
                  {(searchFilters.category || searchFilters.difficulty) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      필터 초기화
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 검색 결과 섹션 */}
        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-8">
                <TabsTrigger value="all">전체 ({totalResults})</TabsTrigger>
                <TabsTrigger value="wargame">워게임 ({wargames.length})</TabsTrigger>
                <TabsTrigger value="ctf">CTF 대회 ({ctfContests.length})</TabsTrigger>
                <TabsTrigger value="ctf_problem">CTF 문제 ({ctfProblems.length})</TabsTrigger>
                <TabsTrigger value="community">커뮤니티 ({community.length})</TabsTrigger>
                <TabsTrigger value="user">사용자 ({users.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-8">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    <p className="mt-4 text-muted-foreground">검색 중...</p>
                  </div>
                ) : (
                  <>
                    {totalResults > 0 ? (
                      <>
                        {/* Wargame Results */}
                        {wargames.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h2 className="text-xl font-bold flex items-center">
                                <Terminal className="mr-2 h-5 w-5" />
                                워게임 문제
                              </h2>
                              {wargames.length > 2 && (
                                <Button variant="link" onClick={() => setActiveTab("wargame")}>
                                  더 보기
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                              {wargames.slice(0, 2).map((item) => (
                                <Link href={`/wargame/${item.id}`} key={item.id}>
                                  <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50">
                                    <CardHeader>
                                      <div className="flex items-center justify-between">
                                        <Badge variant="outline">{item.category}</Badge>
                                        <Badge variant="secondary">{item.difficulty}</Badge>
                                      </div>
                                      <CardTitle className="mt-2">{item.title}</CardTitle>
                                      <CardDescription className="line-clamp-2">
                                        {item.description.replace(/<[^>]*>?/gm, "")}
                                      </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="flex justify-between">
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <Clock className="mr-1 h-3.5 w-3.5" />
                                        <span>{item.createdAt.toDate().toLocaleDateString()}</span>
                                      </div>
                                      <Badge variant="outline">{item.points} 점</Badge>
                                    </CardFooter>
                                  </Card>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* CTF Contest Results */}
                        {ctfContests.length > 0 && (
                          <div className="mt-12">
                            <div className="flex items-center justify-between mb-4">
                              <h2 className="text-xl font-bold flex items-center">
                                <Shield className="mr-2 h-5 w-5" />
                                CTF 대회
                              </h2>
                              {ctfContests.length > 2 && (
                                <Button variant="link" onClick={() => setActiveTab("ctf")}>
                                  더 보기
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                              {ctfContests.slice(0, 2).map((item) => (
                                <Link href={`/ctf/${item.id}`} key={item.id}>
                                  <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50">
                                    <CardHeader>
                                      <div className="flex justify-end">
                                        <Badge
                                          variant={
                                            item.status === "active"
                                              ? "default"
                                              : item.status === "upcoming"
                                                ? "secondary"
                                                : "outline"
                                          }
                                        >
                                          {item.status === "active"
                                            ? "진행중"
                                            : item.status === "upcoming"
                                              ? "예정됨"
                                              : "종료됨"}
                                        </Badge>
                                      </div>
                                      <CardTitle>{item.title}</CardTitle>
                                      <CardDescription className="line-clamp-2">
                                        {item.description.replace(/<[^>]*>?/gm, "")}
                                      </CardDescription>
                                    </CardHeader>
                                    <CardFooter>
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <Clock className="mr-1 h-3.5 w-3.5" />
                                        <span>
                                          {item.startTime.toDate().toLocaleDateString()} -{" "}
                                          {item.endTime.toDate().toLocaleDateString()}
                                        </span>
                                      </div>
                                    </CardFooter>
                                  </Card>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* CTF Problem Results */}
                        {ctfProblems.length > 0 && (
                          <div className="mt-12">
                            <div className="flex items-center justify-between mb-4">
                              <h2 className="text-xl font-bold flex items-center">
                                <Code className="mr-2 h-5 w-5" />
                                CTF 문제
                              </h2>
                              {ctfProblems.length > 2 && (
                                <Button variant="link" onClick={() => setActiveTab("ctf_problem")}>
                                  더 보기
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                              {ctfProblems.slice(0, 2).map((item) => (
                                <Link href={`/ctf/${item.contestId}?problem=${item.id}`} key={item.id}>
                                  <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50">
                                    <CardHeader>
                                      <div className="flex items-center justify-between">
                                        <Badge variant="outline">{item.category}</Badge>
                                        <Badge variant="secondary">{item.difficulty}</Badge>
                                      </div>
                                      <CardTitle className="mt-2">{item.title}</CardTitle>
                                      <CardDescription className="line-clamp-2">
                                        {item.description.replace(/<[^>]*>?/gm, "")}
                                      </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="flex justify-between">
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <Clock className="mr-1 h-3.5 w-3.5" />
                                        <span>{item.createdAt.toDate().toLocaleDateString()}</span>
                                      </div>
                                      <Badge variant="outline">{item.points} 점</Badge>
                                    </CardFooter>
                                  </Card>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Community Results */}
                        {community.length > 0 && (
                          <div className="mt-12">
                            <div className="flex items-center justify-between mb-4">
                              <h2 className="text-xl font-bold flex items-center">
                                <FileText className="mr-2 h-5 w-5" />
                                커뮤니티
                              </h2>
                              {community.length > 2 && (
                                <Button variant="link" onClick={() => setActiveTab("community")}>
                                  더 보기
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                              {community.slice(0, 2).map((item) => (
                                <Link href={`/community/${item.id}`} key={item.id}>
                                  <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50">
                                    <CardHeader>
                                      <CardTitle>{item.title}</CardTitle>
                                      <CardDescription className="line-clamp-2">
                                        {item.content?.replace(/<[^>]*>?/gm, "")}
                                      </CardDescription>
                                    </CardHeader>
                                    <CardFooter>
                                      <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                                        <span>{item.author || "익명"}</span>
                                        <div className="flex items-center">
                                          <Clock className="mr-1 h-3.5 w-3.5" />
                                          <span>{item.createdAt.toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </CardFooter>
                                  </Card>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* User Results */}
                        {users.length > 0 && (
                          <div className="mt-12">
                            <div className="flex items-center justify-between mb-4">
                              <h2 className="text-xl font-bold flex items-center">
                                <Users className="mr-2 h-5 w-5" />
                                사용자
                              </h2>
                              {users.length > 4 && (
                                <Button variant="link" onClick={() => setActiveTab("user")}>
                                  더 보기
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                              {users.slice(0, 4).map((user) => (
                                <Link href={`/user/${user.id}`} key={user.id}>
                                  <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50">
                                    <CardContent className="p-4 flex flex-col items-center text-center">
                                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 overflow-hidden">
                                        {user.photoURL ? (
                                          <img
                                            src={user.photoURL || "/placeholder.svg"}
                                            alt={user.displayName || "사용자"}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <User className="h-8 w-8 text-primary" />
                                        )}
                                      </div>
                                      <h3 className="font-medium">{user.displayName || "익명 사용자"}</h3>
                                      <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                                    </CardContent>
                                  </Card>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-2xl font-bold">검색 결과가 없습니다</h3>
                        <p className="text-muted-foreground mt-2 max-w-md">
                          다른 검색어로 시도하거나 더 일반적인 키워드를 사용해보세요.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Wargame Tab Content */}
              <TabsContent value="wargame">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    <p className="mt-4 text-muted-foreground">검색 중...</p>
                  </div>
                ) : (
                  <>
                    {wargames.length > 0 ? (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {wargames.map((item) => (
                          <Link href={`/wargame/${item.id}`} key={item.id}>
                            <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline">{item.category}</Badge>
                                  <Badge variant="secondary">{item.difficulty}</Badge>
                                </div>
                                <CardTitle className="mt-2">{item.title}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {item.description.replace(/<[^>]*>?/gm, "")}
                                </CardDescription>
                              </CardHeader>
                              <CardFooter className="flex justify-between">
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Clock className="mr-1 h-3.5 w-3.5" />
                                  <span>{item.createdAt.toDate().toLocaleDateString()}</span>
                                </div>
                                <Badge variant="outline">{item.points} 점</Badge>
                              </CardFooter>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-2xl font-bold">워게임 검색 결과가 없습니다</h3>
                        <p className="text-muted-foreground mt-2">다른 검색어로 시도해보세요.</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* CTF Contest Tab Content */}
              <TabsContent value="ctf">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    <p className="mt-4 text-muted-foreground">검색 중...</p>
                  </div>
                ) : (
                  <>
                    {ctfContests.length > 0 ? (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {ctfContests.map((item) => (
                          <Link href={`/ctf/${item.id}`} key={item.id}>
                            <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50">
                              <CardHeader>
                                <div className="flex justify-end">
                                  <Badge
                                    variant={
                                      item.status === "active"
                                        ? "default"
                                        : item.status === "upcoming"
                                          ? "secondary"
                                          : "outline"
                                    }
                                  >
                                    {item.status === "active"
                                      ? "진행중"
                                      : item.status === "upcoming"
                                        ? "예정됨"
                                        : "종료됨"}
                                  </Badge>
                                </div>
                                <CardTitle>{item.title}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {item.description.replace(/<[^>]*>?/gm, "")}
                                </CardDescription>
                              </CardHeader>
                              <CardFooter>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Clock className="mr-1 h-3.5 w-3.5" />
                                  <span>
                                    {item.startTime.toDate().toLocaleDateString()} -{" "}
                                    {item.endTime.toDate().toLocaleDateString()}
                                  </span>
                                </div>
                              </CardFooter>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-2xl font-bold">CTF 대회 검색 결과가 없습니다</h3>
                        <p className="text-muted-foreground mt-2">다른 검색어로 시도해보세요.</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* CTF Problem Tab Content */}
              <TabsContent value="ctf_problem">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    <p className="mt-4 text-muted-foreground">검색 중...</p>
                  </div>
                ) : (
                  <>
                    {ctfProblems.length > 0 ? (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {ctfProblems.map((item) => (
                          <Link href={`/ctf/${item.contestId}?problem=${item.id}`} key={item.id}>
                            <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline">{item.category}</Badge>
                                  <Badge variant="secondary">{item.difficulty}</Badge>
                                </div>
                                <CardTitle className="mt-2">{item.title}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {item.description.replace(/<[^>]*>?/gm, "")}
                                </CardDescription>
                              </CardHeader>
                              <CardFooter className="flex justify-between">
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Clock className="mr-1 h-3.5 w-3.5" />
                                  <span>{item.createdAt.toDate().toLocaleDateString()}</span>
                                </div>
                                <Badge variant="outline">{item.points} 점</Badge>
                              </CardFooter>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-2xl font-bold">CTF 문제 검색 결과가 없습니다</h3>
                        <p className="text-muted-foreground mt-2">다른 검색어로 시도해보세요.</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Community Tab Content */}
              <TabsContent value="community">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    <p className="mt-4 text-muted-foreground">검색 중...</p>
                  </div>
                ) : (
                  <>
                    {community.length > 0 ? (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {community.map((item) => (
                          <Link href={`/community/${item.id}`} key={item.id}>
                            <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50">
                              <CardHeader>
                                <CardTitle>{item.title}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {item.content?.replace(/<[^>]*>?/gm, "")}
                                </CardDescription>
                              </CardHeader>
                              <CardFooter>
                                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                                  <span>{item.author || "익명"}</span>
                                  <div className="flex items-center">
                                    <Clock className="mr-1 h-3.5 w-3.5" />
                                    <span>{item.createdAt.toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </CardFooter>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-2xl font-bold">커뮤니티 검색 결과가 없습니다</h3>
                        <p className="text-muted-foreground mt-2">다른 검색어로 시도해보세요.</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* User Tab Content */}
              <TabsContent value="user">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    <p className="mt-4 text-muted-foreground">검색 중...</p>
                  </div>
                ) : (
                  <>
                    {users.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {users.map((user) => (
                          <Link href={`/user/${user.id}`} key={user.id}>
                            <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50">
                              <CardContent className="p-4 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 overflow-hidden">
                                  {user.photoURL ? (
                                    <img
                                      src={user.photoURL || "/placeholder.svg"}
                                      alt={user.displayName || "사용자"}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="h-8 w-8 text-primary" />
                                  )}
                                </div>
                                <h3 className="font-medium">{user.displayName || "익명 사용자"}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-2xl font-bold">사용자 검색 결과가 없습니다</h3>
                        <p className="text-muted-foreground mt-2">다른 검색어로 시도해보세요.</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
