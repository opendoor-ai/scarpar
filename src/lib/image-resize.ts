// 사진 올리기 전 크기 줄이기 (브라우저 전용)
// 휴대폰·카메라 사진은 5~15MB라서 서버가 받을 수 있는 크기를 넘어요.
// 긴 변을 최대 2000px로 줄이고 압축해서 보통 1MB 아래로 만들어요.
// GIF(움직이는 그림)·SVG는 그대로 보내요.

const MAX_SIDE = 2000
/** 이보다 작고 크기도 작으면 손대지 않아요 */
const SKIP_BELOW_BYTES = 900 * 1024

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

    // PNG는 투명한 부분이 있을 수 있어 WEBP로, 나머지는 JPG로
    const wantWebp = file.type === 'image/png'
    if (!wantWebp) {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    let type = wantWebp ? 'image/webp' : 'image/jpeg'
    let blob = await toBlob(canvas, type, 0.85)
    // WEBP로 못 만드는 브라우저면 JPG(흰 배경)로
    if (!blob || blob.type !== type) {
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      type = 'image/jpeg'
      blob = await toBlob(canvas, type, 0.85)
    }
    if (!blob || blob.size >= file.size) return file

    const base = file.name.replace(/\.[^.]+$/, '') || 'image'
    const ext = type === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() })
  } catch {
    return file
  }
}
