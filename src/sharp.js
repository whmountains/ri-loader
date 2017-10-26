// @flow

import _ from 'lodash'
import sharp from 'sharp'
import { getOptions, interpolateName } from 'loader-utils'
import mime from 'mime'
const throttle = require('promise-parallel-throttle')

const generateSrcsets = (images, formats) => {
  console.log('generating srcsets', images, formats)

  return formats.map(format => {
    const m = mime.getType(format)
    return {
      mime: m,
      srcset: images
        .filter(i => i.mime === m)
        .map(i => {
          return `${i.src} ${i.width}w`
        })
        .join(', '),
    }
  })
}

/* eslint import/no-commonjs: 0 */
/* global module */
module.exports = function(input: string) {
  const callback = this.async()
  const options = Object.assign(
    {
      outputDir: '',
      pattern: '[name]-[sha256:hash:base64:8].[ext]',
      defaultWidth: 1680,
      formats: ['webp', 'jpeg'],
    },
    getOptions(this),
  )

  // This means that, for a given query string, the loader will only be
  // run once. No point in barfing out the same image over and over.
  this.cacheable()

  const emitFile = (imgBuffer, ext) => {
    const filename = interpolateName(
      {
        resourcePath: this.resourcePath.replace(/\.[^.]+$/, '.' + ext),
      },
      options.outputDir + '/' + options.pattern,
      { content: imgBuffer },
    )

    this.emitFile(filename, imgBuffer)

    return filename
  }

  const generateSizes = async (image, info, formats) => {
    let sizes = []
    if (info.width > 1000) {
      sizes = [info.width].concat(_.range(500, info.width, 500))
    } else if (info.width > 500) {
      sizes = [info.width].concat(_.range(100, info.width, 100))
    } else {
      sizes = [25, 50, info.width].concat(_.range(100, info.width, 50))
    }

    // strip out sizes that are bigger than the source image
    sizes = sizes.filter(s => s <= info.width)

    let counter = 0

    const queue = _.flatMap(sizes, width => {
      return formats.map(async format => {
        counter++

        // resize the image
        const imageBuffer = await image
          .clone()
          .resize(width)
          .toFormat(format)
          .toBuffer()

        // read-back results
        const resultInfo = await sharp(imageBuffer).metadata()

        // emit with webpack
        const filename = emitFile(imageBuffer, format)

        console.log(`${counter--} images remaining`)

        // return info
        return {
          mime: mime.getType(format),
          width: resultInfo.width,
          height: resultInfo.height,
          src: filename,
        }
      })
    })

    return Promise.all(queue)
  }
  ;(async () => {
    const image = sharp(input)
    const meta = await image.metadata()
    const images = (await generateSizes(image, meta, options.formats)) || []

    console.log(
      `fallback file to ${Math.min(options.defaultWidth, meta.width)}`,
    )

    const assets = {
      // fallback width
      src: emitFile(
        await image
          .resize(Math.min(options.defaultWidth, meta.width))
          .jpeg()
          .toBuffer(),
        'jpeg',
      ),

      // array of images
      images,

      // srcset for each file type
      srcsets: generateSrcsets(images, options.formats),
    }

    return `
      ${Object.keys(assets)
        .map(k => {
          return `
            export const ${k} = ${JSON.stringify(assets[k])}
          `
        })
        .join('\n')}
      export default ${JSON.stringify(assets)}
    `
  })().then(result => callback(null, result))
}

// Force buffers since sharp doesn't want strings.
module.exports.raw = true
