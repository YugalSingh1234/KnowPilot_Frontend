import { api } from '../api.js'
import { inr } from '../utils.js'

// true = canned replies below, for demos without the backend.
export const USE_MOCK = false

// Mock-only data.
export const ORG_NAME = 'Sunrise College'
export const SUGGESTIONS = [
  'What is the refund policy for hostel fees?',
  `Am I eligible for the merit scholarship? Family income ${inr(650000)}, CGPA 8.4, OBC.`,
  'What time does the library open on Sundays?',
]

const LOOKUP = { step: 'Assistant lookup', kind: 'app', ms: 4 }
const LANGUAGE = { step: 'Language detection', kind: 'system1', ms: 2 }
const TYPE = { step: 'Question type', kind: 'system1', ms: 6 }
const SEARCH = { step: 'Document search', kind: 'retrieval', ms: 148 }
const GATE = { step: 'Answerability check', kind: 'system1', ms: 1 }

const ANSWER = {
  status: 'answered',
  answer: `Hostel fees are refunded in full if you withdraw on or before 15 July. Between 16 July and 31 August you get 50% back, and nothing after that. The ${inr(5000)} caution deposit is returned within 30 days of checkout, minus any damages.`,
  language: 'en',
  question_type: 'policy',
  references: [
    {
      filename: 'Hostel_Rules.pdf',
      page: 4,
      snippet:
        'Students who withdraw from the hostel on or before 15 July shall receive a full refund of hostel fees. Withdrawals between 16 July and 31 August are refunded at 50%. No refund is admissible after 31 August.',
    },
    {
      filename: 'Fee_Structure_2026.pdf',
      page: 2,
      snippet: `Caution deposit (refundable): ${inr(5000)}. Refunded within 30 days of hostel checkout after deduction of damages, if any.`,
    },
  ],
  decision: null,
  trace: [LOOKUP, LANGUAGE, TYPE, SEARCH, GATE, { step: 'Answer writing', kind: 'llm', ms: 1240 }],
}

const POLICY = 'Scholarship_Policy.pdf'
const DECISION = {
  status: 'answered',
  answer: `You are not eligible for the Merit-cum-Means Scholarship. Your family income of ${inr(650000)} is above the ${inr(600000)} limit. Your CGPA and category meet the rules. Attendance couldn’t be checked because you didn’t mention it.`,
  language: 'en',
  question_type: 'eligibility',
  references: [
    {
      filename: POLICY,
      page: 2,
      snippet: `2.1 The annual family income from all sources must not exceed ${inr(600000)}. 2.2 The student must have a CGPA of 7.5 or above in the previous academic year.`,
    },
    {
      filename: POLICY,
      page: 3,
      snippet:
        '3.1 The scholarship is open to students of the SC, ST, OBC and EWS categories. 3.4 A minimum attendance of 75% in the previous semester is required.',
    },
  ],
  decision: {
    outcome: 'NOT_ELIGIBLE',
    score: null,
    booleans: [
      {
        label: `Annual family income up to ${inr(600000)}`,
        result: 'FALSE',
        user_value: inr(650000),
        required_value: `≤ ${inr(600000)}`,
        source: { filename: POLICY, page: 2 },
      },
      {
        label: 'CGPA of 7.5 or above',
        result: 'TRUE',
        user_value: '8.4',
        required_value: '≥ 7.5',
        source: { filename: POLICY, page: 2 },
      },
      {
        label: 'Category is SC, ST, OBC or EWS',
        result: 'TRUE',
        user_value: 'OBC',
        required_value: 'SC, ST, OBC or EWS',
        source: { filename: POLICY, page: 3 },
      },
      {
        label: 'Attendance of 75% or more',
        result: 'UNKNOWN',
        user_value: null,
        required_value: '≥ 75%',
        source: { filename: POLICY, page: 3 },
      },
    ],
    missing_facts: [],
  },
  trace: [
    LOOKUP,
    LANGUAGE,
    TYPE,
    SEARCH,
    GATE,
    { step: 'Fact extraction', kind: 'llm', ms: 910 },
    { step: 'Value normalizer', kind: 'system1', ms: 1 },
    { step: 'Decision engine', kind: 'system1', ms: 3 },
    { step: 'Answer writing', kind: 'llm', ms: 1180 },
  ],
}

const NO_ANSWER = {
  status: 'no_answer',
  answer: `I couldn’t find this in ${ORG_NAME}’s documents. Try asking in a different way, or contact the college office.`,
  language: 'en',
  question_type: 'direct',
  references: [],
  decision: null,
  trace: [LOOKUP, LANGUAGE, TYPE, SEARCH, GATE], // the gate said no, so the LLM never runs
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function getInfo(token) {
  if (USE_MOCK) return Promise.resolve({ org_name: ORG_NAME, suggested_questions: SUGGESTIONS })
  return api(`/api/assistant/${encodeURIComponent(token)}/info`)
}

export async function ask(token, question) {
  if (!USE_MOCK) return api('/api/ask', { method: 'POST', body: { assistant_token: token, question } })
  await wait(1000)
  if (/eligib|scholarship|qualify/i.test(question)) return DECISION
  if (/refund|hostel|fee/i.test(question)) return ANSWER
  return NO_ANSWER
}
