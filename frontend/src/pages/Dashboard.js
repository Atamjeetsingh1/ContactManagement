import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { contactsAPI } from '../services/api';
import ContactCard from '../components/ContactCard';
import ContactModal from '../components/ContactModal';
import toast from 'react-hot-toast';
import './Dashboard.css';

const CATEGORIES = ['all', 'personal', 'work', 'family', 'friend', 'other'];

const StatCard = ({ label, value, color, icon }) => (
  <div className="stat-card" style={{ '--accent': color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const Dashboard = () => {
  const { user, logout } = useAuth();

  // Contacts state
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({ total: 0, favorites: 0, byCategory: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter / search state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // UI state
  const [modalOpen, setModalOpen] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [selected, setSelected] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name } or 'bulk'

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, category, sortBy, order: sortOrder };
      if (showFavorites) params.favorite = 'true';

      const [contactsRes, statsRes] = await Promise.all([
        contactsAPI.getAll(params),
        contactsAPI.getStats()
      ]);

      setContacts(contactsRes.data.contacts);
      setStats(statsRes.data.stats);
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [search, category, sortBy, sortOrder, showFavorites]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Handle modal open for create
  const handleCreate = () => {
    setEditContact(null);
    setModalOpen(true);
  };

  // Handle modal open for edit
  const handleEdit = (contact) => {
    setEditContact(contact);
    setModalOpen(true);
  };

  // Save contact (create or update)
  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editContact?._id) {
        const { data } = await contactsAPI.update(editContact._id, formData);
        setContacts(prev => prev.map(c => c._id === editContact._id ? data.contact : c));
        toast.success('Contact updated!');
      } else {
        const { data } = await contactsAPI.create(formData);
        setContacts(prev => [data.contact, ...prev]);
        setStats(prev => ({ ...prev, total: prev.total + 1 }));
        toast.success('Contact created!');
      }
      setModalOpen(false);
      setEditContact(null);
      fetchContacts(); // Refresh stats
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  // Confirm delete single
  const handleDeleteRequest = (id, name) => {
    setConfirmDelete({ id, name });
  };

  // Execute delete single
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await contactsAPI.delete(confirmDelete.id);
      setContacts(prev => prev.filter(c => c._id !== confirmDelete.id));
      setSelected(prev => prev.filter(s => s !== confirmDelete.id));
      toast.success('Contact deleted');
      fetchContacts();
    } catch {
      toast.error('Failed to delete contact');
    } finally {
      setConfirmDelete(null);
    }
  };

  // Delete selected (bulk)
  const handleBulkDelete = async () => {
    setConfirmDelete('bulk');
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      await contactsAPI.deleteMany(selected);
      setContacts(prev => prev.filter(c => !selected.includes(c._id)));
      toast.success(`${selected.length} contacts deleted`);
      setSelected([]);
      fetchContacts();
    } catch {
      toast.error('Failed to delete contacts');
    } finally {
      setConfirmDelete(null);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id) => {
    try {
      const { data } = await contactsAPI.toggleFavorite(id);
      setContacts(prev => prev.map(c => c._id === id ? { ...c, isFavorite: data.isFavorite } : c));
      toast.success(data.isFavorite ? 'Added to favorites ⭐' : 'Removed from favorites');
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  // Selection
  const handleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selected.length === contacts.length) setSelected([]);
    else setSelected(contacts.map(c => c._id));
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const categoryCount = (cat) => {
    if (cat === 'all') return stats.total;
    return stats.byCategory?.[cat] || 0;
  };

  return (
    <div className="dashboard">
      {/* ─── Sidebar ─────────────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="logo-text">ContactHub</span>
        </div>

        {/* Stats */}
        <div className="sidebar-stats">
          <div className="sidebar-stat">
            <span className="sidebar-stat-value">{stats.total}</span>
            <span className="sidebar-stat-label">Total Contacts</span>
          </div>
          <div className="sidebar-stat">
            <span className="sidebar-stat-value">{stats.favorites}</span>
            <span className="sidebar-stat-label">Favorites</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Filters</div>

          <button
            className={`sidebar-item ${!showFavorites && category === 'all' ? 'active' : ''}`}
            onClick={() => { setCategory('all'); setShowFavorites(false); setSidebarOpen(false); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            All Contacts
            <span className="sidebar-count">{stats.total}</span>
          </button>

          <button
            className={`sidebar-item ${showFavorites ? 'active' : ''}`}
            onClick={() => { setShowFavorites(true); setCategory('all'); setSidebarOpen(false); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={showFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Favorites
            <span className="sidebar-count">{stats.favorites}</span>
          </button>

          <div className="sidebar-section-label" style={{ marginTop: 12 }}>Categories</div>

          {CATEGORIES.filter(c => c !== 'all').map(cat => (
            <button
              key={cat}
              className={`sidebar-item ${!showFavorites && category === cat ? 'active' : ''}`}
              onClick={() => { setCategory(cat); setShowFavorites(false); setSidebarOpen(false); }}
            >
              <span className="cat-dot" data-cat={cat} />
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
              <span className="sidebar-count">{stats.byCategory?.[cat] || 0}</span>
            </button>
          ))}
        </nav>

        {/* User at bottom */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
          <button className="btn-icon" onClick={handleLogout} title="Logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ─── Main Content ─────────────────────────────────────────────────────────── */}
      <main className="main">
        {/* Top Bar */}
        <header className="topbar">
          <button className="topbar-menu btn-icon" onClick={() => setSidebarOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="search-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, email, phone, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <button className="btn btn-primary create-btn" onClick={handleCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Contact
          </button>
        </header>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            {/* Select All */}
            {contacts.length > 0 && (
              <label className="select-all-wrap">
                <div
                  className={`checkbox ${selected.length === contacts.length && contacts.length > 0 ? 'checked' : ''}`}
                  onClick={handleSelectAll}
                  style={{ cursor: 'pointer' }}
                >
                  {selected.length === contacts.length && contacts.length > 0 && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                {selected.length > 0 && (
                  <span className="selected-label">{selected.length} selected</span>
                )}
              </label>
            )}

            {selected.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
                Delete {selected.length}
              </button>
            )}
          </div>

          <div className="toolbar-right">
            <select
              className="sort-select"
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [s, o] = e.target.value.split(':');
                setSortBy(s);
                setSortOrder(o);
              }}
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="firstName:asc">Name A→Z</option>
              <option value="firstName:desc">Name Z→A</option>
              <option value="updatedAt:desc">Recently updated</option>
            </select>
            <span className="contact-count">
              {loading ? '...' : `${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Contact List */}
        <div className="contacts-area">
          {loading ? (
            <div className="empty-state">
              <div className="loader-ring" />
              <p>Loading contacts...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {search ? (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                )}
              </div>
              <h3>{search ? 'No results found' : 'No contacts yet'}</h3>
              <p>{search ? `No contacts match "${search}"` : 'Create your first contact to get started'}</p>
              {!search && (
                <button className="btn btn-primary" onClick={handleCreate} style={{ marginTop: 16 }}>
                  Add your first contact
                </button>
              )}
            </div>
          ) : (
            <div className="contacts-list">
              {contacts.map(contact => (
                <ContactCard
                  key={contact._id}
                  contact={contact}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                  onToggleFavorite={handleToggleFavorite}
                  selected={selected.includes(contact._id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ─── Contact Modal ──────────────────────────────────────────────────────── */}
      {modalOpen && (
        <ContactModal
          contact={editContact}
          onClose={() => { setModalOpen(false); setEditContact(null); }}
          onSave={handleSave}
          loading={saving}
        />
      )}

      {/* ─── Delete Confirm Dialog ──────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="confirm-dialog">
            <div className="confirm-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <h3>
              {confirmDelete === 'bulk'
                ? `Delete ${selected.length} contacts?`
                : `Delete ${confirmDelete.name}?`}
            </h3>
            <p>This action cannot be undone.</p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete === 'bulk' ? handleBulkDeleteConfirm : handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;