"use client";

import { useCallback, useState } from "react";

export interface ParsedArtifact {
  code: string;
  language: string;
  hasCode: boolean;
}

export function useArtifactParser() {
  const [lastParsedCode, setLastParsedCode] = useState<string | null>(null);

  const extractCodeFromMessage = useCallback((content: string): ParsedArtifact => {
    // Match ``` followed by optional language (any word chars), then content, then ```
    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
    const matches = Array.from(content.matchAll(codeBlockRegex));

    if (matches.length === 0) {
      // 没有找到代码块是正常情况，不需要警告
      return {
        code: "",
        language: "",
        hasCode: false,
      };
    }

    console.log('[ArtifactParser] Found code block. Content length:', content.length, 'Matches found:', matches.length);

    const latestMatch = matches[matches.length - 1];
    // latestMatch[0] is full match, [1] is language, [2] is code content
    const code = latestMatch[2] ? latestMatch[2].trim() : "";
    const language = detectLanguage(latestMatch[1] || "");

    return {
      code,
      language,
      hasCode: true,
    };
  }, []);

  const shouldUpdateCode = useCallback((newCode: string): boolean => {
    if (!lastParsedCode) return true;
    return newCode !== lastParsedCode;
  }, [lastParsedCode]);

  const parseAndSet = useCallback((
    content: string,
    setCode: (code: string) => void
  ): boolean => {
    const { code, hasCode } = extractCodeFromMessage(content);

    if (!hasCode || !shouldUpdateCode(code)) {
      return false;
    }

    setLastParsedCode(code);
    setCode(code);
    return true;
  }, [extractCodeFromMessage, shouldUpdateCode]);

  return {
    extractCodeFromMessage,
    shouldUpdateCode,
    parseAndSet,
    lastParsedCode,
  };
}

function detectLanguage(codeBlock: string): string {
  if (codeBlock.includes("tsx")) return "tsx";
  if (codeBlock.includes("jsx")) return "jsx";
  if (codeBlock.includes("typescript") || codeBlock.includes("ts:")) return "typescript";
  return "javascript";
}
