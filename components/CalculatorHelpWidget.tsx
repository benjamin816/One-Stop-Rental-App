import React, { useEffect, useRef, useState } from 'react';
import type { CalculatorType } from '../App';

const ENDPOINT = import.meta.env.VITE_INVESTOR_LEAD_ENDPOINT as string | undefined;

type Mode = 'menu' | 'guide' | 'message';
type LeadResult = { type: 'investor-lead-result'; ok: boolean; submissionId: string; notified?: boolean };
type HelpItem = { question: string; answer: string };

const renovationAnswer = 'For a relatively move-in-ready home, you might spend less than $5,000. Cosmetic updates often run around $10,000–$15,000. If you also need a major item such as a roof or HVAC, plan closer to $20,000–$25,000. These are rough planning ranges; get property-specific bids.';
const capexVsMaintenance: HelpItem = {
  question: 'What’s the difference between CapEx and maintenance?',
  answer: 'Maintenance covers everyday repairs, like a handyman fixing a leaking sink. CapEx is money set aside for planned replacement of big items such as the roof, HVAC, or water heater.',
};

const help: Record<CalculatorType, { title: string; items: HelpItem[] }> = {
  ltr: {
    title: 'Long / Medium-Term Rental',
    items: [
      { question: 'What’s a typical down payment?', answer: 'Most investment loans require 20–25% down. In our Raleigh market, most of our long-term-rental investors put down 30–50% or more to make the property cash flow.' },
      { question: 'Do I need a property manager?', answer: 'I’ve seen investors go both ways. Most out-of-state long-term-rental investors I work with self-manage for at least the first few years to help the numbers, then eventually hire property management.' },
      { question: 'What’s a typical renovation cost?', answer: renovationAnswer },
      capexVsMaintenance,
    ],
  },
  room: {
    title: 'By-the-Room / House Hack',
    items: [
      { question: 'What’s a typical down payment?', answer: 'Most investment loans require 20–25% down. With a by-the-room strategy, 25–30% down may be enough to produce cash flow, depending on the property, financing, and room rents.' },
      { question: 'Do I need a property manager?', answer: 'Most by-the-room operators are local. This is not a strategy for the faint of heart from out of state, and it can be tough to find a property manager for individual-room rentals.' },
      { question: 'What’s a typical renovation cost?', answer: renovationAnswer },
      capexVsMaintenance,
      { question: 'Tell me more about this strategy.', answer: 'Renting individual rooms can create more income from a single-family home that might not work as a traditional long-term rental. We’ve also experimented with short-term stays in individual rooms, but most investors use longer-term room leases. Check local rules and the extra management work before relying on the numbers.' },
      { question: 'Who rents by the room?', answer: 'Traveling professionals, traveling nurses, college students, and people in their 20s are common renters for this strategy.' },
      { question: 'What’s house hacking?', answer: 'House hacking means living in part of a property while renting out other rooms or units to help offset your housing costs. In this calculator, mark the space you’ll occupy as owner-occupied and enter expected rent for the other spaces.' },
    ],
  },
  str: {
    title: 'Short-Term Rental',
    items: [
      { question: 'What’s a typical down payment?', answer: 'Most investment loans require 20–25% down. In our experience, that can often be enough for a short-term rental to cash flow a little, depending on the rate, occupancy, and operating costs.' },
      { question: 'Do I need a property manager?', answer: 'I’ve seen investors go both ways, but most out-of-state operators use a local co-host for the day-to-day work. Managing a short-term rental from a distance is possible, but it’s hard.' },
      { question: 'What’s a typical renovation cost?', answer: renovationAnswer },
      capexVsMaintenance,
      { question: 'What are some of the best areas for a short-term rental in Raleigh?', answer: 'This deserves a property-specific conversation with our team. We often favor North and Northwest Raleigh, Cary, and areas near the airport on the Durham side. Location, local rules, and the exact property all matter.' },
      { question: 'Who rents a short-term rental in Raleigh?', answer: 'Guests include traveling professionals and nurses, people visiting students at local colleges, and visitors here for Lenovo Center events, the State Fair, games, concerts, weddings, and other trips.' },
    ],
  },
  multi: {
    title: 'Multi-Unit',
    items: [
      { question: 'What’s a typical down payment?', answer: 'Most multi-unit investment loans require about 20–25% down. Your lender, property, and loan program determine the actual requirement.' },
      { question: 'Do I need a property manager?', answer: 'Yes, most investors I work with hire property management for a multi-unit property, although I’ve seen investors go both ways.' },
      { question: 'What’s a typical renovation cost?', answer: 'As rough per-unit planning ranges: a relatively move-in-ready unit might need less than $5,000 per unit; cosmetic work often runs $10,000–$15,000 per unit; and work involving major items along with cosmetics can run $20,000–$25,000 per unit. Get bids for the specific building.' },
      capexVsMaintenance,
      { question: 'Is Raleigh a good market for multifamily?', answer: 'Raleigh is competitive and not necessarily the easiest market for multifamily. Good deals exist, but they can be few and far between, and desirable properties can be pricey. Investors may need more cash down, larger renovations, or a creative strategy—such as short-term rental in one or two units—to make the numbers work, subject to local rules.' },
    ],
  },
  build: {
    title: 'New Build',
    items: [
      capexVsMaintenance,
    ],
  },
  dscr: {
    title: 'DSCR Loan',
    items: [
      { question: 'What’s a typical down payment?', answer: 'Most DSCR loans require about 20–25% down, but your rental strategy, the property’s income, and the lender’s rules play a big part in how much you need to put down to cash flow.' },
      { question: 'What’s a typical renovation cost?', answer: renovationAnswer },
      capexVsMaintenance,
      { question: 'How do DSCR rates compare with typical investment loans?', answer: 'There is no dependable fixed percentage-point premium. DSCR rates can be comparable to conventional investment-property rates, although some quotes are higher. Compare live quotes with the same down payment, points, loan term, and prepayment terms.' },
      { question: 'Can I use a DSCR loan for a short-term rental?', answer: 'It depends on the lender and loan program. We work with a trusted lender who can finance short-term rentals with DSCR loans, and I’ve personally used this strategy to buy Raleigh investment property.' },
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
