// @flow

import sharp from 'sharp'
import PrettyError from 'pretty-error'
import _ from 'lodash'
import mime from 'mime'
import path from 'path'

const pe = new PrettyError()

const main = async () => {
  const image = sharp(path.join(__dirname, '../src/seamless.jpg'))
  const info = await image.metadata()
  console.log(info)

  const sizes = [10, 25, 50, info.width]
  // .concat(_.range(100, info.width, 100))
  const formats = ['webp', 'jpeg']

  const queue = _.flatMap(sizes, width => {
    return formats.map(format => async () => {
      console.log(`Resizing to ${width} with ${format} format.`)

      // resize the image
      const imageBuffer = await image
        .clone()
        .resize(width)
        .toFormat(format)
        .toBuffer()

      try {
        // read-back results
        const resultInfo = await sharp(imageBuffer).metadata()
      } catch (e) {
        console.log(`Error resizing to ${format}@${width}w`)
      }
    })
  })

  for (const task of queue) {
    await task()
  }
}

main().catch(e => console.log(pe.render(e)))
