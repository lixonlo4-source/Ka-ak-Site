import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', file: null });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [error, setError] = useState('');

  // Edit modal state
  const [editApp, setEditApp] = useState(null);
  const [editData, setEditData] = useState({ title: '', description: '', file: null });
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const API = 'http://localhost:5000/api';

  const fetchApps = async () => {
    try {
      const res = await fetch(`${API}/apps`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error('Uygulamalar yüklenemedi');
      const data = await res.json();
      setApps(data.filter((a) => a.uploader_id === user.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setError('');

    if (!formData.title.trim()) {
      setError('Başlık gereklidir');
      return;
    }
    if (!formData.file) {
      setError('Dosya seçilmeli');
      return;
    }

    const allowedExts = ['.exe', '.zip', '.rar', '.apk', '.msi'];
    const ext = '.' + formData.file.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(ext)) {
      setError('Geçersiz dosya türü. İzin verilen: .exe, .zip, .rar, .apk, .msi');
      return;
    }

    setFormLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('description', formData.description);
      fd.append('file', formData.file);

      const res = await fetch(`${API}/apps`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Yükleme başarısız');

      setMessage({ type: 'success', text: 'Başarıyla yayınlandı!' });
      setFormData({ title: '', description: '', file: null });
      fetchApps();
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Edit handlers
  const openEditModal = (app) => {
    setEditApp(app);
    setEditData({ title: app.title, description: app.description || '', file: null });
    setMessage({ type: '', text: '' });
    setError('');
  };

  const closeEditModal = () => {
    setEditApp(null);
    setEditData({ title: '', description: '', file: null });
  };

  const handleEditFileChange = (e) => {
    setEditData({ ...editData, file: e.target.files[0] });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editData.title.trim()) {
      setError('Başlık gereklidir');
      return;
    }

    if (editData.file) {
      const allowedExts = ['.exe', '.zip', '.rar', '.apk', '.msi'];
      const ext = '.' + editData.file.name.split('.').pop().toLowerCase();
      if (!allowedExts.includes(ext)) {
        setError('Geçersiz dosya türü. İzin verilen: .exe, .zip, .rar, .apk, .msi');
        return;
      }
    }

    setEditLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', editData.title);
      fd.append('description', editData.description);
      if (editData.file) fd.append('file', editData.file);

      const res = await fetch(`${API}/apps/${editApp.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeader() },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Güncelleme başarısız');

      setMessage({ type: 'success', text: 'Uygulama güncellendi!' });
      closeEditModal();
      fetchApps();
    } catch (err) {
      setError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Delete handlers
  const openDeleteModal = (app) => {
    setDeleteTarget(app);
    setMessage({ type: '', text: '' });
    setError('');
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/apps/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Silme başarısız');

      setMessage({ type: 'success', text: 'Uygulama silindi!' });
      closeDeleteModal();
      fetchApps();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Sorting
  const handleSort = (field) => {
    if (field === sortField) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filtered and sorted apps
  const filteredApps = useMemo(() => {
    let result = apps.filter(
      (a) => a.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'download_count') {
        cmp = a.download_count - b.download_count;
      } else if (sortField === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else {
        cmp = new Date(a.created_at) - new Date(b.created_at);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, searchQuery, sortField, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const totalApps = apps.length;
    const totalDownloads = apps.reduce((sum, a) => sum + a.download_count, 0);
    const topApp = apps.reduce(
      (top, a) => (a.download_count > (top?.download_count || 0) ? a : top),
      null
    );
    return { totalApps, totalDownloads, topApp };
  }, [apps]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getFileIcon = (fileName) => {
    const ext = (`${fileName}`.split('.').pop() || '').toLowerCase();
    return { exe: '⚙️', zip: '🗜️', rar: '🗜️', apk: '📱', msi: '⚙️' }[ext] || '📦';
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="spinner" />
        <p className="loading-text">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Paneli</h1>
        <p>Uygulamalarınızı yönetin, yeni uygulama yayınlayın</p>
      </header>

      {error && <div className="admin-error">{error}</div>}
      {message.type === 'success' && (
        <div className="admin-success">{message.text}</div>
      )}

      {/* Stats cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalApps}</span>
            <span className="stat-label">Toplam Uygulama</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⬇️</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalDownloads}</span>
            <span className="stat-label">Toplam İndirme</span>
          </div>
        </div>
        <div className="stat-card stat-card-highlight">
          <div className="stat-icon">🏆</div>
          <div className="stat-info">
            <span className="stat-value">{stats.topApp ? stats.topApp.download_count : 0}</span>
            <span className="stat-label">
              {stats.topApp ? stats.topApp.title.length > 20 ? stats.topApp.title.slice(0, 20) + '…' : stats.topApp.title : 'En çok indirilen'}
            </span>
          </div>
        </div>
      </div>

      {/* New app form */}
      <section className="admin-section">
        <h2>Yeni Uygulama Yayınla</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="title">Başlık *</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={formLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Açıklama</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              disabled={formLoading}
            />
          </div>
          <div className="form-group">
            <label>Dosya Seç * (.exe, .zip, .rar, .apk, .msi — max 500MB)</label>
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
              required
              disabled={formLoading}
              accept=".exe,.zip,.rar,.apk,.msi"
            />
            {formData.file && <span className="file-name">Seçili: {formData.file.name}</span>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={formLoading}>
            {formLoading ? 'Yayınlanıyor...' : 'Yayınla'}
          </button>
        </form>
      </section>

      {/* App list with search and sort */}
      <section className="admin-section">
        <div className="admin-list-header">
          <h2>Yayınlanan Uygulamalar ({filteredApps.length})</h2>
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Başlığa göre ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredApps.length === 0 ? (
          <p className="admin-empty">
            {searchQuery ? 'Sonuç bulunamadı.' : 'Henüz uygulama yayınlamadınız.'}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Uygulama</th>
                  <th
                    className={`sortable ${sortField === 'download_count' ? `sorted-${sortOrder}` : ''}`}
                    onClick={() => handleSort('download_count')}
                  >
                    İndirme
                  </th>
                  <th
                    className={`sortable ${sortField === 'created_at' ? `sorted-${sortOrder}` : ''}`}
                    onClick={() => handleSort('created_at')}
                  >
                    Tarih
                  </th>
                  <th className="actions-col">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => (
                  <tr key={app.id}>
                    <td className="app-cell">
                      <span className="app-row-icon">{getFileIcon(app.file_name)}</span>
                      <span className="app-row-name">{app.title}</span>
                    </td>
                    <td className="download-cell">⬇ {app.download_count}</td>
                    <td className="date-cell">{formatDate(app.created_at)}</td>
                    <td className="actions-cell">
                      <button
                        className="btn-icon btn-outline"
                        onClick={() => navigate(`/app/${app.id}`)}
                        title="Görüntüle"
                      >
                        👁
                      </button>
                      <button
                        className="btn-icon btn-outline"
                        onClick={() => openEditModal(app)}
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => openDeleteModal(app)}
                        title="Sil"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit modal */}
      {editApp && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Uygulamayı Düzenle</h3>
              <button className="modal-close" onClick={closeEditModal}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} className="admin-form">
              <div className="form-group">
                <label htmlFor="edit-title">Başlık *</label>
                <input
                  type="text"
                  id="edit-title"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  required
                  disabled={editLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-description">Açıklama</label>
                <textarea
                  id="edit-description"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={4}
                  disabled={editLoading}
                />
              </div>
              <div className="form-group">
                <label>Yeni Dosya (opsiyonel — boş bırak mevcut dosyayı korur)</label>
                <input
                  type="file"
                  onChange={handleEditFileChange}
                  disabled={editLoading}
                  accept=".exe,.zip,.rar,.apk,.msi"
                />
                {editData.file && <span className="file-name">Seçili: {editData.file.name}</span>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeEditModal} disabled={editLoading}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Silme Onayı</h3>
              <button className="modal-close" onClick={closeDeleteModal}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-warning">
                <strong>"{deleteTarget.title}"</strong> uygulamasını silmek istediğinize emin misiniz?
              </p>
              <p className="modal-warning-detail">
                Bu işlem geri alınamaz. Uygulama veritabanından ve sunucudan kalıcı olarak silinecek.
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
              >
                İptal
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
