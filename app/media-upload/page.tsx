'use client'

import { useState } from 'react'
import { Upload, Copy, Check, Link2, X, Image as ImageIcon, Video, List, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UploadedFile {
  name: string
  url: string
  type: string
  size: number
  timestamp: Date
}

export default function MediaUploadPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [lastBatch, setLastBatch] = useState<UploadedFile[]>([])
  const [showBulkLinks, setShowBulkLinks] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [copiedBulk, setCopiedBulk] = useState<'batch' | 'all' | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setError(null)
    setUploading(true)

    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Validate file type
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')
        
        if (!isImage && !isVideo) {
          throw new Error(`${file.name} is not a valid image or video file`)
        }

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024
        if (file.size > maxSize) {
          throw new Error(`${file.name} is too large. Max size is 50MB`)
        }

        // Create unique filename
        const timestamp = Date.now()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `${timestamp}_${index}_${sanitizedName}`
        
        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('rental-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('rental-documents')
          .getPublicUrl(fileName)

        return {
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
          timestamp: new Date()
        }
      })

      const results = await Promise.all(uploadPromises)
      setUploadedFiles((prev) => [...results, ...prev])
      setLastBatch(results)
      if (results.length > 1) {
        setShowBulkLinks(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload files')
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const compileLinks = (files: UploadedFile[]) => files.map((file) => file.url).join('\n')

  const handleCopyBulkLinks = async (files: UploadedFile[], scope: 'batch' | 'all') => {
    if (files.length === 0) return
    try {
      await navigator.clipboard.writeText(compileLinks(files))
      setCopiedBulk(scope)
      setTimeout(() => setCopiedBulk(null), 2000)
    } catch (err) {
      console.error('Failed to copy bulk links:', err)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const removeFile = (url: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.url !== url))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📤 Media Uploader</h1>
          <p className="text-gray-600">Upload images and videos to get instant shareable links</p>
        </div>

        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 lg:p-12 text-center transition-all ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 bg-white hover:border-gray-400'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            accept="image/*,video/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center">
              <Upload className={`h-16 w-16 mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Images (PNG, JPG, GIF, WEBP) or Videos (MP4, MOV, etc.)
              </p>
              <p className="text-xs text-gray-400">Max file size: 50MB per file</p>
              
              {uploading && (
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Uploading...</p>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Bulk Links Panel */}
        {lastBatch.length > 1 && (
          <div className="mt-6 bg-white border border-green-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 bg-green-50 border-b border-green-200">
              <div className="flex items-center gap-2 min-w-0">
                <List className="h-5 w-5 text-green-700 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-green-900">
                    Bulk Links ({lastBatch.length} files)
                  </p>
                  <p className="text-sm text-green-700 truncate">
                    From your latest upload
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleCopyBulkLinks(lastBatch, 'batch')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  {copiedBulk === 'batch' ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy All
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowBulkLinks((prev) => !prev)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-green-300 text-green-800 text-sm font-medium rounded-md hover:bg-green-100 transition-colors"
                >
                  {showBulkLinks ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show List
                    </>
                  )}
                </button>
              </div>
            </div>
            {showBulkLinks && (
              <div className="p-4">
                <textarea
                  readOnly
                  value={compileLinks(lastBatch)}
                  rows={Math.min(lastBatch.length + 1, 12)}
                  className="w-full p-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg font-mono resize-y focus:outline-none focus:ring-2 focus:ring-green-500"
                  onClick={(e) => e.currentTarget.select()}
                />
                <p className="mt-2 text-xs text-gray-500">
                  One link per line. Click the box to select all, or use Copy All.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Uploaded Files ({uploadedFiles.length})
              </h2>
              {uploadedFiles.length > 1 && (
                <button
                  onClick={() => handleCopyBulkLinks(uploadedFiles, 'all')}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                >
                  {copiedBulk === 'all' ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Copied all!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy all links
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {uploadedFiles.map((file) => (
                <div
                  key={file.url}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="h-10 w-10 text-blue-600" />
                      ) : (
                        <Video className="h-10 w-10 text-purple-600" />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)} • {file.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFile(file.url)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove from list"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* URL */}
                      <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                        <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="text"
                          value={file.url}
                          readOnly
                          className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                        />
                        <button
                          onClick={() => handleCopyUrl(file.url)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex-shrink-0"
                        >
                          {copiedUrl === file.url ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>

                      {/* Preview */}
                      {file.type.startsWith('image/') && (
                        <div className="mt-3">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="max-h-32 rounded-md border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 How to Use</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Click the upload area or drag & drop files to upload</li>
            <li>• Supports images (PNG, JPG, GIF, WEBP) and videos (MP4, MOV, etc.)</li>
            <li>• Get instant public URLs that you can share anywhere</li>
            <li>• Click "Copy" to copy a single URL, or use "Copy All" after bulk uploads</li>
            <li>• Files are stored permanently in Supabase Storage</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
