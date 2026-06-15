# HistAR Frontend (TimeLens)

React 19 + Vite 8 + Tailwind 4.

> **Chạy full stack:** [`docker-compose.yml`](../docker-compose.yml) → http://localhost:5173

## Dev local

```powershell
cd FE
npm install
npm run dev
```

Vite proxy: `/api` → `localhost:8080`, `/ai` → `localhost:8100`. Cấu hình: `.env.example`.

## Build production

```powershell
npm run build
npm run preview
```

Docker image (nginx + proxy) build qua `docker-compose.yml` service `histar-fe`.

## Tài liệu

- [docs/README.md](../docs/README.md) — mục lục tài liệu dự án
- [docs/03_features_&_functional_spec.md](../docs/03_features_&_functional_spec.md) — routes & tính năng FE
