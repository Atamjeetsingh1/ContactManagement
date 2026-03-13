import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatAPI, contactsAPI, usersAPI } from '../services/api';
import { uploadFile } from '../services/api';
import { connectSocket, getSocket, sendMessage, sendTyping, stopTyping, addReaction, removeReaction, editMessage, deleteMessage, pinMessage, markRead, joinRoom, leaveRoom } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';
import './Chat.css';

const getRoomId = (id1, id2) => [id1, id2].sort().join('_');

const ContactCard = ({ contact, onSave, onClose }) => {
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="shared-contact-card">
      <div className="contact-card-header">
        <div className="contact-avatar">
          {contact.firstName?.[0]?.toUpperCase()}
        </div>
        <div className="contact-info">
          <div className="contact-name">{contact.firstName} {contact.lastName}</div>
          {contact.jobTitle && <div className="contact-title">{contact.jobTitle}</div>}
        </div>
      </div>
      
      <div className="contact-details">
        {contact.email && (
          <div className="contact-row">
            <span className="label">Email:</span>
            <span className="value">{contact.email}</span>
            <button onClick={() => handleCopy(contact.email)} className="copy-btn">📋</button>
          </div>
        )}
        {contact.phone && (
          <div className="contact-row">
            <span className="label">Phone:</span>
            <span className="value">{contact.phone}</span>
            <button onClick={() => handleCopy(contact.phone)} className="copy-btn">📋</button>
          </div>
        )}
        {contact.company && (
          <div className="contact-row">
            <span className="label">Company:</span>
            <span className="value">{contact.company}</span>
          </div>
        )}
        {contact.linkedin && (
          <div className="contact-row">
            <span className="label">LinkedIn:</span>
            <span className="value link">{contact.linkedin}</span>
          </div>
        )}
        {contact.experience && (
          <div className="contact-row">
            <span className="label">Experience:</span>
            <span className="value">{contact.experience}</span>
          </div>
        )}
        {contact.location && (
          <div className="contact-row">
            <span className="label">Location:</span>
            <span className="value">{contact.location}</span>
          </div>
        )}
      </div>

      <div className="contact-card-actions">
        <button className="btn btn-primary" onClick={() => onSave(contact)}>
          Save Contact
        </button>
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

const FilePreview = ({ file, onRemove }) => {
  const isImage = file.fileType?.startsWith('image/');
  const isVideo = file.fileType?.startsWith('video/');
  
  return (
    <div className="file-preview">
      {isImage ? (
        <img src={file.url} alt={file.filename} />
      ) : (
        <div className="file-icon">
          {isVideo ? '🎬' : '📄'}
          <span className="filename">{file.filename}</span>
        </div>
      )}
      <button className="remove-file" onClick={onRemove}>×</button>
    </div>
  );
};

export default function Chat() {
  const { contactId } = useParams();
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [providerContacts, setProviderContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [recipientLastSeen, setRecipientLastSeen] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const fileInputRef = useRef(null);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const messagesEndRef = useRef(null);
  const roomId = getRoomId(user?.id, contactId);

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

  const loadContacts = useCallback(async () => {
    if (user?.role === 'provider') {
      try {
        const { data } = await contactsAPI.getAll({ limit: 50 });
        setProviderContacts(data.contacts);
      } catch (err) {
        console.error('Failed to load contacts:', err);
      }
    }
  }, [user?.role]);

  const loadRecipientInfo = useCallback(async () => {
    try {
      const { data } = await usersAPI.getUser(contactId);
      setRecipientOnline(data.user.isOnline);
      setRecipientLastSeen(data.user.lastSeen);
    } catch (err) {
      console.error('Failed to load recipient info:', err);
    }
  }, [contactId]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    loadMessages(1);
    loadContacts();
    loadRecipientInfo();

    const socket = connectSocket();
    if (!socket) return;

    joinRoom(roomId);

    socket.on('receive_message', (msg) => {
      console.log('🔌 Received message:', msg);
      if (msg.roomId === roomId) {
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          console.log('📝 Adding new message to state:', msg);
          return [...prev, msg];
        });
        
        if (msg.senderId !== user.id) {
          markRead(roomId, msg._id);
        }
      }
    });

    socket.on('user_typing', ({ userId, name }) => {
      if (userId !== user.id && userId === contactId) {
        setTyping(name);
      }
    });

    socket.on('user_stop_typing', ({ userId }) => {
      if (userId !== user.id && userId === contactId) {
        setTyping(null);
      }
    });

    socket.on('message_reaction', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId ? { ...m, reactions } : m
      ));
    });

    socket.on('message_edited', ({ messageId, newMessage, editedAt }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId ? { ...m, message: newMessage, isEdited: true, editedAt } : m
      ));
    });

    socket.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId ? { ...m, isDeleted: true, message: '' } : m
      ));
    });

    socket.on('message_pinned', ({ messageId, isPinned }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId ? { ...m, isPinned } : m
      ));
    });

    socket.on('message_read', ({ messageId, readAt, readerId }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId ? { ...m, readAt, readBy: readerId } : m
      ));
    });

    socket.on('search_results', (results) => {
      setSearchResults(results);
    });

    socket.on('pinned_messages', (pinned) => {
      setPinnedMessages(pinned);
    });

    socket.on('users_online', (users) => {
      setOnlineUsers(users);
      setRecipientOnline(users.includes(contactId));
    });

    socket.on('user_status', ({ userId, isOnline, lastSeen }) => {
      if (userId === contactId) {
        setRecipientOnline(isOnline);
        setRecipientLastSeen(lastSeen);
      }
    });

    return () => {
      const s = getSocket();
      if (s) {
        leaveRoom(roomId);
        s.off('receive_message');
        s.off('user_typing');
        s.off('user_stop_typing');
        s.off('message_reaction');
        s.off('message_edited');
        s.off('message_deleted');
        s.off('message_pinned');
        s.off('message_read');
        s.off('search_results');
        s.off('pinned_messages');
        s.off('users_online');
        s.off('user_status');
      }
      clearTimeout(typingTimer.current);
    };
  }, [roomId, user, navigate, loadMessages, loadContacts, loadRecipientInfo, contactId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(nextPage);
  };

  const handleFileUpload = async (files) => {
    setUploading(true);
    try {
      const uploadedFiles = [];
      console.log('📁 Starting file upload for', files.length, 'files');
      
      for (const file of files) {
        console.log('📤 Uploading file:', file.name, 'Type:', file.type, 'Size:', file.size);
        const data = await uploadFile(file);
        console.log('📋 Upload response:', data);
        
        if (data.success) {
          console.log('✅ File uploaded successfully:', data.file);
          uploadedFiles.push(data.file);
        } else {
          console.error('❌ File upload failed:', data);
        }
      }
      
      console.log('📎 All uploaded files:', uploadedFiles);
      setAttachedFiles(prev => [...prev, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} file(s) attached`);
    } catch (err) {
      console.error('💥 File upload error:', err);
      toast.error('Failed to upload file(s)');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendTextMessage = () => {
    const trimmed = input.trim();
    console.log('📝 Sending message - Text:', trimmed, 'Attached files:', attachedFiles.length);
    
    if (!trimmed && attachedFiles.length === 0) {
      console.log('⚠️ No content to send');
      return;
    }

    // Send files first if any
    if (attachedFiles.length > 0) {
      console.log('📎 Processing attached files:', attachedFiles);
      attachedFiles.forEach((file, index) => {
        const isImage = file.fileType?.startsWith('image/');
        const isVideo = file.fileType?.startsWith('video/');
        const type = isImage ? 'image' : isVideo ? 'file' : 'file';
        
        console.log(`📤 File ${index + 1}:`, {
          url: file.url,
          fileType: file.fileType,
          isImage,
          isVideo,
          type,
          message: isImage ? file.url : `Sent a ${type}`
        });
        
        sendMessage(roomId, isImage ? file.url : `Sent a ${type}`, type, [file]);
      });
    }

    if (trimmed) {
      console.log('📤 Sending text message:', trimmed);
      sendMessage(roomId, trimmed, 'text');
    }
    
    setInput('');
    setAttachedFiles([]);
    clearTimeout(typingTimer.current);
    stopTyping(roomId);
  };

  const handleSendContact = async () => {
    if (!selectedContact) return;

    const contactCard = {
      name: `${selectedContact.firstName} ${selectedContact.lastName}`.trim(),
      phone: selectedContact.phone,
      email: selectedContact.email,
      linkedin: selectedContact.linkedin,
      company: selectedContact.company,
      experience: selectedContact.experience,
      location: selectedContact.location,
      notes: selectedContact.notes
    };

    sendMessage(roomId, `Shared contact: ${contactCard.name}`, 'contact', null, contactCard);
    setShowContactPicker(false);
    setSelectedContact(null);
    toast.success('Contact shared!');
  };

  const handleSaveContact = async (contactCard) => {
    try {
      await contactsAPI.create({
        ...contactCard,
        firstName: contactCard.name.split(' ')[0],
        lastName: contactCard.name.split(' ').slice(1).join(' ')
      });
      toast.success('Contact saved to your library!');
    } catch (err) {
      toast.error('Failed to save contact');
    }
  };

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
      if (editingMessage) {
        handleSaveEdit();
      } else if (showContactPicker && selectedContact) {
        handleSendContact();
      } else {
        sendTextMessage();
      }
    }
  };

  const handleSaveEdit = () => {
    if (!editingMessage || !input.trim()) return;
    editMessage(editingMessage._id, input.trim());
    setEditingMessage(null);
    setInput('');
  };

  const handleReaction = (messageId, emoji) => {
    if (!messageId) return;
    const msg = messages.find(m => m._id === messageId);
    const existingReaction = msg?.reactions?.find(r => r.user === user.id);
    
    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        removeReaction(messageId);
      } else {
        addReaction(messageId, emoji);
      }
    } else {
      addReaction(messageId, emoji);
    }
    setShowReactions(null);
  };

  const handleDelete = (messageId) => {
    if (!messageId) return;
    if (window.confirm('Delete this message?')) {
      deleteMessage(messageId);
    }
  };

  const handlePin = (messageId) => {
    if (!messageId) return;
    pinMessage(messageId);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      const socket = getSocket();
      if (socket) {
        socket.emit('search_messages', { roomId, query });
      }
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (date) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const getMessageStatus = (msg) => {
    if (msg.senderId === user.id) {
      if (msg.readAt) return { icon: '✓✓', class: 'seen', title: 'Seen' };
      if (msg.deliveredAt) return { icon: '✓✓', class: 'delivered', title: 'Delivered' };
      return { icon: '✓', class: 'sent', title: 'Sent' };
    }
    return null;
  };

  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;

    messages.forEach(msg => {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        const now = new Date();
        let label;
        if (new Date(msg.timestamp).toDateString() === now.toDateString()) label = 'Today';
        else {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          if (new Date(msg.timestamp).toDateString() === yesterday.toDateString()) label = 'Yesterday';
          else label = new Date(msg.timestamp).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
        }
        groups.push({ type: 'date', label });
      }
      groups.push({ type: 'message', data: msg });
    });

    return groups;
  };

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
        <div className="chat-header">
          <button className="chat-back-btn" onClick={() => navigate('/chat')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="chat-header-info">
            <div className="recipient-info">
              <h3>Chat</h3>
              <div className="recipient-status">
                {recipientOnline ? (
                  <span className="online-badge">● Online</span>
                ) : (
                  <span className="offline-badge">Last seen {formatLastSeen(recipientLastSeen)}</span>
                )}
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="icon-btn" onClick={() => initiateCall(contactId, false)} title="Audio Call">
              📞
            </button>
            <button className="icon-btn" onClick={() => initiateCall(contactId, true)} title="Video Call">
              📹
            </button>
            <button className="icon-btn" onClick={() => setShowSearch(!showSearch)} title="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button className="icon-btn" onClick={() => {
              const socket = getSocket();
              if (socket) socket.emit('get_pinned', { roomId });
              setShowPinned(!showPinned);
            }} title="Pinned Messages">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L12 12M12 12L8 16M12 12L16 16M5 19H19"/>
              </svg>
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="chat-search-bar">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        )}

        {showPinned && pinnedMessages.length > 0 && (
          <div className="pinned-messages-bar">
            <div className="pinned-header">
              <span>Pinned Messages</span>
              <button onClick={() => setShowPinned(false)}>✕</button>
            </div>
            <div className="pinned-list">
              {pinnedMessages.map(msg => (
                <div key={msg._id} className="pinned-item">
                  <span className="pinned-name">{msg.senderName}:</span>
                  <span className="pinned-text">{msg.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="chat-error">{error}</div>}

        {hasMore && (
          <div className="chat-load-more">
            <button onClick={loadMore} className="chat-load-more-btn">
              Load older messages
            </button>
          </div>
        )}

        <div className="chat-messages">
          {messages.length === 0 && (
            <p className="chat-empty">No messages yet. Say hello! 👋</p>
          )}

          {groupMessagesByDate(messages).map((item, i) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${i}`} className="chat-date-divider">
                  <span>{item.label}</span>
                </div>
              );
            }

            const msg = item.data;
            const isMe = msg.senderId === user.id;
            const status = getMessageStatus(msg);
            
            if (msg.isDeleted && isMe) return null;

            return (
              <div key={msg._id || i} className={`chat-msg-row ${isMe ? 'me' : 'them'} ${msg.isPinned ? 'pinned' : ''}`}>
                {!isMe && (
                  <div className="chat-msg-avatar">
                    {msg.senderName?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="chat-msg-content">
                  {!isMe && <div className="chat-msg-sender">{msg.senderName}</div>}
                  
                  {msg.type === 'contact' && msg.contactCard ? (
                    <ContactCard 
                      contact={msg.contactCard} 
                      onSave={handleSaveContact}
                      onClose={() => {}}
                    />
                  ) : msg.type === 'image' && msg.attachments?.[0] ? (
                    <div className={`chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-them'} chat-image-container`}>
                      <a href={msg.attachments[0].url} target="_blank" rel="noopener noreferrer">
                        <img src={msg.attachments[0].url} alt="Shared Image" className="chat-image" />
                      </a>
                    </div>
                  ) : msg.type === 'file' && msg.attachments?.[0] ? (
                    <div className={`chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-them'} chat-file-container`}>
                      <div className="chat-file">
                        <span className="file-icon">📄</span>
                        <div className="file-info">
                          <span className="file-name">{msg.attachments[0].filename}</span>
                          <span className="file-size">{(msg.attachments[0].size / 1024).toFixed(1)} KB</span>
                        </div>
                        <a href={msg.attachments[0].url} target="_blank" rel="noopener noreferrer" className="download-btn">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className={`chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-them'}`}>
                      {msg.isDeleted ? (
                        <span className="deleted-message">This message was deleted</span>
                      ) : (
                        <>
                          {editingMessage?._id === msg._id ? (
                            <div className="editing-message">
                              <input
                                value={input}
                                onChange={handleTyping}
                                onKeyDown={handleKeyDown}
                                autoFocus
                              />
                              <div className="edit-actions">
                                <button onClick={handleSaveEdit}>Save</button>
                                <button onClick={() => { setEditingMessage(null); setInput(''); }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.isPinned && <span className="pin-indicator">📌 </span>}
                              {msg.message}
                              {msg.isEdited && <span className="edited-indicator">(edited)</span>}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className={`chat-msg-meta ${isMe ? 'align-right' : ''}`}>
                    <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
                    {status && (
                      <span className={`message-status ${status.class}`} title={status.title}>
                        {status.icon}
                      </span>
                    )}
                  </div>

                  {!msg.isDeleted && (
                    <div className="message-actions">
                      <button 
                        className="action-btn"
                        onClick={() => setShowReactions(showReactions === msg._id ? null : msg._id)}
                      >
                        😊
                      </button>
                      {isMe && (
                        <>
                          <button 
                            className="action-btn"
                            onClick={() => { setEditingMessage(msg); setInput(msg.message); }}
                          >
                            ✏️
                          </button>
                          <button className="action-btn" onClick={() => handleDelete(msg._id)}>🗑️</button>
                        </>
                      )}
                      <button className="action-btn" onClick={() => handlePin(msg._id)}>
                        {msg.isPinned ? '📍' : '📌'}
                      </button>
                    </div>
                  )}

                  {showReactions === msg._id && (
                    <div className="reactions-picker" style={{ position: 'absolute', bottom: '100%', zIndex: 50, right: 0 }}>
                      <EmojiPicker 
                        onEmojiClick={(emojiData) => handleReaction(msg._id, emojiData.emoji)}
                        theme="auto"
                        searchDisabled={true}
                        skinTonesDisabled={true}
                        width={280}
                        height={350}
                      />
                    </div>
                  )}

                  {msg.reactions?.length > 0 && (
                    <div className="reactions-display">
                      {msg.reactions.map((r, i) => (
                        <span key={i} className="reaction">{r.emoji}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {typing && <div className="chat-typing">{typing} is typing...</div>}

        <div className="chat-input-area">
          {uploading && (
            <div className="chat-uploading-indicator">
              <div className="loader-spinner"></div>
              <span>Uploading files...</span>
            </div>
          )}

          {attachedFiles.length > 0 && !uploading && (
            <div className="attached-files">
              {attachedFiles.map((file, index) => (
                <FilePreview 
                  key={index} 
                  file={file} 
                  onRemove={() => removeAttachedFile(index)} 
                />
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <div className="input-actions">
              {user?.role === 'provider' && (
                <button 
                  className="icon-btn attach-btn"
                  onClick={() => setShowContactPicker(!showContactPicker)}
                  title="Share Contact"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="14" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                </button>
              )}
              <button 
                className="icon-btn attach-btn"
                onClick={() => setShowFilePicker(!showFilePicker)}
                title="Attach File"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                style={{ display: 'none' }}
              />
            </div>

            {showContactPicker && (
              <div className="contact-picker-dropdown">
                <div className="picker-header">
                  <h4>Select Contact to Share</h4>
                  <button onClick={() => setShowContactPicker(false)}>✕</button>
                </div>
                <div className="picker-list">
                  {providerContacts.length === 0 ? (
                    <div className="picker-empty">
                      <p>No contacts available</p>
                      <p className="hint">Create contacts first to share them</p>
                    </div>
                  ) : (
                    providerContacts.map(contact => (
                      <div
                        key={contact._id}
                        className={`picker-item ${selectedContact?._id === contact._id ? 'selected' : ''}`}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <div className="picker-avatar">
                          {contact.firstName?.[0]?.toUpperCase()}
                        </div>
                        <div className="picker-info">
                          <div className="picker-name">{contact.firstName} {contact.lastName}</div>
                          {contact.company && <div className="picker-company">{contact.company}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {selectedContact && (
                  <button className="btn btn-primary send-contact-btn" onClick={handleSendContact}>
                    Share Contact
                  </button>
                )}
              </div>
            )}

            {showFilePicker && (
              <div className="file-picker-dropdown">
                <button onClick={() => { fileInputRef.current?.click(); setShowFilePicker(false); }}>
                  📷 Photo / Video
                </button>
                <button onClick={() => { fileInputRef.current?.click(); setShowFilePicker(false); }}>
                  📄 Document
                </button>
              </div>
            )}

            <textarea
              value={input}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              placeholder={editingMessage ? 'Edit message... (Enter to save)' : "Type a message..."}
              rows={1}
              className="chat-input"
              maxLength={5000}
            />
            <button
              onClick={sendTextMessage}
              disabled={!input.trim() && attachedFiles.length === 0}
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
    </div>
  );
}
