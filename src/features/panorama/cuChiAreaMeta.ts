// src/features/panorama/cuChiAreaMeta.ts
/** Macro 7-station route order (Bến Dược site map). */
export const CU_CHI_MACRO_ROUTE: Record<string, { areaSlug: string; routeOrder: number; label: string }> = {
  '22222222-2222-2222-2222-222222222221': {
    areaSlug: 'bai-xe',
    routeOrder: 1,
    label: 'Bãi gửi xe gắn máy số 1',
  },
  '22222222-2222-2222-2222-222222222222': {
    areaSlug: 'den-ben-duoc',
    routeOrder: 2,
    label: 'Đền tưởng niệm Liệt sĩ Bến Dược',
  },
  '22222222-2222-2222-2222-222222222224': {
    areaSlug: 'khu-trung-bay',
    routeOrder: 3,
    label: 'Khu trưng bày',
  },
  '22222222-2222-2222-2222-222222222223': {
    areaSlug: 'bo-tu-lenh',
    routeOrder: 4,
    label: 'Căn cứ Bộ Tư lệnh QK SG-GĐ',
  },
  '22222222-2222-2222-2222-222222222225': {
    areaSlug: 'khu-uy',
    routeOrder: 5,
    label: 'Căn cứ Khu ủy QK SG-GĐ',
  },
  '22222222-2222-2222-2222-222222222226': {
    areaSlug: 'nha-bieu-dien',
    routeOrder: 6,
    label: 'Nhà biểu diễn Sa bàn, Phim 3D',
  },
  '22222222-2222-2222-2222-222222222227': {
    areaSlug: 'khu-tai-hien',
    routeOrder: 7,
    label: 'Khu tái hiện Vùng Giải phóng',
  },
}

export const CU_CHI_KB_SUB_SCENES: Record<string, { areaSlug: string; sortOrder: number }> = {
  '22222222-2222-2222-2222-22222222222d': { areaSlug: 'khu-trung-bay', sortOrder: 2 },
}

export const CU_CHI_BTL_SUB_SCENES: Record<string, { areaSlug: string; sortOrder: number }> = {
  '22222222-2222-2222-2222-22222222222e': { areaSlug: 'bo-tu-lenh', sortOrder: 2 },
}

export const CU_CHI_DEN_SUB_SCENES: Record<string, { areaSlug: string; sortOrder: number }> = {
  '22222222-2222-2222-2222-222222222228': { areaSlug: 'den-ben-duoc', sortOrder: 2 },
  '22222222-2222-2222-2222-222222222229': { areaSlug: 'den-ben-duoc', sortOrder: 3 },
  '22222222-2222-2222-2222-22222222222a': { areaSlug: 'den-ben-duoc', sortOrder: 4 },
  '22222222-2222-2222-2222-22222222222b': { areaSlug: 'den-ben-duoc', sortOrder: 5 },
  '22222222-2222-2222-2222-22222222222c': { areaSlug: 'den-ben-duoc', sortOrder: 6 },
}

export function resolveAreaSlug(panoramaId: string, areaSlugFromApi?: string | null): string {
  if (areaSlugFromApi) return areaSlugFromApi
  if (CU_CHI_MACRO_ROUTE[panoramaId]) return CU_CHI_MACRO_ROUTE[panoramaId].areaSlug
  if (CU_CHI_DEN_SUB_SCENES[panoramaId]) return CU_CHI_DEN_SUB_SCENES[panoramaId].areaSlug
  if (CU_CHI_KB_SUB_SCENES[panoramaId]) return CU_CHI_KB_SUB_SCENES[panoramaId].areaSlug
  if (CU_CHI_BTL_SUB_SCENES[panoramaId]) return CU_CHI_BTL_SUB_SCENES[panoramaId].areaSlug
  if (panoramaId === '22222222-2222-2222-2222-222222222222') return 'den-ben-duoc'
  return 'unknown'
}

export function groupPanoramasByArea<T extends { id: string; areaSlug?: string | null; sortOrder?: number | null; title: string }>(
  panoramas: T[],
): { areaSlug: string; routeOrder: number; label: string; scenes: T[] }[] {
  const groups = new Map<string, { areaSlug: string; routeOrder: number; label: string; scenes: T[] }>()

  for (const p of panoramas) {
    const slug = resolveAreaSlug(p.id, p.areaSlug)
    const macro = Object.values(CU_CHI_MACRO_ROUTE).find((m) => m.areaSlug === slug)
    const routeOrder = macro?.routeOrder ?? p.sortOrder ?? 99
    const label = macro?.label ?? slug
    const existing = groups.get(slug)
    if (existing) {
      existing.scenes.push(p)
    } else {
      groups.set(slug, { areaSlug: slug, routeOrder, label, scenes: [p] })
    }
  }

  for (const g of groups.values()) {
    g.scenes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title))
  }

  return [...groups.values()].sort((a, b) => a.routeOrder - b.routeOrder)
}
