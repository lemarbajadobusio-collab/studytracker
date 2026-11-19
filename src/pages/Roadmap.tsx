
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Plus,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  X,
  Target,
  ListChecks,
  GraduationCap,
  ChevronDown,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Technology = {
  id: string
  name: string
  category: string
  level: string
  status: string
  progress: number
}

type Topic = {
  id: string
  technology_id: string
  title: string
  description: string | null
  status: string
  sort_order: number
  estimated_minutes: number
  target_date: string | null
  completed_at: string | null
  created_at: string
}

type TopicForm = {
  title: string
  description: string
  status: string
  sort_order: number
  estimated_minutes: number
  target_date: string
}

const emptyForm: TopicForm = {
  title: '',
  description: '',
  status: 'Not Started',
  sort_order: 1,
  estimated_minutes: 60,
  target_date: '',
}

const topicStatuses = [
  'Not Started',
  'In Progress',
  'Completed',
]

export default function Roadmap() {
  const [technologies, setTechnologies] = useState<Technology[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTechnology, setSelectedTechnology] =
    useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState<TopicForm>(emptyForm)
  const [message, setMessage] = useState('')

  // LOAD USER TECHNOLOGIES
  const loadTechnologies = async () => {
    const { data, error } = await supabase
      .from('technologies')
      .select('id, name, category, level, status, progress')
      .order('name')

    if (error) {
      setMessage(error.message)
      return
    }

    const items = (data ?? []) as Technology[]

    setTechnologies(items)

    setSelectedTechnology((current) => {
      if (items.some((item) => item.id === current)) {
        return current
      }

      return items[0]?.id ?? ''
    })
  }

  // LOAD TOPICS
  const loadTopics = async () => {
    if (!selectedTechnology) {
      setTopics([])
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('learning_topics')
      .select('*')
      .eq('technology_id', selectedTechnology)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      setMessage(error.message)
    } else {
      setTopics((data ?? []) as Topic[])
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadTechnologies()
  }, [])

  useEffect(() => {
    void loadTopics()
  }, [selectedTechnology])

  // SELECTED TECHNOLOGY
  const currentTechnology = technologies.find(
    (item) => item.id === selectedTechnology
  )

  // PROGRESS CALCULATION
  const completed = topics.filter(
    (topic) => topic.status === 'Completed'
  ).length

  const inProgress = topics.filter(
    (topic) => topic.status === 'In Progress'
  ).length

  const total = topics.length

  const progress =
    total > 0
      ? Math.round((completed / total) * 100)
      : 0

  const totalMinutes = topics.reduce(
    (sum, topic) => sum + topic.estimated_minutes,
    0
  )

  // SEARCH AND FILTER
  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      const matchesSearch =
        topic.title.toLowerCase().includes(search.toLowerCase()) ||
        (topic.description ?? '')
          .toLowerCase()
          .includes(search.toLowerCase())

      const matchesFilter =
        filter === 'All' || topic.status === filter

      return matchesSearch && matchesFilter
    })
  }, [topics, search, filter])

  // OPEN ADD MODAL
  const openAddModal = () => {
    setEditingId(null)

    setForm({
      ...emptyForm,
      sort_order: topics.length + 1,
    })

    setMessage('')
    setShowModal(true)
  }

  // OPEN EDIT MODAL
  const openEditModal = (topic: Topic) => {
    setEditingId(topic.id)

    setForm({
      title: topic.title,
      description: topic.description ?? '',
      status: topic.status,
      sort_order: topic.sort_order,
      estimated_minutes: topic.estimated_minutes,
      target_date: topic.target_date ?? '',
    })

    setMessage('')
    setShowModal(true)
  }

  // SAVE TOPIC
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!selectedTechnology) return

    if (!form.title.trim()) {
      setMessage('Topic title is required.')
      return
    }

    if (
      !Number.isInteger(form.sort_order) ||
      form.sort_order < 1
    ) {
      setMessage('Topic order must be at least 1.')
      return
    }

    if (
      !Number.isInteger(form.estimated_minutes) ||
      form.estimated_minutes < 1
    ) {
      setMessage('Estimated duration must be at least 1 minute.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError) throw authError

      const user = authData.user

      if (!user) {
        throw new Error('Please log in again.')
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        sort_order: form.sort_order,
        estimated_minutes: form.estimated_minutes,
        target_date: form.target_date || null,
        technology_id: selectedTechnology,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }

      let error

      if (editingId) {
        const result = await supabase
          .from('learning_topics')
          .update(payload)
          .eq('id', editingId)

        error = result.error
      } else {
        const result = await supabase
          .from('learning_topics')
          .insert(payload)

        error = result.error
      }

      if (error) throw error

      setShowModal(false)
      setEditingId(null)
      setForm(emptyForm)

      await loadTopics()
      await syncTechnologyProgress()

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save topic.'
      )
    } finally {
      setSaving(false)
    }
  }

  // UPDATE TECHNOLOGY PROGRESS
  const syncTechnologyProgress = async () => {
    if (!selectedTechnology) return

    const { data, error } = await supabase
      .from('learning_topics')
      .select('status')
      .eq('technology_id', selectedTechnology)

    if (error) {
      setMessage(error.message)
      return
    }

    const items = data ?? []

    const completedCount = items.filter(
      (item) => item.status === 'Completed'
    ).length

    const percentage =
      items.length > 0
        ? Math.round((completedCount / items.length) * 100)
        : 0

    const status =
      items.length > 0 && percentage === 100
        ? 'Completed'
        : items.length > 0
          ? 'Learning'
          : 'Not Started'

    const { error: updateError } = await supabase
      .from('technologies')
      .update({
        progress: percentage,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedTechnology)

    if (updateError) {
      setMessage(updateError.message)
      return
    }

    await loadTechnologies()
  }

  // CHANGE TOPIC STATUS
  const updateTopicStatus = async (
    id: string,
    status: string
  ) => {
    const { error } = await supabase
      .from('learning_topics')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadTopics()
    await syncTechnologyProgress()
  }

  // DELETE TOPIC
  const deleteTopic = async (id: string) => {
    if (!window.confirm('Delete this learning topic?')) {
      return
    }

    const { error } = await supabase
      .from('learning_topics')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadTopics()
    await syncTechnologyProgress()
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Learning Roadmap
          </h1>

          <p className="text-slate-500 mt-2">
            Organize your learning journey one topic at a time.
          </p>
        </div>

        <button
          onClick={openAddModal}
          disabled={!selectedTechnology}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus size={19} />
          Add Topic
        </button>
      </div>

      {/* TECHNOLOGY SELECTOR */}
      <section className="bg-white border rounded-2xl p-6 shadow-sm">

        <label className="text-sm font-semibold text-slate-600">
          Select Technology
        </label>

        <div className="relative mt-3 max-w-xl">
          <select
            value={selectedTechnology}
            onChange={(e) => {
              setSelectedTechnology(e.target.value)
              setSearch('')
              setFilter('All')
              setMessage('')
            }}
            className="w-full appearance-none border rounded-xl p-4 pr-10 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {technologies.length === 0 && (
              <option value="">No technologies available</option>
            )}

            {technologies.map((technology) => (
              <option key={technology.id} value={technology.id}>
                {technology.name} — {technology.category}
              </option>
            ))}
          </select>

          <ChevronDown
            className="absolute right-4 top-4 text-slate-400 pointer-events-none"
            size={20}
          />
        </div>

        {technologies.length === 0 && (
          <p className="text-sm text-amber-600 mt-3">
            Add a technology in My Technologies before creating a roadmap.
          </p>
        )}

      </section>

      {currentTechnology && (
        <>
          {/* ROADMAP OVERVIEW */}
          <section className="bg-gradient-to-r from-indigo-700 to-violet-700 rounded-2xl p-7 text-white">

            <div className="flex flex-wrap justify-between gap-4">

              <div>
                <p className="text-indigo-200 text-sm">
                  CURRENT LEARNING ROADMAP
                </p>

                <h2 className="text-3xl font-bold mt-2">
                  {currentTechnology.name}
                </h2>

                <p className="text-indigo-200 mt-2">
                  {currentTechnology.category} · {currentTechnology.level}
                </p>
              </div>

              <div className="text-right">
                <p className="text-indigo-200 text-sm">
                  COMPLETION
                </p>

                <p className="text-5xl font-bold mt-1">
                  {progress}%
                </p>
              </div>

            </div>

            <div className="bg-white/20 h-3 rounded-full mt-8 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-indigo-100 text-sm mt-3">
              {completed} of {total} topics completed
            </p>

          </section>

          {/* STATISTICS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

            <StatCard
              label="Total Topics"
              value={total}
              icon={<BookOpen size={22} />}
              color="bg-blue-100 text-blue-600"
            />

            <StatCard
              label="Completed"
              value={completed}
              icon={<CheckCircle2 size={22} />}
              color="bg-green-100 text-green-600"
            />

            <StatCard
              label="In Progress"
              value={inProgress}
              icon={<Clock size={22} />}
              color="bg-orange-100 text-orange-600"
            />

            <StatCard
              label="Estimated Hours"
              value={(totalMinutes / 60).toFixed(1)}
              icon={<Target size={22} />}
              color="bg-purple-100 text-purple-600"
            />

          </section>

          {/* SEARCH AND FILTER */}
          <section className="flex flex-col sm:flex-row gap-3">

            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search learning topics..."
                className="w-full border bg-white rounded-xl p-3 pl-10 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border bg-white rounded-xl p-3"
            >
              <option value="All">All Topics</option>
              {topicStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>

          </section>

          {/* TOPIC LIST */}
          <section className="bg-white border rounded-2xl shadow-sm p-6">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">
                  Learning Topics
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Follow your roadmap in the correct sequence.
                </p>
              </div>

              <ListChecks className="text-indigo-600" size={25} />
            </div>

            {loading ? (
              <p className="text-center py-10 text-slate-500">
                Loading roadmap...
              </p>
            ) : filteredTopics.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap
                  size={45}
                  className="mx-auto text-slate-300 mb-4"
                />

                <h3 className="font-bold text-lg">
                  No learning topics found
                </h3>

                <p className="text-sm text-slate-500 mt-2">
                  Start building your learning roadmap.
                </p>

                <button
                  onClick={openAddModal}
                  className="bg-indigo-600 text-white px-5 py-3 rounded-xl mt-5"
                >
                  Add Your First Topic
                </button>
              </div>
            ) : (
              <div className="space-y-3">

                {filteredTopics.map((topic, index) => (
                  <div
                    key={topic.id}
                    className="border rounded-xl p-4 hover:bg-slate-50 transition"
                  >

                    <div className="flex flex-wrap items-center justify-between gap-4">

                      <div className="flex items-start gap-4 flex-1 min-w-0">

                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold ${
                          topic.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {topic.status === 'Completed'
                            ? <CheckCircle2 size={20} />
                            : topic.sort_order || index + 1}
                        </div>

                        <div className="min-w-0 flex-1">

                          <h3 className="font-semibold text-slate-800">
                            {topic.title}
                          </h3>

                          {topic.description && (
                            <p className="text-sm text-slate-500 mt-1">
                              {topic.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">

                            <span className="flex items-center gap-1">
                              <Clock size={13} />
                              {topic.estimated_minutes} min
                            </span>

                            {topic.target_date && (
                              <span>
                                Target: {topic.target_date}
                              </span>
                            )}

                          </div>

                        </div>

                      </div>

                      <div className="flex flex-wrap items-center gap-2">

                        <select
                          value={topic.status}
                          onChange={(e) =>
                            updateTopicStatus(
                              topic.id,
                              e.target.value
                            )
                          }
                          className="border rounded-lg px-3 py-2 text-xs font-medium"
                        >
                          {topicStatuses.map((status) => (
                            <option key={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => openEditModal(topic)}
                          className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
                          title="Edit topic"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => deleteTopic(topic.id)}
                          className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg"
                          title="Delete topic"
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </section>
        </>
      )}

      {/* FEEDBACK */}
      {message && (
        <div className="bg-indigo-50 text-indigo-700 p-4 rounded-xl text-sm">
          {message}
        </div>
      )}

      {/* ADD / EDIT TOPIC MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl p-6">

            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? 'Edit Topic' : 'Add Learning Topic'}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {currentTechnology?.name} learning roadmap
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
              >
                <X className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="text-sm font-medium">
                  Topic Title *
                </label>

                <input
                  required
                  maxLength={120}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="e.g. React Components"
                  className="w-full border rounded-xl p-3 mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Description
                </label>

                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  placeholder="What will you learn in this topic?"
                  className="w-full border rounded-xl p-3 mt-2 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="text-sm font-medium">
                    Topic Order
                  </label>

                  <input
                    type="number"
                    min="1"
                    required
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sort_order: Number(e.target.value),
                      })
                    }
                    className="w-full border rounded-xl p-3 mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Estimated Minutes
                  </label>

                  <input
                    type="number"
                    min="1"
                    required
                    value={form.estimated_minutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimated_minutes: Number(e.target.value),
                      })
                    }
                    className="w-full border rounded-xl p-3 mt-2"
                  />
                </div>

              </div>

              <div>
                <label className="text-sm font-medium">
                  Learning Status
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                  className="w-full border rounded-xl p-3 mt-2"
                >
                  {topicStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Target Date
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
                  className="border px-5 py-3 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  className="bg-indigo-600 text-white px-5 py-3 rounded-xl disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Update Topic'
                      : 'Save Topic'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}

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

      <p className="text-sm text-slate-500 mt-4">
        {label}
      </p>

      <h3 className="text-3xl font-bold mt-1">
        {value}
      </h3>
    </div>
  )
}
