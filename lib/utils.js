/* eslint-env node */
require('colors')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const { argv = {} } = require('yargs')

function bootstrap(env) {
  let printOutput

  let {
    deploy,
    colors: useColors,
    emoji: useEmoji,
    workerSrc,
    silent: noVerbose,
    enabledPatterns,
    disabledPatterns,
    reset,
    debug,
    zone,
    site,
    minify,
    forceMinify,
  } = argv

  const envConfig = env || dotenv.parse(fs.readFileSync(resolve(`.env`)))

  for (let [key, val] of Object.entries(envConfig)) {
    if (val === '') delete envConfig[key]
    else process.env[key] = val
  }

  const {
    CLOUDFLARE_AUTH_EMAIL: cfEmail,
    CLOUDFLARE_AUTH_KEY: cfApiKey,
  } = process.env

  if (!cfEmail || !cfApiKey) {
    throw new Error(`Cloudflare credentials are missing!`)
  }

  useColors = ifDeclared(useColors, 'NO_COLORS', true)
  useEmoji = ifDeclared(useEmoji, 'NO_EMOJI', true)
  enabledPatterns = ifDeclared(enabledPatterns, 'ENABLED_PATTERNS')
  disabledPatterns = ifDeclared(disabledPatterns, 'DISABLED_PATTERNS')
  reset = Boolean(ifDeclared(reset, 'RESET_EVERYTHING'))
  debug = Boolean(ifDeclared(debug, 'DEBUG'))
  deploy = ifDeclared(deploy, 'NO_UPLOAD', true)
  zone = ifDeclared(zone, 'CLOUDFLARE_ZONE_ID')
  site = ifDeclared(site, 'CLOUDFLARE_SITE_NAME')
  minify = !!forceMinify || !!ifDeclared(deploy && minify, 'DO_NOT_MINIFY', true)

  if (!site && !zone) {
    throw new Error(`Cloudflare site/zone ID missing!`)
  }

  if (debug) process.env.DEBUG = 1

  printOutput = ifDeclared(noVerbose, 'NO_VERBOSE', true)

  workerSrc = workerSrc
    ? resolve(workerSrc)
    : resolve(`src/worker.js`)

  const filename = 'worker.js';
  const default_root_id = process.env.DEFAULT_ROOT_ID;
  const client_ids = process.env.CLIENT_IDS;
  const client_secrets = process.env.CLIENT_SECRETS;
  const refresh_tokens = process.env.REFRESH_TOKENS;

  let params = {
    cfEmail,
    cfApiKey,
    debug,
    deploy,
    disabledPatterns,
    enabledPatterns,
    filename,
    minify,
    printOutput,
    reset,
    site,
    useColors,
    useEmoji,
    workerSrc,
    zone,
    default_root_id,
    client_ids,
    client_secrets,
    refresh_tokens
  }
  logg.call(params, params)
  startupText.call(params)
  return params
}

function startupText() {
  let content = `Bundling Cloudflare ${this.workerSrc} script`

  content = this.useColors ? String(content).green : content

  let text = this.useEmoji ? `🚧  | ` : ``
  text += content

  console.info(text)
}

function logg(stuff) {
  return this.noVerbose
    ? void 0
    : !!this.debug && console.log(JSON.stringify(stuff, null, 2))
}

function resolve(_path = `.`) {
  return path.join(`${__dirname}/../`, _path)
}

function ifDeclared(val, envParam = '', invert = false) {
  let result
  if (val === undefined) {
    result = process.env[envParam.toUpperCase()]
    return invert ? !result : result
  }
  return val
}

module.exports.resolve = resolve
module.exports.bootstrap = bootstrap