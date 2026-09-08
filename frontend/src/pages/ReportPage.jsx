import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Megaphone, LocateFixed, Loader2, CheckCircle2, ImagePlus, Film, X, ArrowLeft } from 'lucide-react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

const DOMAINS = [
  'Water Management', 'Healthcare', 'Agriculture', 'Education',
  'Infrastructure', 'Environment', 'Rural Livelihoods', 'Digital Access',
]

const DISTRICTS = [
  'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Gumla',
  'Khunti', 'Hazaribagh', 'Deoghar', 'Dumka', 'Giridih',
]

export default function ReportPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const [form, setForm] = useState({
    submitter_name: '',
    location: '',
    district: 'Ranchi',
    title: '',
    situation: '',
    domain: '',
    desired_outcome: '',
  })
  const [files, setFiles] = useState([])
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function onFiles(e) {
    const picked = Array.from(e.target.files || [])
    setFiles(prev => [
      ...prev,
      ...picked.map(f => ({
        name: f.name,
        type: f.type.startsWith('video/') ? 'video' : 'photo',
        url: URL.createObjectURL(f),
      })),
    ])
  }

  function locate() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update('location', `${form.location || 'Current location'}, ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await api.post('/report', {
        ...form,
        domain: form.domain ? [form.domain] : [],
        attachments: files.map(f => ({ type: f.type, name: f.name })),
      })
      setDone(data)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-950 via-blue-900 to-teal-950 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-teal-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-1.5 text-blue-200/80 hover:text-white text-sm font-medium">
          <ArrowLeft size={16} /> Back
        </button>

        {done ? (
          <div className="space-y-4">
            <div className="bg-white/5 dark:bg-slate-900/20 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-teal-500/20 border-2 border-teal-400/40 flex items-center justify-center mb-4">
                <CheckCircle2 size={34} className="text-teal-300" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1.5">Report received</h1>
              <p className="text-sm text-blue-100/70 mb-6 leading-relaxed">The department has been notified. Your report is now queued as a challenge in the ecosystem.</p>

              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="px-3 py-1.5 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold font-mono">REF #{done.id}</span>
                <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-blue-100 text-xs font-medium">{done.district || 'Ranchi'}</span>
                {done.community_submitted && <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-blue-100 text-xs font-medium">community submission</span>}
              </div>

              <div className="bg-white/5 rounded-2xl border border-white/10 p-4 mb-6 text-left">
                <p className="text-xs font-semibold text-blue-200/60 uppercase tracking-wide mb-2">Your submission</p>
                <p className="text-sm font-semibold text-white mb-1">{done.title}</p>
                <p className="text-xs text-blue-100/60 leading-relaxed">{done.situation}</p>
              </div>

              <div className="mb-7 text-left">
                <p className="text-xs font-semibold text-blue-200/60 uppercase tracking-wide mb-3">What happens next</p>
                <div className="space-y-2.5">
                  {[
                    { n: 1, t: 'Received', d: 'Logged on the dashboard, dept gets a notification', active: true },
                    { n: 2, t: 'Under review', d: 'Department validates the report details', active: false },
                    { n: 3, t: 'Published to the marketplace', d: 'Shows up as an open challenge for universities', active: false },
                    { n: 4, t: 'Matched & solved', d: 'A team picks it up, builds, and it gets verified on ground', active: false },
                  ].map(step => (
                    <div key={step.n} className="flex items-start gap-3">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${step.active ? 'bg-teal-500 text-teal-950' : 'bg-white/10 text-blue-200/60'}`}>{step.n}</span>
                      <div>
                        <p className={`text-xs font-bold ${step.active ? 'text-teal-300' : 'text-white'}`}>{step.t}</p>
                        <p className="text-[11px] text-blue-100/50 leading-snug">{step.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {token ? (
                  <Link to="/problems" className="px-5 py-2.5 rounded-xl bg-white text-blue-900 text-sm font-bold hover:bg-blue-50 transition-colors">Browse the marketplace</Link>
                ) : (
                  <p className="text-[11px] text-blue-200/50 max-w-xs">Save your reference number. Officials can look it up by that id — or <Link to="/login" className="text-teal-300 hover:underline font-semibold">sign in</Link> to track it directly.</p>
                )}
                <button onClick={() => { setDone(null); setForm({ submitter_name: '', location: '', district: 'Ranchi', title: '', situation: '', domain: '', desired_outcome: '' }); setFiles([]) }} className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors">Report another</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 dark:bg-slate-900/20 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center">
                <Megaphone size={18} className="text-teal-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Report a local problem</h1>
                <p className="text-xs text-blue-200/60">No login needed. Community members can flag issues for the marketplace.</p>
              </div>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-blue-100/90 mb-1.5">Your name</label>
                <input className="input" placeholder="e.g. Mukesh Ram" value={form.submitter_name} onChange={e => update('submitter_name', e.target.value)} required />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-100/90 mb-1.5">District</label>
                  <select className="input" value={form.district} onChange={e => update('district', e.target.value)}>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-100/90 mb-1.5">Village / Town / GPS</label>
                  <div className="flex gap-2">
                    <input className="input flex-1" placeholder="e.g. Bishunpur" value={form.location} onChange={e => update('location', e.target.value)} />
                    <button type="button" onClick={locate} disabled={locating} className="px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs disabled:opacity-50 flex items-center gap-1.5" title="Use my location">
                      {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />} GPS
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-100/90 mb-1.5">What is wrong?</label>
                <input className="input" placeholder="e.g. Village handpump has been broken for 3 months" value={form.title} onChange={e => update('title', e.target.value)} required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-100/90 mb-1.5">Describe the situation</label>
                <textarea className="input" rows={4} placeholder="How many people are affected? Since when? What happens when they try to use it?" value={form.situation} onChange={e => update('situation', e.target.value)} required />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-100/90 mb-1.5">Domain</label>
                  <select className="input" value={form.domain} onChange={e => update('domain', e.target.value)}>
                    <option value="">Select domain…</option>
                    {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-100/90 mb-1.5">What would fix it?</label>
                  <input className="input" placeholder="e.g. Repair and periodic maintenance" value={form.desired_outcome} onChange={e => update('desired_outcome', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-100/90 mb-1.5">Photos / videos (evidence)</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-white/20 hover:border-teal-400/50 text-blue-100/80 text-xs font-medium transition-colors">
                    <ImagePlus size={16} /> Add photos / video
                    <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={onFiles} />
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((f, i) => (
                      <div key={i} className="relative group">
                        {f.type === 'video' ? (
                          <div className="w-20 h-20 rounded-xl bg-black/40 border border-white/20 flex items-center justify-center"><Film size={24} className="text-blue-200/70" /></div>
                        ) : (
                          <img src={f.url} alt={f.name} className="w-20 h-20 object-cover rounded-xl border border-white/20" />
                        )}
                        <button type="button" onClick={() => setFiles(prev => prev.filter((_, ix) => ix !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-teal-950 text-sm font-bold shadow-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : <><Megaphone size={15} /> Submit report</>}
              </button>
              {!submitting && (
                <p className="text-center text-[11px] text-blue-200/50">
                  Already have an account? <Link to="/login" className="text-teal-300 hover:underline font-medium">Sign in</Link> to post a full challenge instead.
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}