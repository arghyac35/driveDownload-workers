/* eslint-env worker, browser, commonjs */
/* globals */ // list injected variables after 'globals'
import GoogleDrive from './googleDrive';
const props = {};
props.default_root_id = default_root_id
props.client_ids = client_ids ? client_ids.split(',') : ''
props.client_secrets = client_secrets ? client_secrets.split(',') : ''
props.refresh_tokens = refresh_tokens ? refresh_tokens.split(',') : ''

const gd = new GoogleDrive(props);

addEventListener(`fetch`, event => {
  event.respondWith(
    requestHandler(event.request).catch(err => {
      console.error(err)
      return new Response(JSON.stringify(err.stack), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })
  )
})

async function requestHandler(request) {
  if (request.method === 'OPTIONS')
    // allow preflight request
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    })

  if (request.method != 'GET') {
    return new Response('', { status: 405 });
  }
  // jwt check goes here
  let isValid = await isValidJwt(request)
  if (!isValid) {
    // It is immediately failing here, which is great. The worker doesn't bother hitting your API
    console.log('token is NOT valid')
    return new Response('Invalid Token', { status: 403 })
  } else {
    console.log('token is valid')
  }

  request = Object.assign({}, request, new URL(request.url))
  request.pathname = request.pathname
    .split('/')
    .map(decodeURIComponent)
    .map(decodeURIComponent) // for some super special cases, browser will force encode it...   eg: +αあるふぁきゅん。 - +♂.mp3
    .join('/')

  let { pathname: path } = request;
  if (!path) {
    return new Response('No, path provided', { status: 500 });
  }
  const rootId = request.searchParams.get('rootId') || props.default_root_id;
  const resp = await downloadFile(request, path, rootId);
  const obj = Object.create(null)
  for (const [k, v] of resp.headers.entries()) {
    obj[k] = v
  }
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: Object.assign(obj, {
      'Access-Control-Allow-Origin': '*'
    })
  })
}

async function downloadFile(request, path, rootId, credNumber = 0, result = '') {
  console.log('Rootid: ', rootId);
  console.log('Path: ', path);
  if (!result) {
    result = await gd.getMetaByPath(path, rootId, credNumber);
  }
  if (!result) {
    return new Response('File not found, report in comment section we will try to post new files.', {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 404
    });
  }
  const isGoogleApps = result.mimeType.includes('vnd.google-apps');
  if (!isGoogleApps) {
    console.log('File id-->', result.id);
    let r;
    try {
      r = await gd.download(result.id, request.headers.get('Range'), credNumber);
    } catch (error) {
      console.error('Error downloadFile---->', error.message);
      if (credNumber < (props.client_ids.length - 1)) {
        credNumber++; //change credentials
        console.log(`trying using ${credNumber} cred`);
        return await downloadFile(request, path, rootId, credNumber, result);
      }
      return new Response('Download quota over for this file, please try again few hours later or 24hr later, as download quota usually resets after every 24hr', {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 403
      });
    }
    const h = new Headers(r.headers);
    h.set(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(result.name)}`
    );
    return new Response(r.body, {
      status: r.status,
      headers: h
    });
  } else {
    return new Response('Don\'t mess with the url', { status: 405 });
  }
}

/**
 * Parse the JWT and validate it.
 *
 * We are just checking that the signature is valid, but you can do more that. 
 * For example, check that the payload has the expected entries or if the signature is expired..
 */
async function isValidJwt(request) {
  const encodedToken = getJwt(request);
  if (encodedToken === null) {
    return false
  }
  const token = decodeJwt(encodedToken);
  // Is the token expired?
  let expiryDate = new Date(token.payload.exp * 1000)
  let currentDate = new Date(Date.now())
  if (expiryDate <= currentDate) {
    console.log('expired token')
    return false
  }

  return isValidJwtSignature(token)
}

/**
 * For this example, the JWT is passed in as part of the Authorization header,
 * after the Bearer scheme.
 * Parse the JWT out of the header and return it.
 */
function getJwt(request) {
  const { searchParams } = new URL(request.url)
  let token = searchParams.get('token')

  // const authHeader = request.headers.get('Authorization');
  // if (!authHeader || authHeader.substring(0, 6) !== 'Bearer') {
  //   return null
  // }
  return token ? token.trim() : null;
}

/**
 * Parse and decode a JWT.
 * A JWT is three, base64 encoded, strings concatenated with ‘.’:
 *   a header, a payload, and the signature.
 * The signature is “URL safe”, in that ‘/+’ characters have been replaced by ‘_-’
 * 
 * Steps:
 * 1. Split the token at the ‘.’ character
 * 2. Base64 decode the individual parts
 * 3. Retain the raw Bas64 encoded strings to verify the signature
 */
function decodeJwt(token) {
  const parts = token.split('.');
  const header = JSON.parse(atob(parts[0]));
  const payload = JSON.parse(atob(parts[1].replace(/_/g, '/').replace(/-/g, '+')));
  const signature = atob(parts[2].replace(/_/g, '/').replace(/-/g, '+'));
  return {
    header: header,
    payload: payload,
    signature: signature,
    raw: { header: parts[0], payload: parts[1], signature: parts[2] }
  }
}

/**
 * Validate the JWT.
 *
 * Steps:
 * Reconstruct the signed message from the Base64 encoded strings.
 * Load the RSA public key into the crypto library.
 * Verify the signature with the message and the key.
 */
async function isValidJwtSignature(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode([token.raw.header, token.raw.payload].join('.'));
  const signature = new Uint8Array(Array.from(token.signature).map(c => c.charCodeAt(0)));
  /*
    const jwk = {
      alg: 'RS256',
      e: 'AQAB',
      ext: true,
      key_ops: ['verify'],
      kty: 'RSA',
      n: RSA_PUBLIC_KEY
    };
  */
  // You need to JWK data with whatever is your public RSA key. If you're using Auth0 you
  // can download it from https://[your_domain].auth0.com/.well-known/jwks.json
  const jwk = {
    alg: "RS256",
    kty: "RSA",
    key_ops: ['verify'],
    use: "sig",
    x5c: ["REPLACE-ME-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    n: "REPLACE-ME-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    e: "AQAB",
    kid: "REPLACE-ME-ccccccccccccccccccccccccccccccccccccccccccccccccc",
    x5t: "REPLACE-ME-ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
  }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
}