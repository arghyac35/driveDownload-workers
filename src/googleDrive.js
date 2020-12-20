import xf from './xfetch'

class GoogleDrive {
	constructor(auth) {
		this.auth = auth
		this.expires = 0;
		this._getIdCache = new Map();
	}

	async initializeClient(credNumber = 0, checkExpire = true) {
		// any method that do api call must call this beforehand
		if (checkExpire && (Date.now() < this.expires)) return;
		console.log(`Auth using: ${credNumber}`);
		const resp = await xf
			.post('https://www.googleapis.com/oauth2/v4/token', {
				urlencoded: {
					client_id: this.auth.client_ids[credNumber],
					client_secret: this.auth.client_secrets[credNumber],
					refresh_token: this.auth.refresh_tokens[credNumber],
					grant_type: 'refresh_token'
				}
			}).json();
		this.client = xf.extend({
			baseURI: 'https://www.googleapis.com/drive/v3/',
			headers: {
				Authorization: `Bearer ${resp.access_token}`
			}
		});
		this.expires = Date.now() + 3500 * 1000; // normally, it should expiers after 3600 seconds
	}

	async download(id, range = '', credNumber = 0) {
		await this.initializeClient(credNumber, false);
		return this.client.get(`files/${id}`, {
			qs: {
				includeItemsFromAllDrives: true,
				supportsAllDrives: true,
				alt: 'media'
			},
			headers: {
				Range: range
			}
		});
	}

	async getMeta(id, credNumber = 0) {
		await this.initializeClient(credNumber);
		return this.client
			.get(`files/${id}`, {
				qs: {
					includeItemsFromAllDrives: true,
					supportsAllDrives: true,
					fields: '*'
				}
			})
			.json()
	}

	async getMetaByPath(path, rootId = 'root', credNumber = 0) {
		const id = await this.getId(path, rootId, credNumber);
		if (!id) return null;
		return this.getMeta(id, credNumber);
	}

	async getId(path, rootId = 'root', credNumber = 0) {
		const toks = path.split('/').filter(Boolean);
		let id = rootId;
		for (const tok of toks) {
			id = await this._getId(id, tok, credNumber);
			// console.log('tmp id-->', id);
		}
		return id;
	}

	async _getId(parentId, childName, credNumber = 0) {
		if (this._getIdCache.has(parentId + childName)) {
			return this._getIdCache.get(parentId + childName);
		}
		// console.log('parent-->', parentId, ' Child--->', childName)
		await this.initializeClient(credNumber);
		childName = childName.replace(/\'/g, `\\'`) // escape single quote
		const resp = await this.client
			.get('files', {
				qs: {
					includeItemsFromAllDrives: true,
					supportsAllDrives: true,
					q: `'${parentId}' in parents and name = '${childName}'  and trashed = false`,
					fields: 'files(id)'
				}
			})
			.json()
			.catch(e => ({ files: [] })) // if error, make it empty
		if (resp.files.length === 0) {
			return null
		}
		this._getIdCache.has(parentId + childName)
		return resp.files[0].id // when there are more than 1 items, simply return the first one
	}
}
export default GoogleDrive
