import { filetypeinfo } from 'magic-bytes.js'
import { lookup } from 'mrmime'

/**
 * @param {string} fileName
 * @param {Uint8Array} bytes
 */
export function detectContentType (fileName, bytes) {
  const infos = filetypeinfo(bytes)
  const idx = fileName.lastIndexOf('.')
  const ext = idx === -1 ? '' : fileName.slice(idx + 1)
  for (const { extension, mime } of infos) {
    if (extension === ext) {
      return mime || lookup(fileName)
    }
  }
  return infos[0]?.mime || lookup(fileName)
}
