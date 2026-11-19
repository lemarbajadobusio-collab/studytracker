
import { useEffect, useState, type FormEvent } from 'react'
import {
  Plus,
  Search,
  Code2,
  Pencil,
  Trash2,
  X,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Clock3,
  Filter,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Technology = {
  id: string
  name: string
  category: string
  level: string
  status: string
  progress: number
  description: string | null
  target_date: string | null
  created_at: string
}

const categories = [
  'Programming',
  'Framework',
  'Database',
  'DevOps',
  'Cloud',
  'Tools',
  'Other',
]

const levels = ['Beginner', 'Intermediate', 'Advanced']

const statuses = ['Not Started', 'Learning', 'Completed']

const emptyForm = {
  name: '',
  category: 'Programming',
  level: 'Beginner',
  status: 'Not Started',
  progress: 0,
  description: '',
  target_date: '',
}

export default function Technologies() {
  const [technologies, setTechnologies] = useState<Technology[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  // Load technologies belonging to the signed-in user
  const loadTechnologies = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('technologies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
    } else {
      setTechnologies((data ?? []) as Technology[])
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadTechnologies()
  }, [])

  // Open the add form
  const openAddModal = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
    setMessage('')
  }

  // Open the edit form
  const openEditModal = (technology: Technology) => {
    setEditingId(technology.id)

    setForm({
      name: technology.name,
      category: technology.category,
      level: technology.level,
      status: technology.status,
      progress: technology.progress,
      description: technology.description ?? '',
      target_date: technology.target_date ?? '',
    })

    setShowModal(true)
    setMessage('')
  }

  // Save a new or existing technology
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const name = form.name.trim()

    if (!name) {
      setMessage('Technology name is required.')
      return
    }

    const progress = Number(form.progress)

    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      setMessage('Progress must be between 0 and 100.')
      return
    }

    if (form.status === 'Completed' && progress !== 100) {
      setMessage('Completed technologies must have 100% progress.')
      return
    }

    if (form.status !== 'Completed' && progress === 100) {
      setMessage('Set the status to Completed when progress reaches 100%.')
      return
    }

    setSaving(true)
    setMessage('')

    const payload = {
      name,
      category: form.category,
      level: form.level,
      status: form.status,
      progress,
      description: form.description.trim() || null,
      target_date: form.target_date || null,
    }

    try {
      let error

      if (editingId) {
        const result = await supabase
          .from('technologies')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)

        error = result.error
      } else {
        const { data: authData } = await supabase.auth.getUser()

        if (!authData.user) {
          throw new Error('Please sign in again.')
        }

        const result = await supabase
          .from('technologies')
          .insert({
            ...payload,
            user_id: authData.user.id,
          })

        error = result.error
      }

      if (error) throw error

      setShowModal(false)
      setForm(emptyForm)
      setEditingId(null)

      await loadTechnologies()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save technology.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Delete a technology
  const deleteTechnology = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this technology?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('technologies')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadTechnologies()
  }

  // Statistics
  const total = technologies.length

  const learning = technologies.filter(
    (item) => item.status === 'Learning'
  ).length

  const completed = technologies.filter(
    (item) => item.status === 'Completed'
  ).length

  const averageProgress =
    total > 0
      ? Math.round(
          technologies.reduce(
            (sum, item) => sum + item.progress,
            0
          ) / total
        )
      : 0

  // Search and category filtering
  const filteredTechnologies = technologies.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())

    const matchesFilter =
      filter === 'All' || item.status === filter

    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            My Technologies
          </h1>
          <p className="text-slate-500 mt-2">
            Organize and monitor the technologies you are learning.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-semibold"
        >
          <Plus size={19} />
          Add Technology
        </button>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

        <StatCard
          label="Total Technologies"
          value={total}
          icon={<Code2 size={22} />}
          color="bg-blue-100 text-blue-600"
        />

        <StatCard
          label="Currently Learning"
          value={learning}
          icon={<BookOpen size={22} />}
          color="bg-purple-100 text-purple-600"
        />

        <StatCard
          label="Completed"
          value={completed}
          icon={<CheckCircle2 size={22} />}
          color="bg-green-100 text-green-600"
        />

        <StatCard
          label="Average Progress"
          value={`${averageProgress}%`}
          icon={<TrendingUp size={22} />}
          color="bg-orange-100 text-orange-600"
        />

      </div>

      {/* SEARCH AND FILTER */}
      <div className="flex flex-col sm:flex-row gap-3">

        <div className="relative flex-1">
          <Search
            size={19}
            className="absolute left-3 top-3.5 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technologies..."
            className="w-full bg-white border rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="relative">
          <Filter
            size={17}
            className="absolute left-3 top-3.5 text-slate-400"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white border rounded-xl py-3 pl-10 pr-8 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* FEEDBACK */}
      {message && !showModal && (
        <div className="bg-indigo-50 text-indigo-700 p-4 rounded-xl text-sm">
          {message}
        </div>
      )}

      {/* TECHNOLOGY CARDS */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">
          Loading technologies...
        </div>
      ) : filteredTechnologies.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center">
          <Code2
            size={45}
            className="mx-auto text-slate-300 mb-4"
          />
          <h3 className="font-bold text-lg">
            No technologies found
          </h3>
          <p className="text-slate-500 text-sm mt-2">
            Add a technology or change your search filters.
          </p>
          <button
            onClick={openAddModal}
            className="mt-5 bg-indigo-600 text-white px-5 py-3 rounded-xl"
          >
            Add Your First Technology
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

          {filteredTechnologies.map((technology) => (
            <div
              key={technology.id}
              className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >

              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                    <Code2 size={25} />
                  </div>

                  <h3 className="text-xl font-bold truncate">
                    {technology.name}
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    {technology.category}
                  </p>
                </div>

                <StatusBadge status={technology.status} />
              </div>

              {technology.description && (
                <p className="text-sm text-slate-500 mt-4 line-clamp-2">
                  {technology.description}
                </p>
              )}

              <div className="mt-6">

                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-600">
                    Learning Progress
                  </span>
                  <span className="font-bold text-indigo-600">
                    {technology.progress}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{
                      width: `${technology.progress}%`,
                    }}
                  />
                </div>

              </div>

              <div className="flex justify-between items-center mt-5 text-sm">
                <span className="text-slate-500">
                  {technology.level}
                </span>

                {technology.target_date && (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock3 size={14} />
                    {technology.target_date}
                  </span>
                )}
              </div>

              <div className="flex gap-2 mt-5 pt-4 border-t">

                <button
                  onClick={() => openEditModal(technology)}
                  className="flex-1 flex justify-center items-center gap-2 border rounded-lg py-2 text-slate-600 hover:bg-slate-50"
                >
                  <Pencil size={15} />
                  Edit
                </button>

                <button
                  onClick={() => deleteTechnology(technology.id)}
                  className="px-4 border rounded-lg text-red-500 hover:bg-red-50"
                  title="Delete technology"
                >
                  <Trash2 size={16} />
                </button>

              </div>

            </div>
          ))}

        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl p-6">

            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? 'Edit Technology' : 'Add Technology'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your technology learning details.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="text-sm font-medium">
                  Technology Name *
                </label>
                <input
                  required
                  maxLength={80}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g. Python, React, Flutter"
                  className="w-full border rounded-xl p-3 mt-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="text-sm font-medium">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full border rounded-xl p-3 mt-2"
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Skill Level
                  </label>
                  <select
                    value={form.level}
                    onChange={(e) =>
                      setForm({ ...form, level: e.target.value })
                    }
                    className="w-full border rounded-xl p-3 mt-2"
                  >
                    {levels.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div>
                <label className="text-sm font-medium">
                  Learning Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => {
                    const status = e.target.value
                    setForm({
                      ...form,
                      status,
                      progress:
                        status === 'Completed'
                          ? 100
                          : form.progress === 100
                            ? 99
                            : form.progress,
                    })
                  }}
                  className="w-full border rounded-xl p-3 mt-2"
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="text-sm font-medium">
                    Progress
                  </label>
                  <span className="text-sm font-bold text-indigo-600">
                    {form.progress}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.progress}
                  disabled={form.status === 'Completed'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      progress: Number(e.target.value),
                      status:
                        Number(e.target.value) === 0
                          ? 'Not Started'
                          : 'Learning',
                    })
                  }
                  className="w-full mt-3 accent-indigo-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  placeholder="What are you learning?"
                  className="w-full border rounded-xl p-3 mt-2 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  value={form.target_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      target_date: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-3 mt-2"
                />
              </div>

              {message && (
                <p className="text-sm text-red-600">
                  {message}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3">

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 border rounded-xl"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-xl disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Update Technology'
                      : 'Save Technology'}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// STATISTICS CARD
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 mt-4">{label}</p>
      <h3 className="text-3xl font-bold mt-1">{value}</h3>
    </div>
  )
}

// STATUS BADGE
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'Not Started': 'bg-slate-100 text-slate-600',
    Learning: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
  }

  return (
    <span
      className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${styles[status] ?? styles['Not Started']}`}
    >
      {status}
    </span>
  )
}
