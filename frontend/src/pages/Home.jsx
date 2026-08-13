import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiFetch } = useAuth();

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const res = await apiFetch('/apps');
      if (!res.ok) throw new Error('Uygulamalar yüklenemedi');
      const data = await res.json();
      setApps(data);
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
    });
  };

  const truncate = (text, maxLength = 120) => {
    if (!text) return 'Açıklama yok';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  // Test uygulamalarını gizle
  const isTestApp = (title) => {
    const testKeywords = ['test', 'deneme', 'örnek'];
    return testKeywords.some(k => title.toLowerCase().includes(k));
  };

  const visibleApps = apps.filter(app => !isTestApp(app.title));

  const getFileIcon = (fileName) => {
    const ext = (`${fileName}`.split('.').pop() || '').toLowerCase();
    const icons = { exe: '⚙️', zip: '🗜️', rar: '🗜️', apk: '📱', msi: '⚙️' };
    return icons[ext] || '📦';
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="spinner" />
        <p className="loading-text">Uygulamalar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      {error && <div className="error-message">{error}</div>}

      {visibleApps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>Henüz uygulama eklenmedi</h2>
          <p>Admin paneline girip ilk uygulamayı ekleyin.</p>
        </div>
      ) : (
        <div className="apps-grid">
          {visibleApps.map((app) => (
            <Link to={`/app/${app.id}`} key={app.id} className="app-card">
              <div className="app-card-top">
                <span className="app-card-icon">{getFileIcon(app.file_name)}</span>
                <span className="app-downloads" title="İndirme sayısı">
                  ⬇ {app.download_count}
                </span>
              </div>
              <h3 className="app-title">{app.title}</h3>
              <p className="app-description">{truncate(app.description)}</p>
              <div className="app-meta">
                <span className="app-uploader">👤 {app.uploader_name}</span>
                <span className="app-date">📅 {formatDate(app.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
