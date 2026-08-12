import { STORAGE_KEY } from '../constants'
import type { Genogram } from '../types'

function normalizeGenogram(parsed: unknown): Genogram | null {
  if (!parsed || typeof parsed !== 'object') return null
  const g = parsed as Partial<Genogram>
  if (!Array.isArray(g.people) || !Array.isArray(g.unions)) return null
  return { ...g, siblingLinks: Array.isArray(g.siblingLinks) ? g.siblingLinks : [] } as Genogram
}

export function loadGenogram(): Genogram | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeGenogram(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveGenogram(data: Genogram): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function downloadGenogram(data: Genogram): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const filename = (data.title || 'genogram').trim().replace(/[^a-z0-9-_]+/gi, '_')
  a.href = url
  a.download = `${filename || 'genogram'}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function readGenogramFile(file: File): Promise<Genogram> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const normalized = normalizeGenogram(JSON.parse(String(reader.result)))
        if (!normalized) {
          reject(new Error('File does not look like a genogram export.'))
          return
        }
        resolve(normalized)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
