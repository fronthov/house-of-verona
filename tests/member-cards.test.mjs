import test from 'node:test';
import assert from 'node:assert/strict';
import {oneCalendarYearAfter,isAnnualCardActive,cardNumberFromPayment,cardEmailHtml,cardName} from '../src/member-cards.js';
test('one-year anniversary keeps the same time, excludes expiry instant',()=>{
 const purchased=Date.parse('2026-11-16T13:30:00+05:30')/1000;
 const end=Date.parse('2027-11-16T13:30:00+05:30')/1000;
 assert.equal(oneCalendarYearAfter(purchased),end);
 const card={purchased_at:purchased,expires_at:end};
 assert.equal(isAnnualCardActive(card,purchased),true);
 assert.equal(isAnnualCardActive(card,end-1),true);
 assert.equal(isAnnualCardActive(card,end),false);
});
test('a 29 February purchase expires on 28 February next year',()=>{
 const start=Date.parse('2028-02-29T10:15:00+05:30')/1000;
 assert.equal(oneCalendarYearAfter(start),Date.parse('2029-02-28T10:15:00+05:30')/1000);
});
test('cards contain member, ID and expiry but escape customer HTML',()=>{
 const now=Date.parse('2026-11-16T12:00:00+05:30')/1000;
 const html=cardEmailHtml({card_id:cardNumberFromPayment('abc-123'),member_name:'<Admin & Team>',
  purchased_at:now,expires_at:oneCalendarYearAfter(now)});
 assert.match(html,/VERONATES/);
 assert.match(html,/Expires:/);
 assert.match(html,/&lt;Admin &amp; Team&gt;/);
 assert.doesNotMatch(html,/<Admin & Team>/);
 assert.equal(cardName('  First   Last  '),'First Last');
});

test('a fully refunded membership cannot stay active',()=>{
 const start=Date.parse('2026-11-16T10:00:00+05:30')/1000;
 const card={purchased_at:start,expires_at:oneCalendarYearAfter(start),revoked_at:start+10};
 assert.equal(isAnnualCardActive(card,start+11),false);
});

test('early-morning IST leap-day purchase ends on 28 February, not 1 March',()=>{
 const start=Date.parse('2028-02-29T00:30:00+05:30')/1000;
 const end=Date.parse('2029-02-28T00:30:00+05:30')/1000;
 assert.equal(oneCalendarYearAfter(start),end);
});
