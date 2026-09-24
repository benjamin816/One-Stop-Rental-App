import React, { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'calculatorLeadCaptured';
const ENDPOINT = import.meta.env.VITE_INVESTOR_LEAD_ENDPOINT as string | undefined;

type LeadResult = { type: 'investor-lead-result'; ok: boolean; submissionId: string; error?: string };

function hasCapturedLead(): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Boolean(saved && typeof saved.timestamp === 'string');
  } catch {
    return false;
  }
}

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-[#D8B13A] focus:ring-2 focus:ring-[#D8B13A]/20';

const InvestorLeadGate: React.FC = () => {
  const [unlocked, setUnlocked] = useState(hasCapturedLead);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [wantsContact, setWantsContact] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [consent, setConsent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingId = useRef('');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (unlocked) return;
    const onMessage = (event: MessageEvent<LeadResult>) => {
      // Apps Script serves HtmlService responses from Google's content domain.
      if (!/^https:\/\/[a-z0-9.-]*googleusercontent\.com$/i.test(event.origin)) return;
      if (event.data?.type !== 'investor-lead-result' || event.data.submissionId !== pendingId.current) return;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      setSubmitting(false);
      if (!event.data.ok) {
        setError('We could not save your details. Please try again.');
        return;
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: new Date().toISOString() })); } catch { /* Private browsing may block storage. */ }
      setUnlocked(true);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [unlocked]);

  useEffect(() => {
    if (unlocked) return;
    const previous = document.body.style.overflow;
    const shell = document.getElementById('calculator-shell');
    shell?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    return () => {
      shell?.removeAttribute('inert');
      document.body.style.overflow = previous;
    };
  }, [unlocked]);

  if (unlocked) return null;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ENDPOINT) {
      setError('The calculator is temporarily unavailable. Please check back shortly.');
      return;
    }
    if (!formRef.current?.reportValidity() || !consent) {
      setError('Please complete the required fields and consent to continue.');
      return;
    }
    const data = new FormData(formRef.current);
    const params = new URLSearchParams(window.location.search);
    const submissionId = crypto.randomUUID();
    pendingId.current = submissionId;
    const payload = {
      submissionId,
      origin: window.location.origin,
      source: 'Rental Calculator',
      firstName: String(data.get('firstName') || '').trim(),
      lastName: String(data.get('lastName') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      investingGoal: String(data.get('investingGoal') || '').trim(),
      propertyType: String(data.get('propertyType') || '').trim(),
      wantsContact,
      newsletterOptIn,
      contactConsent: consent,
      website: String(data.get('website') || ''),
      pageUrl: window.location.href,
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || ''
    };
    const postForm = document.createElement('form');
    postForm.method = 'POST';
    postForm.action = ENDPOINT;
    postForm.target = 'investor-lead-response';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify(payload);
    postForm.appendChild(input);
    document.body.appendChild(postForm);
    setSubmitting(true);
    setError('');
    postForm.submit();
    postForm.remove();
    timeoutRef.current = window.setTimeout(() => {
      pendingId.current = '';
      setSubmitting(false);
      setError('The request timed out. Please try again.');
    }, 20000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#152b1a]/80 p-4 backdrop-blur-sm" role="presentation">
      <iframe title="Lead form response" name="investor-lead-response" className="hidden" />
      <section role="dialog" aria-modal="true" aria-labelledby="investor-gate-title" className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-[#2F5233] px-6 py-6 text-center text-white sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E9CC77]">Raleigh NC Guide</p>
          <h1 id="investor-gate-title" className="mt-2 text-2xl font-bold sm:text-3xl">Plan your next investment</h1>
          <p className="mt-2 text-sm text-slate-100">Share your details to unlock the rental property calculator.</p>
        </div>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4 px-6 py-6 sm:px-10">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[#2F5233]">First name *<input autoFocus required maxLength={100} name="firstName" autoComplete="given-name" className={`${fieldClass} mt-1`} /></label>
            <label className="block text-sm font-semibold text-[#2F5233]">Last name *<input required maxLength={100} name="lastName" autoComplete="family-name" className={`${fieldClass} mt-1`} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[#2F5233]">Email *<input required type="email" maxLength={254} name="email" autoComplete="email" className={`${fieldClass} mt-1`} /></label>
            <label className="block text-sm font-semibold text-[#2F5233]">Phone *<input required type="tel" minLength={10} maxLength={40} name="phone" autoComplete="tel" className={`${fieldClass} mt-1`} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[#2F5233]">Investing goal <input maxLength={500} name="investingGoal" placeholder="Cash flow, house hack, build..." className={`${fieldClass} mt-1`} /></label>
            <label className="block text-sm font-semibold text-[#2F5233]">Property type <select name="propertyType" className={`${fieldClass} mt-1`} defaultValue=""><option value="">Select one (optional)</option><option>Single-family</option><option>Multi-unit</option><option>Short-term rental</option><option>New construction</option><option>Other</option></select></label>
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={wantsContact} onChange={e => setWantsContact(e.target.checked)} className="mt-1 h-4 w-4 accent-[#D8B13A]" /><span>Yes, I would like to be contacted about investing in Raleigh, NC.</span></label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={newsletterOptIn} onChange={e => setNewsletterOptIn(e.target.checked)} className="mt-1 h-4 w-4 accent-[#D8B13A]" /><span>Send me the monthly Raleigh investor newsletter with investment videos, market insights, and new resources. I can unsubscribe anytime.</span></label>
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-600"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#D8B13A]" /><span>I agree to the collection of my details for this calculator and to receive a response about my request. Review the <a href="https://www.raleighncguide.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>.</span></label>
          <div className="absolute left-[-10000px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-[#D8B13A] px-5 py-3 font-bold text-[#203422] transition hover:bg-[#E9C65A] disabled:cursor-wait disabled:opacity-60">{submitting ? 'Saving your details...' : 'Unlock the calculator'}</button>
          <p className="text-center text-xs text-slate-500">Your details are saved once. Returning on this browser will skip this form.</p>
        </form>
      </section>
    </div>
  );
};

export default InvestorLeadGate;
