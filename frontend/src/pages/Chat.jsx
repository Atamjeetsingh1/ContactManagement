import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatAPI } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import './Chat.css';

// Utility: generate a consistent roomId from two user IDs
const getRoomId = (id1, id2) => [id1, id2].sort().join('_');

export default function Chat() {
  const { contactId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const roomId = getRoomId(user?.id, contactId);

  // ── Load chat history ──────────────────────────────────────────────────────
  const loadMessages = useCallback(async (pageNum = 1) => {
    try {
      const { data } = await chatAPI.getMessages(roomId, pageNum);

      if (pageNum === 1) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...data.messages, ...prev]);
      }

      setHasMore(data.messages.length === 30);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // ── Socket setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    loadMessages(1);

    const socket = connectSocket();
    if (!socket) return;

    socket.emit('join_room', roomId);

    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('user_typing', (name) => {
      setTyping(`${name} is typing...`);
    });

    socket.on('user_stop_typing', () => setTyping(''));

    socket.on('error', ({ message }) => {
      setError(message);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      const s = getSocket();
      if (s) {
        s.off('receive_message');
        s.off('user_typing');
        s.off('user_stop_typing');
        s.off('error');
      }
      clearTimeout(typingTimer.current);
    };
  }, [roomId, user, navigate, loadMessages]);

  // ── Auto scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load more (pagination) ─────────────────────────────────────────────────
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(nextPage);
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('send_message', { roomId, message: trimmed });
    socket.emit('stop_typing', { roomId });
    setInput('');
    clearTimeout(typingTimer.current);
  };

  // ── Typing indicator ───────────────────────────────────────────────────────
  const handleTyping = (e) => {
    setInput(e.target.value);

    const socket = getSocket();
    if (!socket) return;

    socket.emit('typing', { roomId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('stop_typing', { roomId });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="chat-page">
        <div className="chat-loader">
          <div className="loader-ring" />
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-container">

        {/* Header */}
        <div className="chat-header">
          <button className="chat-back-btn" onClick={() => navigate('/chat')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="chat-header-info">
            <h3>Chat</h3>
          </div>
        </div>

        {/* Error banner */}
        {error && <div className="chat-error">{error}</div>}

        {/* Load more */}
        {hasMore && (
          <div className="chat-load-more">
            <button onClick={loadMore} className="chat-load-more-btn">
              Load older messages
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <p className="chat-empty">No messages yet. Say hello! 👋</p>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.senderId === user.id;
            return (
              <div key={msg._id || i} className={`chat-msg-row ${isMe ? 'me' : 'them'}`}>
                {!isMe && (
                  <div className="chat-msg-avatar">
                    {msg.senderName?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="chat-msg-content">
                  {!isMe && <div className="chat-msg-sender">{msg.senderName}</div>}
                  <div className={`chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-them'}`}>
                    {msg.message}
                  </div>
                  <div className={`chat-msg-time ${isMe ? 'align-right' : ''}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Typing indicator */}
        <div className="chat-typing">{typing}</div>

        {/* Input */}
        <div className="chat-input-row">
          <textarea
            value={input}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="chat-input"
            maxLength={1000}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="chat-send-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}