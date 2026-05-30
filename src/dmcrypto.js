// ============================================================
// DM-ONLY CONTENT ENCRYPTION (AES-GCM via Web Crypto API)
// ------------------------------------------------------------
// DM-only sections and inline DM blocks have their text content encrypted
// with a key derived from VITE_DM_PASSWORD. Non-DM users receive only the
// ciphertext; without the password they cannot read it, even via DevTools.
//
// Scheme:
//   VITE_DM_PASSWORD -> PBKDF2 (SHA-256, 100k iters, fixed salt) -> AES-GCM-256 key
//   Each encrypted value carries its own random IV (12 bytes), base64-encoded,
//   stored alongside the ciphertext as "iv:ciphertext".
//
// Encrypted values are tagged with a sentinel prefix so we can tell ciphertext
// from plaintext at any point: "enc::v1::<base64 iv>::<base64 ciphertext>".
// ============================================================

const ENC_PREFIX = 'enc::v1::';
const PBKDF2_SALT = 'cotr-compendium-dm-salt-v1'; // fixed, non-secret
const PBKDF2_ITERS = 100000;

const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(bytes) {
  let binary = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

// Derive an AES-GCM key from the DM password. Returns a CryptoKey.
export async function deriveDMKey(password) {
  if (!password) return null;
  try {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(PBKDF2_SALT),
        iterations: PBKDF2_ITERS,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (e) {
    console.error('DM key derivation failed:', e);
    return null;
  }
}

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

// Encrypt a plaintext string -> sentinel-tagged ciphertext string.
export async function encryptString(plaintext, key) {
  if (key == null) return plaintext;            // no key -> leave as-is
  if (typeof plaintext !== 'string') return plaintext;
  if (isEncrypted(plaintext)) return plaintext; // already encrypted
  if (plaintext === '') return '';              // keep empties as empties
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );
    return `${ENC_PREFIX}${toBase64(iv)}::${toBase64(ct)}`;
  } catch (e) {
    console.error('Encrypt failed:', e);
    return plaintext;
  }
}

// Decrypt a sentinel-tagged ciphertext string -> plaintext.
// If not encrypted or no key, returns the value unchanged.
export async function decryptString(value, key) {
  if (!isEncrypted(value)) return value;
  if (key == null) return value;  // can't decrypt; leave ciphertext
  try {
    const rest = value.slice(ENC_PREFIX.length);
    const [ivB64, ctB64] = rest.split('::');
    const iv = fromBase64(ivB64);
    const ct = fromBase64(ctB64);
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ct
    );
    return dec.decode(pt);
  } catch (e) {
    console.error('Decrypt failed:', e);
    return value; // leave ciphertext on failure
  }
}

// ── Section/block-level transforms ─────────────────────────────────────

// Encrypt all text content in a single section (used when dmOnly: true).
async function encryptSectionContent(section, key) {
  const out = { ...section };
  if (typeof out.heading === 'string') out.heading = await encryptString(out.heading, key);
  if (typeof out.lore === 'string') out.lore = await encryptString(out.lore, key);
  if (typeof out.caption === 'string') out.caption = await encryptString(out.caption, key);

  // body can be a string OR a blocks array
  if (Array.isArray(out.body)) {
    out.body = await encryptBlocks(out.body, key, true);
  } else if (typeof out.body === 'string') {
    out.body = await encryptString(out.body, key);
  }

  if (Array.isArray(out.features)) {
    out.features = await Promise.all(out.features.map(async (f) => ({
      ...f,
      name: await encryptString(f.name, key),
      text: Array.isArray(f.text) ? await encryptBlocks(f.text, key, true)
            : await encryptString(f.text, key),
    })));
  }
  if (Array.isArray(out.columns)) {
    out.columns = await Promise.all(out.columns.map((c) => encryptString(c, key)));
  }
  if (Array.isArray(out.rows)) {
    out.rows = await Promise.all(out.rows.map((row) =>
      Promise.all(row.map((cell) => encryptString(cell, key)))));
  }
  if (Array.isArray(out.entries)) {
    out.entries = await Promise.all(out.entries.map(async (e) => ({
      ...e,
      name: await encryptString(e.name, key),
      flavor: await encryptString(e.flavor, key),
      description: Array.isArray(e.description) ? await encryptBlocks(e.description, key, true)
                   : await encryptString(e.description, key),
      features: Array.isArray(e.features) ? await Promise.all(e.features.map(async (f) => ({
        ...f,
        name: await encryptString(f.name, key),
        body: Array.isArray(f.body) ? await encryptBlocks(f.body, key, true)
              : await encryptString(f.body, key),
      }))) : e.features,
    })));
  }
  return out;
}

async function decryptSectionContent(section, key) {
  const out = { ...section };
  if (typeof out.heading === 'string') out.heading = await decryptString(out.heading, key);
  if (typeof out.lore === 'string') out.lore = await decryptString(out.lore, key);
  if (typeof out.caption === 'string') out.caption = await decryptString(out.caption, key);

  if (Array.isArray(out.body)) {
    out.body = await decryptBlocks(out.body, key);
  } else if (typeof out.body === 'string') {
    out.body = await decryptString(out.body, key);
  }

  if (Array.isArray(out.features)) {
    out.features = await Promise.all(out.features.map(async (f) => ({
      ...f,
      name: await decryptString(f.name, key),
      text: Array.isArray(f.text) ? await decryptBlocks(f.text, key)
            : await decryptString(f.text, key),
    })));
  }
  if (Array.isArray(out.columns)) {
    out.columns = await Promise.all(out.columns.map((c) => decryptString(c, key)));
  }
  if (Array.isArray(out.rows)) {
    out.rows = await Promise.all(out.rows.map((row) =>
      Promise.all(row.map((cell) => decryptString(cell, key)))));
  }
  if (Array.isArray(out.entries)) {
    out.entries = await Promise.all(out.entries.map(async (e) => ({
      ...e,
      name: await decryptString(e.name, key),
      flavor: await decryptString(e.flavor, key),
      description: Array.isArray(e.description) ? await decryptBlocks(e.description, key)
                   : await decryptString(e.description, key),
      features: Array.isArray(e.features) ? await Promise.all(e.features.map(async (f) => ({
        ...f,
        name: await decryptString(f.name, key),
        body: Array.isArray(f.body) ? await decryptBlocks(f.body, key)
              : await decryptString(f.body, key),
      }))) : e.features,
    })));
  }
  return out;
}

// Encrypt blocks in a BlockBody array. `forceAll` encrypts every text/table/links
// block (used when the whole section is dmOnly). Otherwise, only `dm`-type blocks.
async function encryptBlocks(blocks, key, forceAll = false) {
  if (!Array.isArray(blocks)) return blocks;
  return Promise.all(blocks.map(async (b) => {
    const shouldEncrypt = forceAll || b.type === 'dm';
    if (!shouldEncrypt) return b;
    const out = { ...b };
    if (typeof out.body === 'string') out.body = await encryptString(out.body, key);
    if (Array.isArray(out.columns)) out.columns = await Promise.all(out.columns.map((c) => encryptString(c, key)));
    if (Array.isArray(out.rows)) out.rows = await Promise.all(out.rows.map((row) => Promise.all(row.map((cell) => encryptString(cell, key)))));
    return out;
  }));
}

async function decryptBlocks(blocks, key) {
  if (!Array.isArray(blocks)) return blocks;
  return Promise.all(blocks.map(async (b) => {
    const out = { ...b };
    if (typeof out.body === 'string') out.body = await decryptString(out.body, key);
    if (Array.isArray(out.columns)) out.columns = await Promise.all(out.columns.map((c) => decryptString(c, key)));
    if (Array.isArray(out.rows)) out.rows = await Promise.all(out.rows.map((row) => Promise.all(row.map((cell) => decryptString(cell, key)))));
    return out;
  }));
}

// ── Top-level: encrypt/decrypt all sections of an entry ────────────────

// Encrypt dmOnly sections and dm blocks before save. Non-dmOnly sections still
// get a pass to catch inline `dm` blocks inside their bodies.
export async function encryptSections(sections, key) {
  if (!Array.isArray(sections) || key == null) return sections;
  return Promise.all(sections.map(async (sec) => {
    if (sec.dmOnly) {
      return encryptSectionContent(sec, key);
    }
    // Non-dmOnly section: still encrypt any inline dm blocks in its body
    if (Array.isArray(sec.body)) {
      return { ...sec, body: await encryptBlocks(sec.body, key, false) };
    }
    // Features/entries may also contain dm blocks in their text/body/description
    return await encryptInlineDmBlocks(sec, key);
  }));
}

export async function decryptSections(sections, key) {
  if (!Array.isArray(sections) || key == null) return sections;
  return Promise.all(sections.map(async (sec) => {
    if (sec.dmOnly) {
      return decryptSectionContent(sec, key);
    }
    if (Array.isArray(sec.body)) {
      return { ...sec, body: await decryptBlocks(sec.body, key) };
    }
    return await decryptInlineDmBlocksDecrypt(sec, key);
  }));
}

// Handle dm blocks nested inside features[].text and entries[].description/features[].body
async function encryptInlineDmBlocks(sec, key) {
  const out = { ...sec };
  if (Array.isArray(out.features)) {
    out.features = await Promise.all(out.features.map(async (f) => {
      if (Array.isArray(f.text)) return { ...f, text: await encryptBlocks(f.text, key, false) };
      return f;
    }));
  }
  if (Array.isArray(out.entries)) {
    out.entries = await Promise.all(out.entries.map(async (e) => {
      const eo = { ...e };
      if (Array.isArray(eo.description)) eo.description = await encryptBlocks(eo.description, key, false);
      if (Array.isArray(eo.features)) {
        eo.features = await Promise.all(eo.features.map(async (f) => {
          if (Array.isArray(f.body)) return { ...f, body: await encryptBlocks(f.body, key, false) };
          return f;
        }));
      }
      return eo;
    }));
  }
  return out;
}

async function decryptInlineDmBlocksDecrypt(sec, key) {
  const out = { ...sec };
  if (Array.isArray(out.features)) {
    out.features = await Promise.all(out.features.map(async (f) => {
      if (Array.isArray(f.text)) return { ...f, text: await decryptBlocks(f.text, key) };
      return f;
    }));
  }
  if (Array.isArray(out.entries)) {
    out.entries = await Promise.all(out.entries.map(async (e) => {
      const eo = { ...e };
      if (Array.isArray(eo.description)) eo.description = await decryptBlocks(eo.description, key);
      if (Array.isArray(eo.features)) {
        eo.features = await Promise.all(eo.features.map(async (f) => {
          if (Array.isArray(f.body)) return { ...f, body: await decryptBlocks(f.body, key) };
          return f;
        }));
      }
      return eo;
    }));
  }
  return out;
}

// Encrypt all entries (subclasses, races, classes, characters) in a content object.
export async function encryptContent(content, key) {
  if (key == null) return content;
  const transform = async (arr) => arr ? Promise.all(arr.map(async (e) =>
    Array.isArray(e.sections) ? { ...e, sections: await encryptSections(e.sections, key) } : e)) : arr;
  return {
    ...content,
    subclasses: await transform(content.subclasses),
    races: await transform(content.races),
    classes: await transform(content.classes),
    characters: await transform(content.characters),
  };
}

export async function decryptContent(content, key) {
  if (key == null) return content;
  const transform = async (arr) => arr ? Promise.all(arr.map(async (e) =>
    Array.isArray(e.sections) ? { ...e, sections: await decryptSections(e.sections, key) } : e)) : arr;
  return {
    ...content,
    subclasses: await transform(content.subclasses),
    races: await transform(content.races),
    classes: await transform(content.classes),
    characters: await transform(content.characters),
  };
}
