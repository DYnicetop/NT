"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Button } from "@/components/ui/button"

// 전역 알림 리스너 컴포넌트
export function NotificationListener() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // 실시간 알림 리스너 설정
  useEffect(() => {
    if (!user) return

    let unsubscribe: () => void = () => {}

    const setupNotificationListener = async () => {
      try {
        console.log("Setting up real-time notification listener for user:", user.uid)

        // 읽지 않은 알림 리스너
        const notificationsRef = collection(db, "notifications")
        const q = query(
          notificationsRef,
          where("userId", "==", user.uid),
          where("read", "==", false),
          orderBy("createdAt", "desc"),
          limit(20),
        )

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            // 새 알림이 추가되었는지 확인
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const data = change.doc.data()

                // 서버 타임스탬프가 아직 설정되지 않은 새 문서는 건너뜀
                if (!data.createdAt) return

                // 현재 시간과 문서 생성 시간의 차이가 10분 이내인 경우에만 토스트 표시
                // 이렇게 하면 앱을 처음 로드할 때 모든 알림에 대해 토스트가 표시되는 것을 방지
                const now = new Date()
                const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
                const timeDiff = (now.getTime() - createdAt.getTime()) / 1000 / 60 // 분 단위

                if (timeDiff <= 10) {
                  // 토스트 알림 표시
                  toast({
                    title: data.title || "새 알림",
                    description: data.message || "새로운 알림이 도착했습니다.",
                    action: data.link ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push(data.link)
                          // 읽음 표시
                          updateDoc(doc(db, "notifications", change.doc.id), {
                            read: true,
                          }).catch(console.error)
                        }}
                      >
                        보기
                      </Button>
                    ) : undefined,
                  })
                }
              }
            })
          },
          (error) => {
            console.error("Error in notifications listener:", error)
          },
        )
      } catch (error) {
        console.error("Error setting up notification listeners:", error)
      }
    }

    setupNotificationListener()

    // 컴포넌트 언마운트 시 리스너 해제
    return () => {
      console.log("Cleaning up notification listeners")
      unsubscribe()
    }
  }, [user, toast, router])

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null
}
