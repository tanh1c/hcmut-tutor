/**
 * Library APIs
 * GET  /api/library/search           - Search materials
 * GET  /api/library/sync             - Sync from HCMUT Library (cron job)
 * POST /api/library/bookmarks        - Bookmark material
 * GET  /api/library/recommendations  - Get recommendations
 * POST /api/library/materials        - Create material (admin only)
 * PUT  /api/library/materials/:id   - Update material (admin only)
 * DELETE /api/library/materials/:id  - Delete material (admin only)
 */

import { Response } from 'express'
import { AuthRequest } from '../../lib/middleware.js'
import { storage } from '../../lib/storage.js'
import { MongoStorage } from '../../lib/mongoStorage.js'
import { config } from '../../lib/config.js'
import { successResponse, errorResponse } from '../../lib/utils.js'
import libraryService from '../../lib/services/libraryService.js'
import { authorize } from '../../lib/middleware.js'
import { UserRole } from '../../lib/types.js'
import { uploadPDF, getPDF } from '../../lib/services/pdfStorageService.js'
import multer from 'multer'
import { extractToken, verifyToken } from '../../lib/utils.js'
import { ObjectId } from 'mongodb'

/**
 * GET /api/library/search
 */
export async function searchMaterialsHandler(req: AuthRequest, res: Response) {
  try {
    const { q, subject, type, tags, page = '1', limit = '10' } = req.query

    const filters: any = {
      subject: subject as string | undefined,
      type: type as string | undefined,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 10
    }

    if (tags) {
      filters.tags = String(tags).split(',').map((t) => t.trim()).filter(Boolean)
    }

    const result = await libraryService.searchMaterials(q as string | undefined, filters)

    return res.json(result)
  } catch (error: any) {
    return res.status(500).json(errorResponse('Lỗi tìm kiếm tài liệu: ' + error.message))
  }
}

/**
 * GET /api/library/sync
 * Note: Intended for cron/admin. Server should protect this endpoint (authorize) when registering the route.
 */
export async function syncLibraryHandler(req: AuthRequest, res: Response) {
  try {
    const result = await libraryService.syncFromHCMUTLibrary()
    if (!result.success) {
      return res.status(500).json(errorResponse('Đồng bộ thất bại: ' + result.error))
    }
    return res.json(successResponse({ imported: result.imported }, 'Đồng bộ thành công'))
  } catch (error: any) {
    return res.status(500).json(errorResponse('Lỗi khi đồng bộ thư viện: ' + error.message))
  }
}

/**
 * POST /api/library/bookmarks
 */
export async function bookmarkMaterialHandler(req: AuthRequest, res: Response) {
  try {
    const currentUser = req.user
    if (!currentUser) {
      return res.status(401).json(errorResponse('Unauthorized', 401))
    }

    const { materialId } = req.body
    if (!materialId) {
      return res.status(400).json(errorResponse('materialId is required', 400))
    }

    const result = await libraryService.bookmarkMaterial(currentUser.userId, materialId)
    if (!result.success) {
      return res.status(400).json(errorResponse(result.error || 'Unable to bookmark'))
    }

    return res.status(201).json(successResponse(result.data, 'Đã bookmark tài liệu'))
  } catch (error: any) {
    return res.status(500).json(errorResponse('Lỗi bookmark tài liệu: ' + error.message))
  }
}

/**
 * GET /api/library/recommendations
 */
export async function getRecommendationsHandler(req: AuthRequest, res: Response) {
  try {
    const { userId, subject, limit = '8' } = req.query
    const limitNum = parseInt(limit as string) || 8

    // Prefer authenticated user if available
    const currentUser = req.user
    const uid = currentUser ? currentUser.userId : (userId as string | undefined)

    const result = await libraryService.getRecommendations(uid, subject as string | undefined, limitNum)
    return res.json(result)
  } catch (error: any) {
    return res.status(500).json(errorResponse('Lỗi lấy gợi ý tài liệu: ' + error.message))
  }
}

/**
 * Multer configuration for PDF upload
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'))
    }
  }
})

/**
 * Multer error handler middleware
 */
const handleMulterError = (err: any, req: any, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json(errorResponse('File size too large. Maximum size is 50MB', 400))
    }
    return res.status(400).json(errorResponse('File upload error: ' + err.message, 400))
  }
  if (err) {
    return res.status(400).json(errorResponse(err.message || 'File upload error', 400))
  }
  next()
}

/**
 * POST /api/library/materials
 * Create a new material (admin only)
 * Supports both text-only materials and PDF upload
 */
export const createMaterialHandler = [
  upload.single('pdfFile'),
  handleMulterError,
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, author, subject, type, description, tags, url, thumbnail } = req.body

      if (!title || !author || !subject || !type) {
        return res.status(400).json(errorResponse('Title, author, subject, and type are required', 400))
      }

      let materialUrl = url || ''
      let pdfFileId: string | undefined = undefined

      // If PDF file is uploaded, upload it to MongoDB GridFS first
      if (req.file) {
        const currentUser = req.user
        const uploadResult = await uploadPDF(
          req.file.buffer,
          req.file.originalname,
          {
            title,
            description,
            subject,
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
            author: author || currentUser?.name || 'Unknown',
            uploadedBy: currentUser?.userId
          }
        )

        if (!uploadResult.success || !uploadResult.fileId) {
          return res.status(500).json(errorResponse(uploadResult.error || 'Failed to upload PDF'))
        }

        pdfFileId = uploadResult.fileId
        materialUrl = `/api/library/preview/${uploadResult.fileId}`
        console.log('📎 PDF uploaded, pdfFileId:', pdfFileId, 'materialUrl:', materialUrl)
      }

      const materialData = {
        title,
        author,
        subject,
        type: type as any,
        description: description || '',
        tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t: string) => t.trim()) : []),
        url: materialUrl,
        thumbnail,
        hcmutId: '',
        ...(pdfFileId && { pdfFileId })
      }
      
      console.log('📦 Creating material with data:', { ...materialData, pdfFileId })

      const result = await libraryService.createMaterial(materialData)

      if (!result.success) {
        return res.status(400).json(errorResponse(result.error || 'Failed to create material'))
      }

      return res.status(201).json(successResponse(result.data, 'Material created successfully'))
    } catch (error: any) {
      return res.status(500).json(errorResponse('Lỗi tạo tài liệu: ' + error.message))
    }
  }
]

/**
 * PUT /api/library/materials/:id
 * Update a material (admin only)
 * Supports PDF file upload/replacement
 */
export const updateMaterialHandler = [
  upload.single('pdfFile'),
  handleMulterError,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const updates: any = { ...req.body }

      if (!id) {
        return res.status(400).json(errorResponse('Material ID is required', 400))
      }

      // Convert tags string to array if needed
      if (updates.tags && typeof updates.tags === 'string') {
        updates.tags = updates.tags.split(',').map((t: string) => t.trim())
      }

      // If PDF file is uploaded, upload it to MongoDB GridFS first
      if (req.file) {
        const currentUser = req.user
        const material = await libraryService.searchMaterials(undefined, {})
        const existingMaterial = material.data?.find((m: any) => m.id === id)
        
        const uploadResult = await uploadPDF(
          req.file.buffer,
          req.file.originalname,
          {
            title: updates.title || existingMaterial?.title || 'Untitled',
            description: updates.description || existingMaterial?.description,
            subject: updates.subject || existingMaterial?.subject,
            tags: updates.tags || existingMaterial?.tags || [],
            author: updates.author || existingMaterial?.author || currentUser?.name || 'Unknown',
            uploadedBy: currentUser?.userId
          }
        )

        if (!uploadResult.success || !uploadResult.fileId) {
          return res.status(500).json(errorResponse(uploadResult.error || 'Failed to upload PDF'))
        }

        updates.pdfFileId = uploadResult.fileId
        updates.url = `/api/library/preview/${uploadResult.fileId}`
      }

      const result = await libraryService.updateMaterial(id, updates)

      if (!result.success) {
        return res.status(400).json(errorResponse(result.error || 'Failed to update material'))
      }

      return res.json(successResponse(result.data, 'Material updated successfully'))
    } catch (error: any) {
      return res.status(500).json(errorResponse('Lỗi cập nhật tài liệu: ' + error.message))
    }
  }
]

/**
 * DELETE /api/library/materials/:id
 * Delete a material (admin only)
 */
export async function deleteMaterialHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json(errorResponse('Material ID is required', 400))
    }

    const result = await libraryService.deleteMaterial(id)

    if (!result.success) {
      return res.status(400).json(errorResponse(result.error || 'Failed to delete material'))
    }

    return res.json(successResponse(null, 'Material deleted successfully'))
  } catch (error: any) {
    return res.status(500).json(errorResponse('Lỗi xóa tài liệu: ' + error.message))
  }
}

/**
 * GET /api/library/preview/:id
 * Preview PDF from MongoDB GridFS
 * Accepts token from Authorization header or query parameter
 */
export async function previewPDFHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params

    console.log('📥 Preview PDF request for ID:', id)

    if (!id) {
      return res.status(400).json(errorResponse('PDF ID is required', 400))
    }

    // Check authentication - accept token from header or query parameter
    let token = extractToken(req.headers.authorization)
    if (!token && req.query.token) {
      token = req.query.token as string
    }

    if (!token) {
      return res.status(401).json(errorResponse('Authentication required', 401))
    }

    const payload = verifyToken(token)
    if (!payload) {
      return res.status(401).json(errorResponse('Invalid or expired token', 401))
    }

    console.log('✅ Authentication successful for user:', payload.userId)

    // Get PDF from GridFS
    const pdfResult = await getPDF(id)
    
    console.log('📄 PDF result:', { 
      success: pdfResult.success, 
      error: pdfResult.error,
      filename: pdfResult.filename 
    })

    if (!pdfResult.success || !pdfResult.buffer) {
      return res.status(404).json(errorResponse(pdfResult.error || 'PDF not found'))
    }

    // Check if this is a download request (not preview)
    const isDownload = req.query.download === 'true'
    
    // Priority: GridFS filename (original) > query parameter (title hint) > ID
    // Always prefer the original filename from GridFS for download
    const queryFilename = req.query.filename as string | undefined
    const gridfsFilename = pdfResult.filename
    const originalFilename = gridfsFilename || queryFilename || `${id}.pdf`
    console.log('📝 Using filename:', originalFilename, '(from:', gridfsFilename ? 'GridFS (original)' : queryFilename ? 'query (title hint)' : 'ID', ')', isDownload ? '(DOWNLOAD)' : '(PREVIEW)')
    
    // Create ASCII-safe filename for header (only ASCII printable characters)
    // This is required because Node.js HTTP headers must be ASCII
    const makeAsciiSafe = (name: string): string => {
      return name
        .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII with underscore
        .replace(/[\/\\:*?"<>|]/g, '_') // Remove path separators and special chars
        .replace(/\s+/g, '_') // Replace spaces with underscore
        .substring(0, 200) // Limit length
    }
    
    // Use original filename (GridFS) for both display and download
    const displayFilename = makeAsciiSafe(originalFilename)
    
    // Encode filename for Content-Disposition header (RFC 5987)
    // This ensures proper display of Unicode characters in modern browsers
    const encodedFilename = encodeURIComponent(originalFilename)
    
    // Use 'attachment' for download, 'inline' for preview
    const dispositionType = isDownload ? 'attachment' : 'inline'
    const contentDisposition = `${dispositionType}; filename="${displayFilename}"; filename*=UTF-8''${encodedFilename}`

    // Set headers for PDF preview
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', contentDisposition)
    res.setHeader('Content-Length', pdfResult.buffer.length)
    
    console.log('📤 Sending PDF with headers:', {
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDisposition,
      'Content-Length': pdfResult.buffer.length
    })

    // Send PDF buffer
    res.send(pdfResult.buffer)
  } catch (error: any) {
    console.error('previewPDFHandler error:', error)
    return res.status(500).json(errorResponse('Lỗi preview PDF: ' + error.message))
  }
}

/**
 * GET /api/library/fix-pdf-ids
 * Fix PDF IDs in materials that don't match GridFS
 * This is a temporary endpoint for fixing data issues
 */
export async function fixPDFIdsHandler(req: AuthRequest, res: Response) {
  try {
    const { getDb } = await import('../../lib/mongodb.js')
    const db = await getDb()
    const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME })
    const materialStorage = config.mongodb.enabled ? new MongoStorage() : storage
    
    const materials = await storage.read(MATERIALS_FILE)
    const fixes: any[] = []
    
    for (const material of materials) {
      const pdfId = material.pdfFileId || material.url?.split('/preview/')[1]?.split('?')[0]
      
      if (!pdfId || !ObjectId.isValid(pdfId)) {
        continue
      }
      
      // Check if PDF exists
      const files = await bucket.find({ _id: new ObjectId(pdfId) }).toArray()
      
      if (files.length === 0) {
        // PDF not found, try to find by filename or use most recent
        const allFiles = await bucket.find({}).sort({ uploadDate: -1 }).limit(5).toArray()
        
        if (allFiles.length > 0) {
          // Try to match by filename first
          const filenameMatch = allFiles.find(f => 
            f.filename.toLowerCase().includes(material.title?.toLowerCase().substring(0, 20) || '')
          )
          
          const correctFile = filenameMatch || allFiles[0]
          
          fixes.push({
            materialId: material.id,
            materialTitle: material.title,
            oldPdfId: pdfId,
            newPdfId: correctFile._id.toString(),
            filename: correctFile.filename
          })
          
          // Update material
          material.pdfFileId = correctFile._id.toString()
          material.url = `/api/library/preview/${correctFile._id.toString()}`
          await storage.update(MATERIALS_FILE, material.id, material)
        }
      }
    }
    
    return res.json(successResponse({ fixes, count: fixes.length }, `Fixed ${fixes.length} materials`))
  } catch (error: any) {
    console.error('fixPDFIdsHandler error:', error)
    return res.status(500).json(errorResponse('Lỗi fix PDF IDs: ' + error.message))
  }
}
