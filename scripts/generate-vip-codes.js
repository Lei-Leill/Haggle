#!/usr/bin/env node

/**
 * VIP Code Generator
 * Generates 45 unique VIP codes for the demo
 * 
 * Usage: node generate-vip-codes.js
 * 
 * This will output SQL INSERT statements for copy-pasting into Supabase SQL Editor
 */

import crypto from 'crypto'

function generateVipCode() {
  // Format: Haggle-XXXX (shorter and easier to type)
  // 4 hex chars = 2 bytes = 65,536 possible combos (plenty for 45 codes)
  const hexCode = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `Haggle-${hexCode}`
}

function generateUniqueCodes(count) {
  const codes = new Set()
  while (codes.size < count) {
    codes.add(generateVipCode())
  }
  return Array.from(codes)
}

const vipCodes = generateUniqueCodes(45)

console.log('-- Generated 45 VIP Codes for Demo (20,000 tokens each)')
console.log('-- Copy and paste this into Supabase SQL Editor\n')
console.log('INSERT INTO vip_codes (code, token_allowance, is_used) VALUES')

const sqlValues = vipCodes.map((code, idx) => {
  const isLast = idx === vipCodes.length - 1
  return `  ('${code}', 20000, false)${isLast ? ';' : ','}`
})

console.log(sqlValues.join('\n'))

console.log('\n-- List of VIP Codes (for sharing with testers):')
console.log('-- Format: Haggle-XXXX\n')
vipCodes.forEach((code, idx) => {
  console.log(`${(idx + 1).toString().padStart(2, '0')}. ${code}`)
})

console.log(`\n-- Total codes generated: ${vipCodes.length}`)
console.log('-- Token allowance per code: 20,000')
console.log('-- Free trial tokens: 1,000')
