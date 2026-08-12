import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/icon.png';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const toggleMenu = () => setMenuOpen((v) => !v);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <img src={logo} alt="Kaçak Site" className="navbar-logo-img" />
          <span className="logo-text">Kaçak Site</span>
        </Link>

        <div className={`navbar-menu ${menuOpen ? 'active' : ''}`} id="navbar-menu">
          {user ? (
            <>
              <span className="navbar-user">Hoş geldin, {user.username}</span>
              {user.role === 'admin' && (
                <Link to="/admin" className="navbar-link" onClick={closeMenu}>
                  Admin Paneli
                </Link>
              )}
              <button onClick={handleLogout} className="navbar-btn navbar-btn-logout">
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="navbar-link" onClick={closeMenu}>
                Kayıt Ol
              </Link>
              <Link to="/login" className="navbar-btn navbar-btn-primary" onClick={closeMenu}>
                Giriş Yap
              </Link>
            </>
          )}
        </div>

        <div className="navbar-right">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Tema değiştir"
            title={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button className="navbar-toggle" aria-label="Menü" onClick={toggleMenu}>
            <span className={`hamburger ${menuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
