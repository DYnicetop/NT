"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
  updateDoc,
  Timestamp,
  getDocs,
} from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"

type Notification = {
  id: string
  title: string
  message: string
  type: string
  link?: string
  read: boolean
  createdAt: any
  userId: string
}

export function NotificationSystem() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  // 알림 읽음 처리 함수
  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const notificationRef = doc(db, "notifications", notificationId)
      await updateDoc(notificationRef, {
        read: true,
      })

      // 로컬 상태 업데이트
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        ),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return

    try {
      // 읽지 않은 알림만 필터링
      const unreadNotifications = notifications.filter((notification) => !notification.read)

      // 각 알림을 읽음으로 업데이트
      const updatePromises = unreadNotifications.map((notification) =>
        updateDoc(doc(db, "notifications", notification.id), { read: true }),
      )

      await Promise.all(updatePromises)

      // 로컬 상태 업데이트
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  // 알림 클릭 처리
  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link)
    }

    if (!notification.read) {
      markAsRead(notification.id)
    }

    setIsOpen(false)
  }

  // 실시간 알림 리스너 설정
  useEffect(() => {
    if (!user) return

    // 마지막으로 확인한 시간 가져오기
    const lastCheckedKey = `lastChecked_${user.uid}`
    const lastChecked = localStorage.getItem(lastCheckedKey)
      ? new Date(localStorage.getItem(lastCheckedKey) as string)
      : new Date(0)

    // 현재 시간을 마지막 확인 시간으로 설정
    localStorage.setItem(lastCheckedKey, new Date().toISOString())

    let unsubscribe: () => void = () => {}

    const setupNotificationListener = async () => {
      try {
        console.log("Setting up real-time notification listener for user:", user.uid)

        // 사용자의 모든 알림 쿼리
        const notificationsRef = collection(db, "notifications")
        const q = query(notificationsRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(20))

        // 초기 알림 데이터 로드
        const initialSnapshot = await getDocs(q)
        const initialNotifications = initialSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          read: doc.data().read || false,
          createdAt: doc.data().createdAt || Timestamp.now(),
        })) as Notification[]

        setNotifications(initialNotifications)
        setUnreadCount(initialNotifications.filter((n) => !n.read).length)

        // 실시간 리스너 설정
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            // 새 알림이 추가되었는지 확인
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const data = change.doc.data() as Omit<Notification, "id">

                // 이미 로컬 상태에 있는 알림인지 확인
                const existingNotification = initialNotifications.find((n) => n.id === change.doc.id)
                if (existingNotification) return

                // 새 알림 객체 생성
                const newNotification: Notification = {
                  id: change.doc.id,
                  ...data,
                  read: data.read || false,
                  createdAt: data.createdAt || Timestamp.now(),
                }

                // 새 알림이 마지막 확인 시간 이후에 생성되었는지 확인
                const createdAt = newNotification.createdAt.toDate
                  ? newNotification.createdAt.toDate()
                  : new Date(newNotification.createdAt)

                if (createdAt > lastChecked) {
                  // 토스트 알림 표시
                  toast({
                    title: newNotification.title || "새 알림",
                    description: newNotification.message || "새로운 알림이 도착했습니다.",
                    action: newNotification.link ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push(newNotification.link!)
                          markAsRead(newNotification.id)
                        }}
                      >
                        보기
                      </Button>
                    ) : undefined,
                  })
                }

                // 로컬 상태 업데이트
                setNotifications((prev) => [newNotification, ...prev])
                if (!newNotification.read) {
                  setUnreadCount((prev) => prev + 1)
                }
              } else if (change.type === "modified") {
                // 알림 수정 처리
                const updatedData = change.doc.data() as Omit<Notification, "id">
                setNotifications((prev) =>
                  prev.map((notification) =>
                    notification.id === change.doc.id
                      ? {
                          ...notification,
                          ...updatedData,
                          read: updatedData.read || false,
                        }
                      : notification,
                  ),
                )

                // 읽음 상태가 변경되었으면 읽지 않은 알림 수 업데이트
                setUnreadCount((prev) => (prev = notifications.filter((n) => !n.read).length))
              } else if (change.type === "removed") {
                // 알림 삭제 처리
                setNotifications((prev) => prev.filter((notification) => notification.id !== change.doc.id))

                // 읽지 않은 알림 수 업데이트
                setUnreadCount((prev) => (prev = notifications.filter((n) => !n.read).length))
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

  if (!user) return null

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>알림</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
              모두 읽음 표시
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">알림이 없습니다</div>
        ) : (
          <>
            {notifications.slice(0, 5).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer ${!notification.read ? "bg-muted/50" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-between w-full">
                  <span className="font-medium">{notification.title}</span>
                  {!notification.read && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{notification.message}</p>
                <span className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(
                    notification.createdAt.toDate ? notification.createdAt.toDate() : new Date(notification.createdAt),
                    { addSuffix: true, locale: ko },
                  )}
                </span>
              </DropdownMenuItem>
            ))}

            {notifications.length > 5 && (
              <DropdownMenuItem
                className="text-center text-primary py-2 cursor-pointer"
                onClick={() => {
                  router.push("/notifications")
                  setIsOpen(false)
                }}
              >
                모든 알림 보기
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
