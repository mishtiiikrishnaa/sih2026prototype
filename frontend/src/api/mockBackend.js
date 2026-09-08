import SEED from './seedData.json'

const MOCK_KEY = 'setu_mock_v3'
const MOCK_ROLES = { faculty: 32, student: 100, problem_owner: 1, gov_admin: 1 }

function loadState() {
  let stored = {}
  try { stored = JSON.parse(localStorage.getItem(MOCK_KEY) || '{}') } catch (e) { stored = {} }
  return {
    extraUsers: stored.extraUsers || [],
    extraProblems: stored.extraProblems || [],
    interestRequests: stored.interestRequests || [],
    milestones: stored.milestones || [],
    projects: stored.projects || [],
    notifications: stored.notifications || [],
    _seeded: stored._seeded,
  }
}

function saveState(state) {
  try { localStorage.setItem(MOCK_KEY, JSON.stringify(state)) } catch (e) {}
}

const state = loadState()

const users = [...SEED.users]
const problems = [...SEED.problems]
const projects = SEED.projects.map(p => ({ ...p, milestones: p.milestones.map(m => ({ ...m })) }))

for (const u of state.extraUsers) users.push(u)
for (const p of state.extraProblems) problems.push(p)
function nextProblemId() {
  let max = 0
  for (const p of problems) max = Math.max(max, p.id || 0)
  for (const p of state.extraProblems) max = Math.max(max, p.id || 0)
  return max + 1
}
function findProblem(id) {
  return problems.find(x => x.id === id) || state.extraProblems.find(x => x.id === id)
}

if (!state._seeded) {
  const today = Date.now()
  const seedNts = [
    { user_id: 1, title: 'New community submission', message: 'Mukesh Ram reported: water contamination in Lapha block', link: '/problems/28', created_at: new Date(today - 3600e3).toISOString(), read: false },
    { user_id: 1, title: 'Milestone completed', message: 'Milestone "Field Testing & Validation" completed on project 1', link: '/projects/1', created_at: new Date(today - 7200e3).toISOString(), read: false },
    { user_id: 1, title: 'Interest received', message: 'Dr. Priya Singh expressed interest in your published challenge', link: '/problems/1', created_at: new Date(today - 86400e3 * 2).toISOString(), read: true },
    { user_id: 3, title: 'You’re on the team', message: 'Your interest in the water challenge was accepted — project created', link: '/projects/1', created_at: new Date(today - 86400e3 * 3).toISOString(), read: false },
    { user_id: 4, title: 'Outcome verified', message: 'Project 2 verified by problem owner with evidence', link: '/projects/2', created_at: new Date(today - 86400e3 * 4).toISOString(), read: false },
    { user_id: 2, title: 'Milestone approved', message: 'Your milestone "Prototype Development" was completed', link: '/projects/1', created_at: new Date(today - 86400e3 * 5).toISOString(), read: true },
  ].map((n, i) => ({ id: i + 1, ...n }))
  state.notifications = seedNts
  state._seeded = true
}

function notify(recipientId, title, message, link) {
  const id = state.notifications.reduce((m, n) => Math.max(m, n.id || 0), 0) + 1
  state.notifications.unshift({ id, user_id: recipientId, title, message, link, created_at: isoNow(), read: false })
}

function notifyMany(recipientIds, title, message, link) {
  for (const uid of new Set(recipientIds)) notify(uid, title, message, link)
}
function nextProjectId() {
  const pjs = [...projects, ...state.projects.map(p => ({ ...p, milestones: [] }))]
  return pjs.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1
}
function nextReqId() {
  return (state.interestRequests.length || 0) + 1
}
function nextMilestoneId() {
  let max = 0
  for (const p of projects) for (const m of p.milestones) max = Math.max(max, m.id)
  for (const m of state.milestones) max = Math.max(max, m.id || 0)
  return max + 1
}
function isoNow() { return new Date().toISOString() }

function fail(status, detail) {
  const err = new Error(detail)
  err.response = { status, data: { detail } }
  throw err
}

function currentUser(config) {
  const token = (config && config.headers && config.headers.Authorization) || ''
  const m = token.match(/^Bearer mock\.(\d+)\./)
  if (!m) fail(401, 'Could not validate credentials')
  const uid = parseInt(m[1], 10)
  const user = users.find(u => u.id === uid)
  if (!user) fail(401, 'Could not validate credentials')
  return user
}

function publicUser(u) {
  return {
    id: u.id, email: u.email, full_name: u.full_name, role: u.role,
    institution: u.institution, department: u.department, expertise_tags: u.expertise_tags || [],
    bio: u.bio, district: u.district, designation: u.designation, avatar_initials: u.avatar_initials,
  }
}

function problemOut(p) {
  const owner = users.find(u => u.id === p.owner_id)
  return {
    id: p.id, title: p.title, situation: p.situation, gap: p.gap, desired_outcome: p.desired_outcome,
    constraints: p.constraints, domain: p.domain || [], sdg_tags: p.sdg_tags || [],
    difficulty: p.difficulty, district: p.district, budget: p.budget, timeline: p.timeline,
    status: p.status, owner_id: p.owner_id, created_at: p.created_at,
    owner_name: owner ? owner.full_name : null,
    owner_designation: owner ? owner.designation : null,
    community_submitted: !!p.community_submitted,
    attachments: p.attachments || [],
  }
}

function tagOverlap(pDomains, uTags) {
  if (!pDomains || !pDomains.length || !uTags || !uTags.length) return 0
  const pSet = new Set(pDomains.map(t => t.toLowerCase()))
  const uSet = new Set(uTags.map(t => t.toLowerCase()))
  let overlap = 0
  for (const pt of pSet) {
    for (const ut of uSet) {
      if (pt.includes(ut) || ut.includes(pt)) { overlap++; break }
    }
  }
  return Math.min(1, overlap / Math.max(pSet.size, 1))
}

function explanation(user, problem, sem, tag) {
  const reasons = []
  const matched = (user.expertise_tags || []).filter(t =>
    (problem.domain || []).some(d => t.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(t.toLowerCase())))
  if (matched.length) reasons.push(`expertise in ${matched.slice(0, 3).join(', ')}`)
  if (user.department) reasons.push(`${user.department} background`)
  if (user.institution) reasons.push(`from ${user.institution}`)
  if (!reasons.length) reasons.push('relevant academic profile')
  const quality = sem > 0.7 ? 'Strong semantic match' : sem > 0.5 ? 'Good semantic match' : 'Keyword match'
  return `${quality} · Matched because of ${reasons.slice(0, 2).join(' and ')}.`
}

function matchSolversForProblem(problem, topK = 8) {
  const solvers = users.filter(u => u.role === 'faculty' || u.role === 'student')
  const results = solvers.map(solver => {
    const tag = tagOverlap(problem.domain || [], solver.expertise_tags || [])
    const final = tag
    return {
      user_id: solver.id, full_name: solver.full_name, email: solver.email, role: solver.role,
      institution: solver.institution, department: solver.department,
      expertise_tags: solver.expertise_tags || [], bio: solver.bio || '',
      avatar_initials: solver.avatar_initials || solver.full_name.slice(0, 2).toUpperCase(),
      match_score: Math.round(final * 100 * 10) / 10,
      semantic_score: Math.round(final * 100 * 10) / 10,
      tag_score: Math.round(tag * 100 * 10) / 10,
      match_method: 'keyword-tags',
      explanation: explanation(solver, problem, final, tag),
    }
  })
  results.sort((a, b) => b.match_score - a.match_score)
  return results.slice(0, topK)
}

function matchProblemsForSolver(user, topK = 8) {
  const open = problems.filter(p => p.status === 'open')
  const results = open.map(p => {
    const tag = tagOverlap(p.domain || [], user.expertise_tags || [])
    return {
      problem_id: p.id, title: p.title, domain: p.domain || [], district: p.district || '',
      difficulty: p.difficulty, status: p.status, sdg_tags: p.sdg_tags || [],
      match_score: Math.round(tag * 100 * 10) / 10,
      semantic_score: Math.round(tag * 100 * 10) / 10,
      tag_score: Math.round(tag * 100 * 10) / 10,
      match_method: 'keyword-tags',
      explanation: `Matches your expertise in ${(user.expertise_tags || ['your field']).slice(0, 2).join(', ')}.`,
    }
  })
  results.sort((a, b) => b.match_score - a.match_score)
  return results.slice(0, topK)
}

// ── Wizard (rule-based, mirrors backend fallback) ─────────────────────────────
const DOMAIN_KEYWORDS = {
  'Water Management': ['water', 'sanitation', 'drinking', 'irrigation', 'bore', 'well', 'river', 'flood', 'drainage'],
  'Healthcare': ['health', 'hospital', 'medicine', 'disease', 'patient', 'clinic', 'malnutrition', 'maternal', 'infant'],
  'Agriculture': ['farm', 'crop', 'soil', 'yield', 'pest', 'fertiliser', 'drought', 'harvest'],
  'Education': ['school', 'teacher', 'student', 'literacy', 'dropout', 'learning', 'classroom', 'skill'],
  'Infrastructure': ['road', 'bridge', 'electricity', 'power', 'connectivity', 'transport', 'building'],
  'Environment': ['pollution', 'waste', 'forest', 'deforestation', 'biodiversity', 'air quality', 'climate'],
  'Rural Livelihoods': ['livelihood', 'employment', 'income', 'poverty', 'tribal', 'artisan', 'craft'],
  'Digital Access': ['internet', 'digital', 'mobile', 'connectivity', 'online', 'technology'],
}
const SDG_MAP = {
  'Water Management': ['SDG 6 – Clean Water'],
  'Healthcare': ['SDG 3 – Good Health'],
  'Agriculture': ['SDG 2 – Zero Hunger'],
  'Education': ['SDG 4 – Quality Education'],
  'Infrastructure': ['SDG 9 – Industry & Infrastructure', 'SDG 11 – Sustainable Cities'],
  'Environment': ['SDG 13 – Climate Action', 'SDG 15 – Life on Land'],
  'Rural Livelihoods': ['SDG 1 – No Poverty', 'SDG 8 – Decent Work'],
  'Digital Access': ['SDG 9 – Industry & Infrastructure'],
}
function detectDomains(text) {
  const lower = text.toLowerCase()
  const matched = []
  for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    if (kws.some(kw => lower.includes(kw))) matched.push(domain)
  }
  return matched.length ? matched.slice(0, 3) : ['General / Other']
}
function detectDifficulty(situation, constraints) {
  const text = `${situation} ${constraints}`.toLowerCase()
  if (/complex|multi|several|multiple|large|state-wide/.test(text)) return 'hard'
  if (/simple|small|basic|single|minor/.test(text)) return 'easy'
  return 'medium'
}

function keywordOverlap(a, b) {
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'for', 'on', 'with', 'is', 'are', 'that', 'this', 'have', 'has', 'there', 'their', 'from', 'by', 'at', 'be', 'as', 'it', 'its'])
  const wa = new Set(a.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w)))
  const wb = new Set(b.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w)))
  if (!wa.size || !wb.size) return 0
  let inter = 0
  for (const w of wa) if (wb.has(w)) inter++
  return inter / Math.max(wa.size, 1)
}

function findSimilarProblems(draftTitle, draftSituation, draftDomains, excludeId) {
  const scored = problems.filter(p => p.id !== excludeId).map(p => {
    const dom = tagOverlap(draftDomains, p.domain || [])
    const kw = 0.6 * keywordOverlap(`${draftTitle} ${draftSituation}`, `${p.title} ${p.situation}`)
    const score = Math.round(Math.min(1, dom * 0.5 + kw) * 100 * 10) / 10
    return { problem_id: p.id, title: p.title, match_score: score, status: p.status, district: p.district || '' }
  }).sort((a, b) => b.match_score - a.match_score)
  return scored.filter(m => m.match_score >= 35).slice(0, 3)
}
function runWizard(data) {
  const situation = data.situation || ''
  const gap = data.gap || ''
  const outcome = data.outcome || ''
  const constraints = data.constraints || ''
  const location = data.location || 'Jharkhand'
  const budget = data.budget || ''
  const timeline = data.timeline || ''
  const domains = detectDomains(`${situation} ${gap} ${outcome}`)
  const primary = domains[0]
  const snippet = situation.split(' ').slice(0, 8).join(' ').replace(/[.,;]+$/, '')
  const title = `${primary} Challenge: ${snippet}${location && !snippet.toLowerCase().includes(location.toLowerCase()) ? ` in ${location}` : ''}`.replace(/^(.{110}).*$/, '$1')
  let smartOutcome = outcome
  if (timeline && !smartOutcome.includes(timeline)) smartOutcome += ` within ${timeline}`
  if (budget && !smartOutcome.includes(budget)) smartOutcome += ` within a budget of ${budget}`
  return {
    title, domain: domains, situation: situation.trim(), gap: gap.trim(),
    desired_outcome: smartOutcome.trim(), constraints: constraints.trim(), location,
    budget, timeline, difficulty: detectDifficulty(situation, constraints),
    sdg_tags: SDG_MAP[primary] || ['SDG 17 – Partnerships'], generation_method: 'rule-based',
  }
}

// ── Projects helpers ───────────────────────────────────────────────────────────
function buildProjectShape(p, detailed) {
  const problem = problems.find(x => x.id === p.problem_id)
  const memberDetails = (p.member_ids || []).map(([uid, roleInTeam]) => {
    const u = users.find(x => x.id === uid)
    if (!u) return null
    return detailed
      ? { user_id: u.id, full_name: u.full_name, email: u.email, role_in_team: roleInTeam, institution: u.institution, department: u.department, avatar_initials: u.avatar_initials, status: 'active' }
      : { user_id: u.id, full_name: u.full_name, role_in_team: roleInTeam, institution: u.institution, avatar_initials: u.avatar_initials }
  }).filter(Boolean)
  const base = {
    id: p.id, problem_id: p.problem_id,
    problem_title: problem ? problem.title : '',
    problem_domain: problem ? problem.domain : [],
    problem_district: problem ? problem.district : '',
    title: p.title, stage: p.stage, description: p.description,
    solution_proposal: p.solution_proposal || null,
    seeking_collab: !!p.seeking_collab,
    needs_funding: !!p.needs_funding,
    patents: (p.patents || []).map(pt => ({ id: pt.id, title: pt.title, status: pt.status, filed_at: pt.filed_at || null })),
    startups_created: p.startups_created || 0,
    outcome_evidence: p.outcome_evidence, outcome_verified_at: p.outcome_verified_at,
    created_at: p.created_at, updated_at: p.updated_at,
  }
  if (detailed) {
    return {
      ...base,
      problem_situation: problem ? problem.situation : '',
      problem_desired_outcome: problem ? problem.desired_outcome : '',
      members: memberDetails,
      milestones: (p.milestones || []).map(m => ({
        id: m.id, title: m.title, description: m.description, status: m.status,
        due_date: m.due_date, completed_at: m.completed_at, evidence_url: m.evidence_url,
      })),
    }
  }
  const ms = p.milestones || []
  return { ...base, members: memberDetails, milestone_count: ms.length, milestones_completed: ms.filter(m => m.status === 'completed').length }
}

function allProjectsFor(user) {
  let pjs = [...projects]
  for (const p of state.projects) pjs.push(p)
  return pjs
}

// ── Router ────────────────────────────────────────────────────────────────────
export function mockRequest(method, urlPath, body, config) {
  config = config || {}
  const url = (urlPath || '').split('?')[0]
  const params = { ...(config.params || {}), ...Object.fromEntries(new URLSearchParams((urlPath || '').split('?')[1] || '').entries()) }

  // ── Auth ───────────────────────────────────────────────────────────────────
  if (method === 'post' && url === '/auth/token') {
    const username = body.get ? body.get('username') : body.username
    const password = body.get ? body.get('password') : body.password
    const user = users.find(u => u.email.toLowerCase() === (username || '').toLowerCase() && u.password === password)
    if (!user) fail(401, 'Incorrect email or password')
    const token = `mock.${user.id}.${Math.random().toString(36).slice(2)}`
    return { data: { access_token: token, token_type: 'bearer', user: publicUser(user) } }
  }

  // ── Community report (public, no auth) ─────────────────────────────────────
  if (method === 'post' && url === '/report') {
    const p = {
      id: nextProblemId(), title: body.title, situation: body.situation, gap: body.gap || '',
      desired_outcome: body.desired_outcome || '', constraints: body.constraints || '',
      domain: body.domain || [], sdg_tags: body.sdg_tags || [], difficulty: body.difficulty || 'medium',
      district: body.district || '', budget: body.budget || '', timeline: body.timeline || '',
      status: 'open', owner_id: 4, community_submitted: true,
      attachments: body.attachments || [], submitted_by: body.submitter_name || 'Citizen',
      location: body.location || '', created_at: isoNow(),
    }
    state.extraProblems.push(p)
    saveState(state)
    notify(4, 'New community submission', `${p.submitted_by} reported: ${p.title}`, `/problems/${p.id}`)
    return { data: problemOut(p) }
  }

  const me = currentUser(config)

  // ── Wizard ─────────────────────────────────────────────────────────────────
  if (method === 'post' && url === '/problems/wizard') {
    const generated = runWizard(body || {})
    const similar = findSimilarProblems(generated.title, generated.situation, generated.domain, null)
    return { data: { ...generated, similar_problems: similar } }
  }

  // ── Problems ───────────────────────────────────────────────────────────────
  if (method === 'post' && url === '/problems/') {
    const p = {
      id: nextProblemId(), title: body.title, situation: body.situation, gap: body.gap,
      desired_outcome: body.desired_outcome, constraints: body.constraints || '',
      domain: body.domain || [], sdg_tags: body.sdg_tags || [], difficulty: body.difficulty || 'medium',
      district: body.district || '', budget: body.budget || '', timeline: body.timeline || '',
      status: 'open', owner_id: me.id, created_at: isoNow(),
    }
    state.extraProblems.push(p)
    saveState(state)
    return { data: problemOut(p) }
  }

  if (method === 'get' && url === '/problems/') {
    let list = [...problems]
    for (const p of state.extraProblems) list.push(p)
    if (me.role === 'problem_owner') list = list.filter(p => p.owner_id === me.id)
    else if (me.role === 'faculty' || me.role === 'student') list = list.filter(p => p.status === 'open')
    else if (me.role === 'gov_admin') { /* all */ }

    if (params.status) list = list.filter(p => p.status === params.status)
    if (params.difficulty) list = list.filter(p => p.difficulty === params.difficulty)
    if (params.district) list = list.filter(p => (p.district || '').toLowerCase().includes(params.district.toLowerCase()))
    if (params.search) {
      const s = params.search.toLowerCase()
      list = list.filter(p => (p.title + ' ' + p.situation + ' ' + p.gap).toLowerCase().includes(s))
    }
    if (params.domain) list = list.filter(p => (p.domain || []).some(d => d.toLowerCase().includes(params.domain.toLowerCase())))

    if (me.role === 'problem_owner') list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    else if (me.role === 'gov_admin') list.sort((a, b) => a.status.localeCompare(b.status) || (b.created_at || '').localeCompare(a.created_at || ''))
    else {
      // random shuffle for solvers
      const shuffled = [...list]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      list = shuffled
    }
    const skip = parseInt(params.skip || '0', 10)
    const limit = parseInt(params.limit || '50', 10)
    return { data: list.slice(skip, skip + limit).map(problemOut) }
  }

  const probMatch = url.match(/^\/problems\/(\d+)$/)
  if (method === 'get' && probMatch) {
    const p = findProblem(parseInt(probMatch[1], 10))
    if (!p) fail(404, 'Problem not found')
    return { data: problemOut(p) }
  }

  // ── Matching ───────────────────────────────────────────────────────────────
  const solverMatch = url.match(/^\/matching\/problem\/(\d+)\/solvers$/)
  if (method === 'get' && solverMatch) {
    const pid = parseInt(solverMatch[1], 10)
    const p = findProblem(pid)
    if (!p) fail(404, 'Problem not found')
    const matches = matchSolversForProblem(p, parseInt(params.top_k || '8', 10))
    return { data: { problem_id: pid, problem_title: p.title, match_count: matches.length, matches } }
  }

  if (method === 'get' && url === '/matching/solver/problems') {
    if (me.role !== 'faculty' && me.role !== 'student') fail(403, 'Only solvers can use this endpoint')
    const matches = matchProblemsForSolver(me, parseInt(params.top_k || '8', 10))
    return { data: { solver_id: me.id, solver_name: me.full_name, match_count: matches.length, matches } }
  }

  // ── Interest requests ──────────────────────────────────────────────────────
  if (method === 'post' && url === '/projects/interest') {
    if (!['faculty', 'student', 'industry_partner'].includes(me.role)) fail(403, 'Only solvers and industry partners can express interest')
    const targetId = body.project_id ? `pj:${body.project_id}` : `pb:${body.problem_id}`
    const existing = state.interestRequests.find(r => r.target_key === targetId && r.user_id === me.id)
    if (existing) fail(400, 'Already expressed interest')
    const req = { id: nextReqId(), target_key: targetId, problem_id: body.project_id ? null : body.problem_id, project_id: body.project_id || null, user_id: me.id, message: body.message || '', interest_type: body.interest_type || 'collaboration', status: 'pending', created_at: isoNow() }
    state.interestRequests.push(req)
    const prob = body.project_id
      ? findProblem(allProjectsFor(me).find(x => x.id === body.project_id)?.problem_id)
      : findProblem(body.problem_id)
    if (prob) {
      const owner = prob.owner_id
      const what = body.interest_type === 'funding' ? 'offered funding support for' : body.interest_type === 'co-development' ? 'wants to co-develop' : 'expressed interest in'
      notify(owner, me.role === 'industry_partner' ? 'Industry collaboration offer' : 'Interest received', `${me.full_name} ${what} "${prob.title}"`, `/projects/interest/problem/${prob.id}`)
    }
    saveState(state)
    return { data: { message: 'Interest registered', request_id: req.id } }
  }

  const interestMatch = url.match(/^\/projects\/interest\/problem\/(\d+)$/)
  if (method === 'get' && interestMatch) {
    const pid = parseInt(interestMatch[1], 10)
    const p = findProblem(pid)
    if (!p) fail(404, 'Problem not found')
    if (p.owner_id !== me.id && me.role !== 'gov_admin') fail(403, 'Not authorized')
    const probRequests = state.interestRequests.filter(r => r.problem_id === pid)
    const proj = allProjectsFor(me).find(x => x.problem_id === pid)
    const projRequests = proj ? state.interestRequests.filter(r => r.project_id === proj.id) : []
    return { data: [...probRequests, ...projRequests].map(r => {
      const u = users.find(x => x.id === r.user_id)
      return {
        request_id: r.id, user_id: r.user_id, full_name: u ? u.full_name : 'Unknown',
        institution: u ? u.institution : '', department: u ? u.department : '', role: u ? u.role : '',
        expertise_tags: u ? u.expertise_tags : [], message: r.message, status: r.status, created_at: r.created_at,
        interest_type: r.interest_type || 'collaboration', on_project: !!r.project_id,
      }
    }) }
  }

  const acceptMatch = url.match(/^\/projects\/interest\/(\d+)\/accept$/)
  if (method === 'patch' && acceptMatch) {
    const reqId = parseInt(acceptMatch[1], 10)
    const req = state.interestRequests.find(r => r.id === reqId)
    if (!req) fail(404, 'Request not found')
    const p = req.project_id ? null : findProblem(req.problem_id)
    const existingProj = req.project_id ? allProjectsFor(me).find(x => x.id === req.project_id) : (projects.find(x => x.problem_id === req.problem_id) || null)
    const probToCheck = p || findProblem(existingProj ? existingProj.problem_id : null)
    const ownerId = probToCheck ? probToCheck.owner_id : (existingProj ? 1 : null)
    if (ownerId !== me.id && me.role !== 'gov_admin') fail(403, 'Not authorized')
    req.status = 'accepted'
    let proj = existingProj
    if (!proj) {
      proj = { id: nextProjectId(), problem_id: req.problem_id, title: `Project: ${p.title}`, description: '', stage: 'discovery', outcome_evidence: null, outcome_verified_at: null, solution_proposal: null, seeking_collab: false, needs_funding: false, patents: [], startups_created: 0, member_ids: [], milestones: [], created_at: isoNow(), updated_at: isoNow() }
      if (p) p.status = 'in_progress'
      state.projects.push(proj)
    }
    if (!proj.member_ids) proj.member_ids = []
    const roleInTeam = req.user_id === me.id ? 'lead' : (proj.member_ids.length === 0 ? 'lead' : 'member')
    if (!proj.member_ids.some(([uid]) => uid === req.user_id)) {
      proj.member_ids.push([req.user_id, req.interest_type === 'funding' ? 'industry-funding' : req.interest_type === 'co-development' ? 'industry-co-dev' : roleInTeam])
    }
    const u = users.find(x => x.id === req.user_id)
    notify(req.user_id, 'You’re on the team', `${me.full_name} accepted your ${req.interest_type || 'collaboration'} request for "${proj.title}"`, `/projects/${proj.id}`)
    saveState(state)
    return { data: { message: 'Interest accepted, team member added', project_id: proj.id } }
  }

  const interestList = url.match(/^\/projects\/interest\/project\/(\d+)$/)
  if (method === 'get' && interestList) {
    const proj = allProjectsFor(me).find(x => x.id === parseInt(interestList[1], 10))
    if (!proj) fail(404, 'Project not found')
    return { data: state.interestRequests.filter(r => r.project_id === proj.id).map(r => {
      const u = users.find(x => x.id === r.user_id)
      return {
        request_id: r.id, user_id: r.user_id, full_name: u ? u.full_name : 'Unknown',
        institution: u ? u.institution : '', role: u ? u.role : '', message: r.message,
        status: r.status, interest_type: r.interest_type, created_at: r.created_at,
      }
    }) }
  }

  // ── Projects ───────────────────────────────────────────────────────────────
  if (method === 'get' && url === '/projects/') {
    let pjs = allProjectsFor(me)
    if (me.role === 'gov_admin') { /* all */ }
    else if (me.role === 'problem_owner') pjs = pjs.filter(p => findProblem(p.problem_id)?.owner_id === me.id)
    else pjs = pjs.filter(p => (p.member_ids || []).some(([uid]) => uid === me.id))
    return { data: pjs.map(p => buildProjectShape(p, false)) }
  }

  const projectMatch = url.match(/^\/projects\/(\d+)$/)
  if (method === 'get' && projectMatch) {
    const p = allProjectsFor(me).find(x => x.id === parseInt(projectMatch[1], 10))
    if (!p) fail(404, 'Project not found')
    return { data: buildProjectShape(p, true) }
  }

  const stageMatch = url.match(/^\/projects\/(\d+)\/stage$/)
  if (method === 'patch' && stageMatch) {
    const p = allProjectsFor(me).find(x => x.id === parseInt(stageMatch[1], 10))
    if (!p) fail(404, 'Project not found')
    const stage = (params.stage || body.stage || '').trim()
    const VALID = ['discovery', 'proposal', 'research', 'prototype', 'evaluation', 'deployment', 'verified']
    if (!VALID.includes(stage)) fail(400, `Invalid stage. Must be one of: ${VALID.join(', ')}`)
    p.stage = stage
    const stageProb = findProblem(p.problem_id)
    if (stageProb) notify(stageProb.owner_id, 'Project stage advanced', `"${p.title}" moved to ${stage}`, `/projects/${p.id}`)
    notifyMany((p.member_ids || []).filter(([uid]) => uid !== me.id).map(([uid]) => uid), 'Project stage updated', `"${p.title}" is now in ${stage} stage`, `/projects/${p.id}`)
    if (stage === 'verified') {
      p.outcome_verified_at = isoNow()
      if (stageProb) stageProb.status = 'verified'
    }
    saveState(state)
    return { data: { message: 'Stage updated', stage } }
  }

  const verifyMatch = url.match(/^\/projects\/(\d+)\/verify$/)
  if (method === 'patch' && verifyMatch) {
    const p = allProjectsFor(me).find(x => x.id === parseInt(verifyMatch[1], 10))
    if (!p) fail(404, 'Project not found')
    const prob = findProblem(p.problem_id)
    if (prob && prob.owner_id !== me.id && me.role !== 'gov_admin') fail(403, 'Only the problem owner can verify outcomes')
    p.stage = 'verified'
    p.outcome_evidence = params.evidence || ''
    p.outcome_verified_at = isoNow()
    if (prob) prob.status = 'verified'
    notifyMany((p.member_ids || []).map(([uid]) => uid), 'Outcome verified', `"${p.title}" was verified by the problem owner — real-world impact confirmed!`, `/projects/${p.id}`)
    saveState(state)
    return { data: { message: 'Outcome verified!', verified_at: p.outcome_verified_at } }
  }

  const msCreateMatch = url.match(/^\/projects\/(\d+)\/milestones$/)
  if (method === 'post' && msCreateMatch) {
    const p = allProjectsFor(me).find(x => x.id === parseInt(msCreateMatch[1], 10))
    if (!p) fail(404, 'Project not found')
    if (!p.milestones) p.milestones = []
    const milestone = { id: nextMilestoneId(), title: body.title, description: body.description || '', due_date: body.due_date || '', status: 'pending', completed_at: null, evidence_url: null }
    p.milestones.push(milestone)
    saveState(state)
    return { data: milestone }
  }

  const msCompleteMatch = url.match(/^\/projects\/milestones\/(\d+)\/complete$/)
  if (method === 'patch' && msCompleteMatch) {
    const mid = parseInt(msCompleteMatch[1], 10)
    let found = null
    for (const p of allProjectsFor(me)) {
      const m = (p.milestones || []).find(x => x.id === mid)
      if (m) { found = m; break }
    }
    if (!found) fail(404, 'Milestone not found')
    found.status = 'completed'
    found.completed_at = isoNow()
    found.evidence_url = params.evidence_url || ''
    const msProj = allProjectsFor(me).find(pp => (pp.milestones || []).some(m => m.id === mid))
    if (msProj) {
      const msProb = findProblem(msProj.problem_id)
      if (msProb) notify(msProb.owner_id, 'Milestone completed', `"${found.title}" completed on project #${msProj.id}`, `/projects/${msProj.id}`)
    }
    saveState(state)
    return { data: { message: 'Milestone completed', milestone_id: mid } }
  }

  // ── Team / proposal / patents ──────────────────────────────────────────────
  const memberMatch = url.match(/^\/projects\/(\d+)\/members$/)
  if (method === 'post' && memberMatch) {
    const proj = allProjectsFor(me).find(x => x.id === parseInt(memberMatch[1], 10))
    if (!proj) fail(404, 'Project not found')
    const invited = users.find(u => u.id === body.user_id)
    if (!invited) fail(404, 'User not found')
    if (!proj.member_ids) proj.member_ids = []
    if (proj.member_ids.some(([uid]) => uid === body.user_id)) fail(400, 'Already a team member')
    const roleInTeam = body.role_in_team || 'member'
    proj.member_ids.push([body.user_id, roleInTeam])
    notify(body.user_id, 'Team invitation', `You were added to the team for "${proj.title}"`, `/projects/${proj.id}`)
    saveState(state)
    return { data: { message: 'Member added to team', user_id: body.user_id } }
  }

  const proposalMatch = url.match(/^\/projects\/(\d+)\/proposal$/)
  if (method === 'patch' && proposalMatch) {
    const proj = allProjectsFor(me).find(x => x.id === parseInt(proposalMatch[1], 10))
    if (!proj) fail(404, 'Project not found')
    const probN = findProblem(proj.problem_id)
    if (probN && probN.owner_id === me.id && me.role === 'problem_owner') fail(403, 'Solution proposals are submitted by the university team')
    proj.solution_proposal = (body.description || '').trim()
    proj.updated_at = isoNow()
    if (probN) notify(probN.owner_id, 'Solution proposal submitted', `The team submitted a solution proposal for "${probN.title}"`, `/projects/${proj.id}`)
    saveState(state)
    return { data: { message: 'Solution proposal saved', solution_proposal: proj.solution_proposal } }
  }

  const patentMatch = url.match(/^\/projects\/(\d+)\/patents$/)
  if (method === 'post' && patentMatch) {
    const proj = allProjectsFor(me).find(x => x.id === parseInt(patentMatch[1], 10))
    if (!proj) fail(404, 'Project not found')
    if (!proj.patents) proj.patents = []
    const pidNext = proj.patents.reduce((m, pt) => Math.max(m, pt.id || 0), 0) + 1
    const patent = { id: pidNext, title: body.title, status: body.status || 'filed', filed_at: isoNow() }
    proj.patents.push(patent)
    proj.updated_at = isoNow()
    saveState(state)
    return { data: patent }
  }

  // ── Industry opportunities ─────────────────────────────────────────────────
  if (method === 'get' && url === '/users') {
    let list = users.filter(u => ['faculty', 'student', 'industry_partner'].includes(u.role))
    if (params.role) list = list.filter(u => u.role === params.role)
    return { data: list.map(publicUser) }
  }

  // ── Industry opportunities ─────────────────────────────────────────────────
  if (method === 'get' && url === '/industry/opportunities') {
    if (me.role !== 'industry_partner' && me.role !== 'gov_admin') fail(403, 'Only industry partners can view opportunities')
    const opps = allProjectsFor(me).filter(p => p.seeking_collab || p.needs_funding).map(p => {
      const prob = findProblem(p.problem_id)
      const isMember = (p.member_ids || []).some(([uid]) => uid === me.id)
      return {
        project_id: p.id, project_title: p.title, problem_title: prob ? prob.title : '',
        problem_domain: prob ? prob.domain : [], problem_district: prob ? prob.district : '',
        stage: p.stage, seeking_collab: !!p.seeking_collab, needs_funding: !!p.needs_funding,
        description: prob ? prob.desired_outcome : '', is_member: isMember,
        member_count: (p.member_ids || []).length,
      }
    })
    return { data: opps }
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  if (method === 'get' && url === '/notifications') {
    return { data: state.notifications.filter(n => n.user_id === me.id).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')) }
  }
  if (method === 'post' && url === '/notifications/read') {
    for (const n of state.notifications) if (n.user_id === me.id && !n.read) n.read = true
    saveState(state)
    return { data: { message: 'Marked all as read' } }
  }
  const nReadMatch = url.match(/^\/notifications\/(\d+)\/read$/)
  if (method === 'post' && nReadMatch) {
    const n = state.notifications.find(x => x.id === parseInt(nReadMatch[1], 10) && x.user_id === me.id)
    if (n) n.read = true
    saveState(state)
    return { data: { message: 'Marked as read' } }
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  if (method === 'get' && url === '/dashboard/stats') {
    const open = problems.filter(p => p.status === 'open').length
    const inProgress = problems.filter(p => p.status === 'in_progress').length
    const solved = problems.filter(p => ['solved', 'verified'].includes(p.status)).length
    const verified = problems.filter(p => p.status === 'verified').length
    const pjs = allProjectsFor(me)
    const activeProjects = pjs.filter(p => p.stage !== 'verified').length
    const faculty = users.filter(u => u.role === 'faculty').length
    const students = users.filter(u => u.role === 'student').length
    const owners = users.filter(u => u.role === 'problem_owner').length
    const industryPartners = users.filter(u => u.role === 'industry_partner').length
    const patentsFiled = pjs.reduce((m, p) => m + (p.patents || []).filter(pt => pt.status === 'filed').length + (p.patents || []).filter(pt => pt.status === 'granted' || pt.status === 'published').length, 0)
    const startupsCreated = pjs.reduce((m, p) => m + (p.startups_created || 0), 0)
    const communitySubmissions = [...problems, ...state.extraProblems].filter(p => p.community_submitted).length

    const domainCounts = {}
    for (const p of problems) for (const d of (p.domain || [])) domainCounts[d] = (domainCounts[d] || 0) + 1
    const districtCounts = {}
    for (const p of problems) if (p.district) districtCounts[p.district] = (districtCounts[p.district] || 0) + 1

    const stageCounts = {}
    for (const proj of pjs) stageCounts[proj.stage] = (stageCounts[proj.stage] || 0) + 1

    const institutionMap = {}
    for (const proj of pjs) for (const [uid] of (proj.member_ids || [])) {
      const u = users.find(x => x.id === uid)
      if (u && u.institution) institutionMap[u.institution] = (institutionMap[u.institution] || 0) + 1
    }

    const recentVerified = pjs.filter(p => p.stage === 'verified' && p.outcome_verified_at)
      .sort((a, b) => (b.outcome_verified_at || '').localeCompare(a.outcome_verified_at || '')).slice(0, 5)
      .map(vp => {
        const prob = findProblem(vp.problem_id)
        return { project_id: vp.id, problem_title: prob ? prob.title : '', district: prob ? prob.district : '', domain: prob ? prob.domain : [], verified_at: vp.outcome_verified_at }
      })

    const industryParticipation = {}
    for (const proj of pjs) for (const [uid, roleInTeam] of (proj.member_ids || [])) {
      const u = users.find(x => x.id === uid)
      if (u && u.role === 'industry_partner') industryParticipation[u.institution] = (industryParticipation[u.institution] || 0) + 1
    }

    return { data: {
      summary: {
        total_problems: problems.length, open_problems: open, in_progress: inProgress,
        solved, verified, total_projects: pjs.length, active_projects: activeProjects,
        total_solvers: faculty + students, total_faculty: faculty, total_students: students,
        total_problem_owners: owners, total_industry_partners: industryPartners,
        patents_filed: patentsFiled, startups_created: startupsCreated,
        community_submissions: communitySubmissions,
        resolution_rate: problems.length ? Math.round((solved / problems.length) * 1000) / 10 : 0,
      },
      domain_distribution: Object.entries(domainCounts).map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count),
      district_distribution: Object.entries(districtCounts).map(([district, count]) => ({ district, count })).sort((a, b) => b.count - a.count),
      status_distribution: [
        { status: 'Open', count: open }, { status: 'In Progress', count: inProgress },
        { status: 'Solved', count: solved - verified }, { status: 'Verified', count: verified },
      ],
      stage_distribution: Object.entries(stageCounts).map(([stage, count]) => ({ stage, count })),
      institution_participation: Object.entries(institutionMap).map(([institution, members]) => ({ institution, members })).sort((a, b) => b.members - a.members),
      industry_participation: Object.entries(industryParticipation).map(([institution, projectsEngaged]) => ({ institution, projectsEngaged })).sort((a, b) => b.projectsEngaged - a.projectsEngaged),
      recent_verifications: recentVerified,
    } }
  }

  fail(404, `Mock endpoint not implemented: ${method.toUpperCase()} ${urlPath}`)
}

export const mockEnabled = true