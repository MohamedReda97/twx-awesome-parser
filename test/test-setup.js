const path = require('path')
const fs = require('fs')

const TEST_PATH = path.resolve(__dirname, 'data')
process.env.TWXPARSE_DATA_FOLDER = TEST_PATH

const deleteFolderRecursive = (path) => {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file, index) => {
      var curPath = path + '/' + file
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath)
      } else { // delete file
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}

beforeEach(() => {
  process.env.TWXPARSE_DATA_FOLDER = TEST_PATH
  deleteFolderRecursive(process.env.TWXPARSE_DATA_FOLDER)
})

after(() => {
  deleteFolderRecursive(process.env.TWXPARSE_DATA_FOLDER)
})
