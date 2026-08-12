const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { db } = require('../db');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename while preserving extension
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.exe', '.zip', '.rar', '.apk', '.msi'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter
});

// GET all apps (public)
router.get('/', (req, res) => {
  try {
    const apps = db.prepare(`
      SELECT a.id, a.title, a.description, a.file_name, a.download_count, a.created_at,
             u.username as uploader_name, u.id as uploader_id
      FROM apps a
      JOIN users u ON a.uploader_id = u.id
      ORDER BY a.created_at DESC
    `).all();
    
    res.json(apps);
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

// GET single app by ID (public)
router.get('/:id', (req, res) => {
  try {
    const app = db.prepare(`
      SELECT a.id, a.title, a.description, a.file_path, a.file_name, a.download_count, a.created_at,
             u.username as uploader_name, u.id as uploader_id
      FROM apps a
      JOIN users u ON a.uploader_id = u.id
      WHERE a.id = ?
    `).get(req.params.id);
    
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    res.json(app);
  } catch (error) {
    console.error('Error fetching app:', error);
    res.status(500).json({ message: 'Failed to fetch application' });
  }
});

// POST new app (admin only)
router.post('/', requireAuth, requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { title, description } = req.body;
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    const filePath = req.file.path.replace(/\\/g, '/'); // normalize path for storage
    const fileName = req.file.filename; // stored filename
    const originalName = req.file.originalname;
    const uploaderId = req.user.id;
    
    const info = db.prepare(`
      INSERT INTO apps (title, description, file_path, file_name, uploader_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, description, filePath, fileName, uploaderId);
    
    res.status(201).json({
      message: 'Application uploaded successfully',
      app: {
        id: info.lastInsertRowid,
        title,
        description,
        file_name: originalName,
        download_count: 0,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error uploading app:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// GET app download (public) and increment download count
router.get('/:id/download', (req, res) => {
  try {
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);
    
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // file_path is already absolute (stored as req.file.path)
    const filePath = app.file_path;
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    // Increment download count in a transaction
    db.prepare('UPDATE apps SET download_count = download_count + 1 WHERE id = ?').run(req.params.id);
    
    // Send file with original filename
    res.download(filePath, app.file_name, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
    });
  } catch (error) {
    console.error('Error downloading app:', error);
    res.status(500).json({ message: 'Download failed' });
  }
});

// PUT update app (admin only) - title/description required, file optional
router.put('/:id', requireAuth, requireAdmin, (req, res, next) => {
  // Use multer only if a file is present in the request
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: 'Dosya yükleme hatası: ' + err.message });
    }
    next();
  });
}, (req, res) => {
  try {
    const appId = req.params.id;
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(appId);

    if (!app) {
      return res.status(404).json({ message: 'Uygulama bulunamadı' });
    }

    const { title, description } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Başlık gereklidir' });
    }

    // If a new file was uploaded, delete the old one and update paths
    let filePath = app.file_path;
    let fileName = app.file_name;
    const fs = require('fs');

    if (req.file) {
      // Delete old file if it exists
      try {
        if (fs.existsSync(app.file_path)) {
          fs.unlinkSync(app.file_path);
        }
      } catch (e) {
        console.error('Eski dosya silinemedi:', e);
      }
      filePath = req.file.path.replace(/\\/g, '/');
      fileName = req.file.filename;
    }

    db.prepare(`
      UPDATE apps
      SET title = ?, description = ?, file_path = ?, file_name = ?
      WHERE id = ?
    `).run(title, description || '', filePath, fileName, appId);

    res.json({
      message: 'Uygulama güncellendi',
      app: {
        id: parseInt(appId),
        title,
        description: description || '',
        file_name: fileName,
        download_count: app.download_count,
        created_at: app.created_at
      }
    });
  } catch (error) {
    console.error('Error updating app:', error);
    res.status(500).json({ message: 'Güncelleme başarısız' });
  }
});

// DELETE app (admin only) - removes DB record and physical file
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const appId = req.params.id;
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(appId);

    if (!app) {
      return res.status(404).json({ message: 'Uygulama bulunamadı' });
    }

    // Delete physical file if it exists
    const fs = require('fs');
    try {
      if (fs.existsSync(app.file_path)) {
        fs.unlinkSync(app.file_path);
      }
    } catch (e) {
      console.error('Dosya silinemedi (devam ediliyor):', e);
    }

    // Delete DB record
    db.prepare('DELETE FROM apps WHERE id = ?').run(appId);

    res.json({ message: 'Uygulama silindi' });
  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({ message: 'Silme başarısız' });
  }
});

module.exports = router;