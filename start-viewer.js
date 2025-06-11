#!/usr/bin/env node

/**
 * Simple HTTP server to serve the TWX viewer and avoid CORS issues
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return mimeTypes[ext] || 'text/plain'
}

function serveFile(res, filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('File not found')
      return
    }

    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      // Try to serve index.html from directory
      const indexPath = path.join(filePath, 'index.html')
      if (fs.existsSync(indexPath)) {
        serveFile(res, indexPath)
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Directory listing not available')
      }
      return
    }

    const mimeType = getMimeType(filePath)
    const fileContent = fs.readFileSync(filePath)
    
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    res.end(fileContent)
  } catch (error) {
    console.error('Error serving file:', error)
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal server error')
  }
}

function createServer(port = 3000) {
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true)
    let pathname = parsedUrl.pathname

    // Remove leading slash
    if (pathname.startsWith('/')) {
      pathname = pathname.substring(1)
    }

    // Default to twx-viewer.html if no path specified
    if (pathname === '' || pathname === '/') {
      pathname = 'twx-viewer.html'
    }

    // Resolve the file path
    const filePath = path.resolve(pathname)
    
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} -> ${filePath}`)
    
    serveFile(res, filePath)
  })

  server.listen(port, () => {
    console.log('🚀 TWX Viewer Server Started!')
    console.log('━'.repeat(50))
    console.log(`📡 Server running at: http://localhost:${port}`)
    console.log(`🌐 Open in browser: http://localhost:${port}`)
    console.log('📁 Serving files from current directory')
    console.log('━'.repeat(50))
    console.log('📊 Available endpoints:')
    console.log(`   • http://localhost:${port}/                    - TWX Viewer UI`)
    console.log(`   • http://localhost:${port}/twx-viewer.html     - TWX Viewer UI`)
    console.log(`   • http://localhost:${port}/output/             - JSON data files`)
    console.log(`   • http://localhost:${port}/output/twx-summary.json - Main data`)
    console.log('━'.repeat(50))
    console.log('💡 Tips:')
    console.log('   • Press Ctrl+C to stop the server')
    console.log('   • Refresh browser page after parsing new TWX files')
    console.log('   • Check browser console for any errors')
    console.log('')
    
    // Try to open browser automatically
    const open = require('child_process').exec
    const url = `http://localhost:${port}`
    
    // Detect platform and open browser
    let command
    switch (process.platform) {
      case 'darwin': // macOS
        command = `open "${url}"`
        break
      case 'win32': // Windows
        command = `start "" "${url}"`
        break
      default: // Linux and others
        command = `xdg-open "${url}"`
        break
    }
    
    setTimeout(() => {
      open(command, (error) => {
        if (error) {
          console.log(`⚠️  Could not auto-open browser. Please manually open: ${url}`)
        } else {
          console.log('🌐 Browser opened automatically')
        }
      })
    }, 1000)
  })

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Trying port ${port + 1}...`)
      createServer(port + 1)
    } else {
      console.error('❌ Server error:', error)
    }
  })

  return server
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down TWX Viewer Server...')
  console.log('👋 Goodbye!')
  process.exit(0)
})

// Start the server
if (require.main === module) {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 3000
  createServer(port)
}

module.exports = { createServer }
