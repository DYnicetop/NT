import { create } from "zustand"
import type { Timestamp } from "firebase/firestore"

// 알림 타입 정의
export type Notification = {
  id: string
  userId: string
  title: string
  message: string
  type:
    | "announcement"
    | "ctf"
    | "wargame"
    | "community"
    | "verification"
    | "system"
    | "achievement"
    | "level_up"
    | "tier_up"
    | "admin_action"
    | "info"
    | "success"
    | "warning"
    | "error"
  read: boolean
  createdAt: Timestamp | { toDate: () => Date }
  link?: string
  expiresAt?: Timestamp
  priority?: "low" | "medium" | "high"
}

// 알림 상태 타입 정의
type NotificationState = {
  notifications: Notification[]
  unreadCount: number
  newNotification: boolean
  notificationsOpen: boolean
  setNotifications: (notifications: Notification[]) => void
  setUnreadCount: (count: number) => void
  setNewNotification: (value: boolean) => void
  setNotificationsOpen: (open: boolean) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
}

// Zustand 스토어 생성
export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  newNotification: false,
  notificationsOpen: false,

  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setNewNotification: (value) => set({ newNotification: value }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),

  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
      unreadCount: 0,
    })),
}))
