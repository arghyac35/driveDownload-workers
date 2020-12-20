# Google Drive download using cloudflare workers

* This repo is based on https://github.com/detroitenglish/cloudflare-workers-webpack-boilerplate

* This repo is also trimmed down and modified as per my need from https://github.com/maple3142/GDIndex


### What you configure

- Your Cloudflare credentials
- Your site name (FQDN) or Cloudflare Zone-Id
- (Optional) One or more route matching patterns for your Worker

### What you get

- This only have the download code from GDindex
- Added JWT authentication, so without it nothing will happen, pass the jwt as token in url. Code taken from: https://gist.github.com/bcnzer/e6a7265fd368fa22ef960b17b9a76488
- This doesnt have the full index code
- Added support for multiple google drive account, as sometimes google drive's file download quota gets excceed from one account but can be accessible from another

### Requirements

- Node 8 or later
- Cloudflare account with domain

## Quick Start

1.  Clone this repository:

    ```bash
    git clone git@github.com:arghyac35/driveDownload-workers.git

    cd driveDownload-workers
    ```

2.  Rename `example.env` to `.env` , and add your required Cloudflare
    credentials, either your site name or site's zone-id, and google drive credentials
3.  Install dependencies with `npm install`
4.  Add the jwk in worker file(https://github.com/arghyac35/driveDownload-workers/blob/main/src/worker.js#L212-L222).
5.  Build, bundle and launch your ~~minion~~ Worker to the Cloudflare Edge 🚀
    using: `npm run deploy`

## Configuration

### Required Config

#### Cloudflare Credentials

The following are **required** in your `.env` file:

- `CLOUDFLARE_AUTH_EMAIL`: Your Cloudflare account email address

- `CLOUDFLARE_AUTH_KEY`: Your Cloudflare API-Key

#### Site Identification

You **must** provide a means of identifying your Cloudflare site deployment
target by defining (in `.env`) either:

- `CLOUDFLARE_ZONE_ID`: The Zone ID to which your worker will be deployed

or

- `CLOUDFLARE_SITE_NAME`: The fully qualified domain name (FQDN) of your site,
  e.g. _example.lol_

### Additional Config

More options are defined and described in [`example.env`](./example.env)

## Default Settings & Behaviors (Advanced)

### Minification

Webpack is configured to minify scripts before deployment in order to help keep
your bundled Worker under the 1MB limit.

Building previews with `npm run build` will **not** minify scripts in order to
make debugging easier.

### Custom `.env` Variables

See [`example.env`](./example.env) for details and examples on adding and
injecting custom variables.

### Route Patterns

See [`example.env`](./example.env) for details and examples on how route
patterns are parsed and deployed.


### License

[MIT](./LICENSE)
