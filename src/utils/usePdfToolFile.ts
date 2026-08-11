/**
 * Zia-PDF - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 Zackery Alline Fajardo
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { getPdfMetaData, unlockPdf } from './pdfHelpers'
import { usePipeline } from './pipelineContext'

export interface PdfToolFileState {
  file: File
  pageCount: number
  isLocked: boolean
  password?: string
}

export function usePdfToolFile() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { consumePipelineFile } = usePipeline()
  const [pdfData, setPdfData] = useState<PdfToolFileState | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const pipelined = consumePipelineFile()
    if (pipelined) {
      const file = new File([pipelined.buffer as any], pipelined.name, { type: 'application/pdf' })
      handleFile(file)
    }
  }, [])

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') return
    setIsProcessing(true)
    try {
      const meta = await getPdfMetaData(file)
      setPdfData({ file, pageCount: meta.pageCount, isLocked: meta.isLocked })
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnlock = async (password: string): Promise<boolean> => {
    if (!pdfData) return false
    setIsProcessing(true)
    const result = await unlockPdf(pdfData.file, password)
    if (result.success) {
      setPdfData({ ...pdfData, isLocked: false, password, pageCount: result.pageCount })
      setIsProcessing(false)
      return true
    }
    setIsProcessing(false)
    return false
  }

  const loadPdfDocument = async (): Promise<PDFDocument> => {
    if (!pdfData) throw new Error('No file loaded')
    const arrayBuffer = await pdfData.file.arrayBuffer()
    return PDFDocument.load(arrayBuffer, {
      password: pdfData.password || undefined,
      ignoreEncryption: true,
    } as any)
  }

  const reset = () => setPdfData(null)

  return { fileInputRef, pdfData, isProcessing, setIsProcessing, handleFile, handleUnlock, loadPdfDocument, reset }
}
