"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase-config"
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export function NotificationCenter() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  // 알림 가져오기 (실시간 리스너 사용)
  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // 실시간 리스너 설정
    const notificationsRef = collection(db, "notifications")
    const q = query(notificationsRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(30))

    // 실시간 리스너 등록
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationData: any[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          notificationData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
          })
        })

        setNotifications(notificationData)

        // 읽지 않은 알림 개수 계산
        const unread = notificationData.filter((notification) => !notification.read).length
        setUnreadCount(unread)

        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching notifications:", error)
        setIsLoading(false)
      },
    )

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe()
  }, [user])

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const notificationRef = doc(db, "notifications", notificationId)
      await updateDoc(notificationRef, {
        read: true,
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return

    try {
      const unreadNotifications = notifications.filter((notification) => !notification.read)

      if (unreadNotifications.length === 0) return

      const batch = db.batch()

      unreadNotifications.forEach((notification) => {
        const notificationRef = doc(db, "notifications", notification.id)
        batch.update(notificationRef, { read: true })
      })

      await batch.commit()

      toast({
        title: "모든 알림을 읽음 처리했습니다",
        description: `${unreadNotifications.length}개의 알림이 읽음 처리되었습니다.`,
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "오류 발생",
        description: "알림 읽음 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 알림 삭제
  const deleteNotification = async (notificationId: string) => {
    if (!user) return

    try {
      const notificationRef = doc(db, "notifications", notificationId)
      await deleteDoc(notificationRef)

      toast({
        title: "알림 삭제됨",
        description: "알림이 성공적으로 삭제되었습니다.",
      })
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({
        title: "오류 발생",
        description: "알림 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 모든 알림 삭제
  const deleteAllNotifications = async () => {
    if (!user || notifications.length === 0) return

    try {
      const notificationsRef = collection(db, "notifications")
      const q = query(notificationsRef, where("userId", "==", user.uid))
      const snapshot = await getDocs(q)

      if (snapshot.empty) return

      const batch = db.batch()

      snapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()

      toast({
        title: "모든 알림 삭제됨",
        description: `${snapshot.size}개의 알림이 삭제되었습니다.`,
      })
    } catch (error) {
      console.error("Error deleting all notifications:", error)
      toast({
        title: "오류 발생",
        description: "알림 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 알림 유형에 따른 아이콘 및 색상 설정
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case "announcement":
        return { icon: "📢", color: "bg-blue-500" }
      case "ctf":
        return { icon: "🚩", color: "bg-red-500" }
      case "wargame":
        return { icon: "🎮", color: "bg-purple-500" }
      case "verification":
        return { icon: "✅", color: "bg-green-500" }
      case "system":
        return { icon: "⚙️", color: "bg-gray-500" }
      case "achievement":
        return { icon: "🏆", color: "bg-yellow-500" }
      case "level_up":
        return { icon: "⬆️", color: "bg-green-500" }
      case "tier_up":
        return { icon: "🌟", color: "bg-yellow-500" }
      case "admin_action":
        return { icon: "👑", color: "bg-orange-500" }
      default:
        return { icon: "📌", color: "bg-gray-500" }
    }
  }

  if (!user) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <Tabs defaultValue="all">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h4 className="font-semibold">알림</h4>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="unread">안 읽음</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex justify-between px-4 py-2 border-b">
            <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
              모두 읽음 처리
            </Button>
            <Button variant="ghost" size="sm" onClick={deleteAllNotifications} disabled={notifications.length === 0}>
              모두 삭제
            </Button>
          </div>

          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex gap-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                      </div>
                    ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p>알림이 없습니다</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const { icon, color } = getNotificationStyle(notification.type)
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 flex gap-3 ${notification.read ? "opacity-70" : "bg-muted/30"}`}
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${color}`}>
                          <span>{icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h5 className="font-medium line-clamp-1">{notification.title}</h5>
                            <div className="flex gap-1">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <span className="sr-only">읽음 처리</span>
                                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <span className="sr-only">삭제</span>
                                <span className="text-xs">×</span>
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: ko })}
                            </span>
                            {notification.link && (
                              <Link
                                href={notification.link}
                                className="text-xs text-primary hover:underline"
                                onClick={() => {
                                  markAsRead(notification.id)
                                  setOpen(false)
                                }}
                              >
                                자세히 보기
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex gap-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                      </div>
                    ))}
                </div>
              ) : notifications.filter((n) => !n.read).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p>읽지 않은 알림이 없습니다</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications
                    .filter((notification) => !notification.read)
                    .map((notification) => {
                      const { icon, color } = getNotificationStyle(notification.type)
                      return (
                        <div key={notification.id} className="p-4 flex gap-3 bg-muted/30">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${color}`}
                          >
                            <span>{icon}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h5 className="font-medium line-clamp-1">{notification.title}</h5>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <span className="sr-only">읽음 처리</span>
                                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <span className="sr-only">삭제</span>
                                  <span className="text-xs">×</span>
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: ko })}
                              </span>
                              {notification.link && (
                                <Link
                                  href={notification.link}
                                  className="text-xs text-primary hover:underline"
                                  onClick={() => {
                                    markAsRead(notification.id)
                                    setOpen(false)
                                  }}
                                >
                                  자세히 보기
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
