"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, limit, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { type WargameChallenge, normalizeWargameChallengeData } from "@/lib/wargame-types"
import { type CTFContest, type CTFProblem, normalizeContestData, normalizeProblemData } from "@/lib/ctf-types"

type SearchResultsType = {
  wargames: WargameChallenge[]
  ctfContests: CTFContest[]
  ctfProblems: CTFProblem[]
  community: any[]
  users: any[]
}

type SearchContextType = {
  query: string
  setQuery: (query: string) => void
  performSearch: () => void
  isSearching: boolean
  searchResults: SearchResultsType
  clearSearch: () => void
  searchCategory: string
  setSearchCategory: (category: string) => void
  searchFilters: {
    difficulty?: string
    category?: string
    dateRange?: string
  }
  setSearchFilters: (filters: any) => void
}

const initialSearchResults: SearchResultsType = {
  wargames: [],
  ctfContests: [],
  ctfProblems: [],
  community: [],
  users: [],
}

const SearchContext = createContext<SearchContextType>({
  query: "",
  setQuery: () => {},
  performSearch: () => {},
  isSearching: false,
  searchResults: initialSearchResults,
  clearSearch: () => {},
  searchCategory: "all",
  setSearchCategory: () => {},
  searchFilters: {},
  setSearchFilters: () => {},
})

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResultsType>(initialSearchResults)
  const [searchCategory, setSearchCategory] = useState("all")
  const [searchFilters, setSearchFilters] = useState({})
  const router = useRouter()

  // Reset search results when query changes
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(initialSearchResults)
    }
  }, [query])

  const performSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)

    try {
      // Navigate to search page with query
      router.push(`/search?q=${encodeURIComponent(query)}&category=${searchCategory}`)

      // Perform actual search based on category
      const results = { ...initialSearchResults }

      // Search wargames
      if (searchCategory === "all" || searchCategory === "wargame") {
        const wargameRef = collection(db, "wargame_challenges")
        // 기존 쿼리를 아래와 같이 변경
        const wargameQuery = query(wargameRef, orderBy("title"), limit(20))

        const wargameSnapshot = await getDocs(wargameQuery)
        const wargames: WargameChallenge[] = []

        wargameSnapshot.forEach((doc) => {
          const data = doc.data()
          // 검색어가 비어있거나 제목/설명에 검색어가 포함된 경우만 결과에 추가
          if (
            !query.trim() ||
            data.title?.toLowerCase().includes(query.toLowerCase()) ||
            data.description?.toLowerCase().includes(query.toLowerCase()) ||
            data.category?.toLowerCase().includes(query.toLowerCase())
          ) {
            wargames.push(normalizeWargameChallengeData(data, doc.id))
          }
        })

        results.wargames = wargames
      }

      // Search CTF contests
      if (searchCategory === "all" || searchCategory === "ctf") {
        const ctfRef = collection(db, "ctf_contests")
        const ctfQuery = query(ctfRef, orderBy("title"), limit(20))

        // 기존 쿼리를 아래와 같이 변경
        const ctfSnapshot = await getDocs(ctfQuery)
        const ctfContests: CTFContest[] = []

        ctfSnapshot.forEach((doc) => {
          const data = doc.data()
          if (
            !query.trim() ||
            data.title?.toLowerCase().includes(query.toLowerCase()) ||
            data.description?.toLowerCase().includes(query.toLowerCase())
          ) {
            ctfContests.push(normalizeContestData(data, doc.id))
          }
        })

        results.ctfContests = ctfContests
      }

      // Search CTF problems
      if (searchCategory === "all" || searchCategory === "ctf_problem") {
        const problemRef = collection(db, "ctf_problems")
        const problemQuery = query(problemRef, orderBy("title"), limit(20))

        const problemSnapshot = await getDocs(problemQuery)
        const ctfProblems: CTFProblem[] = []

        problemSnapshot.forEach((doc) => {
          const data = doc.data()
          if (
            !query.trim() ||
            data.title?.toLowerCase().includes(query.toLowerCase()) ||
            data.description?.toLowerCase().includes(query.toLowerCase()) ||
            data.category?.toLowerCase().includes(query.toLowerCase())
          ) {
            ctfProblems.push(normalizeProblemData(data, doc.id))
          }
        })

        results.ctfProblems = ctfProblems
      }

      // Search community posts
      if (searchCategory === "all" || searchCategory === "community") {
        const communityRef = collection(db, "community_posts")
        const communityQuery = query(communityRef, orderBy("createdAt", "desc"), limit(20))

        const communitySnapshot = await getDocs(communityQuery)
        const community: any[] = []

        communitySnapshot.forEach((doc) => {
          const data = doc.data()
          if (
            !query.trim() ||
            data.title?.toLowerCase().includes(query.toLowerCase()) ||
            data.content?.toLowerCase().includes(query.toLowerCase())
          ) {
            community.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            })
          }
        })

        results.community = community
      }

      // Search users
      if (searchCategory === "all" || searchCategory === "user") {
        const userRef = collection(db, "users")
        const userQuery = query(userRef, limit(20))

        const userSnapshot = await getDocs(userQuery)
        const users: any[] = []

        userSnapshot.forEach((doc) => {
          const data = doc.data()
          if (
            !query.trim() ||
            data.username?.toLowerCase().includes(query.toLowerCase()) ||
            data.email?.toLowerCase().includes(query.toLowerCase())
          ) {
            users.push({
              id: doc.id,
              ...data,
            })
          }
        })

        results.users = users
      }

      // Apply filters if any
      if (Object.keys(searchFilters).length > 0) {
        // Filter wargames
        if (searchFilters.difficulty) {
          results.wargames = results.wargames.filter((item) => item.difficulty === searchFilters.difficulty)
        }

        if (searchFilters.category) {
          results.wargames = results.wargames.filter((item) => item.category === searchFilters.category)
        }

        // Filter CTF problems
        if (searchFilters.difficulty) {
          results.ctfProblems = results.ctfProblems.filter((item) => item.difficulty === searchFilters.difficulty)
        }

        if (searchFilters.category) {
          results.ctfProblems = results.ctfProblems.filter((item) => item.category === searchFilters.category)
        }
      }

      setSearchResults(results)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearch = () => {
    setQuery("")
    setSearchResults(initialSearchResults)
    setSearchFilters({})
  }

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        performSearch,
        isSearching,
        searchResults,
        clearSearch,
        searchCategory,
        setSearchCategory,
        searchFilters,
        setSearchFilters,
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export const useSearch = () => useContext(SearchContext)
