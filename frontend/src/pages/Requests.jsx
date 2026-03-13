import React, { useState, useEffect, useCallback } from 'react';
import { requestsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import toast from 'react-hot-toast';
import './Requests.css';

const statusConfig = {
  requested: { label: 'Requested', color: '#f9e2af', bg: 'rgba(249, 226, 175, 0.15)' },
  reviewing: { label: 'Reviewing', color: '#89b4fa', bg: 'rgba(137, 180, 250, 0.15)' },
  chatting: { label: 'Chatting', color: '#a6e3a1', bg: 'rgba(166, 227, 161, 0.15)' },
  contact_shared: { label: 'Contact Shared', color: '#cba6f7', bg: 'rgba(203, 166, 247, 0.15)' },
  completed: { label: 'Completed', color: '#94e2d5', bg: 'rgba(148, 226, 213, 0.15)' },
  cancelled: { label: 'Cancelled', color: '#f38ba8', bg: 'rgba(243, 139, 168, 0.15)' }
};

const StatusTracker = ({ status, activity }) => {
  const steps = ['requested', 'reviewing', 'chatting', 'contact_shared', 'completed'];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="status-tracker">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className={`tracker-step ${index <= currentIndex ? 'active' : ''} ${index < currentIndex ? 'completed' : ''}`}>
            <div className="step-dot">
              {index < currentIndex && <span>✓</span>}
            </div>
            <span className="step-label">{statusConfig[step]?.label || step}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`tracker-line ${index < currentIndex ? 'active' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const ActivityTimeline = ({ activities }) => {
  return (
    <div className="activity-timeline">
      {activities?.map((item, index) => (
        <div key={index} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-action">{item.action.replace('_', ' ')}</div>
            <div className="timeline-description">{item.description}</div>
            <div className="timeline-time">
              {new Date(item.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const RequestCard = ({ request, userRole, onAccept, onView, onComplete }) => {
  const status = statusConfig[request.status] || { label: request.status, color: '#6c7086', bg: 'rgba(108, 112, 134, 0.15)' };

  return (
    <div className="request-card">
      <div className="request-header">
        <div className="request-info">
          <h3 className="request-title">{request.title}</h3>
          <div className="request-meta">
            <span className="category-badge">{request.category}</span>
            {request.budget && <span className="budget">Budget: {request.budget}</span>}
          </div>
        </div>
        <div className="request-status" style={{ background: status.bg, color: status.color }}>
          {status.label}
        </div>
      </div>

      {request.description && (
        <p className="request-description">{request.description}</p>
      )}

      <div className="request-parties">
        {userRole === 'customer' && request.provider && (
          <div className="party-info">
            <span className="party-label">Provider:</span>
            <span className="party-name">{request.provider.name}</span>
            {request.provider.averageRating > 0 && (
              <span className="rating">⭐ {request.provider.averageRating.toFixed(1)}</span>
            )}
          </div>
        )}
        {userRole === 'provider' && request.customer && (
          <div className="party-info">
            <span className="party-label">Customer:</span>
            <span className="party-name">{request.customer.name}</span>
          </div>
        )}
      </div>

      {userRole === 'provider' && request.status === 'requested' && (
        <div className="request-actions">
          <button className="btn btn-primary" onClick={() => onAccept(request._id)}>
            Accept Request
          </button>
          <button className="btn btn-ghost" onClick={() => onView(request._id)}>
            View Details
          </button>
        </div>
      )}

      {userRole === 'customer' && request.status === 'contact_shared' && (
        <div className="request-actions">
          <button className="btn btn-primary" onClick={() => onComplete(request._id)}>
            Mark as Completed
          </button>
        </div>
      )}

      <div className="request-footer">
        <span className="viewers-count">
          {request.viewedBy?.length || 0} viewed
        </span>
        <span className="request-time">
          {new Date(request.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

const CreateRequestModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'developer',
    budget: '',
    timeline: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
    setFormData({ title: '', description: '', category: 'developer', budget: '', timeline: '' });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content request-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Request</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Need a React developer"
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
              <option value="marketer">Marketer</option>
              <option value="writer">Writer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what you need..."
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Budget</label>
              <input
                type="text"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g., $500"
              />
            </div>
            <div className="form-group">
              <label>Timeline</label>
              <input
                type="text"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                placeholder="e.g., 1 week"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !formData.title}>
              {loading ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await requestsAPI.getAll(params);
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchStats = async () => {
    try {
      const { data } = await requestsAPI.getStats();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStats();

    const socket = getSocket();
    if (socket) {
      socket.on('new_request', (request) => {
        if (user?.role === 'provider') {
          setRequests(prev => [request, ...prev]);
        }
      });

      socket.on('request_accepted', (request) => {
        setRequests(prev => prev.map(r => r._id === request._id ? request : r));
      });

      socket.on('request_updated', (request) => {
        setRequests(prev => prev.map(r => r._id === request._id ? request : r));
      });

      return () => {
        socket.off('new_request');
        socket.off('request_accepted');
        socket.off('request_updated');
      };
    }
  }, [fetchRequests, user?.role]);

  const handleCreateRequest = async (formData) => {
    try {
      await requestsAPI.create(formData);
      toast.success('Request created!');
      setShowCreate(false);
      fetchRequests();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create request');
    }
  };

  const handleAccept = async (id) => {
    try {
      await requestsAPI.accept(id);
      toast.success('Request accepted!');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept request');
    }
  };

  const handleComplete = async (id) => {
    try {
      await requestsAPI.updateStatus(id, { status: 'completed' });
      toast.success('Request completed!');
      fetchRequests();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete request');
    }
  };

  const handleViewRequest = async (id) => {
    try {
      const { data } = await requestsAPI.getOne(id);
      setSelectedRequest(data.request);
      if (user?.role === 'provider') {
        await requestsAPI.view(id);
      }
    } catch (err) {
      toast.error('Failed to load request details');
    }
  };

  if (loading) {
    return (
      <div className="requests-page">
        <div className="loader-container">
          <div className="loader-ring" />
          <p>Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="requests-page">
      <div className="requests-container">
        <div className="requests-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => window.history.back()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1>Requests</h1>
          </div>
          {user?.role === 'customer' && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + New Request
            </button>
          )}
        </div>

        {stats && (
          <div className="stats-cards">
            <div className="stat-card">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.byStatus?.requested || 0}</span>
              <span className="stat-label">Requested</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.byStatus?.chatting || 0}</span>
              <span className="stat-label">In Progress</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.byStatus?.completed || 0}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        )}

        <div className="filter-tabs">
          {['all', 'requested', 'reviewing', 'chatting', 'contact_shared', 'completed'].map(status => (
            <button
              key={status}
              className={`filter-tab ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {statusConfig[status]?.label || status}
            </button>
          ))}
        </div>

        <div className="requests-list">
          {requests.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📝</span>
              <h3>No requests found</h3>
              <p>Create your first request to get started</p>
            </div>
          ) : (
            requests.map(request => (
              <RequestCard
                key={request._id}
                request={request}
                userRole={user?.role}
                onAccept={handleAccept}
                onView={handleViewRequest}
                onComplete={handleComplete}
              />
            ))
          )}
        </div>
      </div>

      <CreateRequestModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateRequest}
      />

      {selectedRequest && (
        <div className="modal-backdrop" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content request-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRequest.title}</h2>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>✕</button>
            </div>

            <div className="request-detail-status">
              <StatusTracker status={selectedRequest.status} activity={selectedRequest.activity} />
            </div>

            <div className="request-detail-body">
              <div className="detail-section">
                <h4>Description</h4>
                <p>{selectedRequest.description || 'No description provided'}</p>
              </div>

              {selectedRequest.category && (
                <div className="detail-section">
                  <h4>Category</h4>
                  <span className="category-badge">{selectedRequest.category}</span>
                </div>
              )}

              {(selectedRequest.budget || selectedRequest.timeline) && (
                <div className="detail-row">
                  {selectedRequest.budget && (
                    <div className="detail-section">
                      <h4>Budget</h4>
                      <p>{selectedRequest.budget}</p>
                    </div>
                  )}
                  {selectedRequest.timeline && (
                    <div className="detail-section">
                      <h4>Timeline</h4>
                      <p>{selectedRequest.timeline}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedRequest.activity?.length > 0 && (
                <div className="detail-section">
                  <h4>Activity</h4>
                  <ActivityTimeline activities={selectedRequest.activity} />
                </div>
              )}
            </div>

            <div className="modal-actions">
              {user?.role === 'provider' && selectedRequest.status === 'requested' && (
                <button className="btn btn-primary" onClick={() => {
                  handleAccept(selectedRequest._id);
                  setSelectedRequest(null);
                }}>
                  Accept Request
                </button>
              )}
              {user?.role === 'customer' && selectedRequest.status === 'contact_shared' && (
                <button className="btn btn-primary" onClick={() => {
                  handleComplete(selectedRequest._id);
                  setSelectedRequest(null);
                }}>
                  Mark as Completed
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setSelectedRequest(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
