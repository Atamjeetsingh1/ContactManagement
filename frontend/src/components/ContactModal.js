import React, { useState, useEffect } from 'react';
import './ContactModal.css';

const CATEGORIES = ['personal', 'work', 'family', 'friend', 'other'];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  jobTitle: '',
  website: '',
  notes: '',
  category: 'other',
  isFavorite: false,
  address: {
    street: '',
    city: '',
    state: '',
    country: '',
    zipCode: ''
  }
};

const ContactModal = ({ contact, onClose, onSave, loading }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');

  const isEdit = Boolean(contact?._id);

  // Prefill form when editing
  useEffect(() => {
    if (contact) {
      setForm({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        jobTitle: contact.jobTitle || '',
        website: contact.website || '',
        notes: contact.notes || '',
        category: contact.category || 'other',
        isFavorite: contact.isFavorite || false,
        address: {
          street: contact.address?.street || '',
          city: contact.address?.city || '',
          state: contact.address?.state || '',
          country: contact.address?.country || '',
          zipCode: contact.address?.zipCode || ''
        }
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [contact]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (form.website && !/^https?:\/\/.+/.test(form.website) && form.website) {
      if (!/^www\..+/.test(form.website)) e.website = 'Enter a valid URL (e.g. https://example.com)';
    }
    return e;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, address: { ...prev.address, [name]: value } }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (errs.firstName) setActiveTab('basic');
      return;
    }
    onSave(form);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'work', label: 'Work' },
    { id: 'address', label: 'Address' },
    { id: 'notes', label: 'Notes' }
  ];

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>{isEdit ? 'Edit Contact' : 'New Contact'}</h2>
            <p>{isEdit ? `Editing ${contact.firstName} ${contact.lastName}` : 'Fill in the contact details below'}</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`modal-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
              {(tab.id === 'basic' && (errors.firstName || errors.email)) && (
                <span className="tab-error-dot" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* BASIC TAB */}
            {activeTab === 'basic' && (
              <div className="tab-content">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name <span className="required">*</span></label>
                    <input
                      name="firstName"
                      type="text"
                      className={`form-input ${errors.firstName ? 'input-error' : ''}`}
                      placeholder="John"
                      value={form.firstName}
                      onChange={handleChange}
                      autoFocus
                    />
                    {errors.firstName && <span className="form-error">{errors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      name="lastName"
                      type="text"
                      className="form-input"
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    name="email"
                    type="email"
                    className={`form-input ${errors.email ? 'input-error' : ''}`}
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    className="form-input"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      name="category"
                      className="form-input"
                      value={form.category}
                      onChange={handleChange}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Favorite</label>
                    <div className="toggle-wrapper">
                      <label className="toggle">
                        <input
                          type="checkbox"
                          name="isFavorite"
                          checked={form.isFavorite}
                          onChange={handleChange}
                        />
                        <span className="toggle-track">
                          <span className="toggle-thumb" />
                        </span>
                        <span className="toggle-label">
                          {form.isFavorite ? 'Yes ⭐' : 'No'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WORK TAB */}
            {activeTab === 'work' && (
              <div className="tab-content">
                <div className="form-group">
                  <label>Company</label>
                  <input
                    name="company"
                    type="text"
                    className="form-input"
                    placeholder="Acme Inc."
                    value={form.company}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    name="jobTitle"
                    type="text"
                    className="form-input"
                    placeholder="Software Engineer"
                    value={form.jobTitle}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input
                    name="website"
                    type="text"
                    className={`form-input ${errors.website ? 'input-error' : ''}`}
                    placeholder="https://example.com"
                    value={form.website}
                    onChange={handleChange}
                  />
                  {errors.website && <span className="form-error">{errors.website}</span>}
                </div>
              </div>
            )}

            {/* ADDRESS TAB */}
            {activeTab === 'address' && (
              <div className="tab-content">
                <div className="form-group">
                  <label>Street</label>
                  <input
                    name="street"
                    type="text"
                    className="form-input"
                    placeholder="123 Main St"
                    value={form.address.street}
                    onChange={handleAddressChange}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input name="city" type="text" className="form-input" placeholder="New York"
                      value={form.address.city} onChange={handleAddressChange} />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input name="state" type="text" className="form-input" placeholder="NY"
                      value={form.address.state} onChange={handleAddressChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Country</label>
                    <input name="country" type="text" className="form-input" placeholder="United States"
                      value={form.address.country} onChange={handleAddressChange} />
                  </div>
                  <div className="form-group">
                    <label>Zip Code</label>
                    <input name="zipCode" type="text" className="form-input" placeholder="10001"
                      value={form.address.zipCode} onChange={handleAddressChange} />
                  </div>
                </div>
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="tab-content">
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    className="form-input notes-area"
                    placeholder="Add any notes about this contact..."
                    value={form.notes}
                    onChange={handleChange}
                    maxLength={500}
                    rows={6}
                  />
                  <span className="char-count">{form.notes.length}/500</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="btn-spinner" /> {isEdit ? 'Saving...' : 'Creating...'}</>
              ) : (isEdit ? 'Save changes' : 'Create contact')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;