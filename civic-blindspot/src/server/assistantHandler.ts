import fs from 'node:fs';
import path from 'node:path';

// Rate limiting in-memory store
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 20;

interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AssistantToolAction {
  type: 'filter_district' | 'set_threshold' | 'select_centre' | 'view_tab';
  payload: Record<string, string | number>;
  label: string;
}

interface AssistantCitation {
  id: string;
  name: string;
  district?: string;
  last_verified?: string;
  is_sample?: boolean;
}

interface AssistantResponsePayload {
  reply: string;
  citations: AssistantCitation[];
  actions: AssistantToolAction[];
  error?: string;
}

// Load data files safely
function loadData() {
  try {
    const centresPath = path.resolve(process.cwd(), 'public/data/centres.json');
    const areasPath = path.resolve(process.cwd(), 'public/data/areas.json');
    const workflowsPath = path.resolve(process.cwd(), 'public/data/workflows.json');
    const centres = JSON.parse(fs.readFileSync(centresPath, 'utf-8'));
    const areas = JSON.parse(fs.readFileSync(areasPath, 'utf-8'));
    let workflows: any[] = [];
    try {
      workflows = JSON.parse(fs.readFileSync(workflowsPath, 'utf-8'));
    } catch {
      workflows = [];
    }
    return { centres, areas, workflows };
  } catch {
    return { centres: [], areas: [], workflows: [] };
  }
}

// Tool: get_workflow
function getWorkflow(workflows: any[], queryOrId: string) {
  const norm = queryOrId.toLowerCase().trim();
  const match = workflows.find(
    (w: any) =>
      w.id.toLowerCase() === norm ||
      w.id.toLowerCase().includes(norm) ||
      w.title.toLowerCase().includes(norm) ||
      (w.title_kn && w.title_kn.includes(norm))
  );
  if (!match) return null;
  return {
    id: match.id,
    title: match.title,
    title_kn: match.title_kn,
    summary: match.plain_language_summary,
    who_is_it_for: match.who_is_it_for,
    total_steps: match.steps?.length || 0,
    steps_overview: match.steps?.map((s: any) => ({
      step: s.step_number,
      title: s.title,
      timeline: s.typical_timeline,
      where: s.where_or_with_whom,
    })),
    last_verified: match.last_verified,
    is_sample: match.is_sample,
  };
}

// Tool 1: search_centres
function searchCentres(centres: any[], args: { district?: string; type?: string; service?: string }) {
  let list = centres;
  if (args.district) {
    const dLower = args.district.toLowerCase();
    list = list.filter((c: any) => c.district.toLowerCase().includes(dLower));
  }
  if (args.type) {
    const tLower = args.type.toLowerCase();
    list = list.filter((c: any) => c.type.toLowerCase() === tLower);
  }
  if (args.service) {
    const sLower = args.service.toLowerCase();
    list = list.filter((c: any) => c.services.some((s: string) => s.toLowerCase().includes(sLower)));
  }
  return list.slice(0, 5).map((c: any) => ({
    id: c.id,
    name: c.name,
    name_kn: c.name_kn,
    type: c.type,
    district: c.district,
    address: c.address,
    phone: c.phone,
    services: c.services,
    last_verified: c.last_verified,
    is_sample: c.is_sample,
  }));
}

// Tool 2: get_area_stats
function getAreaStats(areas: any[], centres: any[], areaName: string) {
  const norm = areaName.toLowerCase().trim();
  const area = areas.find(
    (a: any) =>
      a.name.toLowerCase() === norm ||
      a.name.toLowerCase().includes(norm) ||
      (a.name_kn && a.name_kn.includes(norm))
  );

  if (!area) return { found: false, message: `No taluk found matching "${areaName}".` };

  // Calculate distance to nearest centre
  let nearest: any = null;
  let minDist = Infinity;
  for (const c of centres) {
    const R = 6371;
    const dLat = ((c.lat - area.centroid_lat) * Math.PI) / 180;
    const dLng = ((c.lng - area.centroid_lng) * Math.PI) / 180;
    const aVal =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((area.centroid_lat * Math.PI) / 180) *
        Math.cos((c.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const dist = R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
    if (dist < minDist) {
      minDist = dist;
      nearest = c;
    }
  }

  const roundedKm = Math.round(minDist * 10) / 10;
  return {
    found: true,
    name: area.name,
    name_kn: area.name_kn,
    district: area.district,
    population: area.population,
    nearestCentre: nearest ? { id: nearest.id, name: nearest.name, type: nearest.type } : null,
    distanceKm: roundedKm,
    gapAssessment:
      roundedKm > 50
        ? 'Critical Gap (>50km)'
        : roundedKm > 25
        ? 'Underserved (25-50km)'
        : 'Adequately Served (<=25km)',
  };
}

// Tool 3: get_top_gaps
function getTopGaps(areas: any[], centres: any[], n = 5, threshold = 25) {
  const scored = areas.map((a: any) => {
    let minDist = Infinity;
    for (const c of centres) {
      const R = 6371;
      const dLat = ((c.lat - a.centroid_lat) * Math.PI) / 180;
      const dLng = ((c.lng - a.centroid_lng) * Math.PI) / 180;
      const aVal =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((a.centroid_lat * Math.PI) / 180) *
          Math.cos((c.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const dist = R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
      if (dist < minDist) minDist = dist;
    }
    return {
      name: a.name,
      district: a.district,
      population: a.population,
      distanceKm: Math.round(minDist * 10) / 10,
    };
  });

  scored.sort((a: any, b: any) => b.distanceKm - a.distanceKm);
  const beyondThreshold = scored.filter((s: any) => s.distanceKm > threshold);

  return {
    thresholdKm: threshold,
    totalBeyondThreshold: beyondThreshold.length,
    topGaps: scored.slice(0, n),
  };
}

// Tool 4: get_what_to_bring
function getWhatToBring(issueType: string) {
  const norm = issueType.toLowerCase();
  const common = [
    'Government-issued Photo ID (Aadhaar card, Voter ID, or Ration card)',
    'Income certificate or BPL card (for free fee exemption)',
    'Written chronology/statement of the issue in simple terms',
    'Two photocopies of all submitted documents',
  ];

  if (norm.includes('property') || norm.includes('land') || norm.includes('tenant')) {
    return {
      category: 'Property & Land Disputes',
      checklist: [
        ...common,
        'Title deed / Sale deed / Lease agreement copy',
        'Recent property tax receipts or mutation/khata extract',
        'Notice copies received from the opposite party (if any)',
      ],
      authority: 'District Legal Services Authority (DLSA) / Taluk Legal Services Committee (TLSC)',
    };
  }

  if (norm.includes('family') || norm.includes('domestic') || norm.includes('matrimonial')) {
    return {
      category: 'Family & Matrimonial Issues',
      checklist: [
        ...common,
        'Marriage registration certificate (if available)',
        'Birth certificates of children (if custody or maintenance is involved)',
        'Any prior police complaints, mediation notes, or medical records',
      ],
      authority: 'Family Court Legal Services Clinic / DLSA',
    };
  }

  if (norm.includes('criminal') || norm.includes('police') || norm.includes('bail')) {
    return {
      category: 'Criminal & Police Matters',
      checklist: [
        ...common,
        'Copy of First Information Report (FIR) if filed',
        'Remand order or summons received',
        'Contact information of any surety/relatives',
      ],
      authority: 'Legal Aid Defence Counsel System (LADCS) at District Court',
    };
  }

  return {
    category: 'General Civil Legal Assistance',
    checklist: common,
    authority: 'Nearest DLSA or TLSC front office',
  };
}

// Process request
export async function handleAssistantRequest(
  reqBody: {
    messages: AssistantMessage[];
    sessionId?: string;
    lang?: 'en' | 'kn';
    caseSummaryConsent?: boolean;
    caseData?: {
      id?: string;
      title?: string;
      stage?: string;
      authority_forum?: string;
      next_deadline?: string;
      notes?: string;
    };
  },
  clientIp = '127.0.0.1'
): Promise<AssistantResponsePayload> {
  const { messages, sessionId, lang = 'en', caseSummaryConsent, caseData } = reqBody;

  // 1. Validate Input Length
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { reply: 'Please provide a valid question.', citations: [], actions: [], error: 'Invalid message payload' };
  }

  const latestUserMsg = messages[messages.length - 1];
  if (!latestUserMsg || !latestUserMsg.content || latestUserMsg.content.trim().length === 0) {
    return { reply: 'Please enter a message.', citations: [], actions: [], error: 'Empty message' };
  }

  if (latestUserMsg.content.length > 1000) {
    return {
      reply: 'Message too long. Please restrict questions to under 1,000 characters.',
      citations: [],
      actions: [],
      error: 'Message exceeded 1000 characters limit',
    };
  }

  // 2. Enforce Rate Limiting
  const rateKey = sessionId || clientIp;
  const now = Date.now();
  const rateRecord = rateLimitMap.get(rateKey) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > rateRecord.resetTime) {
    rateRecord.count = 1;
    rateRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    rateRecord.count += 1;
  }
  rateLimitMap.set(rateKey, rateRecord);

  if (rateRecord.count > MAX_REQUESTS_PER_WINDOW) {
    return {
      reply: 'Session limit reached (20 requests per 10 minutes). Please wait a few moments before asking another question.',
      citations: [],
      actions: [],
      error: 'Rate limit exceeded',
    };
  }

  // 3. Load Data & Resolve Tools
  const { centres, areas, workflows } = loadData();
  const userText = latestUserMsg.content.trim();
  const userTextLower = userText.toLowerCase();

  // Check for emergency / distress keywords
  if (
    userTextLower.includes('emergency') ||
    userTextLower.includes('attack') ||
    userTextLower.includes('kill') ||
    userTextLower.includes('danger') ||
    userTextLower.includes('violence now')
  ) {
    return {
      reply:
        lang === 'kn'
          ? 'ತುರ್ತು ಸಂದರ್ಭದಲ್ಲಿ ಅಥವಾ ತಕ್ಷಣದ ಅಪಾಯವಿದ್ದಲ್ಲಿ, ದಯವಿಟ್ಟು ಮೊದಲು ಪೊಲೀಸ್ ಸಹಾಯವಾಣಿ 112 ಅಥವಾ 100 ಗೆ ಕರೆ ಮಾಡಿ. ಈ ಸೇವೆಯು ತುರ್ತು ರಕ್ಷಣಾ ವೇದಿಕೆಯಲ್ಲ.'
          : 'If you or someone else is in immediate danger, please contact Emergency Services immediately by dialling 112 or 100. This dashboard is for legal accessibility information, not emergency dispatch.',
      citations: [],
      actions: [],
    };
  }

  const citations: AssistantCitation[] = [];
  const actions: AssistantToolAction[] = [];

  // Determine relevant tools
  let toolContext = '';

  // Case: Area or Taluk inquiry
  const matchedArea = areas.find(
    (a: any) =>
      userTextLower.includes(a.name.toLowerCase()) ||
      (a.name_kn && userTextLower.includes(a.name_kn))
  );
  if (matchedArea) {
    const stats = getAreaStats(areas, centres, matchedArea.name);
    toolContext += `\n[Tool Result: get_area_stats]\n${JSON.stringify(stats, null, 2)}\n`;
    const nearest = (stats as any).nearestCentre;
    if (stats.found && nearest) {
      const c = centres.find((x: any) => x.id === nearest.id);
      if (c) {
        citations.push({
          id: c.id,
          name: c.name,
          district: c.district,
          last_verified: c.last_verified,
          is_sample: c.is_sample,
        });
        actions.push({
          type: 'select_centre',
          payload: { centreId: c.id },
          label: `Open ${c.name}`,
        });
      }
    }
  }

  // Case: Gaps inquiry ("underserved", "gap", "farthest", "remote", "ಕೊರತೆ")
  if (
    userTextLower.includes('gap') ||
    userTextLower.includes('underserved') ||
    userTextLower.includes('farthest') ||
    userTextLower.includes('worst') ||
    userTextLower.includes('remote') ||
    userTextLower.includes('ಕೊರತೆ')
  ) {
    const gaps = getTopGaps(areas, centres, 5, 25);
    toolContext += `\n[Tool Result: get_top_gaps]\n${JSON.stringify(gaps, null, 2)}\n`;
    actions.push({
      type: 'view_tab',
      payload: { tab: 'explorer' },
      label: 'Inspect Gap Map',
    });
  }

  // Case: Help / checklist / documents ("bring", "document", "papers", "family", "tenant", "property", "ದಾಖಲೆ", "ಬಾಡಿಗೆ")
  if (
    userTextLower.includes('bring') ||
    userTextLower.includes('document') ||
    userTextLower.includes('paper') ||
    userTextLower.includes('checklist') ||
    userTextLower.includes('tenant') ||
    userTextLower.includes('rent') ||
    userTextLower.includes('property') ||
    userTextLower.includes('ದಾಖಲೆ') ||
    userTextLower.includes('ಬಾಡಿಗೆ')
  ) {
    const checklist = getWhatToBring(userTextLower);
    toolContext += `\n[Tool Result: get_what_to_bring]\n${JSON.stringify(checklist, null, 2)}\n`;
  }

  // Case: District centre search
  const foundDistrict = [
    'Bengaluru Urban', 'Bengaluru Rural', 'Belagavi', 'Mysuru', 'Tumakuru',
    'Ballari', 'Kalaburagi', 'Dakshina Kannada', 'Dharwad', 'Shivamogga',
    'Raichur', 'Vijayapura', 'Bidar', 'Hassan', 'Mandya', 'Udupi'
  ].find((d) => userTextLower.includes(d.toLowerCase()));

  if (foundDistrict) {
    const foundCentres = searchCentres(centres, { district: foundDistrict });
    toolContext += `\n[Tool Result: search_centres for ${foundDistrict}]\n${JSON.stringify(foundCentres, null, 2)}\n`;
    foundCentres.forEach((fc) => {
      if (!citations.some((c) => c.id === fc.id)) {
        citations.push({
          id: fc.id,
          name: fc.name,
          district: fc.district,
          last_verified: fc.last_verified,
          is_sample: fc.is_sample,
        });
      }
    });
    actions.push({
      type: 'filter_district',
      payload: { district: foundDistrict },
      label: `Filter by ${foundDistrict}`,
    });
  }

  // Tool: get_workflow
  const matchedWorkflow = getWorkflow(workflows, userTextLower);
  if (matchedWorkflow) {
    toolContext += `\n[Tool Result: get_workflow]\n${JSON.stringify(matchedWorkflow, null, 2)}\n`;
  }

  // Tool: get_case_summary (Only when user explicitly consented with toggle)
  if (caseSummaryConsent && caseData) {
    const caseSummary = {
      case_id: caseData.id || 'current-case',
      title: caseData.title || 'Untitled Case',
      stage: caseData.stage || 'Preparing',
      authority: caseData.authority_forum || 'DLSA',
      next_deadline: caseData.next_deadline || 'None recorded',
      notes_summary: caseData.notes ? caseData.notes.slice(0, 300) : 'None',
      user_consent_granted: true,
    };
    toolContext += `\n[Tool Result: get_case_summary (User-Consented Active Case)]\n${JSON.stringify(caseSummary, null, 2)}\n`;
  }

  // 4. Call Model (Gemini if key is present, else grounded synthesis engine)
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const systemInstruction = `You are the Nyaya-Maarg grounded assistant for Karnataka legal aid accessibility.
STRICT GUIDELINES:
1. Ground answers SOLELY in the provided Tool Results. Never hallucinate addresses, phone numbers, or laws from memory.
2. If data is absent, state: "I don't have verified information on that in the Nyaya-Maarg database."
3. Never provide legal advice. Remind users this is general procedural guidance and to confirm with DLSA/TLSC.
4. Never estimate travel time from the user's personal location; offer the Google Maps link instead.
5. Do not include personal case numbers or request private details.
6. Language: If lang is 'kn', write fluently in Kannada. Otherwise, write in clear, accessible English.
7. Tone: Objective, respectful, concise prose (avoid excessive bullet walls, no emojis).
8. Cap output strictly under 250 words.`;

      const promptPayload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemInstruction}\n\nAvailable Verified Tool Data:\n${toolContext || 'No specific tool match found for this query.'}\n\nUser Question:\n${userText}\nRequested Language: ${lang}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.2,
        },
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptPayload),
      });

      if (response.ok) {
        const json = (await response.json()) as any;
        const generatedText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          return {
            reply: generatedText.trim(),
            citations: citations.slice(0, 4),
            actions: actions.slice(0, 2),
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local grounded response:', err);
    }
  }

  // Grounded Deterministic Response (Fallback when API key not yet configured)
  let groundedReply = '';

  if (matchedArea) {
    const s = getAreaStats(areas, centres, matchedArea.name);
    if (lang === 'kn') {
      groundedReply = `${s.name} (${s.district} ಜಿಲ್ಲೆ) ಜನಸಂಖ್ಯೆ ಸುಮಾರು ${s.population.toLocaleString('en-IN')} ಆಗಿದೆ. ಹತ್ತಿರದ ಕಾನೂನು ನೆರವು ಕೇಂದ್ರ: ${s.nearestCentre?.name || 'ಯಾವುದೂ ಲಭ್ಯವಿಲ್ಲ'} (${s.distanceKm} ಕಿ.ಮೀ. ಅಂದಾಜು ಅಂತರ). ಸ್ಥಿತಿ: ${s.gapAssessment}.`;
    } else {
      groundedReply = `${s.name} in ${s.district} has an approximate population of ${s.population.toLocaleString('en-IN')}. Its nearest mapped facility is ${s.nearestCentre?.name || 'None'} located approximately ${s.distanceKm} km away (${s.gapAssessment}). Straight-line distance is shown; use Google Maps for road navigation.`;
    }
  } else if (foundDistrict) {
    const list = searchCentres(centres, { district: foundDistrict });
    if (lang === 'kn') {
      groundedReply = `${foundDistrict} ಜಿಲ್ಲೆಯಲ್ಲಿ ${list.length} ಕಾನೂನು ನೆರವು ಕೇಂದ್ರಗಳು ಪತ್ತೆಯಾಗಿವೆ. ಪ್ರಮುಖ ಕೇಂದ್ರ: ${list[0]?.name || 'DLSA'}, ವಿಳಾಸ: ${list[0]?.address || 'ಜಿಲ್ಲಾ ನ್ಯಾಯಾಲಯ'}. ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗೆ ನಕ್ಷೆ ವೀಕ್ಷಿಸಿ.`;
    } else {
      groundedReply = `Identified ${list.length} mapped legal aid facilities in ${foundDistrict}. The primary district authority is ${list[0]?.name || 'DLSA'} located at ${list[0]?.address || 'Court Complex'}. Detailed services and directions can be opened on the map.`;
    }
  } else if (
    userTextLower.includes('bring') ||
    userTextLower.includes('tenant') ||
    userTextLower.includes('document') ||
    userTextLower.includes('ದಾಖಲೆ') ||
    userTextLower.includes('ಬಾಡಿಗೆ')
  ) {
    const ch = getWhatToBring(userTextLower);
    if (lang === 'kn') {
      groundedReply = `${ch.category} ಸಂಬಂಧಿಸಿದಂತೆ ನೀವು ತರಬೇಕಾದ ದಾಖಲೆಗಳು: ಸರ್ಕಾರಿ ಗುರುತಿನ ಚೀಟಿ (ಆಧಾರ್/ಮತದಾರ ಚೀಟಿ), ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ, ಮತ್ತು ಸಮಸ್ಯೆಯ ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆ. ದಯವಿಟ್ಟು ${ch.authority} ಸಂಪರ್ಕಿಸಿ.`;
    } else {
      groundedReply = `For ${ch.category}, essential documents required at legal aid clinics include: government photo ID (Aadhaar or Voter card), income certificate or BPL card for fee exemption, and all relevant dispute papers. Present these at your nearest ${ch.authority}. This is procedural guidance, not formal legal counsel.`;
    }
  } else if (
    userTextLower.includes('gap') ||
    userTextLower.includes('underserved') ||
    userTextLower.includes('ಕೊರತೆ')
  ) {
    const gaps = getTopGaps(areas, centres, 5, 25);
    if (lang === 'kn') {
      groundedReply = `25 ಕಿ.ಮೀ. ಮಾನದಂಡದ ಆಧಾರದಲ್ಲಿ ${gaps.totalBeyondThreshold} ತಾಲ್ಲೂಕುಗಳಲ್ಲಿ ಕಾನೂನು ನೆರವು ಕೊರತೆ ಇದೆ. ಹೆಚ್ಚು ದೂರದಲ್ಲಿರುವ ತಾಲ್ಲೂಕುಗಳು: ${gaps.topGaps.map((g: any) => `${g.name} (${g.distanceKm}km)`).join(', ')}.`;
    } else {
      groundedReply = `Based on a 25 km accessibility threshold, ${gaps.totalBeyondThreshold} taluks in Karnataka have no mapped legal aid centre within range. The most distant taluks include ${gaps.topGaps.slice(0, 3).map((g: any) => `${g.name} in ${g.district} (${g.distanceKm} km)`).join(', ')}.`;
    }
  } else {
    groundedReply =
      lang === 'kn'
        ? 'ನಾನು ಕರ್ನಾಟಕದ ಕಾನೂನು ನೆರವು ಕೇಂದ್ರಗಳು ಮತ್ತು ತಾಲ್ಲೂಕು ಕೊರತೆಗಳ ಬಗ್ಗೆ ಮಾತ್ರ ನಿಖರ ಮಾಹಿತಿ ನೀಡಬಲ್ಲೆ. ನಿರ್ದಿಷ್ಟ ತಾಲ್ಲೂಕು, ಜಿಲ್ಲೆ, ಅಥವಾ ಅಗತ್ಯವಿರುವ ದಾಖಲೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ.'
        : 'I can only provide verified data regarding Karnataka legal aid centres, taluk gap distances, and required documentation. Please ask about a specific taluk, district, or legal aid checklist.';
  }

  return {
    reply: groundedReply,
    citations: citations.slice(0, 4),
    actions: actions.slice(0, 2),
  };
}
