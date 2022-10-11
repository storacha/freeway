import { filetypeinfo } from 'magic-bytes.js'
import { lookup } from 'mrmime'
import chardet from 'chardet'
import { toString } from 'uint8arrays'

/**
 * @param {string} fileName
 * @param {Uint8Array} bytes
 */
export function detectContentType (fileName, bytes) {
  const infos = filetypeinfo(bytes)
  if (infos.length) {
    const idx = fileName.lastIndexOf('.')
    const ext = idx === -1 ? '' : fileName.slice(idx + 1)
    const info = infos.find(i => i.mime && i.extension === ext)
    if (info?.mime) return info.mime
    if (infos[0].mime) return infos[0].mime
  }
  return lookup(fileName) || detectTextContent(bytes)
}

/** @param {Uint8Array} bytes */
function detectTextContent (bytes) {
  const encoding = chardet.detect(bytes)
  if (!encoding) return
  let mime = 'text/plain'
  if (encoding === 'UTF-8' || encoding === 'ISO-8859-1') {
    const text = toString(bytes).toLowerCase()
    if (text.startsWith('<!doctype html')) {
      mime = 'text/html'
    } else if (text.includes('<svg')) {
      mime = 'image/svg+xml'
    } else if (text.startsWith('<!xml')) {
      mime = 'text/xml'
    }
  }
  return `${mime}; charset=${encoding}`
}
