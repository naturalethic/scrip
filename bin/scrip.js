#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const glob = require('glob').sync
const minimist = require('minimist')
const camelcase = require('lodash.camelcase')

const pkg = JSON.parse(fs.readFileSync('package.json'))

const bin = pkg.name === 'scrip' ? 'bin/scrip.js' : 'scrip'

let script = process.env.npm_lifecycle_event
const lifecycle = !!script
let argv

if (!lifecycle) {
  script = process.argv[2]
  argv = minimist(process.argv.slice(3))
} else {
  argv = minimist(process.argv.slice(2))
}

function usage () {
  console.log(`Usage: ${bin} <script>`)
  console.log('  create | add')
  console.log('  sync')
  console.log('  ' + Object.keys(pkg.scripts || {}).join('  \n'))
}

if (!script) {
  usage()
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
  if (script === 'create' || script === 'add') {
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
    const scripts = pkg.scripts || {}
    let files = glob('scripts/**/*.js')
    for (const file of files) {
      if (/^scripts\/(preamble.js|lib)/.test(file)) continue
      const scriptPath = (/^scripts\/(.*)\/index.js$/.exec(file) || /^scripts\/(.*).js$/.exec(file))[1]
      if (scriptPath === 'index') continue
      scripts[scriptPath.replace(/\//g, ':')] = bin
    }
    if (fs.existsSync('packages')) {
      files = glob('packages/*/scripts/**/*.js')
      for (const file of files) {
        const m = (/^packages\/([^/]+)\/scripts\/(.*)\/index.js$/.exec(file) || /^packages\/([^/]+)\/scripts\/(.*).js$/.exec(file))
        scripts[`${m[1]}:${m[2].replace(/\//g, ':')}`] = bin
      }
    }
    pkg.scripts = scripts
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2))
  }
  process.exit(0)
}

const preamblePath = `${process.cwd()}/scripts/preamble.js`
const modPaths = [
  `${process.cwd()}/scripts/${script.split(':').join('/')}`,
  `${process.cwd()}/packages/${script.split(':')[0]}/scripts/${script.split(':').slice(1).join('/')}`
]
const modPath = modPaths.filter(s => fs.existsSync(s) || fs.existsSync(`${s}.js`))[0]
if (!modPath) {
  console.log(`No module found for script '${script}' in: \n  ${modPaths[0]}\n  ${modPaths[1]}`)
  process.exit(1)
}

let pfn
let fn
try {
  if (fs.existsSync(preamblePath)) {
    pfn = require(preamblePath)
  }
  fn = require(modPath)
} catch (e) {
  console.log(`Error importing '${modPath}'`)
  console.log(e)
  process.exit(1)
}

async function run () {
  if (fs.existsSync(preamblePath)) {
    if (typeof pfn !== 'function') {
      console.log(`'${preamblePath}' must set module.exports to a function`)
      process.exit(1)
    }
    await pfn(options)
  }

  if (typeof fn !== 'function') {
    console.log(`'${modPath}' must set module.exports to a function`)
    process.exit(1)
  }

  fn(options)
}

run()
