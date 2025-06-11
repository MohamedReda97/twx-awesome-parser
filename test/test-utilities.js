const defer = (isSuccess = true, data, timeout = 10) => {
  return new Promise((resolve, reject) => {
    if (timeout > 0) {
      setTimeout(() => {
        if (isSuccess) {
          resolve(data)
        } else {
          reject(new Error(data))
        }
      }, timeout)
    } else {
      if (isSuccess) {
        resolve(data)
      } else {
        reject(new Error(data))
      }
    }
  })
}

module.exports = {
  defer
}
