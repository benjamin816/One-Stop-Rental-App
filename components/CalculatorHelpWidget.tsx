import React, { useEffect, useRef, useState } from 'react';
import type { CalculatorType } from '../App';

const ENDPOINT = import.meta.env.VITE_INVESTOR_LEAD_ENDPOINT as string | undefined;

type Mode = 'menu' | 'guide' | 'message';
type LeadResult = { type: 'investor-lead-result'; ok: boolean; submissionId: string; notified?: boolean };
type HelpItem = { question: string; answer: string };

const help: Record<CalculatorType, { title: string; items: HelpItem[] }> = {
  ltr: {
    title: 'Long / Medium-Term Rental',
    items: [
      { question: 'What does cash flow mean here?', answer: 'It is estimated monthly rent minus the mortgage payment and the operating costs entered above. Use it as a screening estimate, not a guarantee.' },
      { question: 'Why is cash to close different from my down payment?', answer: 'Cash to close also includes closing costs and any upfront renovation costs, and accounts for an enabled seller credit.' },
      { question: 'What should I include in expenses?', answer: 'Add realistic taxes, insurance, HOA, utilities, management, maintenance and future capital repairs. Compare the results with actual quotes before making a decision.' },
    ],
  },
  room: {
    title: 'By-the-Room / House Hack',
    items: [
      { question: 'How do I model an owner-occupied room?', answer: 'Mark the space you will occupy as owner-occupied and enter rent for the spaces you expect to lease. This helps separate your own space from potential rental income.' },
      { question: 'Can I add an ADU or another unit?', answer: 'Yes. Add a room, ADU or unit and set its expected monthly rent. Check local rules and permitting before relying on that income.' },
      { question: 'What is a house hack?', answer: 'It is living in part of a property while renting other space. The calculator helps compare that rental income with the property’s ongoing costs.' },
    ],
  },
  str: {
    title: 'Short-Term Rental',
    items: [
      { question: 'What are ADR and occupancy?', answer: 'ADR is the average nightly rate. Occupancy is the share of nights you expect to book. Together, they drive estimated gross booking revenue.' },
      { question: 'Why enter cleaning and platform fees?', answer: 'Short-term rentals have turnover and booking costs that can materially reduce take-home income. Include co-hosting, supplies and utilities too.' },
      { question: 'Should I use peak-season numbers?', answer: 'Use a realistic annual average and try a lower-occupancy scenario. Confirm local short-term rental rules and actual comparable listings.' },
    ],
  },
  multi: {
    title: 'Multi-Unit',
    items: [
      { question: 'How do I enter each unit?', answer: 'Add a unit for each rentable space and enter its estimated monthly rent. The calculator combines their income for the property-level analysis.' },
      { question: 'What happens when one unit is vacant?', answer: 'Lower that unit’s rent to zero, or reduce the total expected rent, to see a conservative scenario. A vacancy reserve is wise even when every unit is currently leased.' },
      { question: 'Are the costs per unit or for the whole building?', answer: 'Purchase, loan, tax, insurance and most operating inputs are for the overall property. Verify shared utilities and maintenance carefully.' },
    ],
  },
  build: {
    title: 'New Build',
    items: [
      { question: 'What goes into total project cost?', answer: 'Include land, hard construction costs, soft costs, a contingency buffer and closing costs. Estimates can change, so confirm them with your builder and lender.' },
      { question: 'What are ARV and refinance LTV?', answer: 'ARV is your estimated value after construction. Refinance LTV is the loan share of that value. These assumptions affect the modeled permanent loan.' },
      { question: 'Can units use different rental strategies?', answer: 'Yes. Set each unit to long-term or short-term rental and enter the relevant income and costs before comparing the completed project.' },
    ],
  },
  dscr: {
    title: 'DSCR Loan',
    items: [
      { question: 'What does DSCR measure?', answer: 'Debt-service coverage compares estimated property income with the loan payment. Lenders calculate it differently, so check the specific lender’s rules.' },
      { question: 'Why use a stress test?', answer: 'A higher rate or lower income scenario helps show how much room the deal has if conditions change.' },
      { question: 'Can I compare long- and short-term rental income?', answer: 'Yes. Choose the property income type in the DSCR tab and enter the corresponding rent or nightly-rate assumptions.' },
    ],
  },
};

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#D8B13A] focus:outline-none focus:ring-2 focus:ring-[#D8B13A]/20';

const CalculatorHelpWidget: React.FC<{ activeTab: CalculatorType }> = ({ activeTab }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('menu');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingId = useRef('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent<LeadResult>) => {
      if (!/^https:\/\/[a-z0-9.-]*googleusercontent\.com$/i.test(event.origin)) return;
      if (event.data?.type !== 'investor-lead-result' || event.data.submissionId !== pendingId.current) return;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      pendingId.current = '';
      setSubmitting(false);
      if (!event.data.ok) {
        setError('Your message could not be saved. Please try again.');
        return;
      }
      setError('');
      setStatus(event.data.notified === false
        ? 'Your message was saved, but the email alert did not send. Please call or email Benjamin if it is urgent.'
        : 'Thanks! Your message was sent to Benjamin.');
      formRef.current?.reset();
      setConsent(false);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => setExpanded(0), [activeTab]);

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ENDPOINT) { setError('Messages are temporarily unavailable. Please email Benjamin directly.'); return; }
    if (!formRef.current?.reportValidity() || !consent) { setError('Please complete all fields and consent to a reply.'); return; }
    const data = new FormData(formRef.current);
    const params = new URLSearchParams(window.location.search);
    const submissionId = crypto.randomUUID();
    pendingId.current = submissionId;
    const payload = {
      kind: 'calculator_message',
      submissionId,
      origin: window.location.origin,
      source: 'Calculator Message',
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      message: String(data.get('message') || '').trim(),
      calculatorTab: help[activeTab].title,
      contactConsent: consent,
      website: String(data.get('website') || ''),
      pageUrl: window.location.href,
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
    };
    const postForm = document.createElement('form');
    postForm.method = 'POST';
    postForm.action = ENDPOINT;
    postForm.target = 'calculator-message-response';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify(payload);
    postForm.appendChild(input);
    document.body.appendChild(postForm);
    setSubmitting(true);
    setStatus('');
    setError('');
    postForm.submit();
    postForm.remove();
    timerRef.current = window.setTimeout(() => {
      pendingId.current = '';
      setSubmitting(false);
      setError('The request timed out. Please try again.');
    }, 20000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <iframe title="Message form response" name="calculator-message-response" className="hidden" />
      {open && (
        <section aria-label="Calculator help" className="flex max-h-[min(75vh,620px)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#D8B13A]/50 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 bg-[#2F5233] px-4 py-4 text-white">
            <div><p className="text-xs font-bold uppercase tracking-widest text-[#E9CC77]">Raleigh NC Guide</p><h2 className="mt-1 text-lg font-bold">How can we help?</h2></div>
            <button type="button" aria-label="Close help" onClick={() => setOpen(false)} className="rounded px-2 text-2xl leading-none hover:bg-white/10">×</button>
          </div>
          <div className="overflow-y-auto p-4">
            {mode !== 'menu' && <button type="button" onClick={() => { setMode('menu'); setError(''); }} className="mb-3 text-sm font-semibold text-[#2F5233] hover:underline">← Back to help options</button>}
            {mode === 'menu' && <div className="space-y-3">
              <button type="button" onClick={() => setMode('message')} className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#D8B13A] hover:bg-amber-50"><span className="block font-bold text-[#2F5233]">Send Benjamin a message</span><span className="mt-1 block text-sm text-slate-600">Ask a specific question. This is a message form, not a live chat.</span></button>
              <button type="button" onClick={() => setMode('guide')} className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#D8B13A] hover:bg-amber-50"><span className="block font-bold text-[#2F5233]">Help explain this calculator</span><span className="mt-1 block text-sm text-slate-600">Quick answers for {help[activeTab].title}.</span></button>
            </div>}
            {mode === 'guide' && <div>
              <h3 className="mb-3 font-bold text-[#2F5233]">{help[activeTab].title}</h3>
              <div className="space-y-2">{help[activeTab].items.map((item, index) => <div key={item.question} className="rounded-lg border border-slate-200">
                <button type="button" aria-expanded={expanded === index} onClick={() => setExpanded(expanded === index ? null : index)} className="flex w-full items-start justify-between gap-3 p-3 text-left text-sm font-semibold text-slate-800"><span>{item.question}</span><span aria-hidden="true">{expanded === index ? '−' : '+'}</span></button>
                {expanded === index && <p className="px-3 pb-3 text-sm leading-5 text-slate-600">{item.answer}</p>}
              </div>)}</div>
              <button type="button" onClick={() => setMode('message')} className="mt-4 text-sm font-semibold text-[#2F5233] underline">Still have a question? Send a message</button>
            </div>}
            {mode === 'message' && <form ref={formRef} onSubmit={sendMessage} className="space-y-3 text-sm">
              <p className="text-slate-600">Ask about {help[activeTab].title}. Benjamin will receive your message by email.</p>
              <label className="block font-semibold text-[#2F5233]">Name *<input name="name" required maxLength={200} autoComplete="name" className={inputClass} /></label>
              <label className="block font-semibold text-[#2F5233]">Email *<input name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} /></label>
              <label className="block font-semibold text-[#2F5233]">Phone *<input name="phone" type="tel" required minLength={10} maxLength={40} autoComplete="tel" className={inputClass} /></label>
              <label className="block font-semibold text-[#2F5233]">Message *<textarea name="message" required minLength={5} maxLength={2000} rows={4} className={inputClass} placeholder="What would you like to know?" /></label>
              <label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#D8B13A]" /><span>I agree to share these details so Benjamin can respond. Read the <a href="/privacy-policy/" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>.</span></label>
              <div className="absolute left-[-10000px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              {error && <p role="alert" className="font-semibold text-red-700">{error}</p>}
              {status && <p role="status" className="font-semibold text-[#2F5233]">{status}</p>}
              <button type="submit" disabled={submitting} className="w-full rounded-lg bg-[#D8B13A] px-4 py-2.5 font-bold text-[#203422] transition hover:bg-[#E9C65A] disabled:opacity-60">{submitting ? 'Sending...' : 'Send message'}</button>
            </form>}
          </div>
        </section>
      )}
      <button type="button" aria-expanded={open} aria-label={open ? 'Close calculator help' : 'Open calculator help'} onClick={() => setOpen(!open)} className="rounded-full bg-[#2F5233] px-5 py-3 font-bold text-white shadow-xl ring-2 ring-[#D8B13A] transition hover:bg-[#3D6541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D8B13A]">{open ? 'Close help' : 'Questions? Get help'}</button>
    </div>
  );
};

export default CalculatorHelpWidget;
