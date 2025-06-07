"use client"

import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, User } from "lucide-react"
import Link from "next/link"

// CTF 참가자 타입 정의
type CTFParticipant = {
  uid: string
  username: string
  photoURL?: string
  score: number
  solvedProblems: string[]
  contestId: string
  rank?: number
  title?: string
  affiliation?: string
}

export function CTFLeaderboard({ limit: userLimit = 10 }: { limit?: number }) {
  const [topUsers, setTopUsers] = useState<CTFParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        setIsLoading(true)
        // CTF 참가자 컬렉션에서 상위 사용자 가져오기
        const participantsRef = collection(db, "ctf_participants")
        const q = query(participantsRef, orderBy("score", "desc"), limit(userLimit))
        const querySnapshot = await getDocs(q)

        const topUsersData: CTFParticipant[] = []
        let rank = 1

        querySnapshot.forEach((doc) => {
          const data = doc.data() as CTFParticipant
          topUsersData.push({
            ...data,
            rank,
          })
          rank++
        })

        setTopUsers(topUsersData)
      } catch (error) {
        console.error("Error fetching CTF top users:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopUsers()
  }, [userLimit])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          CTF Top {userLimit}
        </CardTitle>
        <CardDescription>CTF 대회 상위 {userLimit}명</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : topUsers.length > 0 ? (
          <div className="space-y-1">
            {topUsers.map((user) => (
              <Link
                key={user.uid}
                href={`/user/${user.uid}`}
                className="flex items-center justify-between px-6 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold">
                    {user.rank}
                  </div>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.username} />
                    <AvatarFallback>
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.username}</span>
                    {user.affiliation && <span className="text-xs text-muted-foreground">{user.affiliation}</span>}
                  </div>
                </div>
                <div className="font-bold text-sm">{user.score}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-4 text-center text-muted-foreground">
            <p>아직 CTF 참가자가 없습니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
