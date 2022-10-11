/* eslint-env browser */
/* global FixedLengthStream */
import { toReadableStream } from '../util/streams.js'
import { detectContentType } from '../util/mime.js'

/** @type {import('../bindings').Handler} */
export async function handleUnixfsFile (request, env, ctx) {
  const { unixfsEntry: entry } = ctx
  if (!entry) throw new Error('missing unixfs entry')
  if (entry.type !== 'file' && entry.type !== 'raw' && entry.type !== 'identity') {
    throw new Error('non unixfs file entry')
  }

  const etag = `"${entry.cid}"`
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304 })
  }

  /** @type {Record<string, string>} */
  const headers = {
    Etag: etag,
    'Cache-Control': 'public, max-age=29030400, immutable'
  }

  console.log('unixfs root', entry.cid.toString())
  const contentIterator = entry.content()[Symbol.asyncIterator]()
  const { done, value: firstChunk } = await contentIterator.next()
  if (done || !firstChunk.length) {
    return new Response(null, { status: 204, headers })
  }

  const fileName = entry.path.split('/').pop()
  const contentType = detectContentType(fileName, firstChunk)
  if (contentType) {
    headers['Content-Type'] = contentType
  }

  // stream the remainder
  const stream = toReadableStream((async function * () {
    let bytesWritten = firstChunk.length
    yield firstChunk
    try {
      for await (const chunk of contentIterator) {
        bytesWritten += chunk.length
        yield chunk
      }
      // FixedLengthStream does not like when you send less than what you said
      if (bytesWritten < entry.size) {
        console.warn(`padding with ${entry.size - bytesWritten} zeroed bytes`)
        yield new Uint8Array(entry.size - bytesWritten)
      }
    } catch (err) {
      console.error(err.stack)
      throw err
    }
  })())

  return new Response(
    toReadableStream(stream).pipeThrough(new FixedLengthStream(entry.size)),
    { headers }
  )
}
