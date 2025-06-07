// 통합 마크다운 파서
export const parseMarkdown = (markdown: string): string => {
  if (!markdown) return ""

  let html = markdown

  // 1. 코드 블록 먼저 처리 (다른 문법과 충돌 방지)
  const codeBlocks: string[] = []
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length
    const language = lang || "text"
    const codeContent = code.trim()
    const highlightedCode = highlightCode(codeContent, language)

    codeBlocks.push(`
    <div class="my-6 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-gray-50 dark:bg-gray-900">
      <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div class="flex items-center gap-3">
          <span class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">${language}</span>
        </div>
        <button 
          class="copy-btn text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1" 
          onclick="copyMarkdownCode(this)" 
          data-code="${encodeURIComponent(codeContent)}"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
          복사
        </button>
      </div>
      <div class="relative">
        <pre class="bg-gray-900 text-gray-100 p-4 overflow-x-auto m-0 font-mono text-sm leading-relaxed"><code class="language-${language}">${highlightedCode}</code></pre>
      </div>
    </div>
  `)
    return `__CODE_BLOCK_${index}__`
  })

  // 2. 인라인 코드 처리
  const inlineCodes: string[] = []
  html = html.replace(/`([^`\n]+)`/g, (match, code) => {
    const index = inlineCodes.length
    inlineCodes.push(
      `<code class="inline-flex items-center px-2 py-1 mx-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm font-mono border border-red-200 dark:border-red-800 shadow-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">${escapeHtml(code)}</code>`,
    )
    return `__INLINE_CODE_${index}__`
  })

  // 3. 이미지 처리 (링크보다 먼저 처리해야 함)
  html = html.replace(
    /!\[([^\]]*)\]$$([^)]+)$$/g,
    `<div class="my-8 text-center">
    <div class="inline-block rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
      <img src="$2" alt="$1" class="max-w-full h-auto" loading="lazy" />
      ${`$1` ? `<div class="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 italic">$1</div>` : ""}
    </div>
  </div>`,
  )

  // 4. 링크 처리 (표준 마크다운 문법 사용)
  html = html.replace(
    /\[([^\]]+)\]$$([^)]+)$$/g,
    '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-2 underline-offset-2 font-medium transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-1 py-0.5 rounded" target="_blank" rel="noopener noreferrer">$1</a>',
  )

  // 5. 헤딩 처리 (노션 스타일)
  html = html.replace(
    /^#{6}\s+(.*$)/gim,
    '<h6 class="text-sm font-semibold mt-6 mb-3 text-gray-600 dark:text-gray-400 uppercase tracking-wide">$1</h6>',
  )
  html = html.replace(
    /^#{5}\s+(.*$)/gim,
    '<h5 class="text-base font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300">$1</h5>',
  )
  html = html.replace(
    /^#{4}\s+(.*$)/gim,
    '<h4 class="text-lg font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">$1</h4>',
  )
  html = html.replace(
    /^#{3}\s+(.*$)/gim,
    '<h3 class="text-xl font-bold mt-10 mb-5 text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-700">$1</h3>',
  )
  html = html.replace(
    /^#{2}\s+(.*$)/gim,
    '<h2 class="text-2xl font-bold mt-12 mb-6 text-gray-900 dark:text-gray-100 pb-3 border-b-2 border-blue-500">$1</h2>',
  )
  html = html.replace(
    /^#{1}\s+(.*$)/gim,
    '<h1 class="text-4xl font-bold mt-16 mb-8 text-gray-900 dark:text-gray-100 pb-4 border-b-4 border-blue-600">$1</h1>',
  )

  // 6. 텍스트 스타일링 (노션 스타일)
  html = html.replace(
    /\*\*\*(.*?)\*\*\*/g,
    '<strong class="font-bold text-gray-900 dark:text-gray-100"><em class="italic">$1</em></strong>',
  )
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-700 dark:text-gray-300">$1</em>')
  html = html.replace(/__(.*?)__/g, '<u class="underline decoration-2 decoration-blue-500 underline-offset-2">$1</u>')
  html = html.replace(/~~(.*?)~~/g, '<del class="line-through text-gray-500 dark:text-gray-400 opacity-75">$1</del>')

  // 7. 하이라이트 (노션 스타일)
  html = html.replace(
    /==(.*?)==/g,
    '<mark class="bg-yellow-200 dark:bg-yellow-800/50 px-1 py-0.5 rounded-sm">$1</mark>',
  )

  // 8. 체크박스 (노션 스타일)
  html = html.replace(
    /^\s*- \[x\]\s+(.*$)/gim,
    `<div class="flex items-start gap-3 my-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <div class="flex-shrink-0 mt-0.5">
        <div class="w-5 h-5 bg-green-500 rounded border-2 border-green-500 flex items-center justify-center">
          <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        </div>
      </div>
      <span class="text-gray-700 dark:text-gray-300 line-through opacity-75">$1</span>
    </div>`,
  )

  html = html.replace(
    /^\s*- \[ \]\s+(.*$)/gim,
    `<div class="flex items-start gap-3 my-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="flex-shrink-0 mt-0.5">
        <div class="w-5 h-5 bg-white dark:bg-gray-700 rounded border-2 border-gray-300 dark:border-gray-600"></div>
      </div>
      <span class="text-gray-700 dark:text-gray-300">$1</span>
    </div>`,
  )

  // 9. 인용구 (노션 스타일)
  html = html.replace(
    /^>\s+(.*$)/gim,
    `<blockquote class="my-6 pl-6 py-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 mt-1">
          <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <p class="italic text-gray-700 dark:text-gray-300 m-0 leading-relaxed">$1</p>
      </div>
    </blockquote>`,
  )

  // 10. 수평선 (노션 스타일)
  html = html.replace(
    /^---+$/gim,
    '<hr class="my-12 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />',
  )

  // 11. 목록 처리 (노션 스타일)
  const lines = html.split("\n")
  let inUnorderedList = false
  let inOrderedList = false
  const processedLines = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.*)$/)
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)$/)

    if (unorderedMatch) {
      const content = unorderedMatch[2]

      if (!inUnorderedList) {
        processedLines.push('<ul class="my-6 space-y-2">')
        inUnorderedList = true
      }
      if (inOrderedList) {
        processedLines.push("</ol>")
        inOrderedList = false
      }
      processedLines.push(`
        <li class="flex items-start gap-3 text-gray-700 dark:text-gray-300 leading-relaxed">
          <div class="flex-shrink-0 mt-2">
            <div class="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
          </div>
          <span>${content}</span>
        </li>
      `)
    } else if (orderedMatch) {
      const content = orderedMatch[2]

      if (!inOrderedList) {
        processedLines.push('<ol class="my-6 space-y-2 counter-reset-list">')
        inOrderedList = true
      }
      if (inUnorderedList) {
        processedLines.push("</ul>")
        inUnorderedList = false
      }
      processedLines.push(`
        <li class="flex items-start gap-3 text-gray-700 dark:text-gray-300 leading-relaxed counter-increment-list">
          <div class="flex-shrink-0 mt-0.5">
            <div class="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
              <span class="counter-content"></span>
            </div>
          </div>
          <span>${content}</span>
        </li>
      `)
    } else {
      if (inUnorderedList) {
        processedLines.push("</ul>")
        inUnorderedList = false
      }
      if (inOrderedList) {
        processedLines.push("</ol>")
        inOrderedList = false
      }
      processedLines.push(line)
    }
  }

  if (inUnorderedList) processedLines.push("</ul>")
  if (inOrderedList) processedLines.push("</ol>")

  html = processedLines.join("\n")

  // 12. 테이블 (노션 스타일)
  html = html.replace(/\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)*)/g, (match, header, rows) => {
    const headerCells = header
      .split("|")
      .map((cell: string) => cell.trim())
      .filter((cell: string) => cell)
    const headerRow = headerCells
      .map(
        (cell: string) =>
          `<th class="px-6 py-4 bg-gray-50 dark:bg-gray-800 font-semibold text-left text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">${cell}</th>`,
      )
      .join("")

    const bodyRows = rows
      .trim()
      .split("\n")
      .map((row: string, index: number) => {
        const cells = row
          .split("|")
          .map((cell: string) => cell.trim())
          .filter((cell: string) => cell)
        const rowCells = cells
          .map(
            (cell: string) =>
              `<td class="px-6 py-4 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800">${cell}</td>`,
          )
          .join("")
        return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">${rowCells}</tr>`
      })
      .join("")

    return `
      <div class="my-8 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <table class="min-w-full">
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    `
  })

  // 13. 키보드 단축키 (노션 스타일)
  html = html.replace(
    /\[\[([^\]]+)\]\]/g,
    '<kbd class="px-3 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono shadow-sm">$1</kbd>',
  )

  // 14. 수학 공식 (노션 스타일)
  html = html.replace(
    /\$\$([^$]+)\$\$/g,
    '<div class="my-6 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center font-mono text-lg border border-purple-200 dark:border-purple-800">$1</div>',
  )
  html = html.replace(
    /\$([^$\n]+)\$/g,
    '<span class="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded font-mono text-sm border border-purple-200 dark:border-purple-800">$1</span>',
  )

  // 15. 각주 (노션 스타일)
  html = html.replace(
    /\[\^(\w+)\]/g,
    '<sup class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"><a href="#fn-$1" class="no-underline">$1</a></sup>',
  )

  // 16. 단락 처리 (노션 스타일)
  const paragraphs = html.split("\n\n")
  html = paragraphs
    .map((paragraph) => {
      const trimmed = paragraph.trim()
      if (!trimmed) return ""

      if (trimmed.match(/^<(h[1-6]|ul|ol|blockquote|pre|div|hr|table|img)/)) {
        return trimmed
      }

      const lines = trimmed.split("\n").filter((line) => line.trim())
      if (lines.length === 1) {
        return `<p class="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed text-base">${lines[0]}</p>`
      } else {
        return `<p class="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed text-base">${lines.join("<br>")}</p>`
      }
    })
    .join("\n")

  // 17. 코드 블록과 인라인 코드 복원
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block)
  })

  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, code)
  })

  return html
}

// HTML 이스케이프
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// 정규식 이스케이프
const escapeRegex = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// 고급 구문 강조 함수
const highlightCode = (code: string, language: string): string => {
  const config = SYNTAX_CONFIGS[language as keyof typeof SYNTAX_CONFIGS]
  if (!config) return escapeHtml(code)

  let highlighted = escapeHtml(code)

  // 1. 주석 강조 (가장 먼저)
  if (language === "javascript" || language === "typescript") {
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
    highlighted = highlighted.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>',
    )
  } else if (language === "python") {
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>')
  } else if (language === "html") {
    highlighted = highlighted.replace(
      /(&lt;!--[\s\S]*?--&gt;)/g,
      '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>',
    )
  } else if (language === "css") {
    highlighted = highlighted.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="text-gray-500 dark:text-gray-400 italic">$1</span>',
    )
  }

  // 2. 문자열 강조
  if (language === "javascript" || language === "typescript") {
    // 템플릿 리터럴
    highlighted = highlighted.replace(/(`[^`]*`)/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    // 일반 문자열
    highlighted = highlighted.replace(/("[^"]*")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    highlighted = highlighted.replace(/('[^']*')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
  } else if (language === "python") {
    highlighted = highlighted.replace(/("""[\s\S]*?""")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    highlighted = highlighted.replace(/('''[\s\S]*?''')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    highlighted = highlighted.replace(/("[^"]*")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
    highlighted = highlighted.replace(/('[^']*')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
  } else {
    config.strings.forEach((quote) => {
      if (quote === '"') {
        highlighted = highlighted.replace(/("[^"]*")/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
      } else if (quote === "'") {
        highlighted = highlighted.replace(/('[^']*')/g, '<span class="text-green-400 dark:text-green-300">$1</span>')
      }
    })
  }

  // 3. 키워드 강조
  config.keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "g")
    highlighted = highlighted.replace(
      regex,
      `<span class="text-purple-500 dark:text-purple-400 font-semibold">${keyword}</span>`,
    )
  })

  // 4. 타입 강조
  config.types.forEach((type) => {
    const regex = new RegExp(`\\b${escapeRegex(type)}\\b`, "g")
    highlighted = highlighted.replace(
      regex,
      `<span class="text-blue-500 dark:text-blue-400 font-medium">${type}</span>`,
    )
  })

  // 5. 숫자 강조
  highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="text-orange-500 dark:text-orange-400">$&</span>')

  // 6. 함수 호출 강조
  highlighted = highlighted.replace(
    /(\w+)(\s*\()/g,
    '<span class="text-yellow-500 dark:text-yellow-400 font-medium">$1</span>$2',
  )

  // 7. 괄호 강조
  highlighted = highlighted.replace(
    /([{}[\]()])/g,
    '<span class="text-gray-300 dark:text-gray-500 font-bold">$1</span>',
  )

  // 8. HTML 태그 강조 (HTML 전용)
  if (language === "html") {
    highlighted = highlighted.replace(
      /(&lt;\/?)([\w-]+)([^&gt;]*?)(&gt;)/g,
      '<span class="text-red-500 dark:text-red-400">$1</span><span class="text-blue-600 dark:text-blue-400 font-semibold">$2</span><span class="text-green-600 dark:text-green-400">$3</span><span class="text-red-500 dark:text-red-400">$4</span>',
    )
  }

  // 9. CSS 속성 강조 (CSS 전용)
  if (language === "css") {
    highlighted = highlighted.replace(
      /([\w-]+)(\s*:)/g,
      '<span class="text-blue-500 dark:text-blue-400 font-medium">$1</span>$2',
    )
    highlighted = highlighted.replace(
      /(:)(\s*[^;]+)(;)/g,
      '$1<span class="text-green-500 dark:text-green-400">$2</span>$3',
    )
  }

  // 10. JSON 키 강조 (JSON 전용)
  if (language === "json") {
    highlighted = highlighted.replace(
      /("[\w-]+")(\s*:)/g,
      '<span class="text-blue-500 dark:text-blue-400 font-medium">$1</span>$2',
    )
  }

  return highlighted
}

// 언어별 구문 강조 설정
const SYNTAX_CONFIGS = {
  javascript: {
    keywords: [
      "const",
      "let",
      "var",
      "function",
      "return",
      "if",
      "else",
      "for",
      "while",
      "class",
      "import",
      "export",
      "async",
      "await",
      "try",
      "catch",
      "finally",
      "throw",
      "new",
      "this",
      "super",
      "extends",
      "static",
      "typeof",
      "instanceof",
      "in",
      "of",
      "delete",
      "void",
      "null",
      "undefined",
      "true",
      "false",
    ],
    types: [
      "String",
      "Number",
      "Boolean",
      "Array",
      "Object",
      "Date",
      "RegExp",
      "Promise",
      "Map",
      "Set",
      "WeakMap",
      "WeakSet",
    ],
    operators: [
      "===",
      "!==",
      "==",
      "!=",
      ">=",
      "<=",
      ">",
      "<",
      "&&",
      "||",
      "!",
      "+",
      "-",
      "*",
      "/",
      "%",
      "++",
      "--",
      "+=",
      "-=",
      "*=",
      "/=",
      "=>",
      "?.",
      "??",
    ],
    strings: ['"', "'", "`"],
    comments: ["//", "/*", "*/"],
    brackets: ["(", ")", "[", "]", "{", "}"],
  },
  typescript: {
    keywords: [
      "const",
      "let",
      "var",
      "function",
      "return",
      "if",
      "else",
      "for",
      "while",
      "class",
      "import",
      "export",
      "async",
      "await",
      "try",
      "catch",
      "finally",
      "throw",
      "new",
      "this",
      "super",
      "extends",
      "static",
      "typeof",
      "instanceof",
      "in",
      "of",
      "delete",
      "void",
      "null",
      "undefined",
      "true",
      "false",
      "interface",
      "type",
      "enum",
      "namespace",
      "declare",
      "readonly",
      "public",
      "private",
      "protected",
      "abstract",
      "implements",
    ],
    types: [
      "string",
      "number",
      "boolean",
      "any",
      "void",
      "never",
      "unknown",
      "object",
      "Array",
      "Promise",
      "Record",
      "Partial",
      "Required",
      "Pick",
      "Omit",
      "Exclude",
      "Extract",
    ],
    operators: [
      "===",
      "!==",
      "==",
      "!=",
      ">=",
      "<=",
      ">",
      "<",
      "&&",
      "||",
      "!",
      "+",
      "-",
      "*",
      "/",
      "%",
      "++",
      "--",
      "+=",
      "-=",
      "*=",
      "/=",
      "=>",
      "?.",
      "??",
      "?:",
      "as",
      "is",
    ],
    strings: ['"', "'", "`"],
    comments: ["//", "/*", "*/"],
    brackets: ["(", ")", "[", "]", "{", "}", "<", ">"],
  },
  python: {
    keywords: [
      "def",
      "class",
      "import",
      "from",
      "return",
      "if",
      "else",
      "elif",
      "for",
      "while",
      "try",
      "except",
      "finally",
      "with",
      "as",
      "lambda",
      "yield",
      "global",
      "nonlocal",
      "pass",
      "break",
      "continue",
      "and",
      "or",
      "not",
      "in",
      "is",
      "assert",
      "del",
      "raise",
    ],
    types: [
      "int",
      "float",
      "str",
      "bool",
      "list",
      "dict",
      "tuple",
      "set",
      "frozenset",
      "bytes",
      "bytearray",
      "None",
      "True",
      "False",
      "type",
      "object",
    ],
    operators: [
      "==",
      "!=",
      ">=",
      "<=",
      ">",
      "<",
      "and",
      "or",
      "not",
      "+",
      "-",
      "*",
      "/",
      "//",
      "%",
      "**",
      "+=",
      "-=",
      "*=",
      "/=",
      "//=",
      "%=",
      "**=",
    ],
    strings: ['"', "'", '"""', "'''"],
    comments: ["#"],
    brackets: ["(", ")", "[", "]", "{", "}"],
  },
  html: {
    keywords: [
      "<!DOCTYPE",
      "html",
      "head",
      "body",
      "title",
      "meta",
      "link",
      "script",
      "style",
      "div",
      "span",
      "p",
      "a",
      "img",
      "ul",
      "ol",
      "li",
      "table",
      "tr",
      "td",
      "th",
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "option",
      "label",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "header",
      "footer",
      "nav",
      "section",
      "article",
      "aside",
      "main",
    ],
    types: [],
    operators: ["="],
    strings: ['"', "'"],
    comments: ["<!--", "-->"],
    brackets: ["<", ">", "(", ")", "[", "]"],
  },
  css: {
    keywords: [
      "color",
      "background",
      "background-color",
      "background-image",
      "background-size",
      "background-position",
      "margin",
      "padding",
      "border",
      "border-radius",
      "width",
      "height",
      "max-width",
      "max-height",
      "min-width",
      "min-height",
      "display",
      "position",
      "top",
      "left",
      "right",
      "bottom",
      "flex",
      "grid",
      "font-size",
      "font-family",
      "font-weight",
      "text-align",
      "line-height",
      "z-index",
      "opacity",
      "transform",
      "transition",
      "animation",
    ],
    types: [
      "px",
      "em",
      "rem",
      "%",
      "vh",
      "vw",
      "vmin",
      "vmax",
      "ch",
      "ex",
      "cm",
      "mm",
      "in",
      "pt",
      "pc",
      "auto",
      "inherit",
      "initial",
      "unset",
      "none",
      "block",
      "inline",
      "inline-block",
      "flex",
      "grid",
      "absolute",
      "relative",
      "fixed",
      "sticky",
    ],
    operators: [":"],
    strings: ['"', "'"],
    comments: ["/*", "*/"],
    brackets: ["{", "}", "(", ")", "[", "]"],
  },
  json: {
    keywords: [],
    types: ["true", "false", "null"],
    operators: [":"],
    strings: ['"'],
    comments: [],
    brackets: ["{", "}", "[", "]"],
  },
}

// 코드 복사 스크립트 생성 함수
export const generateCopyScript = (): string => {
  return `
    window.copyMarkdownCode = function(button) {
      const code = decodeURIComponent(button.dataset.code);
      navigator.clipboard.writeText(code).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>복사됨!';
        button.style.color = '#10b981';
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.color = '';
        }, 2000);
      }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        const originalText = button.innerHTML;
        button.innerHTML = '<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>복사됨!';
        button.style.color = '#10b981';
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.color = '';
        }, 2000);
      });
    }
  `
}
