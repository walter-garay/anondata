/**
 * Pure TypeScript synchronous SHA-256 implementation.
 * Ensures consistent, secure-looking hashing without external async calls.
 */
export function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const words: number[] = [];
  const asciiLength = ascii.length;
  for (let i = 0; i < asciiLength; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
  words[((asciiLength + 8) >> 6 << 4) + 15] = asciiLength * 8;
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  const w = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    const wTmp = words.slice(i, i + 16);
    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = wTmp[j] || 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
    }
    
    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];
    
    for (let j = 0; j < 64; j++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }
  
  return hash.map(val => (val >>> 0).toString(16).padStart(8, '0')).join('');
}

/**
 * Consistent hashing seed function (djb2 string hashing)
 */
export function stringHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Lists of components to construct plausible fake names, companies and emails.
 */
const MOCK_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Sam', 'Jamie', 'Robin', 'Pat', 'Chris',
  'Elena', 'Mateo', 'Aiko', 'Lucas', 'Fatima', 'Dmitry', 'Chloe', 'Zane', 'Sanjay', 'Sofia'
];

const MOCK_SURNAMES = [
  'Smith', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Thomas', 'Anderson', 'Taylor',
  'Chen', 'Kim', 'Patel', 'Novak', 'Suzuki', 'Silva', 'Muller', 'Gomez', 'Ali', 'Ivanov'
];

const MOCK_DOMAINS = [
  'example.com', 'mockdata.net', 'sandbox.org', 'testcorp.io', 'anondata.dev', 'company.local'
];

/**
 * Generates a realistic fake value based on category and original text (stable seed).
 */
export function getFakeValue(category: string, original: string): string {
  const hash = stringHash(original);
  
  switch (category) {
    case 'email': {
      const name = MOCK_NAMES[hash % MOCK_NAMES.length].toLowerCase();
      const surname = MOCK_SURNAMES[(hash >>> 2) % MOCK_SURNAMES.length].toLowerCase();
      const domain = MOCK_DOMAINS[(hash >>> 4) % MOCK_DOMAINS.length];
      const number = hash % 100 ? `.${hash % 100}` : '';
      return `${name}${number}_${surname}@${domain}`;
    }
    
    case 'ip': {
      // Local IP or non-routable class
      const octet1 = [10, 172, 192, 8][hash % 4];
      const octet2 = octet1 === 192 ? 168 : octet1 === 172 ? (16 + (hash % 16)) : (hash % 256);
      const octet3 = (hash >>> 3) % 256;
      const octet4 = (hash >>> 6) % 254 + 1;
      return `${octet1}.${octet2}.${octet3}.${octet4}`;
    }
    
    case 'credit_card': {
      // Pick card type based on hash (4 = Visa, 5 = MC, 3 = Amex)
      const prefix = [4, 51, 37, 6011][hash % 4];
      let length = prefix === 37 ? 15 : 16;
      let digits = prefix.toString();
      
      // Seed remaining digits (leaving last 4 for actual visible representation or random)
      const contentDigitsCount = length - digits.length - 4;
      for (let i = 0; i < contentDigitsCount; i++) {
        digits += ((hash >>> i) % 10).toString();
      }
      
      // Append a fixed suffix
      digits += (hash % 10000).toString().padStart(4, '7');
      
      // Format with spaces
      if (length === 15) { // Amex
        return `${digits.slice(0, 4)}-${digits.slice(4, 10)}-${digits.slice(10)}`;
      }
      return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12)}`;
    }
    
    case 'uuid': {
      // Consistent UUID
      const p1 = (hash & 0xfffffff).toString(16).padStart(8, '0');
      const p2 = ((hash >>> 4) & 0xffff).toString(16).padStart(4, '0');
      const p3 = ((hash >>> 8) & 0x0fff | 0x4000).toString(16).padStart(4, '0'); // v4 uuid
      const p4 = ((hash >>> 12) & 0x3fff | 0x8000).toString(16).padStart(4, '0');
      const p5 = sha256Sync(original).slice(0, 12);
      return `${p1}-${p2}-${p3}-${p4}-${p5}`;
    }
    
    case 'api_key': {
      // Mock specific API key patterns
      if (original.startsWith('sk_live_')) {
        return `sk_live_${sha256Sync(original).slice(0, 24)}`;
      }
      if (original.startsWith('sk_test_')) {
        return `sk_test_${sha256Sync(original).slice(0, 24)}`;
      }
      if (original.startsWith('ghp_')) {
        return `ghp_fakeToken${sha256Sync(original).slice(0, 28)}`;
      }
      if (original.startsWith('AKIA') || original.startsWith('ASIA')) {
        const prefix = original.slice(0, 4);
        return `${prefix}MOCKKEY${sha256Sync(original).slice(0, 8).toUpperCase()}`;
      }
      return `key_mock_${sha256Sync(original).slice(0, 16)}`;
    }
    
    case 'phone': {
      const area = (200 + (hash % 800)).toString();
      const prefix = (100 + ((hash >>> 2) % 900)).toString();
      const line = (1000 + ((hash >>> 4) % 9000)).toString();
      return `+1 (${area}) ${prefix}-${line}`;
    }
    
    case 'password': {
      return '••••••••';
    }
    
    default:
      return `[fake_data_${hash % 1000}]`;
  }
}

/**
 * Formats a redact placeholder based on category.
 */
export function getRedactedPlaceholder(category: string): string {
  return `[REDACTED_${category.toUpperCase()}]`;
}
