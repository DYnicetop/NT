import { NotificationDebug } from "@/components/notification-debug"

export default function NotificationDebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">알림 시스템 디버그</h1>
      <p className="mb-6 text-muted-foreground">
        이 페이지는 알림 시스템을 디버그하기 위한 도구를 제공합니다. 알림 데이터를 확인하고 테스트 알림을 보낼 수
        있습니다.
      </p>
      <NotificationDebug />
    </div>
  )
}
