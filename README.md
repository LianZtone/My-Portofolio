# Portfolio Website - Lian

Website portofolio pribadi untuk menampilkan project development dan design.

## Tech Stack
- HTML5
- CSS3
- Vanilla JavaScript
- Font Awesome

## Fitur
- Hero section dengan typing effect
- Particle background menggunakan canvas
- Section project dan design work
- About section + skills tags
- Contact section (email + GitHub)
- Responsive navigation (desktop/mobile)

## Struktur Folder
```text
portofolio/
|- index.html
|- README.md
|- assets/
|  |- css/
|  |  |- style.css
|  |- js/
|  |  |- script.js
|  |- img/
```

## Menjalankan Project (Lokal)
Karena ini web statis, cukup jalankan server lokal:

```bash
cd /tempat projectkamu
python3 -m http.server 8000
```

Lalu buka:
`http://localhost:8000`

Alternatif:
- Gunakan VS Code extension `Live Server`

## Yang Perlu Kamu Ubah Sendiri
- Nama brand (`Lian`)
- Deskripsi di hero/about
- Link LinkedIn
- Link project/prototype (yang masih `Coming Soon`)
- Gambar project di `assets/img`

## Catatan
Project ini fokus ke presentasi visual portofolio, bukan aplikasi backend.
