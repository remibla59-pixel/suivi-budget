import { describe, it, expect } from 'vitest';
import {
  parseOfx,
  parseOfxDate,
  parseOfxAmount,
  decodeEntities,
  transactionsPeriod,
} from './ofxParser';

// Relevé OFX 1.x (SGML) tel que l'exporte l'espace client Banque Populaire.
const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<DTSERVER>20260401120000[-3:GMT]
<LANGUAGE>FRA
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>0
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS>
<CURDEF>EUR
<BANKACCTFROM>
<BANKID>10207
<BRANCHID>00001
<ACCTID>12345678901
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260301000000
<DTEND>20260331235959
<STMTTRN>
<TRNTYPE>DIRECTDEBIT
<DTPOSTED>20260305100000
<TRNAMT>-880.00
<FITID>BP2603050001
<NAME>PRET IMMOBILIER
<MEMO>ECHEANCE PRET &amp; FRAIS
</STMTTRN>
<STMTTRN>
<TRNTYPE>POS
<DTPOSTED>20260307143000[+1:CET]
<TRNAMT>-45,90
<FITID>BP2603070002
<NAME>CARREFOUR MARKET
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260301080000
<TRNAMT>2400.00
<FITID>BP2603010003
<NAME>VIR SEPA SALAIRE
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1523.45
<DTASOF>20260331235959
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

// Relevé OFX 2.x (XML) avec attributs OFXHEADER et balises fermantes.
const OFX_XML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<?OFX OFXHEADER="200" VERSION="211" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <CURDEF>EUR</CURDEF>
        <BANKACCTFROM>
          <BANKID>10207</BANKID>
          <ACCTID>98765432109</ACCTID>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>20260301</DTSTART>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20260301120000[+1:CET]</DTPOSTED>
            <TRNAMT>1500.50</TRNAMT>
            <FITID>X-1</FITID>
            <NAME>REMBOURSEMENT</NAME>
            <MEMO>REMBOURSEMENT MUTUELLE</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

describe('parseOfxDate', () => {
  it('convertit une date OFX avec ou sans heure', () => {
    expect(parseOfxDate('20260315')).toBe('2026-03-15');
    expect(parseOfxDate('20260315120000[-3:GMT]')).toBe('2026-03-15');
    expect(parseOfxDate('20260315143000[+1:CET]')).toBe('2026-03-15');
  });

  it('rejette les dates incomplètes ou impossibles', () => {
    expect(parseOfxDate('')).toBe('');
    expect(parseOfxDate(undefined)).toBe('');
    expect(parseOfxDate('2026')).toBe('');
    expect(parseOfxDate('20261315')).toBe('');
    expect(parseOfxDate('20260332')).toBe('');
  });
});

describe('parseOfxAmount', () => {
  it('lit les montants signés au format OFX', () => {
    expect(parseOfxAmount('-880.00')).toBe(-880);
    expect(parseOfxAmount('2400.00')).toBe(2400);
    expect(parseOfxAmount('-45,90')).toBe(-45.9);
  });

  it('gère les séparateurs de milliers', () => {
    expect(parseOfxAmount('1,234.56')).toBe(1234.56);
    expect(parseOfxAmount('1.234,56')).toBe(1234.56);
    expect(parseOfxAmount('12 345,60')).toBe(12345.6);
  });

  it('retombe à zéro sur une valeur illisible', () => {
    expect(parseOfxAmount('')).toBe(0);
    expect(parseOfxAmount('abc')).toBe(0);
  });
});

describe('decodeEntities', () => {
  it('décode les entités XML des libellés bancaires', () => {
    expect(decodeEntities('ECHEANCE PRET &amp; FRAIS')).toBe('ECHEANCE PRET & FRAIS');
    expect(decodeEntities('AUCHAN &#39;LENS&#39;')).toBe("AUCHAN 'LENS'");
    expect(decodeEntities('DUPONT &amp; FILS')).toBe('DUPONT & FILS');
    expect(decodeEntities('')).toBe('');
  });
});

describe('parseOfx (relevé SGML Banque Populaire)', () => {
  const releve = parseOfx(OFX_SGML);

  it('reconnaît le format SGML et le compte du relevé', () => {
    expect(releve.format).toBe('SGML');
    expect(releve.currency).toBe('EUR');
    expect(releve.accounts).toEqual([{ acctId: '12345678901', bankId: '10207' }]);
  });

  it('extrait toutes les opérations avec date, montant et identifiant stable', () => {
    expect(releve.transactions).toHaveLength(3);
    expect(releve.transactions[0]).toMatchObject({
      fitId: 'BP2603050001',
      date: '2026-03-05',
      amount: -880,
      name: 'PRET IMMOBILIER',
      acctId: '12345678901',
      direction: 'debit',
    });
  });

  it('décode le libellé et retient le mémo en premier', () => {
    expect(releve.transactions[0].label).toBe('ECHEANCE PRET & FRAIS');
    expect(releve.transactions[1]).toMatchObject({ date: '2026-03-07', amount: -45.9, label: 'CARREFOUR MARKET' });
  });

  it('marque les crédits', () => {
    expect(releve.transactions[2]).toMatchObject({ amount: 2400, direction: 'credit', trnType: 'CREDIT' });
  });

  it('donne la période couverte', () => {
    expect(transactionsPeriod(releve.transactions)).toEqual({ from: '2026-03-01', to: '2026-03-07' });
  });
});

describe('parseOfx (relevé XML)', () => {
  const releve = parseOfx(OFX_XML);

  it('reconnaît le format XML malgré l’attribut OFXHEADER', () => {
    expect(releve.format).toBe('XML');
  });

  it('lit les opérations délimitées par des balises fermantes', () => {
    expect(releve.transactions).toHaveLength(1);
    expect(releve.transactions[0]).toMatchObject({
      fitId: 'X-1',
      date: '2026-03-01',
      amount: 1500.5,
      direction: 'credit',
      label: 'REMBOURSEMENT MUTUELLE',
      acctId: '98765432109',
    });
  });
});

describe('parseOfx (fichier illisible)', () => {
  it('ne renvoie aucune opération hors format OFX', () => {
    expect(parseOfx('un simple texte')).toEqual({
      format: 'unknown',
      currency: 'EUR',
      accounts: [],
      transactions: [],
    });
    expect(parseOfx('')).toEqual({ format: 'unknown', currency: 'EUR', accounts: [], transactions: [] });
    expect(parseOfx(undefined).transactions).toEqual([]);
  });
});
