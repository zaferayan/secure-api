# Secure API

JWT kimlik doğrulama, korumalı rotalar ve rol tabanlı erişim kontrolü içeren REST API.

Express, bcrypt ve JSON Web Token ile geliştirildi. Veritabanı gerekmez - tek bir `db.json` dosyası yeterli.

## Kurulum

```bash
npm install
```

## Kullanım

```bash
npm start
```

API `http://localhost:3000` adresinde çalışır.

## Kimlik Doğrulama

Kayıt olun veya giriş yaparak bir JWT token alın. Korumalı rotalarda `Authorization` başlığına token ekleyin:

```
Authorization: Bearer <token>
```

Tokenlar 7 gün geçerlidir.

## Endpoint'ler

### Açık (token gerekmez)

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| POST | `/auth/register` | Yeni hesap oluştur |
| POST | `/auth/login` | Giriş yap ve token al |
| GET | `/products` | Tüm ürünleri listele |
| GET | `/products/:id` | Tek bir ürünü getir |
| GET | `/posts` | Tüm gönderileri listele |
| GET | `/posts/:id` | Tek bir gönderiyi getir |

### Korumalı (token gerekli)

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| GET | `/auth/me` | Mevcut kullanıcı profilini getir |
| PUT | `/auth/me` | Profili güncelle |
| POST | `/posts` | Yeni gönderi oluştur |
| PUT | `/posts/:id` | Kendi gönderisini düzenle |
| DELETE | `/posts/:id` | Kendi gönderisini sil |
| GET | `/orders` | Kullanıcının siparişlerini listele |
| POST | `/orders` | Yeni sipariş oluştur |
| GET | `/orders/:id` | Belirli bir siparişi getir |
| GET | `/comments` | Yorumları listele |
| POST | `/comments` | Bir gönderiye yorum ekle |
| DELETE | `/comments/:id` | Kendi yorumunu sil |

### Sadece Yönetici (admin rolü gerekli)

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| GET | `/admin/users` | Tüm kullanıcıları listele |
| PUT | `/admin/users/:id/role` | Kullanıcı rolünü değiştir |
| DELETE | `/admin/users/:id` | Kullanıcı sil |

## Örnekler

### Kayıt Ol

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"ahmet","email":"ahmet@test.com","password":"123456"}'
```

### Giriş Yap

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ahmet@test.com","password":"123456"}'
```

### Korumalı rotaya erişim

```bash
curl http://localhost:3000/orders \
  -H "Authorization: Bearer <token>"
```

### Gönderi oluştur (korumalı)

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"İlk Gönderim","body":"Merhaba dünya!"}'
```

### Token olmadan erişim

```bash
curl http://localhost:3000/orders
# => {"error":"Access denied. No token provided."}
```

## Hata Yanıtları

| Durum Kodu | Anlamı |
|------------|--------|
| 400 | Geçersiz istek (eksik alanlar) |
| 401 | Yetkisiz (token yok veya geçersiz token) |
| 403 | Yasaklı (sahip değil veya yönetici değil) |
| 404 | Bulunamadı |
| 409 | Çakışma (e-posta veya kullanıcı adı zaten mevcut) |

## Yönetici Erişimi

İlk çalıştırmada otomatik olarak bir yönetici hesabı oluşturulur:

```
E-posta: admin@secure-api.com
Şifre: admin123
```

Bir kullanıcıyı yönetici yapmak için admin endpoint'ini kullanın:

```bash
curl -X PUT http://localhost:3000/admin/users/2/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"role":"admin"}'
```
