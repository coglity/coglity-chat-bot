// In-memory session store: tracks conversation state per session
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { step: 'greeting', domain: null, history: [] });
  }
  return sessions.get(sessionId);
}

// Domain-specific response trees
const DOMAINS = {
  banking: {
    keywords: ['balance', 'account', 'transfer', 'bank', 'transaction', 'payment', 'credit', 'debit', 'loan', 'interest'],
    responses: {
      balance: 'Your current account balance is $4,250.00. Your savings account balance is $12,800.50.',
      transfer: 'To initiate a transfer, please provide the recipient account number and the amount you wish to transfer.',
      transaction: 'Your last 3 transactions: \n1. -$45.00 (Grocery Store, 2 days ago)\n2. +$2,500.00 (Salary, 5 days ago)\n3. -$120.00 (Electricity Bill, 6 days ago)',
      payment: 'Your next bill payment of $85.00 is due on the 15th. Would you like to schedule it now?',
      loan: 'You are eligible for a personal loan of up to $25,000 at 8.5% annual interest. Shall I connect you with a loan specialist?',
      credit: 'Your credit card limit is $5,000. Available credit: $3,200. Current statement balance: $1,800.',
      default: 'I can help you with account balance, fund transfers, transaction history, bill payments, and loan enquiries. What would you like to know?',
    },
  },
  retail: {
    keywords: ['order', 'product', 'delivery', 'return', 'refund', 'shipping', 'track', 'cart', 'purchase', 'discount', 'coupon'],
    responses: {
      order: 'Your order #ORD-78432 is currently being processed. Expected delivery: 3-5 business days.',
      delivery: 'Your package is out for delivery today. Estimated arrival between 2 PM and 6 PM.',
      return: 'You can return items within 30 days of purchase. Shall I initiate a return for your most recent order?',
      refund: 'Your refund of $59.99 has been approved and will reflect in your account within 5-7 business days.',
      track: 'Tracking number TRK-99283: Your item is at the Mumbai sorting facility and will be dispatched today.',
      discount: 'Use code SAVE20 for 20% off your next purchase. Valid until end of this month.',
      default: 'I can help you with orders, deliveries, returns, refunds, and tracking. What do you need assistance with?',
    },
  },
  travel: {
    keywords: ['flight', 'hotel', 'booking', 'ticket', 'reservation', 'cancel', 'checkin', 'baggage', 'visa', 'itinerary'],
    responses: {
      flight: 'Flight AI-302 from Delhi to Mumbai departs at 14:30 and arrives at 16:45. Your seat is 24A (window).',
      hotel: 'Your hotel reservation at Taj Palace is confirmed for 3 nights (15-18 July). Room type: Deluxe King.',
      checkin: 'Online check-in is available 48 hours before departure. Your boarding pass will be sent to your email.',
      baggage: 'Your ticket includes 1 check-in bag (23kg) and 1 cabin bag (7kg). Additional bags cost $30 each.',
      cancel: 'Cancellation is free up to 24 hours before departure. After that, a $50 fee applies. Would you like to cancel?',
      visa: 'For your destination, a tourist visa is required. Processing time is 5-7 business days. Shall I guide you through the application?',
      default: 'I can help with flight details, hotel bookings, check-in, baggage, cancellations, and visa information. How can I assist?',
    },
  },
  hr: {
    keywords: ['leave', 'salary', 'payslip', 'holiday', 'policy', 'attendance', 'appraisal', 'benefits', 'training', 'onboarding'],
    responses: {
      leave: 'You have 12 days of annual leave remaining. Your last leave request (3 days, 20-22 July) is pending approval.',
      salary: 'Your salary for June has been credited on the 28th. Net amount: $3,450. Payslip available in the HR portal.',
      holiday: 'Upcoming public holidays: Independence Day (15 Aug), Diwali (20 Oct). The full holiday calendar is on the HR portal.',
      attendance: 'Your attendance for this month: 18 days present, 2 days WFH, 0 absences. Attendance rate: 100%.',
      appraisal: 'Your mid-year appraisal is scheduled for 25 July with your manager. Please complete the self-assessment form by 20 July.',
      benefits: 'Your benefits include: health insurance ($500/month), gym allowance ($50/month), and meal vouchers ($100/month).',
      default: 'I can help with leave balances, salary details, holiday calendar, attendance, appraisals, and employee benefits. What do you need?',
    },
  },
  support: {
    keywords: ['help', 'issue', 'problem', 'error', 'not working', 'broken', 'complaint', 'report', 'bug', 'fix'],
    responses: {
      issue: 'I understand you are facing an issue. Could you describe the problem in more detail so I can assist you better?',
      complaint: 'I am sorry to hear about your experience. I have logged your complaint with reference ID CMP-4521. Our team will contact you within 24 hours.',
      error: 'Please try clearing your browser cache and logging in again. If the issue persists, I can escalate it to our technical team.',
      default: 'I am here to help! Please describe your issue and I will do my best to resolve it or escalate it to the right team.',
    },
  },
};

function detectDomain(text) {
  const lower = text.toLowerCase();
  for (const [domain, config] of Object.entries(DOMAINS)) {
    if (config.keywords.some((kw) => lower.includes(kw))) return domain;
  }
  return null;
}

function detectIntent(text, domain) {
  const lower = text.toLowerCase();
  const responses = DOMAINS[domain]?.responses ?? {};
  for (const key of Object.keys(responses)) {
    if (key !== 'default' && lower.includes(key)) return key;
  }
  return 'default';
}

export function handleChat(sessionId, text) {
  const session = getSession(sessionId);
  const lower = text.toLowerCase();

  // Greeting
  if (session.step === 'greeting' || /^(hi|hello|hey|good morning|good afternoon|start)/i.test(lower)) {
    session.step = 'domain';
    return 'Hello! Welcome to the Coglity Test Assistant. I can help you with Banking, Retail, Travel, HR, or General Support. What can I assist you with today?';
  }

  // Farewell
  if (/^(bye|goodbye|exit|quit|thanks|thank you)/i.test(lower)) {
    sessions.delete(sessionId);
    return 'Thank you for reaching out! Have a great day. Goodbye!';
  }

  // Escalation
  if (/agent|human|representative|speak to someone|transfer/i.test(lower)) {
    return 'I am connecting you to a live agent. Please hold for a moment. Estimated wait time: 2 minutes.';
  }

  // Detect or reuse domain
  const detected = detectDomain(text);
  if (detected) session.domain = detected;

  if (!session.domain) {
    return "I didn't quite catch that. I can help with Banking, Retail, Travel, HR, or Support. Which area do you need help with?";
  }

  const intent = detectIntent(text, session.domain);
  const domainResponses = DOMAINS[session.domain].responses;
  return domainResponses[intent] ?? domainResponses.default;
}
