import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, UserPlus, Send, X, CheckCircle2, AlertTriangle,
  Loader2, Clock, Users, Ban
} from 'lucide-react'
import { toast } from 'sonner'
import { useParentalControls } from '../context/ParentalControlContext'

const InvitationManager = () => {
  const {
    isParent, isChild, familyGroup, pendingInvitations,
    sentInvitations, createInvitation, respondToInvitation
  } = useParentalControls()
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [childName, setChildName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [responding, setResponding] = useState(null)

  const handleSendInvite = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Enter the child\'s email')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address')
      return
    }
    if (!childName.trim()) {
      toast.error('Enter the child\'s name')
      return
    }

    setSending(true)
    try {
      await createInvitation({
        childEmail: email.trim(),
        childName: childName.trim(),
        message: message.trim() || null,
      })
      toast.success('Invitation sent!')
      setEmail('')
      setChildName('')
      setMessage('')
      setShowForm(false)
    } catch (err) {
      toast.error(err.message || 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  const handleRespond = async (invitationId, status) => {
    setResponding(invitationId)
    try {
      await respondToInvitation({ invitationId, status })
      toast.success(status === 'accepted' ? 'Invitation accepted!' : 'Invitation declined')
    } catch (err) {
      toast.error(err.message || 'Failed to respond')
    } finally {
      setResponding(null)
    }
  }

  // Show pending invitations for any user who has them
  if (!isParent && pendingInvitations.length > 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Family Invitations
        </h3>
        {pendingInvitations.map((inv) => (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-5 border border-border"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">
                  Invitation to <span className="text-primary">{inv.family_groups?.name || 'Family Group'}</span>
                </p>
                {inv.child_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">Added as: {inv.child_name}</p>
                )}
                {inv.message && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{inv.message}"</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                  Sent {new Date(inv.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleRespond(inv.id, 'accepted')}
                disabled={responding === inv.id}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {responding === inv.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Accept
              </button>
              <button
                onClick={() => handleRespond(inv.id, 'declined')}
                disabled={responding === inv.id}
                className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-muted/80 transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Decline
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  // Parent view: invitation form
  if (!isParent || !familyGroup) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Mail className="w-5 h-5 text-amber-500" />
          Invite Family Members
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-secondary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Invite by Email'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSendInvite}
            className="bg-muted/30 rounded-2xl p-5 space-y-4 overflow-hidden"
          >
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Child's Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input pl-10"
                  placeholder="child.email@example.com"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Child's Name *</label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="auth-input"
                  placeholder="Enter child name"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-primary w-full justify-center py-3 rounded-xl font-bold flex items-center gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Invitation
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="auth-input min-h-[60px] resize-none"
                placeholder="Add a personal message..."
              />
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Sent invitations list */}
      {sentInvitations.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Sent Invitations ({sentInvitations.length})
          </h4>
          <div className="space-y-2">
            {sentInvitations.slice(0, 10).map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between bg-muted/20 rounded-xl px-4 py-3 border border-border/60"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {inv.child_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{inv.child_email}</p>
                  {inv.message && (
                    <p className="text-[10px] text-muted-foreground/60 italic mt-0.5 truncate">
                      "{inv.message}"
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  {inv.status === 'pending' && (
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                  {inv.status === 'accepted' && (
                    <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Accepted
                    </span>
                  )}
                  {inv.status === 'declined' && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Ban className="w-3 h-3" /> Declined
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default InvitationManager
