import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const styles=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

test('mobile contract signature panel scrolls after the contract instead of staying fixed',()=>{
  const responsive=styles.match(/@media \(max-width: 1080px\) \{([\s\S]*?)(?=\n\})/)?.[1]||'';
  assert.match(responsive,/\.contract-grid\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(responsive,/\.contract-panel--side\s*\{[^}]*position:\s*static/);
  assert.doesNotMatch(responsive,/\.contract-panel--side\s*\{[^}]*position:\s*(?:fixed|sticky)/);
  assert.match(responsive,/\.contract-panel--side\s*\{[^}]*max-height:\s*none/);
});
