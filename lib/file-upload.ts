export interface UploadResult {
  success: boolean
  fileUrl?: string
  fileName?: string
  error?: string
  details?: any
}

// 파일명 안전하게 변환
function sanitizeFileName(fileName: string): string {
  // 한글 및 특수문자를 안전한 문자로 변환
  return fileName
    .replace(/[^\w\s.-]/g, "_") // 특수문자를 언더스코어로
    .replace(/\s+/g, "_") // 공백을 언더스코어로
    .replace(/_{2,}/g, "_") // 연속된 언더스코어를 하나로
    .toLowerCase()
}

// 로컬 파일 업로드
export async function uploadFile(file: File, folder = "challenges"): Promise<UploadResult> {
  console.log("=== uploadFile function called ===")

  // 파일 객체 상세 검사
  console.log("File object inspection:", {
    file: file,
    isFile: file instanceof File,
    isBlob: file instanceof Blob,
    constructor: file?.constructor?.name,
    name: file?.name,
    size: file?.size,
    type: file?.type,
    lastModified: file?.lastModified,
  })

  // 파일 유효성 검사
  if (!file) {
    console.error("No file provided")
    return {
      success: false,
      error: "No file provided",
      details: { file: file },
    }
  }

  if (!(file instanceof File) && !(file instanceof Blob)) {
    console.error("Invalid file type:", typeof file, file?.constructor?.name)
    return {
      success: false,
      error: "Invalid file type",
      details: { type: typeof file, constructor: file?.constructor?.name },
    }
  }

  if (file.size === 0) {
    console.error("File is empty")
    return {
      success: false,
      error: "File is empty",
      details: { size: file.size },
    }
  }

  // 파일 크기 제한 (100MB)
  const maxSize = 100 * 1024 * 1024 // 100MB
  if (file.size > maxSize) {
    console.error("File too large:", file.size)
    return {
      success: false,
      error: "File too large (max 100MB)",
      details: { size: file.size, maxSize },
    }
  }

  // 파일명 안전하게 처리
  const originalName = file.name
  const safeName = sanitizeFileName(originalName)
  const timestamp = Date.now()
  const finalName = `${timestamp}_${safeName}`

  console.log("File name processing:", {
    original: originalName,
    safe: safeName,
    final: finalName,
  })

  try {
    // 새로운 File 객체 생성 (안전한 파일명으로)
    const safeFile = new File([file], finalName, {
      type: file.type,
      lastModified: file.lastModified,
    })

    console.log("Safe file created:", {
      name: safeFile.name,
      size: safeFile.size,
      type: safeFile.type,
    })

    const formData = new FormData()
    formData.append("file", safeFile)
    formData.append("folder", folder)
    formData.append("originalName", originalName)

    console.log("Sending request to /api/upload-file...")

    const response = await fetch("/api/upload-file", {
      method: "POST",
      body: formData,
    })

    console.log("Response received:")
    console.log("  Status:", response.status)
    console.log("  Status Text:", response.statusText)
    console.log("  OK:", response.ok)

    let responseText: string
    try {
      responseText = await response.text()
      console.log("  Response text:", responseText)
    } catch (textError) {
      console.error("Failed to read response text:", textError)
      return {
        success: false,
        error: "Failed to read server response",
        details: textError,
      }
    }

    let result: any
    try {
      result = JSON.parse(responseText)
      console.log("  Parsed result:", result)
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError)
      return {
        success: false,
        error: "Invalid JSON response from server",
        details: { responseText, parseError },
      }
    }

    if (!response.ok) {
      console.error("Server returned error:", result)
      return {
        success: false,
        error: result.error || `Server error: ${response.status}`,
        details: result,
      }
    }

    if (!result.success) {
      console.error("Upload marked as failed:", result)
      return {
        success: false,
        error: result.error || "Upload failed",
        details: result,
      }
    }

    console.log("✅ Upload successful:", result)

    // 파일 URL을 쿼리 파라미터 방식으로 변경
    const relativePath = result.fileUrl.replace("/uploads/", "")
    const fileUrl = `/api/file?path=${encodeURIComponent(relativePath)}`

    return {
      success: true,
      fileUrl: fileUrl, // 쿼리 파라미터 방식 사용
      fileName: result.fileName,
    }
  } catch (error) {
    console.error("❌ Client-side upload error:", error)
    console.error("Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : "Network or client error",
      details: error,
    }
  }
}
