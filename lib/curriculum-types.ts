import type { Timestamp } from "firebase/firestore"

export interface Curriculum {
  id: string
  title: string
  description: string
  content: string // 마크다운 콘텐츠
  category: string
  thumbnailUrl?: string
  createdAt: Timestamp | { toDate: () => Date }
  updatedAt: Timestamp | { toDate: () => Date }
  createdBy: string
  createdByName: string
  isPublished: boolean
  viewCount: number
  tags?: string[]
  isPasswordProtected?: boolean
  password?: string
  steps?: CurriculumStep[]
  currentStep?: number
  totalSteps?: number
  difficulty?: "Easy" | "Medium" | "Hard" | "Expert"
  estimatedTime?: string // 예상 소요 시간
  prerequisites?: string[] // 선수 과목
  learningObjectives?: string[] // 학습 목표
  instructor?: string // 강사명
  language?: string // 언어
  skillLevel?: "Beginner" | "Intermediate" | "Advanced" | "Expert"
  courseType?: "Skill Path" | "Job Role Path" | "Single Course"
  rating?: number // 평점
  enrollmentCount?: number // 수강생 수
}

export interface CurriculumCategory {
  id: string
  name: string
  description: string
  order: number
  createdAt: Timestamp | { toDate: () => Date }
  updatedAt: Timestamp | { toDate: () => Date }
  createdBy: string
}

export interface CurriculumStep {
  id: string
  title: string
  content: string
  order: number
  isCompleted?: boolean
  videoUrl?: string // 비디오 URL
  duration?: string // 단계별 소요 시간
  resources?: string[] // 추가 자료 링크
}

export interface UserCurriculumProgress {
  userId: string
  curriculumId: string
  currentStep: number
  completedSteps: string[]
  lastAccessedAt: Timestamp | { toDate: () => Date }
  startedAt: Timestamp | { toDate: () => Date }
  completedAt?: Timestamp | { toDate: () => Date }
}

export interface Banner {
  id: string
  title: string
  description: string
  imageUrl: string
  linkUrl?: string
  isActive: boolean
  order: number
  backgroundColor: string
  textColor: string
  buttonText?: string
  buttonColor?: string
  createdAt: Timestamp | { toDate: () => Date }
  updatedAt: Timestamp | { toDate: () => Date }
  createdBy: string
  startDate?: Timestamp | { toDate: () => Date }
  endDate?: Timestamp | { toDate: () => Date }
}
