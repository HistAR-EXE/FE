export function photoUploadError(file: Pick<File, 'type' | 'size'>): string | null {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Vui lòng chọn ảnh JPG, PNG hoặc WebP.'
    if (!file.size) return 'Tệp ảnh đang trống. Hãy chọn ảnh khác.'
    if (file.size > 20 * 1024 * 1024) return 'Ảnh vượt quá 20 MB. Hãy chọn ảnh nhỏ hơn.'
    return null
}
