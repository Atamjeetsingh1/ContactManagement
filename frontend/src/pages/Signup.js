import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'customer' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    else if (!/\d/.test(form.password)) e.password = 'Password must contain at least one number';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) return setErrors(errs);

    setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.role);
      toast.success('Account created! Welcome 🎉');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed. Please try again.';
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    if (!form.password) return 0;
    let s = 0;
    if (form.password.length >= 6) s++;
    if (form.password.length >= 10) s++;
    if (/\d/.test(form.password)) s++;
    if (/[A-Z]/.test(form.password)) s++;
    if (/[^A-Za-z0-9]/.test(form.password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', '#f38ba8', '#f9e2af', '#fab387', '#a6e3a1', '#94e2d5'][strength];

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob blob-1" />
        <div className="auth-blob blob-2" />
        <div className="auth-blob blob-3" />
      </div>

      <div className="auth-card auth-card-lg">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="auth-logo-text">ContactHub</span>
        </div>

        <div className="auth-header">
          <h1>Create account</h1>
          <p>Start managing your contacts today</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {errors.general && (
            <div className="auth-alert">
              <span>⚠</span> {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              className={`form-input ${errors.name ? 'input-error' : ''}`}
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              autoFocus
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group role-group">
            <label>I want to sign up as a:</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-option ${form.role === 'customer' ? 'active' : ''}`}
                onClick={() => setForm(prev => ({ ...prev, role: 'customer' }))}
              >
                Customer
              </button>
              <button
                type="button"
                className={`role-option ${form.role === 'provider' ? 'active' : ''}`}
                onClick={() => setForm(prev => ({ ...prev, role: 'provider' }))}
              >
                Provider
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="Min. 6 characters with a number"
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {form.password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className="strength-bar"
                      style={{ background: i <= strength ? strengthColor : 'var(--border)' }}
                    />
                  ))}
                </div>
                <span style={{ color: strengthColor, fontSize: '12px' }}>{strengthLabel}</span>
              </div>
            )}
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPass ? 'text' : 'password'}
              className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleChange}
            />
            {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? (
              <><span className="btn-spinner" /> Creating account...</>
            ) : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;