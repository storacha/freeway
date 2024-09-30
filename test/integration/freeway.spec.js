import fetch from 'node-fetch'
import { jest } from '@jest/globals'
import { HttpError } from '@web3-storage/gateway-lib/util'
import { spawn } from 'child_process'
import { mockClaimsService } from '../helpers/content-claims'

describe('Integration Test for fetch handler', () => {
    let serverProcess
    let env
    let rateLimiter
    let claimsService
    let ctx

    // Increase the timeout for the tests, so the server has time to start
    jest.setTimeout(30000) // 30 seconds

    beforeAll(async (done) => {
        claimsService = await mockClaimsService()

        const cloudflareProfile = 'fforbeck' // TODO: make this configurable via env variable
        serverProcess = spawn('npx', ['wrangler', 'dev', '-e', cloudflareProfile], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_OPTIONS: '--no-warnings --inspect=0' },  // Prevent child from inheriting the debugger
        }) //TODO create a new profile in the wrangler.toml for testing purposes

        // Wait for the server to start
        serverProcess.stdout.on('data', (data) => {
            if (data.toString().includes('Ready on http://localhost:8787')) {
                done()
            }
        })

        serverProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`)
        })

        serverProcess.on('close', (code) => {
            if (!serverStarted) {
                done(new Error('Server failed to start.'));
            }
            console.log(`child process exited with code ${code}`);
        });
    })

    afterAll(async (done) => {
        serverProcess.on('close', () => done());
        return serverProcess.kill('SIGTERM');
    })

    beforeEach(() => {
        rateLimiter = {
            limit: jest.fn()
        }
        env = {
            RATE_LIMITER: rateLimiter,
            ACCOUNTING_SERVICE_URL: 'http://example.com',
            AUTH_TOKEN_METADATA: {
                get: jest.fn(),
                put: jest.fn()
            },
            CONTENT_CLAIMS_SERVICE_URL: claimsService.url.toString(),
        }
        ctx = {
            dataCid: 'bafybeibv7vzycdcnydl5n5lbws6lul2omkm6a6b5wmqt77sicrwnhesy7y'
        }
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe.skip('Rate Limiter', () => {
        it('should call the handler if rate limit is not exceeded', async () => {
            rateLimiter.limit.mockResolvedValue({ success: true })

            const response = await fetch(`http://localhost:8787/ipfs/${ctx.dataCid}`, {
                method: 'GET',
                headers: {
                    'Authorization': 'test-token'
                }
            })

            expect(rateLimiter.limit).toHaveBeenCalledTimes(1)
            expect(rateLimiter.limit).toHaveBeenCalledWith({ key: ctx.dataCid.toString() })
            expect(response).toBeDefined()
            expect(response.status).toBe(200)
        })

        it('should throw an error if rate limit is exceeded', async () => {
            rateLimiter.limit.mockResolvedValue({ success: false })

            try {
                await fetch(`http://localhost:8787/ipfs/${ctx.dataCid}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'test-token'
                    }
                })
                throw new Error('Expected error was not thrown')
            } catch (err) {
                expect(rateLimiter.limit).toHaveBeenCalledTimes(1)
                expect(rateLimiter.limit).toHaveBeenCalledWith({ key: ctx.dataCid.toString() })
                expect(err).toBeInstanceOf(HttpError)
                expect(err.message).toBe('Too Many Requests')
            }
        })

        it('should call the handler if auth token is present but no token metadata and rate limit is not exceeded', async () => {
            rateLimiter.limit.mockResolvedValue({ success: true })
            env.AUTH_TOKEN_METADATA.get.mockResolvedValue(null)

            const response = await fetch(`http://localhost:8787/ipfs/${ctx.dataCid}`, {
                method: 'GET',
                headers: {
                    'Authorization': 'test-token'
                }
            })

            expect(rateLimiter.limit).toHaveBeenCalledTimes(1)
            expect(rateLimiter.limit).toHaveBeenCalledWith({ key: ctx.dataCid.toString() })
            expect(response).toBeDefined()
            expect(response.status).toBe(200)
        })

        it('should throw an error if auth token is present but no token metadata and rate limit is exceeded', async () => {
            rateLimiter.limit.mockResolvedValue({ success: false })
            env.AUTH_TOKEN_METADATA.get.mockResolvedValue(null)

            try {
                await fetch(`http://localhost:8787/ipfs/${ctx.dataCid}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'test-token'
                    }
                })
                throw new Error('Expected error was not thrown')
            } catch (err) {
                expect(rateLimiter.limit).toHaveBeenCalledTimes(1)
                expect(rateLimiter.limit).toHaveBeenCalledWith({ key: ctx.dataCid.toString() })
                expect(err).toBeInstanceOf(HttpError)
                expect(err.message).toBe('Too Many Requests')
            }
        })
    })
})