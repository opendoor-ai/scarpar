// 사진 올리기 전 자동 최적화 (브라우저 전용)
// - 용량이 큰 JPG·PNG·WEBP는 WEBP로 바꿔서 올려요. (같은 화질에서 JPG보다 25~35%, PNG보다 훨씬 작아요)
// - 화질은 0.92(눈으로 차이를 거의 못 느끼는 수준), 투명한 부분(PNG)도 그대로 살아요.
// - 아주 큰 사진만 긴 변 2400px로 맞춰요. (상세페이지·확대 보기에 충분한 크기)
// - 바꾼 파일이 원본보다 크면 원본을 그대로 올려요. → 손해 보는 일 없음
// - GIF(움직이는 그림)·SVG·작은 사진(500KB 이하)은 손대지 않아요.
// - WEBP를 못 만드는 오래된 브라우저에서는 JPG(흰 배경)로 줄여요.

const MAX_SIDE = 2400
const QUALITY = 0.92
/** 이보다 작고 크기도 알맞으면 손대지 않아요 */
const SKIP_BELOW_BYTES = 500 * 1024

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('사진을 읽지 못했어요'))
    }
    img.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type)) return file
  try {
    const img = await loadImage(file)
    const { naturalWidth: w, naturalHeight: h } = img
    if (file.size <= SKIP_BELOW_BYTES && Math.max(w, h) <= MAX_SIDE) return file

    const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // 줄일 때 부드럽게 (계단 현상 방지)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // 1순위: WEBP (투명 배경 유지)
    let type = 'image/webp'
    let blob = await toBlob(canvas, type, QUALITY)
    // WEBP를 못 만드는 브라우저면 JPG(흰 배경)로
    if (!blob || blob.type !== type) {
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      type = 'image/jpeg'
      blob = await toBlob(canvas, type, QUALITY)
    }
    // 바꾼 게 더 크면(이미 잘 압축된 사진) 원본 그대로 — 크기를 줄일 필요가 없을 때만
    if (!blob) return file
    if (blob.size >= file.size && scale === 1) return file

    const base = file.name.replace(/\.[^.]+$/, '') || 'image'
    const ext = type === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() })
  } catch {
    return file
  }
}
