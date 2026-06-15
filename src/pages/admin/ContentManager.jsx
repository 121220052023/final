import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Search, Plus, X, Loader2, Star, Save, Trash2, ExternalLink, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'

const BooksManager = () => {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [form, setForm] = useState({
    title: '', author: '', description: '', isbn: '', page_count: '',
    published_date: '', publisher: '', cover_url: '', categories: '',
  })

  useEffect(() => { loadBooks() }, [])

  const loadBooks = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setBooks(data || [])
    } catch (err) {
      console.error('Error loading books:', err)
      toast.error('Failed to load books')
    } finally {
      setLoading(false)
    }
  }

  const handleCoverUpload = async (file) => {
    if (!file) return
    setUploadingCover(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `book-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setForm({ ...form, cover_url: publicUrl })
      toast.success('Cover image uploaded')
    } catch (err) {
      toast.error(err.message || 'Failed to upload image')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleAddBook = async (e) => {
    e.preventDefault()
    if (!form.title) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('books').insert({
        title: form.title,
        author: form.author || null,
        description: form.description || null,
        isbn: form.isbn || null,
        page_count: form.page_count ? parseInt(form.page_count) : null,
        published_date: form.published_date || null,
        publisher: form.publisher || null,
        cover_url: form.cover_url || null,
        categories: form.categories ? form.categories.split(',').map(c => c.trim()).filter(Boolean) : [],
      })
      if (error) throw error
      toast.success('Book added successfully')
      setShowAddModal(false)
      setForm({ title: '', author: '', description: '', isbn: '', page_count: '', published_date: '', publisher: '', cover_url: '', categories: '' })
      loadBooks()
    } catch (err) {
      toast.error(err.message || 'Failed to add book')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (bookId) => {
    if (!window.confirm('Delete this book permanently?')) return
    setDeleting(bookId)
    try {
      const { error } = await supabase.from('books').delete().eq('id', bookId)
      if (error) throw error
      setBooks(prev => prev.filter(b => b.id !== bookId))
      toast.success('Book deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const filteredBooks = books.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q) || (b.isbn || '').toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-background pt-28 pb-16">
      <div className="page-shell-wide">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between gap-6">
          <div>
            <div className="section-label">Administration</div>
            <h1 className="display-font mt-3 text-5xl font-bold leading-[0.92] md:text-6xl">
              Books Manager
            </h1>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Add, edit, and manage books in the platform database
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary h-11 px-5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Add Book
          </button>
        </motion.div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, author, or ISBN..." className="w-full p-3 pl-11 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold" />
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground/20 mx-auto" /></div>
          ) : filteredBooks.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{search ? 'No books match your search' : 'No books added yet'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {filteredBooks.map((book, i) => (
                <motion.div key={book.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-muted/30 rounded-xl p-4 border border-border hover:border-primary/30 transition-all">
                  <div className="flex gap-3">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-16 h-24 rounded-lg object-cover flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{book.title}</h3>
                      {book.author && <p className="text-xs text-muted-foreground truncate">{book.author}</p>}
                      {book.categories?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {book.categories.slice(0, 3).map(c => <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">{c}</span>)}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {book.page_count && <span>{book.page_count}p</span>}
                        {book.published_date && <span>{book.published_date}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(book.id)} disabled={deleting === book.id} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all disabled:opacity-50 self-start">
                      {deleting === book.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">{filteredBooks.length} books total</p>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Add New Book</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-all"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full p-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Author</label>
                  <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="w-full p-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">ISBN</label>
                  <input type="text" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} className="w-full p-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold min-h-[80px] resize-none" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Page Count</label>
                  <input type="number" value={form.page_count} onChange={(e) => setForm({ ...form, page_count: e.target.value })} className="w-full p-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Published Date</label>
                  <input type="text" value={form.published_date} onChange={(e) => setForm({ ...form, published_date: e.target.value })} placeholder="2024" className="w-full p-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Publisher</label>
                <input type="text" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className="w-full p-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Cover Image</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-3 bg-background border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-all font-bold text-sm text-muted-foreground hover:text-foreground">
                    <Upload className="w-4 h-4" />
                    {uploadingCover ? 'Uploading...' : 'Choose File'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = '' }} disabled={uploadingCover} />
                  </label>
                  {form.cover_url && (
                    <div className="relative group">
                      <img src={form.cover_url} alt="Preview" className="w-12 h-16 rounded-lg object-cover border border-border" />
                      <button type="button" onClick={() => setForm({ ...form, cover_url: '' })} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {!form.cover_url && !uploadingCover && <span className="text-xs text-muted-foreground">Or paste URL below</span>}
                </div>
                <input type="url" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." className="w-full p-3 mt-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Categories (comma-separated)</label>
                <input type="text" value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} placeholder="Fiction, Fantasy, Adventure" className="w-full p-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost flex-1 h-11 rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Adding...' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BooksManager
