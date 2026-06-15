import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, Mail, Lock, User, Eye, EyeOff, Crown, Shield,
  ArrowLeft, CheckCircle2, AlertTriangle, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'

const validateEmail = (email) => {
  if (!email) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address'
  return null
}

const validatePassword = (password) => {
  if (!password) return 'Password is required'
  if (password.length < 6) return 'Password must be at least 6 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain a number'
  return null
}

const validateUsername = (username) => {
  if (!username) return 'Username is required'
  if (username.length < 3) return 'Username must be at least 3 characters'
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Username can only contain letters, numbers, and hyphens'
  return null
}

const CreateAccount = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState('form')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    fullName: '',
    role: 'user',
  })
  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: null }))
  }

  const validate = () => {
    const newErrors = {}
    const emailErr = validateEmail(form.email)
    const passErr = validatePassword(form.password)
    const userErr = validateUsername(form.username)
    if (emailErr) newErrors.email = emailErr
    if (passErr) newErrors.password = passErr
    if (userErr) newErrors.username = userErr
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      // Create user via Supabase admin API (uses service_role)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            username: form.username,
            full_name: form.fullName || form.username,
            role: form.role,
          },
        },
      })

      if (authError) {
        if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
          setErrors({ email: 'This email is already registered. Use a different email.' })
          return
        }
        throw authError
      }

      if (authData?.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          username: form.username,
          full_name: form.fullName || form.username,
          email: form.email,
          role: form.role,
        })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }

        setStep('success')
        toast.success(`Account created for ${form.email}`)
      }
    } catch (err) {
      const msg = err.message || 'Failed to create account'
      if (msg.includes('email') || msg.includes('Email')) {
        setErrors({ email: msg })
      } else if (msg.includes('password') || msg.includes('Password')) {
        setErrors({ password: msg })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ email: '', password: '', username: '', fullName: '', role: 'user' })
    setErrors({})
    setStep('form')
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background pt-28">
        <div className="mx-auto max-w-md px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="editorial-panel rounded-[2rem] p-8 text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Account Created</h2>
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-semibold text-foreground">{form.email}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Role: <span className="font-semibold text-primary capitalize">{form.role}</span>
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/admin')} className="btn-primary w-full justify-center py-3.5 rounded-xl">
                Back to Dashboard
              </button>
              <button onClick={resetForm} className="btn-secondary w-full justify-center py-3.5 rounded-xl">
                Create Another Account
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-28">
      <div className="mx-auto max-w-md px-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate('/admin')}
            className="group mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="editorial-panel rounded-[2rem] p-6 sm:p-8"
        >
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
                <p className="text-sm text-muted-foreground">Set up a new user on the platform</p>
              </div>
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-[1.2rem] border border-red-500/20 bg-red-500/8 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-400 space-y-1">
                  {Object.values(errors).filter(Boolean).map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`auth-input pl-11 ${errors.email ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
                  placeholder="your.email@example.com"
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`auth-input pl-11 pr-12 ${errors.password ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    className={`auth-input pl-11 ${errors.username ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
                    placeholder="your.username"
                  />
                </div>
                {errors.username && <p className="mt-1.5 text-xs text-red-400">{errors.username}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className="auth-input pl-11"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Role</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'user', label: 'User', icon: User, desc: 'Regular viewer' },
                  { value: 'parent', label: 'Parent', icon: Crown, desc: 'Family manager' },
                  { value: 'admin', label: 'Admin', icon: Shield, desc: 'Full access' },
                ].map((option) => {
                  const Icon = option.icon
                  const selected = form.role === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('role', option.value)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background hover:border-primary/30'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1.5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className={`text-sm font-bold ${selected ? 'text-primary' : 'text-foreground'}`}>{option.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{option.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 rounded-xl mt-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create {form.role === 'admin' ? 'Admin' : form.role === 'parent' ? 'Parent' : 'User'} Account
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default CreateAccount
