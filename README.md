# Presentasi TV Kereta

Demo presentasi interaktif menggunakan Next.js App Router dan static export. Kartu topik berada di sisi kiri; memilih kartu akan memperbarui panel detail di sisi kanan.

## Menjalankan aplikasi Next.js

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Build untuk hosting statis

```bash
npm run build
```

Konfigurasi `output: "export"` menghasilkan folder `out/`, sesuai direktori statis di `.openai/hosting.json`.

Semua isi presentasi adalah materi dummy. Rute, inventori, spesifikasi, harga, dan angka kampanye perlu diganti dengan data yang telah dikonfirmasi sebelum digunakan sebagai materi komersial.
