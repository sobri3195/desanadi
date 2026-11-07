import vm from 'node:vm';
import fs from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
export function gas() {
  const tables = new Map<string, unknown[][]>();
  let serial = 0,
    locked = false;
  const properties: Record<string, string> = {
    SPREADSHEET_ID: 'test',
    GAS_SHARED_SECRET: 'a'.repeat(48),
    ADMIN_EMAILS: 'admin@example.invalid',
  };
  class Sheet {
    constructor(public name: string) {}
    getLastRow() {
      return tables.get(this.name)!.length;
    }
    getLastColumn() {
      return (tables.get(this.name)![0] || []).length;
    }
    setFrozenRows() {}
    deleteRow(n: number) {
      tables.get(this.name)!.splice(n - 1, 1);
    }
    getRange(row: number, col: number, n: number, m: number) {
      return {
        getValues: () =>
          Array.from({ length: n }, (_, r) =>
            Array.from(
              { length: m },
              (_, c) =>
                tables.get(this.name)![row + r - 1]?.[col + c - 1] ?? '',
            ),
          ),
        setValues: (values: unknown[][]) => {
          values.forEach((r, ri) =>
            r.forEach((v, ci) => {
              const data = tables.get(this.name)!;
              data[row + ri - 1] ||= [];
              data[row + ri - 1][col + ci - 1] = v;
            }),
          );
        },
      };
    }
  }
  const book = {
    getSheetByName: (name: string) =>
      tables.has(name) ? new Sheet(name) : null,
    insertSheet: (name: string) => {
      tables.set(name, []);
      return new Sheet(name);
    },
  };
  const ctx = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Object,
    Array,
    String,
    Number,
    isFinite,
    isNaN,
    Error,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => properties[k],
        setProperty: (k: string, v: string) => (properties[k] = v),
      }),
    },
    SpreadsheetApp: { openById: () => book },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => {
          if (locked) throw Error('locked');
          locked = true;
        },
        releaseLock: () => {
          locked = false;
        },
        hasLock: () => locked,
      }),
    },
    Utilities: {
      getUuid: () =>
        `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`,
      Charset: { UTF_8: 'utf8' },
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_: string, s: string) => [
        ...createHash('sha256').update(s).digest(),
      ],
      computeHmacSha256Signature: (s: string, k: string) => [
        ...createHmac('sha256', k).update(s).digest(),
      ],
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text: string) => ({
        setMimeType: () => JSON.parse(text),
      }),
    },
  }) as any;
  for (const name of [
    'Config',
    'Database',
    'Auth',
    'Validation',
    'PublicData',
    'Requests',
    'Code',
  ])
    vm.runInContext(fs.readFileSync(`apps-script/${name}.gs`, 'utf8'), ctx);
  ctx.setupDatabase();
  const actor = { sub: 'admin-sub' };
  ctx.provisionInitialAdmin(
    actor.sub,
    'admin@example.invalid',
    'Pengelola Uji',
  );
  ctx.put('SiteSettings', {
    key: 'privacyNotice',
    value: 'Pemberitahuan privasi pilot uji dengan retensi dan kontak resmi.',
  });
  ctx.put('SiteSettings', { key: 'retentionDays', value: '30' });
  ctx.put('SiteSettings', { key: 'contact', value: 'Kontak resmi uji' });
  function call(
    action: string,
    params: unknown = {},
    customActor: unknown = actor,
    patch: Record<string, unknown> = {},
  ) {
    const timestamp = Date.now(),
      nonce = createHash('sha256')
        .update(String(++serial))
        .digest('hex')
        .slice(0, 48),
      payloadJson = JSON.stringify({ action, params, actor: customActor });
    const envelope = {
      timestamp,
      nonce,
      payloadJson,
      signature: createHmac('sha256', properties.GAS_SHARED_SECRET)
        .update(`${timestamp}\n${nonce}\n${payloadJson}`)
        .digest('hex'),
      ...patch,
    };
    return ctx.doPost({ postData: { contents: JSON.stringify(envelope) } });
  }
  return { ctx, call, actor, tables, properties };
}
