import React, { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Providers.css';

const ProviderCard = ({ provider, isFavorite, onToggleFavorite, onMessage }) => {
  return (
    <div className="provider-card">
      <div className="provider-header">
        <div className="provider-avatar">
          {provider.avatar ? (
            <img src={provider.avatar} alt={provider.name} />
          ) : (
            provider.name?.[0]?.toUpperCase()
          )}
          {provider.isOnline && <div className="online-indicator" />}
        </div>
        <div className="provider-info">
          <h3 className="provider-name">
            {provider.name}
            {provider.averageRating >= 4 && (
              <span className="trust-badge" title="Top Rated">✓</span>
            )}
          </h3>
          {provider.providerProfile?.title && (
            <p className="provider-title">{provider.providerProfile.title}</p>
          )}
        </div>
        <button 
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(provider._id)}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      {provider.providerProfile?.bio && (
        <p className="provider-bio">{provider.providerProfile.bio}</p>
      )}

      <div className="provider-skills">
        {provider.providerProfile?.skills?.slice(0, 4).map((skill, i) => (
          <span key={i} className="skill-tag">{skill}</span>
        ))}
      </div>

      <div className="provider-stats">
        <div className="stat">
          <span className="stat-value">
            {provider.averageRating > 0 ? `⭐ ${provider.averageRating.toFixed(1)}` : 'New'}
          </span>
          <span className="stat-label">Rating</span>
        </div>
        <div className="stat">
          <span className="stat-value">{provider.totalContactsShared || 0}</span>
          <span className="stat-label">Contacts</span>
        </div>
        <div className="stat">
          <span className="stat-value">{provider.successfulRequests || 0}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>

      {provider.providerProfile?.location && (
        <div className="provider-location">
          📍 {provider.providerProfile.location}
        </div>
      )}

      <div className="provider-actions">
        <button className="btn btn-primary" onClick={() => onMessage(provider._id)}>
          Message
        </button>
      </div>
    </div>
  );
};

const Providers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [favorites, setFavorites] = useState([]);
  
  const [filters, setFilters] = useState({
    search: '',
    skill: '',
    category: '',
    location: '',
    minRating: '',
    available: false,
    sortBy: 'topRated'
  });

  const fetchProviders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 12, ...filters };
      const { data } = await usersAPI.getProviders(params);
      setProviders(data.providers);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = async () => {
    try {
      const { data } = await usersAPI.getProviderStats();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      const { data } = await usersAPI.getFavorites();
      setFavorites(data.favorites.map(f => f._id));
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    }
  };

  useEffect(() => {
    fetchProviders();
    fetchStats();
    fetchFavorites();
  }, [fetchProviders, user]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProviders(1);
  };

  const handleToggleFavorite = async (providerId) => {
    if (!user) {
      toast.error('Please login to add favorites');
      return;
    }
    try {
      const { data } = await usersAPI.toggleFavorite(providerId);
      if (data.isFavorite) {
        setFavorites(prev => [...prev, providerId]);
        toast.success('Added to favorites!');
      } else {
        setFavorites(prev => prev.filter(id => id !== providerId));
        toast.success('Removed from favorites');
      }
    } catch (err) {
      toast.error('Failed to update favorite');
    }
  };

  const handleMessage = (providerId) => {
    if (!user) {
      toast.error('Please login first');
      return;
    }
    navigate(`/chat/${providerId}`);
  };

  const handlePageChange = (newPage) => {
    fetchProviders(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="providers-page">
      <div className="providers-container">
        <div className="providers-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/dashboard')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1>Discover Providers</h1>
          </div>
        </div>

        {stats && (
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-icon">👥</span>
              <span className="stat-text">{stats.totalProviders} Providers</span>
            </div>
            <div className="stat-item online">
              <span className="stat-icon">🟢</span>
              <span className="stat-text">{stats.onlineNow} Online Now</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <span className="stat-text">Top Rated Available</span>
            </div>
          </div>
        )}

        <form className="search-filters" onSubmit={handleSearch}>
          <div className="search-row">
            <div className="search-input-wrap">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name or skill..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
              <option value="marketer">Marketer</option>
              <option value="writer">Writer</option>
            </select>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            >
              <option value="topRated">Top Rated</option>
              <option value="mostContacts">Most Contacts</option>
              <option value="mostReviews">Most Reviews</option>
              <option value="recentlyActive">Recently Active</option>
            </select>
            <label className="available-filter">
              <input
                type="checkbox"
                checked={filters.available}
                onChange={(e) => setFilters({ ...filters, available: e.target.checked })}
              />
              Available Now
            </label>
            <button type="submit" className="btn btn-primary">Search</button>
          </div>
        </form>

        {loading ? (
          <div className="loader-container">
            <div className="loader-ring" />
            <p>Loading providers...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <h3>No providers found</h3>
            <p>Try adjusting your search filters</p>
          </div>
        ) : (
          <>
            <div className="providers-grid">
              {providers.map(provider => (
                <ProviderCard
                  key={provider._id}
                  provider={provider}
                  isFavorite={favorites.includes(provider._id)}
                  onToggleFavorite={handleToggleFavorite}
                  onMessage={handleMessage}
                />
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className="page-btn"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Providers;
