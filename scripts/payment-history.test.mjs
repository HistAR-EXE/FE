import test from 'node:test'
import assert from 'node:assert/strict'
import { csvCell, money, paymentLabel, validDates } from '../src/features/billing/historyState.ts'
test('CSV escapes spreadsheet formulas and embedded quotes',()=>{assert.equal(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');assert.equal(csvCell('a"b'), '"a""b"')})
test('unknown amount is not presented as zero',()=>{assert.equal(money(null),'Chưa xác nhận');assert.match(money(0),/0/);assert.equal(paymentLabel('UNDERPAID'),'Chưa đủ tiền')})
test('date filters reject reversed or impossible dates',()=>{assert.equal(validDates('2026-02-30',''),false);assert.equal(validDates('2026-10-29','2026-10-28'),false);assert.equal(validDates('','2026-10-29'),true)})
