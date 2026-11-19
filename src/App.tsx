import Technologies from './pages/Technologies'
import Roadmap from './pages/Roadmap'
import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  BookOpen,
  Clock,
  Code2,
  LayoutDashboard,
  LogOut,
  Plus,
  Trash2,
  TrendingUp,
  GraduationCap,
  Lock,
  Mail,
  CalendarDays,
  LoaderCircle,
} from 'lucide-react'
import { supabase } from './lib/supabase'

type StudySession = {
  id: string
  title: string
  duration_minutes: number
  studied_on: string
  created_at: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('60')
  const [date, setDate] = useState(() => {
    const now = new Date()
    const localDate = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    )
    return localDate.toISOString().slice(0, 10)
  })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  // Check current authentication
  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      const { data } = await supabase.auth.getSession()

      if (mounted) {
        setUser(data.session?.user ?? null)
        setLoading(false)
      }
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Load the current user's study sessions
  useEffect(() => {
    if (!user) {
      setSessions([])
      return
    }

    const loadSessions = async () => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select(
          'id, title, duration_minutes, studied_on, created_at'
        )
        .order('studied_on', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        setMessage(error.message)
        return
      }

      setSessions((data ?? []) as StudySession[])
    }

    void loadSessions()
  }, [user])

  // Register or log in
  const handleAuth = async (e: FormEvent) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name,
            },
          },
        })

        if (error) throw error

        if (!data.session) {
          setMessage(
            'Account created! Check your email to confirm your account.'
          )
        } else {
          setMessage('Welcome to StudyTrack!')
        }
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          })

        if (error) throw error
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Authentication failed.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Save a study session
  const addSession = async (e: FormEvent) => {
    e.preventDefault()

    if (!user || !title.trim()) return

    const minutes = Number(duration)

    if (!Number.isInteger(minutes) || minutes <= 0) {
      setMessage('Enter a valid study duration.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          title: title.trim(),
          duration_minutes: minutes,
          studied_on: date,
        })

      if (error) throw error

      setTitle('')
      setDuration('60')
      setMessage('Study session saved successfully!')

      const { data, error: fetchError } = await supabase
        .from('study_sessions')
        .select(
          'id, title, duration_minutes, studied_on, created_at'
        )
        .order('studied_on', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setSessions((data ?? []) as StudySession[])
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save study session.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Delete a study session
  const deleteSession = async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    setSessions((previous) =>
      previous.filter((session) => session.id !== id)
    )

    setMessage('Study session deleted.')
  }

  // Log out
  const logout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    }
  }

  const totalMinutes = sessions.reduce(
    (total, session) => total + session.duration_minutes,
    0
  )

  const totalHours = (totalMinutes / 60).toFixed(1)

  const averageMinutes =
    sessions.length > 0
      ? Math.round(totalMinutes / sessions.length)
      : 0

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'Student'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderCircle className="animate-spin text-indigo-600" size={32} />
      </div>
    )
  }

  // ===================================
  // LOGIN AND REGISTRATION
  // ===================================

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-5">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">

          <div className="flex items-center gap-3 mb-8">
            <div className="bg-indigo-600 text-white p-3 rounded-xl">
              <GraduationCap size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                StudyTrack
              </h1>
              <p className="text-sm text-slate-500">
                Your personal learning journey
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">
            {authMode === 'login'
              ? 'Welcome back!'
              : 'Create your account'}
          </h2>

          <p className="text-slate-500 text-sm mb-7">
            {authMode === 'login'
              ? 'Sign in to continue your learning journey.'
              : 'Start tracking your learning progress today.'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">

            {authMode === 'signup' && (
              <div>
                <label className="text-sm font-medium">
                  Full name
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full mt-2 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium">
                Email address
              </label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                Password
              </label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  required
                  minLength={6}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {message && (
              <p className="text-sm text-indigo-600">
                {message}
              </p>
            )}

            <button
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white p-3 rounded-xl font-semibold"
            >
              {saving
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {authMode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}
            <button
              onClick={() => {
                setAuthMode(
                  authMode === 'login' ? 'signup' : 'login'
                )
                setMessage('')
              }}
              className="text-indigo-600 font-semibold ml-2"
            >
              {authMode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>

        </div>
      </div>
    )
  }

  // ===================================
  // MAIN DASHBOARD
  // ===================================

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-white border-r flex-col p-6">

        <div className="flex items-center gap-3 mb-12">
          <div className="bg-indigo-600 text-white p-2 rounded-xl">
            <GraduationCap size={25} />
          </div>
          <span className="text-xl font-bold">
            StudyTrack
          </span>
        </div>

        <p className="text-xs text-slate-400 font-bold mb-4">
          WORKSPACE
        </p>

        <div className="space-y-2">
          <button
            onClick={() => setActivePage('dashboard')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-semibold ${
              activePage === 'dashboard'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button
            onClick={() => setActivePage('technologies')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-semibold ${
              activePage === 'technologies'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Code2 size={20} />
            My Technologies
          </button>

          <button
            onClick={() => setActivePage('roadmap')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-semibold ${
              activePage === 'roadmap'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <BookOpen size={20} />
            Learning Roadmap
          </button>
        </div>

        <div className="mt-auto">
          <div className="border-t pt-5">
            <p className="font-semibold text-sm">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user.email}
            </p>

            <button
              onClick={logout}
              className="flex items-center gap-2 text-red-500 mt-5 text-sm hover:text-red-700"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full">

        <header className="flex flex-wrap justify-between items-center gap-4 mb-10">
          <div>
            <p className="text-sm text-slate-500">
              Your learning workspace
            </p>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              Dashboard
            </h1>
          </div>

          <button
            onClick={logout}
            className="md:hidden flex items-center gap-2 text-red-500"
          >
            <LogOut size={18} />
            Logout
          </button>
        </header>

        {activePage === 'dashboard' ? (
          <>
        <section className="mb-8">
          <h2 className="text-xl font-bold">
            Welcome back, {displayName}!
          </h2>
          <p className="text-slate-500 mt-1">
            Every study session brings you closer to your goals.
          </p>
        </section>

        {/* STATISTICS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">

          <StatCard
            icon={<Clock size={22} />}
            label="Total Study Hours"
            value={`${totalHours} hrs`}
            color="bg-blue-100 text-blue-600"
          />

          <StatCard
            icon={<BookOpen size={22} />}
            label="Study Sessions"
            value={String(sessions.length)}
            color="bg-purple-100 text-purple-600"
          />

          <StatCard
            icon={<TrendingUp size={22} />}
            label="Average Session"
            value={`${averageMinutes} min`}
            color="bg-green-100 text-green-600"
          />

        </section>

        {/* ADD STUDY SESSION */}
        <section className="bg-white border rounded-2xl p-6 mb-8 shadow-sm">

          <div className="flex items-center gap-2 mb-6">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
              <Plus size={20} />
            </div>
            <h2 className="text-lg font-bold">
              Record Study Session
            </h2>
          </div>

          <form onSubmit={addSession}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="md:col-span-1">
                <label className="text-sm font-medium">
                  What did you study?
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. React Hooks"
                  className="w-full mt-2 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Duration (minutes)
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full mt-2 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Study date
                </label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full mt-2 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

            </div>

            <div className="flex justify-end mt-5">
              <button
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
              >
                <Plus size={18} />
                {saving ? 'Saving...' : 'Save Session'}
              </button>
            </div>
          </form>

          {message && (
            <p className="text-sm text-indigo-600 mt-4">
              {message}
            </p>
          )}

        </section>

        {/* RECENT SESSIONS */}
        <section className="bg-white border rounded-2xl p-6 shadow-sm">

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold">
                Recent Study Sessions
              </h2>
              <p className="text-sm text-slate-500">
                Your latest learning activities
              </p>
            </div>
            <CalendarDays className="text-slate-400" />
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen
                size={40}
                className="mx-auto text-slate-300 mb-3"
              />
              <p className="font-semibold text-slate-600">
                No study sessions yet
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Record your first learning activity above.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 py-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
                      <BookOpen size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {session.studied_on}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-indigo-600">
                      {session.duration_minutes} min
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSession(session.id)}
                      title="Delete session"
                      className="text-slate-400 hover:text-red-500 p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>

        <footer className="text-center text-xs text-slate-400 mt-10">
          StudyTrack © 2026 · Keep learning, keep growing.
        </footer>
          </>
        ) : activePage === 'technologies' ? (
          <Technologies />
        ) : activePage === 'roadmap' ? (
          <Roadmap />
        ) : null}

      </main>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white border rounded-2xl p-6 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 mt-5">
        {label}
      </p>
      <h3 className="text-3xl font-bold mt-1">
        {value}
      </h3>
    </div>
  )
}

export default App
