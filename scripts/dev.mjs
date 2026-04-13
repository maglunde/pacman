import { spawn } from 'node:child_process'
import net from 'node:net'

const BASE_PORT = 9001
const argv = process.argv.slice(2)

if (argv.some((arg) => arg === '--port' || arg === '-p' || arg.startsWith('--port='))) {
  startVite(argv)
} else {
  const port = await findFreePort(BASE_PORT)
  startVite(['--port', String(port), ...argv])
}

function startVite(args) {
  const child = spawn('vite', ['--open', ...args], {
    stdio: 'inherit',
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 0)
  })
}

async function findFreePort(startPort) {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await isPortFree(port)) {
      return port
    }
  }

  throw new Error(`No free port found starting at ${startPort}`)
}

async function isPortFree(port) {
  for (const host of ['127.0.0.1', '::1', '0.0.0.0']) {
    const result = await probePort(port, host)
    if (result === false) {
      return false
    }
  }

  return true
}

function probePort(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.on('error', (error) => {
      if (error?.code === 'EADDRINUSE') {
        resolve(false)
        return
      }

      if (error?.code === 'EADDRNOTAVAIL' || error?.code === 'EAFNOSUPPORT' || error?.code === 'EINVAL') {
        resolve(null)
        return
      }

      resolve(false)
    })
    server.listen(port, host, () => {
      server.close(() => resolve(true))
    })
  })
}
