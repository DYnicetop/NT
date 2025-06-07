"use client"

import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type ActiveUser = {
  uid: string
  username: string
  photoURL?: string
  challengeId?: string
  challengeName?: string
  lastActive: Timestamp
}

export function ActiveChallengeUsers({ challengeId }: { challengeId: string }) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])

  useEffect(() => {
    const now = Timestamp.now()
    const fiveMinutesAgo = new Timestamp(now.seconds - 5 * 60, now.nanoseconds)

    const activeUsersRef = collection(db, "active_users")
    const q = query(activeUsersRef, where("lastActive", ">", fiveMinutesAgo), where("challengeId", "==", challengeId))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activeUsersData: ActiveUser[] = []
        snapshot.forEach((doc) => {
          activeUsersData.push(doc.data() as ActiveUser)
        })
        setActiveUsers(activeUsersData)
      },
      (error) => {
        console.error("Error getting active challenge users:", error)
      },
    )

    return () => unsubscribe()
  }, [challengeId])

  if (activeUsers.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
          {activeUsers.length}명이 이 문제를 풀고 있습니다
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeUsers.map((user) => (
          <Avatar key={user.uid} className="h-8 w-8 border border-primary/20">
            <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.username} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
    </div>
  )
}
