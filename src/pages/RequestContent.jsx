import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Film, Tv, BookOpen, Loader2, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

const types = [
  { id: 'movie', label: 'Movie', icon: Film },
  { id: 'series', label: 'Series', icon: Tv },
  { id: 'book', label: 'Book', icon: BookOpen },
]

export default function RequestContent() {
  const [contentType, setContentType] = useState('movie')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required'); return }
    if (!/^[a-zA-Z]/.test(title.trim())) { toast.error('Title must start with a letter'); return }

    setSending(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { error } = await supabase.from('content_requests').insert({
        content_type: contentType,
        title: title.trim(),
        description: description.trim() || null,
        reason: reason.trim() || null,
        user_id: currentUser?.id,
      })
      if (error) throw error
      setSent(true)
      toast.success('Request submitted! Admin will review it.')
    } catch (err) {
      toast.error(err.message || 'Failed to submit request')
    } finally { setSending(false) }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 mb-5">
            <CheckCircle className="h-7 w-7 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Request Sent!</h1>
          <p className="text-sm text-muted-foreground mb-6">Your request has been submitted. Admin will review it and add the content if approved.</p>
          <Link to="/" className="inline-flex items-center justify-center w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 transition-opacity">Back to Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-foreground">Ocean of Movies</Link>
        </div>

        <div className="border border-border bg-card rounded-xl p-6">
          <h1 className="text-xl font-bold text-foreground mb-1">Request Content</h1>
          <p className="text-sm text-muted-foreground mb-6">Suggest a movie, series, or book you'd like added</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Type</label>
              <div className="flex gap-2">
                {types.map(t => (
                  <button key={t.id} type="button" onClick={() => setContentType(t.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${contentType === t.id ? 'bg-primary text-on-primary border-primary' : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:bg-muted'}`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter the title" className="w-full rounded-lg border border-border bg-transparent py-2.5 px-3.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px] focus:shadow-primary/15" required />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the content" rows={3} className="w-full rounded-lg border border-border bg-transparent py-2.5 px-3.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px] focus:shadow-primary/15 min-h-[80px] resize-none" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Why should we add it?</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell us why you want this content" rows={2} className="w-full rounded-lg border border-border bg-transparent py-2.5 px-3.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px] focus:shadow-primary/15 min-h-[60px] resize-none" />
            </div>

            <button type="submit" disabled={sending} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link to="/" className="font-semibold text-primary">Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
