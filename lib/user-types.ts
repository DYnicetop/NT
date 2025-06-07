import { Timestamp } from "firebase/firestore"

// 소속 정보 타입 정의
export interface Affiliation {
  id: string
  name: string
  department?: string
  startDate?: string
  endDate?: string
  isVerified: boolean
  verificationRequestDate?: Timestamp
  verifiedBy?: string
  verifiedAt?: Timestamp
}

// 사용자 상태 타입 정의
export interface UserStatus {
  status: "active" | "suspended" | "banned" | "restricted"
  reason?: string
  appliedBy?: string
  appliedAt?: Timestamp
  expiresAt?: Timestamp
}

// 제재 정보 타입 정의
export interface Sanction {
  id: string
  type: "warning" | "restriction" | "suspension" | "ban"
  reason: string
  appliedBy: string
  appliedAt: Timestamp
  expiresAt?: Timestamp
  isActive: boolean
  details?: string
}

// 사용자 프로필 타입 정의
export interface UserProfile {
  uid: string
  username: string
  email?: string
  photoURL?: string
  bio?: string
  location?: string
  website?: string
  points: number
  wargamePoints: number
  ctfPoints: number
  solvedChallenges: string[]
  createdAt: Timestamp
  lastLogin?: Timestamp
  rank?: number
  title?: string // 칭호 필드 추가
  // 여러 소속 정보를 배열로 저장
  affiliations?: Affiliation[]
  // 레벨 시스템 관련 필드
  exp?: number
  level?: number
  // 업적 시스템 관련 필드
  achievements?: string[]
  // 티어 시스템 관련 필드
  tier?: string
  // 연속 로그인 관련 필드
  streak?: number
  lastStreak?: Timestamp
  status?: UserStatus
  sanctions?: Sanction[]
}

// 해결한 문제 타입 정의
export interface SolvedChallenge {
  id: string
  title: string
  category: string
  difficulty: string
  points: number
  solvedAt: Timestamp
  type: "wargame" | "ctf"
  contestId?: string
  contestTitle?: string
}

// 사용자 프로필 데이터 정규화 함수
export function normalizeUserProfileData(data: any, id: string): UserProfile {
  return {
    uid: id,
    username: data.username || "사용자",
    email: data.email,
    photoURL: data.photoURL,
    bio: data.bio || "",
    location: data.location || "",
    website: data.website || "",
    points: data.points || 0,
    wargamePoints: data.wargamePoints || 0,
    ctfPoints: data.ctfPoints || 0,
    solvedChallenges: data.solvedChallenges || [],
    createdAt: data.createdAt || Timestamp.now(),
    lastLogin: data.lastLogin,
    rank: data.rank || 0,
    title: data.title || (data.role === "admin" ? "관리자" : undefined),
    role: data.role,
    // 소속 정보 배열
    affiliations: data.affiliations || [],
    // 레벨 시스템 관련 필드
    exp: data.exp || 0,
    level: data.level || 1,
    // 업적 시스템 관련 필드
    achievements: data.achievements || [],
    // 티어 시스템 관련 필드
    tier: data.tier || "Bronze",
    // 연속 로그인 관련 필드
    streak: data.streak || 0,
    lastStreak: data.lastStreak,
    status: data.status,
    sanctions: data.sanctions,
  }
}
