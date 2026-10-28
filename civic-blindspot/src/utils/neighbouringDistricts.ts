/**
 * Adjacency map for Karnataka's 31 districts.
 * Used when a district has no direct mapped legal aid headquarters,
 * to inform citizens of adjacent administrative districts with offices
 * strictly by shared boundary (never by calculated distance).
 */
export const KARNATAKA_DISTRICT_NEIGHBOURS: Record<string, string[]> = {
  'Bagalkote': ['Belagavi', 'Vijayapura', 'Gadag', 'Koppal', 'Raichur'],
  'Ballari': ['Vijayanagara', 'Koppal', 'Chitradurga'],
  'Belagavi': ['Bagalkote', 'Vijayapura', 'Dharwad', 'Gadag', 'Uttara Kannada'],
  'Bengaluru Rural': ['Bengaluru Urban', 'Ramanagara', 'Tumakuru', 'Chikkaballapura', 'Kolar'],
  'Bengaluru Urban': ['Bengaluru Rural', 'Ramanagara'],
  'Bidar': ['Kalaburagi'],
  'Chamarajanagara': ['Mysuru', 'Mandya'],
  'Chikkaballapura': ['Kolar', 'Bengaluru Rural', 'Tumakuru'],
  'Chikkamagaluru': ['Hassan', 'Shivamogga', 'Udupi', 'Dakshina Kannada', 'Davangere', 'Chitradurga'],
  'Chitradurga': ['Davangere', 'Tumakuru', 'Chikkamagaluru', 'Ballari', 'Vijayanagara'],
  'Dakshina Kannada': ['Udupi', 'Chikkamagaluru', 'Hassan', 'Kodagu'],
  'Davangere': ['Chitradurga', 'Shivamogga', 'Haveri', 'Vijayanagara', 'Chikkamagaluru'],
  'Dharwad': ['Belagavi', 'Gadag', 'Haveri', 'Uttara Kannada'],
  'Gadag': ['Belagavi', 'Dharwad', 'Haveri', 'Koppal', 'Bagalkote', 'Vijayanagara'],
  'Hassan': ['Chikkamagaluru', 'Dakshina Kannada', 'Kodagu', 'Mysuru', 'Mandya', 'Tumakuru'],
  'Haveri': ['Dharwad', 'Gadag', 'Vijayanagara', 'Davangere', 'Shivamogga', 'Uttara Kannada'],
  'Kalaburagi': ['Bidar', 'Yadgir', 'Vijayapura'],
  'Kodagu': ['Dakshina Kannada', 'Hassan', 'Mysuru'],
  'Kolar': ['Chikkaballapura', 'Bengaluru Rural'],
  'Koppal': ['Gadag', 'Bagalkote', 'Raichur', 'Vijayanagara', 'Ballari'],
  'Mandya': ['Mysuru', 'Hassan', 'Tumakuru', 'Ramanagara', 'Chamarajanagara'],
  'Mysuru': ['Chamarajanagara', 'Mandya', 'Hassan', 'Kodagu'],
  'Raichur': ['Kalaburagi', 'Yadgir', 'Bagalkote', 'Koppal', 'Ballari'],
  'Ramanagara': ['Bengaluru Urban', 'Bengaluru Rural', 'Tumakuru', 'Mandya'],
  'Shivamogga': ['Uttara Kannada', 'Haveri', 'Davangere', 'Chikkamagaluru', 'Udupi'],
  'Tumakuru': ['Chitradurga', 'Chikkamagaluru', 'Hassan', 'Mandya', 'Ramanagara', 'Bengaluru Rural', 'Chikkaballapura'],
  'Udupi': ['Uttara Kannada', 'Shivamogga', 'Chikkamagaluru', 'Dakshina Kannada'],
  'Uttara Kannada': ['Belagavi', 'Dharwad', 'Haveri', 'Shivamogga', 'Udupi'],
  'Vijayanagara': ['Ballari', 'Koppal', 'Gadag', 'Haveri', 'Davangere', 'Chitradurga'],
  'Vijayapura': ['Belagavi', 'Bagalkote', 'Kalaburagi'],
  'Yadgir': ['Kalaburagi', 'Raichur', 'Vijayapura'],
};

export function getNeighbouringDistricts(district: string): string[] {
  // Case-insensitive lookup
  const matchKey = Object.keys(KARNATAKA_DISTRICT_NEIGHBOURS).find(
    (k) => k.toLowerCase() === district.toLowerCase()
  );
  return matchKey ? KARNATAKA_DISTRICT_NEIGHBOURS[matchKey] : [];
}
