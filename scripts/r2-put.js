/**
 * Puts data to the local persisted Miniflare R2 buckets.
 *
 * Usage:
 *   node scripts/r2-put.js test.jpg --no-wrap --no-rollup
 */
import { R2Bucket } from '@miniflare/r2'
import { FileStorage } from '@miniflare/storage-file'
import { getFilesFromPath } from 'files-from-path'
import { Builder } from '../test/helpers/builder.js'

const bucketNames = ['CARPARK', 'SATNAV', 'DUDEWHERE']
const buckets = bucketNames.map(b => new R2Bucket(new FileStorage(`./.mf/r2/${b}`)))
// @ts-expect-error
const builder = new Builder(buckets[0], buckets[1], buckets[2])

const paths = process.argv.slice(2).filter(p => p !== '--no-wrap')
const files = await getFilesFromPath(paths)
const input = files.map(f => ({ path: f.name, content: f.stream() }))
const wrapWithDirectory = process.argv.every(p => p !== '--no-wrap')

const { dataCid, carCids } = await builder.add(input, { wrapWithDirectory })

const rollup = process.argv.every(p => p !== '--no-rollup')
if (rollup) await builder.rollup(dataCid, carCids)

console.log(`Data CID:\n${dataCid}`)
console.log(`CAR CIDs:\n${carCids.join('\n')}`)
