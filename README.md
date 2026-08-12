# Kaçak Site

Uygulama deposu / vitrin sitesi. Admin uygulamaları yükler, ziyaretçiler görüntüler ve indirir.

## Teknoloji Yığını

- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React (Vite) + React Router + Düz CSS (CSS custom properties ile tema)
- **Auth**: JWT (access token, 7 gün geçerli)
- **Dosya Yükleme**: multer (500MB limit, .exe/.zip/.rar/.apk/.msi)
- **Tema**: Dark/Light mod (localStorage + prefers-color-scheme, flash önleme)

## Klasör Yapısı

```
kacak-site/
  backend/
    src/
      index.js              # Express sunucu giriş noktası
      db.js                 # SQLite bağlantısı ve tablo oluşturma
      middleware/auth.js    # JWT doğrulama, admin kontrolü
      routes/
        auth.js             # Kayıt / giriş uçları
        apps.js             # Uygulama listeleme, ekleme, düzenleme, silme, indirme
      uploads/              # Yüklenen dosyalar
    package.json
    .env                    # Ortam değişkenleri (gitignore)
  frontend/
    src/
      assets/icon.png       # Site logosu
      components/Navbar.jsx  # Sticky navbar + tema toggle + hamburger
      context/
        AuthContext.jsx     # Auth state
        ThemeContext.jsx    # Dark/Light tema yönetimi
      pages/
        Home.jsx            # Uygulama listesi (kart görünümü)
        AppDetail.jsx       # Detay + indirme
        Login.jsx
        Register.jsx
        AdminPanel.jsx      # Yönetim paneli (düzenle/sil/ara/sırala/istatistik)
      App.jsx               # Routing
      main.jsx
    package.json
  icon.png
  README.md
```

## Kurulum

### Backend

```bash
cd backend
npm.cmd install
# .env dosyasını oluşturun (örnek: .env.example)
npm.cmd run dev
```

Sunucu `http://localhost:5000` adresinde başlar.

### Frontend

```bash
cd frontend
npm.cmd install
npm.cmd run dev
```

Frontend `http://localhost:5173` adresinde başlar.

> **Not:** Site logosu `frontend/src/assets/icon.png` ve favicon olarak `frontend/public/icon.png` konumundadır.

## Ortam Değişkenleri (Backend `.env`)

```env
PORT=5000
JWT_SECRET=uzun-ve-guvenli-bir-secret
FRONTEND_URL=http://localhost:5173
ADMIN_USERNAME=admin
ADMIN_PASSWORD=guvenli-sifre-buraya
```

> **Önemli**: `JWT_SECRET` ve `ADMIN_PASSWORD` üretimde güçlü, rastgele değerlerle değiştirilmelidir.

## API Uç Noktaları

### Auth
- `POST /api/auth/register` — Kayıt (herkese açık, rol: user)
- `POST /api/auth/login` — Giriş (JWT döner)

### Apps (Herkese Açık)
- `GET /api/apps` — Tüm uygulamaları listele
- `GET /api/apps/:id` — Tek uygulama detayı
- `GET /api/apps/:id/download` — Dosyayı indir + sayaç artır

### Apps (Sadece Admin)
- `POST /api/apps` — Yeni uygulama yükle (multipart/form-data: title, description, file)
- `PUT /api/apps/:id` — Uygulama güncelle (title/description zorunlu, file opsiyonel). Yeni dosya yüklenirse eskisi silinir.
- `DELETE /api/apps/:id` — Uygulama sil (DB kaydını + fiziksel dosyayı siler)

## Özellikler

### Genel
- **Navbar**: Sticky, blur efekti, logo, tema değiştirme butonu, responsive hamburger menü (mobil)
- **Dark/Light Tema**: Tek tıkla geçiş, tercih `localStorage`'da saklanır, `prefers-color-scheme` ile başlangıç, flash önleme script'i
- **Tipografi**: Inter fontu (Google Fonts)
- **Tasarım**: Mor vurgu rengi, yumuşak gölgeler, yuvarlatılmış kartlar, hover animasyonları

### Ana Sayfa
- Kart görünümünde uygulama listesi
- Dosya türüne göre ikon (.exe, .zip, .apk vb.)
- Loading spinner + empty state
- Hover'da kart büyüme efekti

### Detay Sayfası
- Tam başlık/açıklama, indirme butonu
- İndirme sayacı güncellenir
- Dosya türü ikonu

### Admin Paneli
- **İstatistik kartları**: Toplam uygulama, toplam indirme, en çok indirilen uygulama
- **Yeni uygulama formu**: Başlık/açıklama/dosya
- **Uygulama tablosu**: İkon + başlık + indirme sayısı + tarih + aksiyon butonları (Görüntüle/Düzenle/Sil)
- **Düzenleme modalı**: Mevcut başlık/açıklama önceden dolu, opsiyonel dosya değişimi
- **Silme onayı**: Modal ile geri alınamaz uyarısı
- **Arama**: Başlığa göre filtreleme
- **Sıralama**: İndirme sayısı / tarih alanlarına tıkla sırala
- **Anlık güncelleme**: İşlemler sonrası sayfa yenilenmeden liste güncellenir

### Kayıt/Giriş
- Form validasyonu, hata mesajları
- JWT `localStorage`'da
- Şifre eşleştirme kontrolü (kayıtta)

## Güvenlik

- Şifreler bcrypt ile hashlenir
- JWT secret `.env`'den okunur
- Dosya adları UUID ile yeniden adlandırılır (path traversal önlenir)
- Sadece izin verilen uzantılara izin verilir
- Admin kaydı dışarıdan yapılamaz (sadece başlangıçta otomatik oluşur)
- Silme işleminde fiziksel dosya da güvenli şekilde silinir

## Geliştirme

```bash
# Backend (watch mode)
cd backend && npm.cmd run dev

# Frontend
cd frontend && npm.cmd run dev
```

## Test Akışı

1. Kayıt ol → giriş yap (normal kullanıcı)
2. Admin ile giriş (`.env`'deki `ADMIN_USERNAME`/`ADMIN_PASSWORD`)
3. Admin paneline git → yeni uygulama yayınla
4. Ana sayfada görüntüle → detaya git → indir
5. Admin panelinde düzenle/sil, arama ve sıralamayı test et
6. Tema değiştirme butonu ile dark/light mod geçişini dene

## Lisans

MIT
