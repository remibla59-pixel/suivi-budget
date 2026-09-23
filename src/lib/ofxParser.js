// --- Lecture d'un relevé bancaire OFX (aucune dépendance) ---
// Les banques — dont Banque Populaire via « Télécharger les opérations » — exportent
// les mouvements au format OFX, en deux variantes : SGML (OFX 1.x, balises sans
// fermeture hors blocs) et XML (OFX 2.x). Ce module lit les deux et renvoie des
// opérations normalisées, prêtes à être rapprochées des postes du budget.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

// Entités XML : les libellés d'opérations en contiennent régulièrement (&amp;, &#39;).
export const decodeEntities = (value) =>
  String(value ?? '').replace(/&(#\d+|[a-z]+);/gi, (raw, code) =>
    code.startsWith('#') ? String.fromCharCode(Number(code.slice(1))) : ENTITIES[code.toLowerCase()] ?? raw);

// Valeur d'une balise OFX : en SGML elle court jusqu'au saut de ligne, en XML
// jusqu'à la balise fermante — dans les deux cas elle s'arrête au premier '<'.
const tagValue = (block, tag) => {
  const match = new RegExp(`<${tag}>\\s*([^<\\r\\n]*)`, 'i').exec(block);
  return match ? decodeEntities(match[1]).trim() : '';
};

// Date OFX ('20260315' ou '20260315120000[-3:GMT]') vers 'AAAA-MM-JJ'.
export const parseOfxDate = (raw) => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length < 8) return '';
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(iso) ? iso : '';
};

// Montant OFX : le '.' est le séparateur décimal officiel, mais certains exports
// utilisent la virgule (avec séparateur de milliers). Le séparateur le plus à
// droite est toujours celui des décimales.
export const parseOfxAmount = (raw) => {
  const cleaned = String(raw ?? '').replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;
  if (lastComma !== -1 && lastDot !== -1) {
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.') // 1.234,56
      : cleaned.replace(/,/g, ''); // 1,234.56
  } else if (lastComma !== -1) {
    normalized = cleaned.replace(',', '.');
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) / 100 : 0;
};

// Comptes présents dans le relevé (identifiant + banque annoncée), dédupliqués.
const collectAccounts = (raw) => {
  const found = new Map();
  const re = /<ACCTID>\s*([^<\r\n]*)/gi;
  let match;
  while ((match = re.exec(raw)) !== null) {
    const acctId = decodeEntities(match[1]).trim();
    if (!acctId || found.has(acctId)) continue;
    const before = raw.slice(Math.max(0, match.index - 500), match.index);
    const bank = /<BANKID>\s*([^<\r\n]*)/i.exec(before);
    found.set(acctId, { acctId, bankId: bank ? bank[1].trim() : '' });
  }
  return [...found.values()];
};

// Compte auquel appartient une opération : dernier <ACCTID> déclaré avant elle.
const accountBefore = (raw, index) => {
  const matches = [...raw.slice(0, index).matchAll(/<ACCTID>\s*([^<\r\n]*)/gi)];
  const last = matches[matches.length - 1];
  return last ? decodeEntities(last[1]).trim() : '';
};

// Découpe le relevé en blocs <STMTTRN>… (le bloc va jusqu'à la balise fermante en
// XML, jusqu'au bloc suivant ou la fin de liste en SGML).
const transactionBlocks = (raw) => {
  const blocks = [];
  const re = /<STMTTRN>/gi;
  let match;
  while ((match = re.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const rest = raw.slice(start);
    const ends = [rest.search(/<\/STMTTRN>/i), rest.search(/<STMTTRN>|<\/BANKTRANLIST>/i)]
      .filter((i) => i !== -1);
    const block = ends.length ? rest.slice(0, Math.min(...ends)) : rest;
    blocks.push({ block, index: match.index });
  }
  return blocks;
};

// Lit un relevé OFX complet.
export const parseOfx = (text) => {
  const raw = String(text ?? '');
  if (!/<STMTTRN>/i.test(raw)) {
    return { format: 'unknown', currency: 'EUR', accounts: [], transactions: [] };
  }
  // Un en-tête OFX en clair (« OFXHEADER:100 ») signale du SGML ; sinon c'est du XML
  // (les fichiers XML annoncent OFXHEADER en attribut et commencent par <?xml).
  const format = /OFXHEADER\s*:|DATA:OFXSGML/i.test(raw) ? 'SGML' : 'XML';
  const currency = tagValue(raw, 'CURDEF') || 'EUR';

  const transactions = transactionBlocks(raw).reduce((list, { block, index }) => {
    const date = parseOfxDate(tagValue(block, 'DTPOSTED') || tagValue(block, 'DTUSER'));
    if (!date) return list; // ligne inexploitable : on l'ignore plutôt que d'importer du faux
    const amount = parseOfxAmount(tagValue(block, 'TRNAMT'));
    const name = tagValue(block, 'NAME');
    const memo = tagValue(block, 'MEMO');
    list.push({
      fitId: tagValue(block, 'FITID'),
      acctId: accountBefore(raw, index),
      date,
      amount,
      name,
      memo,
      label: memo || name || 'Opération',
      trnType: (tagValue(block, 'TRNTYPE') || '').toUpperCase(),
      checkNum: tagValue(block, 'CHECKNUM'),
      currency,
      direction: amount < 0 ? 'debit' : 'credit',
    });
    return list;
  }, []);

  return { format, currency, accounts: collectAccounts(raw), transactions };
};

// Période couverte par un lot d'opérations (pour l'aperçu avant import).
export const transactionsPeriod = (transactions) => {
  const dates = (transactions || []).map((t) => t.date).filter(Boolean).sort();
  return dates.length ? { from: dates[0], to: dates[dates.length - 1] } : { from: '', to: '' };
};
