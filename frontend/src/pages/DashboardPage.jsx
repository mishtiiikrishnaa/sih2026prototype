import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, Target, Activity, Factory, FileText, Rocket, Megaphone } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import api from '../api/client'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/dashboard/stats')
        setStats(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="p-6">
      <div className="h-6 bg-bg-secondary rounded w-1/4 mb-6 animate-pulse" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-bg-secondary rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  if (!stats) return <div className="p-6">Failed to load dashboard data.</div>

  const { summary } = stats

  // ECharts config for Domain Distribution (Pie)
  const domainOption = {
    tooltip: { trigger: 'item', backgroundColor: '#fff', textStyle: { color: '#333' } },
    series: [
      {
        name: 'Domain',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: stats.domain_distribution.map(d => ({ value: d.count, name: d.domain }))
      }
    ]
  }

  // ECharts config for District Distribution (Bar)
  const districtOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: [...stats.district_distribution].reverse().map(d => d.district),
      axisLabel: { interval: 0, fontSize: 10 }
    },
    series: [
      {
        name: 'Problems',
        type: 'bar',
        data: [...stats.district_distribution].reverse().map(d => d.count),
        itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] }
      }
    ]
  }

  // ECharts config for Stage Distribution (Funnel/Bar)
  const stageOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: stats.stage_distribution.map(d => d.stage.charAt(0).toUpperCase() + d.stage.slice(1)),
      axisLabel: { interval: 0, rotate: 30, fontSize: 10 }
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Projects',
        type: 'bar',
        data: stats.stage_distribution.map(d => d.count),
        itemStyle: { color: '#0f766e', borderRadius: [4, 4, 0, 0] }
      }
    ]
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <LayoutDashboard size={20} className="text-blue-600" />
            Government Innovation Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">Real-time oversight of state-level problem solving activity.</p>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Problems Posted" value={summary.total_problems} icon={Activity} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Active Projects" value={summary.active_projects} icon={Target} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Outcome Verified" value={summary.verified} icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Engaged Solvers" value={summary.total_solvers} icon={Users} color="text-violet-600" bg="bg-violet-50" />
      </div>

      {/* Impact Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Industry Partners" value={summary.total_industry_partners} icon={Factory} color="text-rose-600" bg="bg-rose-50" />
        <StatCard title="Patents Filed / Granted" value={summary.patents_filed} icon={FileText} color="text-violet-600" bg="bg-violet-50" />
        <StatCard title="Startups Created" value={summary.startups_created} icon={Rocket} color="text-amber-600" bg="bg-amber-50" />
        <StatCard title="Community Submissions" value={summary.community_submissions} icon={Megaphone} color="text-teal-600" bg="bg-teal-50" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Problems by Domain</h2>
          <ReactECharts option={domainOption} style={{ height: '300px' }} />
        </div>
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Problem Density by District</h2>
          <ReactECharts option={districtOption} style={{ height: '300px' }} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Project Funnel (Current Stages)</h2>
          <ReactECharts option={stageOption} style={{ height: '250px' }} />
        </div>
        
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Top Participating Institutions</h2>
          <div className="space-y-4">
            {stats.institution_participation.slice(0, 5).map((inst, i) => (
              <div key={inst.institution} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-bg-secondary flex items-center justify-center text-xs font-bold text-text-secondary">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{inst.institution}</p>
                </div>
                <div className="text-sm font-bold text-text-primary">{inst.members}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Industry participation */}
      {(stats.industry_participation || []).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Factory size={15} className="text-rose-600" /> Industry Participation (Projects Engaged)
            </h2>
            <div className="space-y-4">
              {stats.industry_participation.slice(0, 5).map((inst, i) => (
                <div key={inst.institution} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{inst.institution}</p>
                  </div>
                  <div className="text-sm font-bold text-text-primary">{inst.projectsEngaged} project{inst.projectsEngaged > 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-text-primary leading-none mt-1">{value}</p>
      </div>
    </div>
  )
}

// Inline CheckCircle since it wasn't imported from lucide-react in this file
function CheckCircle(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
