#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const glob = require('glob')
const minimist = require('minimist')
const camelcase = require('lodash.camelcase')

const pkg = JSON.parse(fs.readFileSync('package.json'))

const bin = pkg.name === 'scrip' ? 'bin/script.js' : 'scrip'

let script = process.env.npm_lifecycle_event
const lifecycle = !!script
let argv

if (!lifecycle) {
  script = process.argv[2]
  argv = minimist(process.argv.slice(3))
} else {
  argv = minimist(process.argv.slice(2))
}

if (!script) {
  console.log('No script specified')
  process.exit(1)
}

const scriptTemplate = `
module.exports = (options) => {

}
`

const options = argv._
for (const key of Object.keys(argv)) {
  if (key === '_') continue
  options[camelcase(key)] = argv[key]
}

if (!lifecycle) {
  if (script === 'create') {
    if (!options[0]) {
      console.log('Usage: scrip create <name>')
      process.exit(1)
    }
    const scriptPath = 'scripts/' + options[0].split(':').join('/') + '.js'
    if (fs.existsSync(scriptPath)) {
      console.log('That script already exists in:', scriptPath)
      process.exit(1)
    }
    mkdirp.sync(path.dirname(scriptPath))
    fs.writeFileSync(scriptPath, scriptTemplate)
    console.log('Created', scriptPath)
  }

  if (script === 'sync' || script === 'create') {
    const scripts = {}
    const files = glob.sync('scripts/**/*.js')
    for (const file of files) {
      if (/^scripts\/lib/.test(file)) continue
      const scriptPath = (/^scripts\/(.*)\/index.js$/.exec(file) || /^scripts\/(.*).js$/.exec(file))[1]
      if (scriptPath === 'index') continue
      scripts[scriptPath.replace(/\//g, ':')] = bin
    }
    pkg.scripts = scripts
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2))
  }
  process.exit(0)
}

const modPath = `${process.cwd()}/scripts/${script.split(':').join('/')}`
let fn
try {
  fn = require(modPath)
} catch (e) {
  console.log(`'${modPath}' does not exist`)
  process.exit(1)
}

if (typeof fn !== 'function') {
  console.log(`'${modPath}' must set module.exports to a function`)
  process.exit(1)
}

fn(options)
