import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../services/api';
import './ChatUsers.css';

export default function ChatUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await chatAPI.getUsers();
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);


  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="chat-users-page">
        <div className="chat-users-loader">
          <div className="loader-ring" />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-users-page">
      <div className="chat-users-container">
        {/* Header */}
        <div className="chat-users-header">
          <button className="chat-users-back" onClick={() => navigate('/dashboard')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="chat-users-title">
            <h2>💬 Chat</h2>
            <span className="chat-users-subtitle">{users.length} user{users.length !== 1 ? 's' : ''} available</span>
          </div>
        </div>

        {/* Search */}
        <div className="chat-users-search-wrap">
          <svg className="chat-users-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="chat-users-search"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="chat-users-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* User List */}
        <div className="chat-users-list">
          {filtered.length === 0 ? (
            <div className="chat-users-empty">
              <p>{search ? `No users match "${search}"` : 'No other users registered yet'}</p>
            </div>
          ) : (
            filtered.map(u => (
              <div
                key={u._id}
                className="chat-user-card"
                onClick={() => navigate(`/chat/${u._id}`)}
              >
                <div className="chat-user-avatar">
                  {u.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="chat-user-info">
                  <div className="chat-user-name">{u.name}</div>
                  <div className="chat-user-email">{u.email}</div>
                </div>
                <svg className="chat-user-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
