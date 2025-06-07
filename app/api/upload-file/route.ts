import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  console.log("=== File Upload API Called ===")
  console.log("Request method:", request.method)
  console.log("Request headers:", Object.fromEntries(request.headers.entries()))

  try {
    // FormData 파싱
    let formData: FormData
    try {
      formData = await request.formData()
      console.log("FormData parsed successfully")
    } catch (parseError) {
      console.error("Failed to parse FormData:", parseError)
      return NextResponse.json(
        {
          error: "Failed to parse form data",
          details: parseError instanceof Error ? parseError.message : "Unknown parse error",
        },
        { status: 400 },
      )
    }

    // FormData 내용 로깅
    console.log("FormData contents:")
    const entries = Array.from(formData.entries())
    for (const [key, value] of entries) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    }

    // 파일 추출
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "challenges"
    const originalName = (formData.get("originalName") as string) || ""

    console.log("Extracted values:", {
      file: file ? `File(${file.name}, ${file.size} bytes)` : "null",
      folder: folder,
      originalName: originalName,
    })

    if (!file) {
      console.error("No file found in FormData")
      console.log("Available FormData keys:", Array.from(formData.keys()))
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size === 0) {
      console.error("File is empty")
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }

    console.log("File details:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      folder: folder,
      originalName: originalName,
    })

    // 파일명 처리 (이미 클라이언트에서 안전하게 처리됨)
    const fileName = file.name

    // 경로 설정
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder)
    const filePath = path.join(uploadDir, fileName)

    console.log("Paths:", {
      uploadDir,
      filePath,
      fileName,
    })

    // 디렉토리 생성
    try {
      await mkdir(uploadDir, { recursive: true })
      console.log("Directory created/verified:", uploadDir)
    } catch (dirError) {
      console.error("Directory creation failed:", dirError)
      return NextResponse.json(
        {
          error: "Failed to create upload directory",
          details: dirError instanceof Error ? dirError.message : "Unknown directory error",
        },
        { status: 500 },
      )
    }

    // 파일 데이터 읽기
    let buffer: Buffer
    try {
      const bytes = await file.arrayBuffer()
      buffer = Buffer.from(bytes)
      console.log("File buffer created, size:", buffer.length)
    } catch (bufferError) {
      console.error("Failed to read file data:", bufferError)
      return NextResponse.json(
        {
          error: "Failed to read file data",
          details: bufferError instanceof Error ? bufferError.message : "Unknown buffer error",
        },
        { status: 500 },
      )
    }

    // 파일 저장
    try {
      await writeFile(filePath, buffer)
      console.log("File saved successfully to:", filePath)
    } catch (writeError) {
      console.error("Failed to write file:", writeError)
      return NextResponse.json(
        {
          error: "Failed to save file",
          details: writeError instanceof Error ? writeError.message : "Unknown write error",
        },
        { status: 500 },
      )
    }

    // 파일 URL 생성
    const fileUrl = `/uploads/${folder}/${fileName}`

    const result = {
      success: true,
      fileUrl: fileUrl,
      fileName: fileName,
      originalName: originalName || file.name,
      size: file.size,
      type: file.type,
    }

    console.log("✅ Upload successful:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Unexpected upload error:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

// GET 메서드도 추가 (테스트용)
export async function GET() {
  return NextResponse.json({
    message: "File upload endpoint is working",
    timestamp: new Date().toISOString(),
  })
}
