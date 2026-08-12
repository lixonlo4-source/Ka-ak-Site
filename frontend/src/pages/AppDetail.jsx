import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AppDetail.css';

const AppDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchApp = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/apps/${id}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Uygulama bulunamadı');
        throw new Error('Uygulama yüklenemedi');
      }
      const data = await res.json();
      setApp(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (fileName) => {
    const ext = (`${fileName}`.split('.').pop() || '').toLowerCase();
    const icons = { exe: '⚙️', zip: '🗜️', rar: '🗜️', apk: '📱', msi: '⚙️' };
    return icons[ext] || '📦';
  };

  const handleDownload = async () => {
    if (!app) return;
    setDownloading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/apps/${id}/download`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'İndirme başarısız');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = (`${app.file_name}`.split('.').pop() || '').toLowerCase();
      const originalName = `${app.title}.${ext}`;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      fetchApp();
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-container">
        <div className="spinner" />
        <p className="loading-text">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-container">
        <div className="detail-error">
          <h2>{error}</h2>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <div className="detail-card">
        <div className="detail-back">
          <Link to="/" className="detail-back-link">
            ← Geri
          </Link>
        </div>

        <header className="detail-header">
          <div className="detail-icon">{getFileIcon(app.file_name)}</div>
          <div className="detail-header-text">
            <h1 className="detail-title">{app.title}</h1>
            <div className="detail-meta">
              <span className="detail-downloads">⬇ {app.download_count} indirme</span>
              <span className="detail-date">📅 {formatDate(app.created_at)}</span>
              <span className="detail-uploader">👤 {app.uploader_name}</span>
            </div>
          </div>
        </header>

        <div className="detail-description">
          <h3>Açıklama</h3>
          <p>{app.description || 'Açıklama belirtilmemiş.'}</p>
        </div>

        <div className="detail-actions">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn btn-primary btn-download"
          >
            {downloading ? '⏳ İndiriliyor...' : '⬇ İndir'}
          </button>
        </div>

        <div className="detail-file-info">
          <span className="detail-file-label">Dosya adı:</span>
          <code>{app.file_name}</code>
        </div>
      </div>
    </div>
  );
};

export default AppDetail;
