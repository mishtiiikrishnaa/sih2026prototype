import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Sparkles, Loader2, Edit3, AlertTriangle } from 'lucide-react'
import api from '../api/client'

const STEPS = [
  {
    id: 'domain',
    title: 'Domain & Location',
    subtitle: 'What area does your challenge fall under?',
  },
  {
    id: 'situation',
    title: 'Current Situation',
    subtitle: 'Describe what is currently happening on the ground.',
  },
  {
    id: 'gap',
    title: 'The Problem / Gap',
    subtitle: 'What is missing or not working? What causes this?',
  },
  {
    id: 'outcome',
    title: 'Desired Outcome',
    subtitle: 'What would success look like? Be as specific as possible.',
  },
  {
    id: 'constraints',
    title: 'Constraints & Resources',
    subtitle: 'What limitations exist? Budget, time, technology, capacity?',
  },
]

const DOMAINS = [
  'Water Management', 'Healthcare', 'Agriculture', 'Education',
  'Infrastructure', 'Environment', 'Rural Livelihoods', 'Digital Access',
]

const DISTRICTS = [
  'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Gumla',
  'Khunti', 'Hazaribagh', 'Deoghar', 'Dumka', 'Giridih',
]

export default function WizardPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    domain_hint: '',
    location: 'Ranchi',
    situation: '',
    gap: '',
    outcome: '',
    constraints: '',
    budget: '',
    timeline: '',
  })
  const [generated, setGenerated] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [editMode, setEditMode] = useState(false)

  function update(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function generate() {
    setGenerating(true)
    try {
      const { data } = await api.post('/problems/wizard', formData)
      setGenerated(data)
      setStep(5)
    } catch (e) {
      alert('Failed to generate challenge statement. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function publish() {
    setPublishing(true)
    try {
      const payload = {
        title: generated.title,
        situation: generated.situation,
        gap: generated.gap,
        desired_outcome: generated.desired_outcome,
        constraints: generated.constraints,
        domain: generated.domain,
        sdg_tags: generated.sdg_tags,
        difficulty: generated.difficulty,
        district: generated.location,
        budget: generated.budget,
        timeline: generated.timeline,
      }
      const { data } = await api.post('/problems/', payload)
      navigate(`/problems/${data.id}`)
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to publish challenge.')
    } finally {
      setPublishing(false)
    }
  }

  const currentStep = STEPS[step]
  const progress = step < 5 ? ((step + 1) / (STEPS.length + 1)) * 100 : 100

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-blue-600" />
          <h1 className="text-xl font-bold text-text-primary">AI Problem Articulation Wizard</h1>
        </div>
        <p className="text-sm text-text-secondary">
          Answer 5 simple questions — our AI converts your answers into a structured, publishable challenge.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
          <span>{step < 5 ? `Step ${step + 1} of ${STEPS.length}` : 'Review & Publish'}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium
                ${i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-700 text-white ring-2 ring-blue-200' : 'bg-bg-secondary text-text-secondary'}`}>
                {i < step ? <Check size={10} /> : i + 1}
              </div>
            </div>
          ))}
          <div className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium
            ${step === 5 ? 'bg-green-600 text-white ring-2 ring-green-200' : 'bg-bg-secondary text-text-secondary'}`}>
            ✓
          </div>
        </div>
      </div>

      {/* Step content */}
      {step < 5 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-text-primary mb-1">{currentStep.title}</h2>
          <p className="text-sm text-text-secondary mb-4">{currentStep.subtitle}</p>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="label">Domain / Sector</label>
                <select
                  className="input"
                  value={formData.domain_hint}
                  onChange={e => update('domain_hint', e.target.value)}
                >
                  <option value="">Select a domain…</option>
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">District / Location</label>
                <select
                  className="input"
                  value={formData.location}
                  onChange={e => update('location', e.target.value)}
                >
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <label className="label">Current situation on the ground</label>
              <textarea
                className="input"
                rows={5}
                placeholder="e.g. Approximately 15 villages in our block lack access to safe drinking water. Residents rely on contaminated open wells, causing frequent disease outbreaks affecting 8,000+ people…"
                value={formData.situation}
                onChange={e => update('situation', e.target.value)}
              />
              <p className="text-xs text-text-secondary mt-1">Include numbers, locations, and people affected where possible.</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="label">What is the problem or gap?</label>
              <textarea
                className="input"
                rows={5}
                placeholder="e.g. Existing borewells have high fluoride content. No water quality monitoring system exists. Maintenance capacity is absent at the village level…"
                value={formData.gap}
                onChange={e => update('gap', e.target.value)}
              />
              <p className="text-xs text-text-secondary mt-1">What specifically isn't working? What's the root cause?</p>
            </div>
          )}

          {step === 3 && (
            <div>
              <label className="label">What would a successful solution look like?</label>
              <textarea
                className="input"
                rows={5}
                placeholder="e.g. A cost-effective water purification system serving 8,000+ people with a community-operated maintenance model, deployed within 6 months…"
                value={formData.outcome}
                onChange={e => update('outcome', e.target.value)}
              />
              <p className="text-xs text-text-secondary mt-1">Be specific: who benefits, by how much, by when?</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="label">Constraints (budget, technology, time, etc.)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. Budget ₹2L, no electricity in 5 villages, community must be able to operate it without external help…"
                  value={formData.constraints}
                  onChange={e => update('constraints', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Budget (approx.)</label>
                  <input className="input" placeholder="e.g. ₹2,00,000" value={formData.budget} onChange={e => update('budget', e.target.value)} />
                </div>
                <div>
                  <label className="label">Timeline</label>
                  <input className="input" placeholder="e.g. 6 months" value={formData.timeline} onChange={e => update('timeline', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="btn-secondary"
            >
              <ArrowLeft size={14} /> Previous
            </button>
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} className="btn-primary">
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={generate}
                disabled={generating}
                className="btn-primary"
              >
                {generating ? (
                  <><Loader2 size={14} className="animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles size={14} /> Generate Challenge</>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Generated result */}
      {step === 5 && generated && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Check size={18} className="text-green-600" />
              <h2 className="font-semibold text-text-primary">AI-Generated Challenge Statement</h2>
            </div>
            <div className="flex gap-2">
              <span className="badge bg-blue-50 text-blue-700 text-xs">
                {generated.generation_method === 'gemini-flash' ? '✨ Gemini Flash' : '⚙️ Rule-based'}
              </span>
              <button onClick={() => setEditMode(!editMode)} className="btn-ghost text-xs">
                <Edit3 size={13} /> {editMode ? 'Done Editing' : 'Edit'}
              </button>
            </div>
          </div>

          {(generated.similar_problems || []).length > 0 && (
            <div className="mb-5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/15 p-4">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={14} /> {generated.similar_problems.length} existing challenge{(generated.similar_problems.length > 1 ? 's' : '')} look similar to this
              </p>
              <ul className="space-y-1.5">
                {generated.similar_problems.map(sp => (
                  <li key={sp.problem_id} className="flex items-center justify-between gap-2 text-xs">
                    <button onClick={() => navigate(`/problems/${sp.problem_id}`)} className="text-left text-amber-900 dark:text-amber-100 hover:underline flex-1 truncate">{sp.title}</button>
                    <span className="shrink-0 badge bg-amber-100 text-amber-800 text-[10px]">{sp.match_score}% overlap</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2">You can still publish a refined version — but consider building on the existing challenge instead to avoid duplication.</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label">Title</label>
              {editMode ? (
                <input className="input font-semibold" value={generated.title} onChange={e => setGenerated(g => ({ ...g, title: e.target.value }))} />
              ) : (
                <p className="text-sm font-semibold text-text-primary bg-bg-primary rounded-lg p-3">{generated.title}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 py-2">
              {(generated.domain || []).map(d => (
                <span key={d} className="badge bg-blue-100 text-blue-800 text-xs">{d}</span>
              ))}
              <span className={`badge text-xs ${generated.difficulty === 'hard' ? 'bg-red-100 text-red-700' : generated.difficulty === 'easy' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {generated.difficulty}
              </span>
              {(generated.sdg_tags || []).map(s => (
                <span key={s} className="badge bg-violet-100 text-violet-700 text-xs">{s}</span>
              ))}
            </div>

            {[
              { label: 'Situation', key: 'situation' },
              { label: 'Gap', key: 'gap' },
              { label: 'Desired Outcome', key: 'desired_outcome' },
              { label: 'Constraints', key: 'constraints' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="label">{label}</label>
                {editMode ? (
                  <textarea
                    className="input text-sm"
                    rows={3}
                    value={generated[key] || ''}
                    onChange={e => setGenerated(g => ({ ...g, [key]: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm text-text-primary bg-bg-primary rounded-lg p-3 leading-relaxed">
                    {generated[key] || <em className="text-text-secondary">Not specified</em>}
                  </p>
                )}
              </div>
            ))}

            {(generated.budget || generated.timeline) && (
              <div className="flex gap-4 text-sm text-text-secondary bg-bg-primary rounded-lg p-3">
                {generated.budget && <span>💰 {generated.budget}</span>}
                {generated.timeline && <span>⏱ {generated.timeline}</span>}
                {generated.location && <span>📍 {generated.location}</span>}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button onClick={() => setStep(0)} className="btn-secondary">
              <ArrowLeft size={14} /> Start Over
            </button>
            <button
              onClick={publish}
              disabled={publishing}
              className="btn-primary flex-1 justify-center"
            >
              {publishing ? (
                <><Loader2 size={14} className="animate-spin" /> Publishing…</>
              ) : (
                <><Check size={14} /> Publish to Marketplace</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
