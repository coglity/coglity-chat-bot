// ─── Session store ────────────────────────────────────────────────────────────

const sessions = new Map();

function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      name: null,
      lastIntent: null,
      pendingContext: null,
      turnCount: 0,
      history: [],
    });
  }
  return sessions.get(id);
}

// ─── Intent detection ─────────────────────────────────────────────────────────

const INTENTS = [
  { name: 'greeting',               patterns: [/^(hi|hello|hey|good\s?(morning|afternoon|evening)|namaste|start|howdy)/i] },
  { name: 'farewell',               patterns: [/^(bye|goodbye|exit|quit|see\s?you|take care|that.?s all|no thanks|nothing else)/i] },
  { name: 'thanks',                 patterns: [/^(thank|thanks|thank you|thx|ty|appreciate)/i] },
  { name: 'help',                   patterns: [/help|what can you do|options|menu|what.*assist|services|features/i] },
  { name: 'affirmative',            patterns: [/^(yes|yeah|yep|sure|ok|okay|please|go ahead|proceed|confirm|yup|absolutely)/i] },
  { name: 'negative',               patterns: [/^(no|nope|nah|not now|cancel|don.?t|never mind|skip)/i] },

  // Account
  { name: 'account_balance',        patterns: [/balance|how much.*account|account.*balance|available funds|how much do i have/i] },
  { name: 'account_summary',        patterns: [/account summary|account details|account info|account number|my account/i] },
  { name: 'account_statement',      patterns: [/statement|bank statement|account statement|past.*transactions|last month.*transactions/i] },
  { name: 'account_open',           patterns: [/open.*account|new account|create.*account|start.*account|want.*account/i] },
  { name: 'account_close',          patterns: [/close.*account|close my account|terminate account|delete account/i] },
  { name: 'account_type',           patterns: [/savings account|current account|joint account|nri account|zero balance|types of account/i] },

  // Transactions
  { name: 'transaction_history',    patterns: [/transaction history|recent transactions|last.*transactions|transaction list|what.*spend/i] },
  { name: 'transaction_failed',     patterns: [/transaction failed|payment failed|transfer failed|failed.*transaction|money.*deducted|money.*gone/i] },
  { name: 'transaction_dispute',    patterns: [/dispute.*transaction|unauthoris|unauthoriz|fraud.*transaction|wrong.*charge|didn.?t.*do.*transaction|not.*my.*transaction/i] },

  // Transfers
  { name: 'fund_transfer',          patterns: [/transfer.*money|send.*money|fund transfer|transfer funds|move.*money|i want to.*transfer/i] },
  { name: 'neft',                   patterns: [/neft|national electronic funds/i] },
  { name: 'rtgs',                   patterns: [/rtgs|real.?time gross/i] },
  { name: 'imps',                   patterns: [/imps|immediate payment/i] },
  { name: 'upi',                    patterns: [/upi|unified payment|google pay|phonepe|paytm|gpay/i] },
  { name: 'international_transfer', patterns: [/international transfer|wire transfer|swift|foreign.*transfer|overseas|send.*abroad/i] },
  { name: 'bill_payment',           patterns: [/bill payment|pay.*bill|utility.*payment|electricity.*bill|water.*bill|gas.*bill|recharge/i] },
  { name: 'scheduled_payment',      patterns: [/scheduled payment|standing instruction|auto.*pay|recurring payment|automatic.*debit/i] },
  { name: 'beneficiary',            patterns: [/add.*beneficiary|beneficiary|payee|add.*payee|registered payee|new.*payee/i] },

  // Cards
  { name: 'card_balance',           patterns: [/card.*balance|credit.*balance|outstanding.*card|how much.*owe|card.*due/i] },
  { name: 'card_block',             patterns: [/block.*card|freeze.*card|lost.*card|stolen.*card|hotlist|card.*missing/i] },
  { name: 'card_unblock',           patterns: [/unblock.*card|activate.*card|unlock.*card|card.*unfreeze/i] },
  { name: 'card_limit',             patterns: [/card.*limit|credit.*limit|spending.*limit|increase.*limit|decrease.*limit|raise.*limit/i] },
  { name: 'card_pin',               patterns: [/card.*pin|change.*pin|reset.*pin|forgot.*pin|generate.*pin|pin.*change/i] },
  { name: 'card_statement',         patterns: [/card.*statement|credit.*statement|card.*history|card.*transactions/i] },
  { name: 'card_apply',             patterns: [/apply.*card|new.*credit card|get.*credit card|debit card.*apply|want.*credit card/i] },
  { name: 'card_reward',            patterns: [/reward.*points|cashback|card.*rewards|redeem.*points|points.*balance/i] },
  { name: 'card_emi',               patterns: [/card.*emi|convert.*emi|emi.*card|split.*payment/i] },

  // Loans
  { name: 'loan_eligibility',       patterns: [/loan.*eligible|eligible.*loan|qualify.*loan|can i get.*loan|loan.*qualify/i] },
  { name: 'personal_loan',          patterns: [/personal loan|pl\s*loan/i] },
  { name: 'home_loan',              patterns: [/home loan|housing loan|mortgage|buy.*house.*loan/i] },
  { name: 'auto_loan',              patterns: [/auto loan|car loan|vehicle loan|two.?wheeler loan|bike loan/i] },
  { name: 'education_loan',         patterns: [/education loan|student loan|study loan|college loan/i] },
  { name: 'business_loan',          patterns: [/business loan|sme loan|msme loan|working capital|startup loan/i] },
  { name: 'loan_status',            patterns: [/loan.*status|loan.*application|application.*status|loan.*progress/i] },
  { name: 'loan_repayment',         patterns: [/loan.*repayment|emi.*due|repay.*loan|loan.*emi|pay.*emi|next.*emi/i] },
  { name: 'loan_foreclosure',       patterns: [/foreclose|preclosure|loan.*close early|close.*loan.*early|prepay.*loan/i] },
  { name: 'loan_statement',         patterns: [/loan.*statement|loan.*history|repayment.*schedule|amortisation/i] },

  // FD/RD
  { name: 'fd_create',              patterns: [/create.*fd|open.*fd|new.*fixed deposit|book.*fd|start.*fd/i] },
  { name: 'fd_status',              patterns: [/fd.*status|fixed deposit.*status|fd.*details|my.*fd|check.*fd/i] },
  { name: 'fd_break',               patterns: [/break.*fd|close.*fd|premature.*fd|withdraw.*fd|cancel.*fd/i] },
  { name: 'fd_interest',            patterns: [/fd.*interest|fixed deposit.*rate|fd.*rate|interest.*fd/i] },
  { name: 'rd_create',              patterns: [/recurring deposit|open.*rd|create.*rd|start.*rd/i] },
  { name: 'interest_rates',         patterns: [/interest rate|rate of interest|savings.*rate|deposit.*rate|current.*rate/i] },

  // Insurance
  { name: 'insurance_policy',       patterns: [/insurance.*policy|my.*insurance|policy.*details|life insurance|health insurance|show.*policy/i] },
  { name: 'insurance_premium',      patterns: [/insurance.*premium|premium.*due|pay.*premium|premium.*amount/i] },
  { name: 'insurance_claim',        patterns: [/insurance.*claim|file.*claim|raise.*claim|claim.*status|submit.*claim/i] },
  { name: 'insurance_apply',        patterns: [/apply.*insurance|new.*insurance|buy.*insurance|get.*insurance|want.*insurance/i] },

  // Investments
  { name: 'mutual_fund',            patterns: [/mutual fund|mf.*invest|sip|systematic investment|invest.*fund/i] },
  { name: 'stock_market',           patterns: [/stocks|shares|equity|demat|trading account|invest.*stock/i] },
  { name: 'investment_portfolio',   patterns: [/portfolio|my.*investments|investment.*summary|how.*investments.*doing/i] },
  { name: 'gold_investment',        patterns: [/gold.*invest|digital gold|sovereign gold|buy.*gold/i] },

  // Net Banking
  { name: 'netbanking_register',    patterns: [/register.*netbanking|net banking.*register|internet banking.*setup|sign up.*netbanking/i] },
  { name: 'netbanking_password',    patterns: [/netbanking.*password|internet banking.*password|login.*password|reset.*password|forgot.*password/i] },
  { name: 'mobile_banking',         patterns: [/mobile banking|mobile app|bank.*app|download.*app/i] },
  { name: 'otp',                    patterns: [/otp|one.?time password|otp.*not received|resend.*otp|didn.?t.*get.*otp/i] },

  // KYC
  { name: 'kyc',                    patterns: [/kyc|know your customer|kyc.*update|kyc.*pending|complete.*kyc/i] },
  { name: 'pan_update',             patterns: [/pan.*update|update.*pan|pan.*card|link.*pan|pan.*link/i] },
  { name: 'aadhaar_link',           patterns: [/aadhaar|aadhar|link.*aadhaar|aadhaar.*link/i] },
  { name: 'nominee',                patterns: [/nominee|add.*nominee|update.*nominee|nomination/i] },
  { name: 'address_update',         patterns: [/update.*address|change.*address|address.*update|new.*address/i] },
  { name: 'mobile_update',          patterns: [/update.*mobile|change.*mobile|mobile.*number.*update|register.*mobile/i] },
  { name: 'email_update',           patterns: [/update.*email|change.*email|email.*update/i] },

  // Cheques
  { name: 'cheque_status',          patterns: [/cheque.*status|check.*status|cheque.*cleared|cheque.*bounced|did.*cheque.*clear/i] },
  { name: 'cheque_book',            patterns: [/cheque.*book|checkbook|request.*cheque|new.*cheque book/i] },
  { name: 'stop_cheque',            patterns: [/stop.*cheque|cancel.*cheque|stop payment/i] },

  // ATM
  { name: 'atm_location',           patterns: [/atm.*location|nearest.*atm|find.*atm|atm.*near|where.*atm/i] },
  { name: 'atm_limit',              patterns: [/atm.*limit|withdrawal.*limit|cash.*limit|how much.*withdraw/i] },
  { name: 'atm_issue',              patterns: [/atm.*not working|atm.*issue|cash.*not dispensed|atm.*problem|swallowed.*card/i] },

  // Support
  { name: 'complaint',              patterns: [/complaint|raise.*complaint|lodge.*complaint|grievance|i.?m not happy|not satisfied/i] },
  { name: 'complaint_status',       patterns: [/complaint.*status|complaint.*update|my.*complaint|track.*complaint/i] },
  { name: 'branch_location',        patterns: [/branch.*location|nearest.*branch|find.*branch|branch.*near|where.*branch/i] },
  { name: 'customer_care',          patterns: [/customer care|helpline|toll free|contact.*bank|speak.*agent|human|real person|operator/i] },
  { name: 'charges_fees',           patterns: [/charges|fees|service charge|bank.*fee|annual.*fee|maintenance.*charge|cost/i] },
];

function detectIntent(text) {
  for (const intent of INTENTS) {
    if (intent.patterns.some((p) => p.test(text))) return intent.name;
  }
  return 'unknown';
}

// ─── Response variants (randomised for human feel) ────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Responses ────────────────────────────────────────────────────────────────

const RESPONSES = {
  greeting: [
    "Hey there! Welcome to BFSI Assistant. Great to have you here. Whether it's checking your balance, managing loans, or anything else banking-related — I've got you covered. What can I help you with today?",
    "Hello! Good to see you. I'm your personal BFSI assistant. I can help with everything from account queries and fund transfers to loans, insurance, and investments. What's on your mind?",
    "Hi! Welcome back. I'm here to make your banking experience as smooth as possible. What would you like to do today?",
  ],
  farewell: [
    "It was great assisting you today! If you ever need anything — whether it's banking, loans, or investments — I'm always here. Take care and have a wonderful day!",
    "Thanks for banking with us! Wishing you a great day ahead. Don't hesitate to reach out anytime. Goodbye!",
    "That's all for now? No problem! You know where to find me. Stay safe and have a great day!",
  ],
  thanks: [
    "You're most welcome! That's exactly what I'm here for. Is there anything else I can help you with?",
    "Happy to help! Feel free to ask if there's anything else on your mind.",
    "Anytime! Your satisfaction means everything to us. Anything else I can assist you with today?",
  ],
  help: [
    "Of course! I can help you with a wide range of banking services. Here's a quick overview of what I can do:\n\n💰 Accounts — balance, statements, open/close\n💳 Cards — block, PIN, limits, rewards, EMI\n🏦 Transfers — NEFT, RTGS, IMPS, UPI, international\n📋 Loans — personal, home, auto, education, business\n📈 Investments — mutual funds, stocks, FDs, gold\n🛡️ Insurance — policies, claims, premiums\n📱 Digital Banking — net banking, mobile app, OTP\n🔐 KYC — PAN, Aadhaar, nominee, address updates\n🏧 ATM & Cheques — locations, limits, cheque book\n📞 Support — complaints, charges, branch locator\n\nJust tell me what you need — I'll take it from there!",
  ],
  affirmative: [
    "Perfect, let me get that sorted for you right away!",
    "Great! I'll take care of that for you.",
    "Absolutely, proceeding with that now!",
  ],
  negative: [
    "No problem at all! If you change your mind or need anything else, I'm right here.",
    "Understood! Is there anything else I can help you with?",
    "Sure thing, we can skip that. What else can I do for you?",
  ],

  // Account
  account_balance: [
    "Sure, let me pull that up for you! Here are your current account balances as of today:\n\n• Savings Account (XX1234): ₹84,250.00\n• Current Account (XX5678): ₹2,45,800.00\n\nYour savings account is looking healthy! Would you like to see your recent transactions or anything else?",
    "Of course! Here's a quick snapshot of your balances right now:\n\n• Savings Account (XX1234): ₹84,250.00\n• Current Account (XX5678): ₹2,45,800.00\n\nIs there anything specific you'd like to do with your account today?",
  ],
  account_summary: [
    "Here's a summary of your account details:\n\n• Account Number: XXXX XXXX 1234\n• Account Type: Savings\n• IFSC Code: BFSI0001234\n• Branch: Koramangala, Bengaluru\n• Status: Active ✓\n• Nominee: Registered ✓\n\nEverything looks good on your account. Need anything else?",
  ],
  account_statement: [
    "I've sent your account statement for the last 30 days to your registered email address. You should receive it within a few minutes.\n\nAlternatively, you can download it anytime from Net Banking under Accounts → Statements. Would you like a summary of your top transactions instead?",
    "Your statement is on its way to your inbox! I've triggered the last 30 days' statement for you.\n\nBy the way, you can also set up auto-email statements every month if that'd be convenient. Want me to enable that?",
  ],
  account_open: [
    "Opening a new account is easy! We have a few options:\n\n1. Visit a branch with your PAN and Aadhaar — takes about 30 minutes.\n2. Apply online via our website — paperless and quick.\n3. Use our mobile app for a zero-balance digital account — done in under 10 minutes!\n\nWhich option sounds best for you?",
  ],
  account_close: [
    "I understand. To close your account, you'll need to visit your home branch with a written closure request and your passbook or debit card. Please ensure there are no pending transactions and the balance is zero or transferred out.\n\nMay I ask what's prompting the closure? If there's something we can resolve, I'd love to help retain your account!",
  ],
  account_type: [
    "We have a great range of account types to suit your needs:\n\n• Savings Account — for everyday banking with interest\n• Current Account — for businesses and high-volume transactions\n• Zero Balance Account — no minimum balance required\n• NRI Account (NRE/NRO) — for non-resident Indians\n• Joint Account — for two or more holders\n• Senior Citizen Account — higher interest rates and special benefits\n\nWhich type interests you? I can walk you through the features in more detail!",
  ],

  // Transactions
  transaction_history: [
    "Here are your 5 most recent transactions:\n\n1. 02 Jul — UPI to Swiggy: -₹450\n2. 01 Jul — NEFT from ABC Corp: +₹85,000\n3. 30 Jun — ATM Withdrawal: -₹10,000\n4. 29 Jun — Electricity Bill: -₹2,340\n5. 28 Jun — Salary Credit: +₹65,000\n\nWould you like to filter by a specific date range or transaction type?",
  ],
  transaction_failed: [
    "Oh no, I'm really sorry to hear that! A failed transaction can be frustrating. Let me explain what likely happened.\n\nCommon reasons include insufficient balance, a network timeout, or an issue with the beneficiary's account. The good news is — if your account was debited, the amount will be automatically reversed within 2–3 business days.\n\nWould you like me to raise a formal dispute for this transaction? Or would you like to retry the transfer?",
  ],
  transaction_dispute: [
    "I completely understand your concern — an unauthorised transaction is serious and we take it very seriously too. I've flagged this immediately.\n\nA dispute case has been raised with reference ID TXN-DISP-78432. Our fraud investigation team will review this within 7 working days and keep you updated via SMS and email.\n\nIn the meantime, would you like me to temporarily block your card or account as a precaution?",
  ],

  // Transfers
  fund_transfer: [
    "Sure, I can help you transfer funds! We have several options depending on your needs:\n\n• IMPS — Instant, 24x7, up to ₹5 lakh\n• NEFT — Batch processing, up to ₹10 lakh, very cost-effective\n• RTGS — Real-time, best for large amounts (min ₹2 lakh)\n• UPI — Instant and free, up to ₹1 lakh per transaction\n\nDo you know how much you'd like to transfer and to whom? I can guide you through the best option!",
  ],
  neft: [
    "NEFT (National Electronic Funds Transfer) is a reliable and widely used option! Transfers are settled in batches every 30 minutes during banking hours (8 AM – 7 PM on weekdays).\n\nLimit: Up to ₹10 lakh per transaction. And the best part? Online NEFT transfers are completely free!\n\nWould you like to initiate an NEFT transfer right now?",
  ],
  rtgs: [
    "RTGS (Real-Time Gross Settlement) is perfect for large transfers — real-time, no waiting around! The minimum transfer amount is ₹2 lakh, and there's no upper cap.\n\nAvailable during banking hours: 7 AM to 6 PM, Monday to Saturday. Charges are minimal for such a powerful service.\n\nShall I help you set up an RTGS transfer?",
  ],
  imps: [
    "IMPS is my personal recommendation for urgent transfers! It's instant, works 24x7 including weekends and holidays, and you can transfer up to ₹5 lakh.\n\nCharges are minimal — ₹5 for up to ₹1,000, ₹15 for up to ₹1 lakh, and ₹25 above that. You'll have the money in the recipient's account within seconds.\n\nWant to proceed with an IMPS transfer?",
  ],
  upi: [
    "UPI is the easiest and most popular option these days! Transfer money instantly to any UPI ID or mobile number — completely free.\n\nDaily limit is ₹1 lakh per transaction, up to ₹2 lakh per day. Works seamlessly with Google Pay, PhonePe, Paytm, and of course our own BFSI Pay app.\n\nDo you have the recipient's UPI ID handy?",
  ],
  international_transfer: [
    "Sending money abroad? We've got you covered through SWIFT transfers. You can transfer to over 200 countries with competitive exchange rates.\n\nProcessing time is typically 2–5 business days. Charges are ₹500 + 1% of the transfer amount. For amounts above $25,000, FEMA documentation is required.\n\nWhich country are you sending to? I can share the exact exchange rate and estimated fees!",
  ],
  bill_payment: [
    "Paying bills is super easy with us! You can pay electricity, water, gas, broadband, DTH, mobile recharges, and much more — all from Net Banking or our mobile app.\n\nI'd highly recommend setting up auto-pay for regular bills so you never miss a due date. Want me to help you set that up?",
  ],
  scheduled_payment: [
    "Great thinking! Standing instructions are a lifesaver for regular payments. Here's what we currently have set up for you:\n\n• LIC Premium: ₹5,500 on the 5th of every month\n• Home Loan EMI: ₹32,400 on the 1st of every month\n\nWould you like to add a new instruction, modify an existing one, or pause any of these?",
  ],
  beneficiary: [
    "Adding a beneficiary is straightforward. Head to Net Banking → Transfers → Manage Beneficiaries and enter the account details.\n\nJust a heads up — for security reasons, there's a 30-minute cooling period before you can transfer to a newly added beneficiary for the first time. You can add up to 20 beneficiaries on your account.\n\nWould you like me to walk you through the process step by step?",
  ],

  // Cards
  card_balance: [
    "Here's a quick look at your credit card details:\n\n• Card: XXXX XXXX XXXX 9876\n• Credit Limit: ₹2,00,000\n• Available Credit: ₹1,45,320\n• Outstanding Balance: ₹54,680\n• Minimum Amount Due: ₹2,734\n• Payment Due Date: 15 July 2026\n\nWould you like to make a payment, convert your outstanding to EMI, or anything else?",
  ],
  card_block: [
    "Oh no — I'm sorry to hear that! I've blocked your card ending XX9876 immediately to prevent any misuse. You can breathe easy now.\n\nA replacement card will be dispatched to your registered address within 5–7 business days. Also, if the card was stolen, I'd strongly recommend filing a police complaint for your records.\n\nIs there anything else I should do to secure your account right away?",
  ],
  card_unblock: [
    "Sure, let's get your card reactivated! I'll send an OTP to your registered mobile number for verification. Once you confirm it, your card will be active within 30 minutes.\n\nShall I send the OTP now?",
  ],
  card_limit: [
    "Your current credit limit is ₹2,00,000. Based on your account history, you may be eligible for a higher limit!\n\nA limit enhancement request can be raised via Net Banking → Cards → Limit Enhancement. The decision is based on your credit score and repayment history, and you'll get a response within 2–3 working days.\n\nWould you like me to initiate that request?",
  ],
  card_pin: [
    "Changing your card PIN is quick and secure. You have a few options:\n\n1. At any of our ATMs — select 'Change PIN' after inserting your card\n2. Net Banking → Cards → PIN Management\n3. Call our IVR helpline and follow the prompts\n\nAll methods require OTP verification for security. Which would be most convenient for you?",
  ],
  card_statement: [
    "Here's your June 2026 credit card summary:\n\n• Opening Balance: ₹12,400\n• Total Purchases: ₹48,200\n• Payments Made: ₹12,400\n• Closing Balance: ₹48,200\n\nThe detailed statement has been sent to your registered email. Would you like to convert your balance to EMI or set up auto-pay for the minimum due?",
  ],
  card_apply: [
    "Exciting! We have some great credit card options for you:\n\n• Platinum Card — premium benefits, airport lounge access\n• Gold Card — great for everyday spending and dining\n• Travel Card — air miles, travel insurance, forex benefits\n\nEligibility: Annual income of ₹3 lakh+, CIBIL score of 700 or above. Processing typically takes 7–10 business days.\n\nShall I check your eligibility right now?",
  ],
  card_reward: [
    "You've been earning well! Here's your rewards summary:\n\n• Points Balance: 8,450 points\n• Equivalent Value: ₹845\n• Earn Rate: 2 points for every ₹100 spent\n\nYou can redeem your points for cashback, shopping vouchers, or even flight miles via Net Banking → Cards → Rewards. Would you like to redeem them now?",
  ],
  card_emi: [
    "Converting to EMI is a smart move for large purchases! You can convert any transaction above ₹2,000 to easy monthly instalments.\n\nAvailable tenures: 3, 6, 9, 12, or 24 months. Interest rate ranges from 13–15% per annum, which works out to a very manageable monthly payment.\n\nWhich transaction would you like to convert? I can show you the EMI breakdown!",
  ],

  // Loans
  loan_eligibility: [
    "Great question! Loan eligibility is determined by a few key factors — your monthly income, CIBIL credit score (ideally 700 or above), employment type, and any existing EMIs you're currently paying.\n\nWould you like me to do a quick eligibility check for you? Just tell me which type of loan you're interested in and I'll guide you through!",
  ],
  personal_loan: [
    "A personal loan is one of our most popular products! Here are the highlights:\n\n• Loan Amount: ₹50,000 to ₹25,00,000\n• Interest Rate: Starting at 10.5% per annum\n• Tenure: 12 to 60 months\n• Processing Fee: 1–2% of loan amount\n• Disbursal: Within 24 hours for pre-approved customers — sometimes even faster!\n\nNo collateral required. Would you like to check your eligibility or proceed with an application?",
  ],
  home_loan: [
    "A home loan is a big step — and we're here to make it as smooth as possible! Here's what we offer:\n\n• Loan Amount: Up to ₹5 crore\n• Interest Rate: Starting at 8.4% per annum (floating)\n• Tenure: Up to 30 years\n• Tax Benefits: Under Section 80C and 24B\n\nWe also offer a doorstep service where our representative visits you for documentation. Shall I arrange that?",
  ],
  auto_loan: [
    "Looking to buy a vehicle? Here's what we have for you:\n\n• New Car: Up to 90% of on-road price at 7.5% p.a.\n• Used Car: Up to 80% of value at 9.5% p.a.\n• Two-Wheeler: Up to 95% of on-road price\n• Tenure: Up to 7 years\n\nMinimal documentation needed. Would you like to know the EMI for a specific vehicle?",
  ],
  education_loan: [
    "Investing in education is always a great decision! Here's how we can help:\n\n• Domestic Studies: Up to ₹10 lakh\n• Overseas Studies: Up to ₹30 lakh\n• Interest Rate: 9–11% p.a.\n• Moratorium: Course duration + 1 year (no EMI while studying!)\n• Tax Benefit: Under Section 80E\n\nWhich institution and course are you planning for? I can give you a more tailored estimate!",
  ],
  business_loan: [
    "Great to support your business journey! Here's our MSME loan offering:\n\n• Amount: ₹1 lakh to ₹2 crore\n• Interest Rate: 11–16% p.a.\n• Collateral-free up to ₹25 lakh under the CGTMSE scheme\n• Tenure: Up to 5 years\n• Quick processing for existing customers\n\nWhat type of business do you run? That'll help me find the best fit for you!",
  ],
  loan_status: [
    "I've checked your loan application status. Here's what I found:\n\n• Reference Number: PL-2026-04521\n• Applied On: 28 June 2026\n• Current Status: Under Verification\n• Estimated Decision: Within 5–7 business days\n\nYou'll receive an SMS and email notification the moment a decision is made. Is there anything else you'd like to know about your application?",
  ],
  loan_repayment: [
    "Here are your upcoming EMI dues:\n\n• Personal Loan EMI: ₹8,450 — due on 10 July 2026\n• Home Loan EMI: ₹32,400 — due on 1 July 2026 ✓ Already paid!\n\nAuto-debit is active on your account, so your EMIs will be deducted automatically. Just make sure your account has sufficient balance a day before the due date. Would you like a reminder set up?",
  ],
  loan_foreclosure: [
    "Planning to close your loan early — that's financially smart! Here's what you need to know:\n\nForeclosure charges are typically 2–4% of the outstanding principal. However, if you've completed more than 12 EMIs, the charges may be waived on some products.\n\nI'd recommend requesting a Foreclosure Statement first so you know the exact amount. Shall I generate that for you, or would you prefer to visit a branch?",
  ],
  loan_statement: [
    "Here's a quick summary of your loan:\n\n• Outstanding Principal: ₹4,85,200\n• EMIs Completed: 18 out of 60\n• Next EMI Amount: ₹8,450\n• Next Due Date: 10 July 2026\n\nThe full repayment schedule has been sent to your registered email. Is there anything specific you'd like to review — like the interest vs. principal breakup?",
  ],

  // FD/RD
  fd_create: [
    "Great choice — FDs are one of the safest investments! Here's what you need to know:\n\n• Minimum Amount: ₹1,000\n• Tenure: 7 days to 10 years\n• Interest Rate: Up to 7.5% p.a. (senior citizens get an extra 0.5%!)\n• You can open an FD instantly via Net Banking, our app, or at a branch\n\nHow much would you like to invest, and for how long? I'll calculate your maturity amount!",
  ],
  fd_status: [
    "Here are your active Fixed Deposits:\n\n1. FD-001: ₹2,00,000 at 7.2% p.a. — Maturity Date: 15 January 2027\n   Maturity Amount: ₹2,14,400\n\n2. FD-002: ₹50,000 at 6.8% p.a. — Maturity Date: 30 September 2026\n   Maturity Amount: ₹51,700\n\nBoth are performing well! Would you like to renew either of them or open a new one?",
  ],
  fd_break: [
    "I understand sometimes you need liquidity. Just so you know, breaking an FD before maturity attracts a 1% penalty on the applicable interest rate — so you'd earn slightly less than the original rate.\n\nWould you like me to calculate exactly how much you'd receive if you break it today? I just want to make sure you have all the information before proceeding.",
  ],
  fd_interest: [
    "Here are our current FD interest rates:\n\n• 7–29 days: 3.5% p.a.\n• 30–90 days: 4.5% p.a.\n• 91–180 days: 5.5% p.a.\n• 181 days – 1 year: 6.5% p.a.\n• 1–2 years: 7.2% p.a. ⭐ Best rate!\n• 2–5 years: 7.0% p.a.\n• Above 5 years: 6.8% p.a.\n\nSenior citizens get an additional 0.5% on all tenures. Would you like to open an FD at today's rates?",
  ],
  rd_create: [
    "A Recurring Deposit is a brilliant way to save systematically! You invest a fixed amount every month and earn assured returns.\n\n• Minimum: ₹500 per month\n• Tenure: 6 months to 10 years\n• Interest Rate: Up to 7.0% p.a.\n• Amount is auto-debited from your savings account every month\n\nHow much would you like to save monthly? I'll show you the maturity amount!",
  ],
  interest_rates: [
    "Here's a quick overview of our current interest rates:\n\n• Savings Account: 3.5% p.a.\n• Fixed Deposit (1 year): 7.2% p.a.\n• Recurring Deposit (1 year): 7.0% p.a.\n• Personal Loan: Starting from 10.5% p.a.\n• Home Loan: Starting from 8.4% p.a.\n\nInterest rates are subject to change. Would you like to lock in an FD at today's rates?",
  ],

  // Insurance
  insurance_policy: [
    "Here's a summary of your active insurance policies:\n\n1. Term Life Insurance (POL-L-4521)\n   Sum Assured: ₹50 lakh | Premium: ₹12,500/year | Status: Active ✓\n\n2. Health Insurance (POL-H-7832)\n   Cover: ₹5 lakh (family floater) | Premium: ₹18,000/year | Status: Active ✓\n\nBoth policies are in good standing. Would you like to review the coverage details or add any riders?",
  ],
  insurance_premium: [
    "Here are your upcoming premium due dates:\n\n• Term Life Insurance: ₹12,500 due on 20 July 2026\n• Health Insurance: ₹18,000 due on 5 August 2026\n\nWould you like to pay now? I can process it from your savings account instantly. Or I can set up auto-debit so you never have to worry about it!",
  ],
  insurance_claim: [
    "I'm sorry you're going through this — but don't worry, we're here to help every step of the way.\n\nA claim case has been raised for you with reference ID CLM-78234. Our claims team will review this within 15 working days. For cashless health claims, your treatment at any of our empanelled hospitals is covered directly.\n\nIs there anything specific about the claim process you'd like me to explain?",
  ],
  insurance_apply: [
    "Smart thinking — insurance is one of the best investments you can make for peace of mind! We offer:\n\n• Term Life Insurance — high cover at low premiums\n• Health Insurance — cashless treatment at 10,000+ hospitals\n• Motor Insurance — comprehensive and third-party options\n• Travel Insurance — coverage for delays, loss, and medical emergencies\n• Home Insurance — protection for your property\n\nWhich one interests you? A relationship manager can call you within 24 hours with a personalised quote!",
  ],

  // Investments
  mutual_fund: [
    "Mutual funds are a fantastic way to grow your wealth! Here's a quick guide:\n\n• Equity Funds — higher risk, potential returns of 12–18% over the long term\n• Debt Funds — low risk, stable returns of 6–8%\n• Hybrid Funds — balanced approach, 8–12% expected returns\n\nYou can start a SIP (Systematic Investment Plan) from as little as ₹500 per month. The power of compounding over time is incredible!\n\nWould you like me to recommend a fund based on your risk appetite?",
  ],
  stock_market: [
    "Ready to invest in the markets? We can open a Demat + Trading account for you, linked directly to your savings account for seamless transfers.\n\n• Annual Maintenance Charge: ₹300\n• Brokerage: 0.1% for delivery trades, flat ₹20 for intraday\n• Access to stocks, ETFs, IPOs, bonds, and more\n\nI can get the account opening process started for you today — it's completely paperless and takes about 15 minutes. Interested?",
  ],
  investment_portfolio: [
    "Here's how your investments are performing:\n\n📊 Mutual Funds: ₹3,45,200 | Returns: +12.4% ↑\n📈 Stocks (Demat): ₹1,82,500 | Returns: +8.2% ↑\n🏦 Fixed Deposits: ₹2,50,000 | Guaranteed returns\n\n💼 Total Portfolio Value: ₹7,77,700\n\nYour portfolio is well diversified! Would you like me to suggest any rebalancing based on current market conditions?",
  ],
  gold_investment: [
    "Digital gold is a wonderful, modern way to invest in gold without worrying about storage or purity!\n\n• Buy 24K certified pure gold starting from just ₹1\n• Current price: ₹7,245 per gram\n• Zero storage charges — backed by physical gold in insured vaults\n• Convert to physical gold or coins anytime\n• Sell whenever you want at live market rates\n\nHow much would you like to invest in gold today?",
  ],

  // Net Banking
  netbanking_register: [
    "Getting you set up on Net Banking is easy! Here's how:\n\n1. Visit our website and click 'Register for Net Banking'\n2. Enter your account number and registered mobile number\n3. Set your User ID and a strong password via OTP verification\n\nAlternatively, our mobile app 'BFSI Pay' lets you do the same in just a few taps. Want me to walk you through it?",
  ],
  netbanking_password: [
    "No worries — forgotten passwords happen to the best of us! Here's how to reset it:\n\n1. Go to our login page and click 'Forgot Password'\n2. Enter your User ID and registered mobile number\n3. Verify using the OTP we send you\n4. Create a new password — make it strong (8+ characters, mix of letters, numbers, and symbols)\n\nShall I send you the reset link right now?",
  ],
  mobile_banking: [
    "Our mobile banking app 'BFSI Pay' is available on both the App Store and Google Play — completely free!\n\nYou can check balances, transfer funds, pay bills, book FDs, track loans, and so much more — all from your phone. One-time registration with your account number and OTP.\n\nWould you like a link to download it?",
  ],
  otp: [
    "Hmm, sorry about the OTP delay! It's been sent to your registered mobile number ending in XX89.\n\nIf you haven't received it within 60 seconds, you can tap 'Resend OTP'. Please make sure your phone has network coverage.\n\nStill not receiving it? It's possible your registered number needs updating — shall I help with that?",
  ],

  // KYC
  kyc: [
    "Good news — your KYC is fully verified and valid until December 2028! ✓\n\nIf you ever need to update your KYC documents (like a new Aadhaar or PAN), you can do it via Net Banking → Services → KYC Update, or by visiting your branch. No hassle at all.\n\nIs there anything specific about your KYC you wanted to check?",
  ],
  pan_update: [
    "Linking your PAN is important — it's required for transactions above ₹50,000 and helps with your financial records.\n\nHere's how to do it:\n1. Log in to Net Banking → Services → Update PAN\n2. Enter your PAN number\n3. Verify via OTP\n\nProcessing takes 24–48 hours. Once linked, it reflects across all your accounts automatically. Want to proceed?",
  ],
  aadhaar_link: [
    "Linking Aadhaar to your bank account is now mandatory for several government benefits and compliance purposes.\n\nHere's the quickest way:\n1. Net Banking → Services → Link Aadhaar\n2. Enter your 12-digit Aadhaar number\n3. Approve the OTP sent to your Aadhaar-linked mobile\n\nTakes less than 2 minutes! Shall I guide you through it right now?",
  ],
  nominee: [
    "Adding a nominee is one of the most important things you can do for your account — it ensures your assets reach the right person.\n\nYou can add or update nominees via Net Banking → Services → Nominee Management. Enter the nominee's name, relationship, date of birth, and the share percentage.\n\nYou can have multiple nominees with different percentages. Would you like help with this?",
  ],
  address_update: [
    "To update your address, you'll need a valid proof of the new address (Aadhaar, Passport, or a recent utility bill works perfectly).\n\nYou can upload it via Net Banking → Services → Update Address, and it'll be updated within 3–5 working days. Or you can drop by your branch if you'd prefer.\n\nShall I initiate the online update process for you?",
  ],
  mobile_update: [
    "Updating your registered mobile number is something we handle in-branch for your security — to make sure only you can authorise this change.\n\nJust visit your nearest branch with a valid government ID and the new mobile number you'd like to register. It'll be updated within 24 hours.\n\nIs there a branch near you? I can help you find the closest one!",
  ],
  email_update: [
    "Updating your email is quick and easy — you can do it yourself right now!\n\nGo to Net Banking → Profile → Update Email, enter your new email address, and verify via OTP. It updates immediately.\n\nWant me to walk you through it step by step?",
  ],

  // Cheques
  cheque_status: [
    "I've checked the status of your cheque:\n\n• Cheque Number: 004521\n• Amount: ₹15,000\n• Status: Cleared ✓\n• Cleared On: 01 July 2026\n• Credited To: XXXX1234\n\nEverything looks good! If you believe this cheque wasn't issued by you, please contact us immediately and we'll investigate.",
  ],
  cheque_book: [
    "Cheque book request placed! A 25-leaf cheque book will be dispatched to your registered address within 5–7 business days.\n\nYou can also track the delivery status via Net Banking → Services → Cheque Book Status. Is there anything else you'd like to request?",
  ],
  stop_cheque: [
    "Stop payment instruction has been placed for cheque numbers 004600 to 004605. A nominal charge of ₹100 per cheque applies, and this instruction is valid for 6 months.\n\nConfirmation has been sent to your registered email. If you'd like to renew the instruction after 6 months, just let me know. Is there anything else?",
  ],

  // ATM
  atm_location: [
    "Here are the nearest ATMs based on your registered address:\n\n1. Koramangala Branch ATM — 0.3 km (open 24x7)\n2. HSR Layout ATM — 1.2 km\n3. Indiranagar ATM — 2.1 km\n\nFor real-time ATM availability and live directions, you can use the 'Find ATM' feature on our BFSI Pay app. Shall I help with anything else?",
  ],
  atm_limit: [
    "Here are your current ATM and card limits:\n\n• Daily ATM Cash Withdrawal: ₹50,000\n• Daily POS (Card Swipe): ₹1,00,000\n• Daily Online Transactions: ₹2,00,000\n\nIf you'd like to temporarily increase or decrease these limits, you can do that instantly via Net Banking → Cards → Manage Limits. Want to make any changes?",
  ],
  atm_issue: [
    "Oh no, that must have been really stressful! I'm sorry for the trouble.\n\nIf cash was not dispensed but your account was debited, rest assured — the amount will be automatically reversed within 5 business days as per RBI guidelines.\n\nI've raised a dispute for you with reference ID ATM-DISP-2026-0034. If the reversal doesn't happen within 5 days, you're entitled to compensation. Would you like me to escalate this to our technical team right away?",
  ],

  // Support
  complaint: [
    "I'm truly sorry to hear that your experience hasn't been up to the mark — that's definitely not the standard we hold ourselves to.\n\nYour complaint has been registered with reference ID CMP-2026-45821. Our customer resolution team will reach out to you within 5 working days to make things right.\n\nYou can track your complaint status anytime via Net Banking → Services → Complaint Status. Is there anything I can do to help in the meantime?",
  ],
  complaint_status: [
    "I've pulled up the status of your complaint:\n\n• Reference ID: CMP-2026-45821\n• Status: Under Review\n• Assigned To: Customer Resolution Team\n• Expected Resolution: Within 5 working days\n• Last Updated: 02 July 2026\n\nWe're working on it and you'll be notified via SMS and email. Is there anything specific you'd like me to follow up on?",
  ],
  branch_location: [
    "Here are the nearest branches to your registered address:\n\n1. Koramangala Branch — 0.5 km\n   Mon–Sat: 9:30 AM – 4:30 PM\n\n2. HSR Layout Branch — 1.8 km\n   Mon–Sat: 9:30 AM – 4:30 PM\n\n3. BTM Layout Branch — 2.5 km\n   Mon–Sat: 9:30 AM – 4:00 PM\n\nYou can also find branches and book appointments on our mobile app. Would you like help with anything before you visit?",
  ],
  customer_care: [
    "Of course! I'll connect you with a live agent right away. Our customer care team is available 24x7.\n\n📞 Toll-Free Number: 1800-XXX-XXXX\n⏱️ Estimated Wait Time: Approximately 3 minutes\n\nAlternatively, you can start a live chat directly on our BFSI Pay mobile app for a quicker response. Would you prefer to hold, or is there something I can try to resolve for you right now?",
  ],
  charges_fees: [
    "Great question — here's a breakdown of our key charges so you know exactly what to expect:\n\n• Account Maintenance: ₹150/quarter (waived if balance > ₹10,000)\n• NEFT (Online): Free\n• RTGS (Online): ₹25 per transaction\n• ATM (Our Network): Free (unlimited)\n• ATM (Other Banks): ₹21 per transaction after 5 free per month\n• Cheque Book: First book free, then ₹50 per 25 leaves\n• Duplicate Statement: ₹100\n\nNo hidden fees — what you see is what you pay. Any specific charge you'd like to know more about?",
  ],

  unknown: [
    "Hmm, I'm not quite sure I understood that. Could you rephrase it for me? I want to make sure I give you the right help!\n\nI can assist with accounts, cards, loans, transfers, FDs, insurance, investments, KYC, cheques, ATMs, and general support. Just tell me what you need!",
    "I'm sorry, I didn't quite catch that. Could you try asking in a different way? I'm here to help with all your banking needs — accounts, transfers, loans, cards, investments, and more!",
  ],
};

// ─── Main handler ─────────────────────────────────────────────────────────────

export function handleChat(sessionId, text) {
  const session = getSession(sessionId);
  session.turnCount++;
  session.history.push({ role: 'user', text });

  const intent = detectIntent(text);
  session.lastIntent = intent;

  const responsePool = RESPONSES[intent] ?? RESPONSES.unknown;
  const reply = pick(Array.isArray(responsePool) ? responsePool : [responsePool]);

  session.history.push({ role: 'bot', text: reply });
  return reply;
}
