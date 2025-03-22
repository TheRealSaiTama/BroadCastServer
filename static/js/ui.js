class ChatUI {
  constructor(chatClient) {
    this.chat = chatClient;
    this.elements = {
      appContainer: document.querySelector('.app-container'),
      sidebar: document.querySelector('.sidebar'),
      chatArea: document.querySelector('.chat-area'),
      messagesContainer: document.querySelector('.messages-container'),
      messages: document.querySelector('.messages'),
      welcomeMessage: document.querySelector('.welcome-message'),
      statusDot: document.querySelector('.status-dot'),
      statusText: document.querySelector('.status-text'),
      connectionOverlay: document.querySelector('.connection-overlay'),
      usernameDisplay: document.querySelector('.username-display'),
      userId: document.querySelector('.user-id'),
      editUsernameBtn: document.querySelector('.edit-username-btn'),
      activeUsersList: document.querySelector('.active-users-list'),
      userCount: document.querySelector('.user-count'),
      messageInput: document.querySelector('.message-input'),
      sendBtn: document.querySelector('.send-btn'),
      typingIndicator: document.querySelector('.typing-indicator'),
      typingText: document.querySelector('.typing-text'),
      usernameModal: document.querySelector('#username-modal'),
      usernameForm: document.querySelector('#username-form'),
      usernameInput: document.querySelector('#username-input'),
      closeModalBtn: document.querySelector('.close-modal-btn'),
      cancelBtn: document.querySelector('.cancel-btn'),
      emojiPickerToggle: document.querySelector('.emoji-picker-toggle'),
      emojiPicker: document.querySelector('.emoji-picker'),
      emojiList: document.querySelector('.emoji-list'),
      emojiCategories: document.querySelectorAll('.emoji-category'),
      toggleSidebarBtn: document.querySelector('.toggle-sidebar-btn'),
      clearMessagesBtn: document.querySelector('.clear-messages-btn'),
      themeToggle: document.querySelector('#theme-toggle'),
      toastContainer: document.querySelector('.toast-container'),
      exportChat: document.querySelector('#export-chat'),
      toggleTimestamps: document.querySelector('#toggle-timestamps'),
      toggleNotifications: document.querySelector('#toggle-notifications')
    };
    this.state = {
      showTimestamps: true,
      showNotifications: true,
      darkTheme: false,
      sidebarVisible: true,
      typingUsers: new Map(),
      messageCount: 0,
      lastMessageTime: 0
    };
    this.emojis = {
      smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'],
      gestures: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '✋', '🤚', '👋', '👏', '🙌'],
      people: ['👨', '👩', '👶', '👦', '👧', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '👨‍🦲', '👩‍🦲', '👴', '👵'],
      animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸'],
      food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅'],
      travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️'],
      symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
    };
    this.init();
  }
  
  init() {
    this.registerChatEvents();
    this.registerUIEvents();
    this.loadPreferences();
    this.initEmojiPicker();
    this.updateConnectionStatus(false);
  }
  
  registerChatEvents() {
    this.chat.on('onConnect', () => {
      this.updateConnectionStatus(true);
      this.hideConnectionOverlay();
    });
    
    this.chat.on('onDisconnect', () => {
      this.updateConnectionStatus(false);
      this.showConnectionOverlay();
    });
    
    this.chat.on('onMessage', (message) => {
      this.addMessage(message);
      this.playMessageSound(message.sender_id === this.chat.clientId);
      
      if (this.state.showNotifications && message.sender_id !== this.chat.clientId) {
        this.showNotification(message.sender_name, message.content);
      }
    });
    
    this.chat.on('onHistoryReceived', (messages) => {
      this.elements.messages.innerHTML = '';
      this.state.messageCount = 0;
      
      messages.forEach(message => {
        this.addMessage(message, true);
      });
      
      if (messages.length > 0) {
        this.elements.welcomeMessage.classList.add('hidden');
      }
    });
    
    this.chat.on('onUserJoin', (user) => {
      this.addSystemMessage(`${user.username} has joined the chat`);
      this.updateActiveUsersList();
    });
    
    this.chat.on('onUserLeave', (user) => {
      this.addSystemMessage(`${user.username} has left the chat`);
      this.updateActiveUsersList();
      
      if (this.state.typingUsers.has(user.id)) {
        this.state.typingUsers.delete(user.id);
        this.updateTypingIndicator();
      }
    });
    
    this.chat.on('onUserRename', (user, oldUsername) => {
      this.addSystemMessage(`${oldUsername} is now known as ${user.username}`);
      this.updateActiveUsersList();
      
      if (this.state.typingUsers.has(user.id)) {
        this.state.typingUsers.set(user.id, user.username);
        this.updateTypingIndicator();
      }
    });
    
    this.chat.on('onTypingStart', (userId, username) => {
      this.state.typingUsers.set(userId, username);
      this.updateTypingIndicator();
    });
    
    this.chat.on('onTypingStop', (userId) => {
      this.state.typingUsers.delete(userId);
      this.updateTypingIndicator();
    });
    
    this.chat.on('onError', (error) => {
      this.showToast('error', 'Connection Error', 'There was a problem with the connection.');
    });
  }
  
  registerUIEvents() {
    this.elements.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
      
      this.handleTypingIndicator();
    });
    
    this.elements.sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });
    
    this.elements.messageInput.addEventListener('input', () => {
      this.elements.sendBtn.disabled = !this.elements.messageInput.value.trim();
      this.handleTypingIndicator();
      
      this.autoResizeTextarea();
    });
    
    this.elements.editUsernameBtn.addEventListener('click', () => {
      this.showUsernameModal();
    });
    
    this.elements.usernameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.updateUsername();
    });
    
    this.elements.closeModalBtn.addEventListener('click', () => {
      this.hideUsernameModal();
    });
    
    this.elements.cancelBtn.addEventListener('click', () => {
      this.hideUsernameModal();
    });
    
    this.elements.themeToggle.addEventListener('change', () => {
      this.toggleTheme();
    });
    
    this.elements.toggleSidebarBtn.addEventListener('click', () => {
      this.toggleSidebar();
    });
    
    this.elements.clearMessagesBtn.addEventListener('click', () => {
      this.clearMessages();
    });
    
    this.elements.emojiPickerToggle.addEventListener('click', () => {
      this.toggleEmojiPicker();
    });
    
    document.addEventListener('click', (e) => {
      if (!this.elements.emojiPickerContainer.contains(e.target)) {
        this.elements.emojiPicker.classList.add('hidden');
      }
    });
    
    this.elements.exportChat.addEventListener('click', (e) => {
      e.preventDefault();
      this.exportChatHistory();
    });
    
    this.elements.toggleTimestamps.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleTimestamps();
    });
    
    this.elements.toggleNotifications.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleNotifications();
    });
    
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.elements.sidebar.classList.remove('active');
      }
    });
  }
  
  loadPreferences() {
    const darkTheme = localStorage.getItem('darkTheme') === 'true';
    this.state.darkTheme = darkTheme;
    this.elements.themeToggle.checked = darkTheme;
    
    if (darkTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    this.state.showTimestamps = localStorage.getItem('showTimestamps') !== 'false';
    this.state.showNotifications = localStorage.getItem('showNotifications') !== 'false';
  }
  
  initEmojiPicker() {
    this.elements.emojiPickerContainer = this.elements.emojiPickerToggle.parentElement;
    
    this.loadEmojiCategory('smileys');
    
    this.elements.emojiCategories.forEach(tab => {
      tab.addEventListener('click', () => {
        this.elements.emojiCategories.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const category = tab.getAttribute('data-category');
        this.loadEmojiCategory(category);
      });
    });
  }
  
  loadEmojiCategory(category) {
    const emojis = this.emojis[category] || [];
    this.elements.emojiList.innerHTML = '';
    
    emojis.forEach(emoji => {
      const emojiElement = document.createElement('div');
      emojiElement.className = 'emoji';
      emojiElement.textContent = emoji;
      emojiElement.addEventListener('click', () => {
        this.insertEmoji(emoji);
      });
      
      this.elements.emojiList.appendChild(emojiElement);
    });
  }
  
  insertEmoji(emoji) {
    const input = this.elements.messageInput;
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const text = input.value;
    
    input.value = text.substring(0, startPos) + emoji + text.substring(endPos);
    
    input.selectionStart = input.selectionEnd = startPos + emoji.length;
    
    input.focus();
    
    this.elements.sendBtn.disabled = !input.value.trim();
    
    this.elements.emojiPicker.classList.add('hidden');
  }
  
  toggleEmojiPicker() {
    this.elements.emojiPicker.classList.toggle('hidden');
  }
  
  updateConnectionStatus(connected) {
    if (connected) {
      this.elements.statusDot.classList.add('connected');
      this.elements.statusDot.classList.remove('disconnected');
      this.elements.statusText.textContent = 'Connected';
      
      this.elements.usernameDisplay.textContent = this.chat.username || 'Guest';
      this.elements.userId.textContent = `ID: ${this.chat.clientId || '-'}`;
      
      this.updateActiveUsersList();
    } else {
      this.elements.statusDot.classList.remove('connected');
      this.elements.statusDot.classList.add('disconnected');
      this.elements.statusText.textContent = 'Disconnected';
    }
  }
  
  updateActiveUsersList() {
    const users = this.chat.activeUsers || [];
    this.elements.activeUsersList.innerHTML = '';
    this.elements.userCount.textContent = `(${users.length})`;
    
    users.forEach(user => {
      const li = document.createElement('li');
      
      const firstLetter = user.username.charAt(0).toUpperCase();
      
      li.innerHTML = `
        <div class="user-avatar">${firstLetter}</div>
        <div class="user-info">
          <div class="user-name">${user.username}</div>
          <div class="user-type">${user.type === 'web' ? 'Web Client' : 'Terminal'}</div>
        </div>
      `;
      
      this.elements.activeUsersList.appendChild(li);
    });
  }
  
  sendMessage() {
    const content = this.elements.messageInput.value.trim();
    
    if (content && this.chat.sendMessage(content)) {
      this.elements.messageInput.value = '';
      this.elements.messageInput.style.height = 'auto';
      this.elements.sendBtn.disabled = true;
      
      this.chat.sendTypingIndicator(false);
    }
  }
  
  addMessage(message, isHistory = false) {
    this.elements.welcomeMessage.classList.add('hidden');
    
    const messageElement = document.createElement('div');
    const isSelf = message.sender_id === this.chat.clientId;
    messageElement.className = `message ${isSelf ? 'sent' : 'received'}`;
    
    const timestamp = new Date(message.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    this.addDateSeparatorIfNeeded(message.timestamp);
    
    messageElement.innerHTML = `
      <div class="message-bubble">
        ${!isSelf ? `<div class="message-header">
          <span class="message-sender">${message.sender_name}</span>
          ${this.state.showTimestamps ? `<span class="message-time">${timestamp}</span>` : ''}
        </div>` : ''}
        <div class="message-content">${this.formatMessageContent(message.content)}</div>
        ${isSelf && this.state.showTimestamps ? `<div class="message-header">
          <span class="message-time">${timestamp}</span>
        </div>` : ''}
      </div>
    `;
    
    this.elements.messages.appendChild(messageElement);
    
    if (!isHistory) {
      this.scrollToBottom();
    }
    
    this.state.messageCount++;
    this.state.lastMessageTime = message.timestamp;
  }
  
  addSystemMessage(content) {
    const messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    messageElement.innerHTML = `<div class="system-message-content">${content}</div>`;
    
    this.elements.messages.appendChild(messageElement);
    this.scrollToBottom();
  }
  
  addDateSeparatorIfNeeded(timestamp) {
    if (!timestamp) return;
    
    const messageDate = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDateStr = messageDate.toLocaleDateString();
    const todayStr = today.toLocaleDateString();
    const yesterdayStr = yesterday.toLocaleDateString();
    
    let dateLabel;
    if (messageDateStr === todayStr) {
      dateLabel = 'Today';
    } else if (messageDateStr === yesterdayStr) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = messageDate.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    const lastMessageTime = this.state.lastMessageTime;
    if (lastMessageTime === 0) {
      this.addDateSeparator(dateLabel);
    } else {
      const lastMessageDate = new Date(lastMessageTime * 1000).toLocaleDateString();
      if (lastMessageDate !== messageDateStr) {
        this.addDateSeparator(dateLabel);
      }
    }
  }
  
  addDateSeparator(dateLabel) {
    const separatorElement = document.createElement('div');
    separatorElement.className = 'system-message';
    separatorElement.innerHTML = `<div class="system-message-content">${dateLabel}</div>`;
    
    this.elements.messages.appendChild(separatorElement);
  }
  
  formatMessageContent(content) {
    if (!content) return '';
    
    let formatted = this.escapeHtml(content);
    
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  scrollToBottom() {
    this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
  }
  
  handleTypingIndicator() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    const isTyping = this.elements.messageInput.value.length > 0;
    this.chat.sendTypingIndicator(isTyping);
    
    if (isTyping) {
      this.typingTimeout = setTimeout(() => {
        this.chat.sendTypingIndicator(false);
      }, 3000);
    }
  }
  
  updateTypingIndicator() {
    if (this.state.typingUsers.size === 0) {
      this.elements.typingIndicator.classList.add('hidden');
      return;
    }
    
    this.elements.typingIndicator.classList.remove('hidden');
    
    if (this.state.typingUsers.size === 1) {
      const username = [...this.state.typingUsers.values()][0];
      this.elements.typingText.textContent = `${username} is typing...`;
    } else if (this.state.typingUsers.size === 2) {
      const usernames = [...this.state.typingUsers.values()];
      this.elements.typingText.textContent = `${usernames[0]} and ${usernames[1]} are typing...`;
    } else {
      this.elements.typingText.textContent = 'Several people are typing...';
    }
  }
  
  showUsernameModal() {
    this.elements.usernameInput.value = this.chat.username || '';
    this.elements.usernameModal.classList.remove('hidden');
    this.elements.usernameInput.focus();
  }
  
  hideUsernameModal() {
    this.elements.usernameModal.classList.add('hidden');
  }
  
  updateUsername() {
    const newUsername = this.elements.usernameInput.value.trim();
    
    if (newUsername && newUsername !== this.chat.username) {
      if (this.chat.updateUsername(newUsername)) {
        this.elements.usernameDisplay.textContent = newUsername;
        this.showToast('success', 'Username Updated', `Your username is now ${newUsername}`);
      } else {
        this.showToast('error', 'Error', 'Failed to update username');
      }
    }
    
    this.hideUsernameModal();
  }
  
  toggleTheme() {
    this.state.darkTheme = this.elements.themeToggle.checked;
    
    if (this.state.darkTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    
    localStorage.setItem('darkTheme', this.state.darkTheme);
  }
  
  toggleSidebar() {
    this.elements.sidebar.classList.toggle('active');
  }
  
  clearMessages() {
    if (confirm('Are you sure you want to clear all messages? This only affects your view.')) {
      this.elements.messages.innerHTML = '';
      this.elements.welcomeMessage.classList.remove('hidden');
      this.state.messageCount = 0;
      this.state.lastMessageTime = 0;
    }
  }
  
  toggleTimestamps() {
    this.state.showTimestamps = !this.state.showTimestamps;
    
    const timestamps = document.querySelectorAll('.message-time');
    timestamps.forEach(el => {
      el.style.display = this.state.showTimestamps ? '' : 'none';
    });
    
    localStorage.setItem('showTimestamps', this.state.showTimestamps);
    
    this.showToast(
      'info', 
      'Timestamps', 
      this.state.showTimestamps ? 'Timestamps are now visible' : 'Timestamps are now hidden'
    );
  }
  
  toggleNotifications() {
    if (this.state.showNotifications && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    
    this.state.showNotifications = !this.state.showNotifications;
    
    localStorage.setItem('showNotifications', this.state.showNotifications);
    
    this.showToast(
      'info', 
      'Notifications', 
      this.state.showNotifications ? 'Notifications are now enabled' : 'Notifications are now hidden'
    );
  }
  
  showNotification(title, body) {
    if (!this.state.showNotifications || Notification.permission !== 'granted') return;

    const notification = new Notification(`${title} - Broadcast Chat`, {
      body: body
    });

    setTimeout(() => {
      notification.close();
    }, 5000);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
  
  exportChatHistory() {
    const messages = this.elements.messages.querySelectorAll('.message');
    let exportText = 'Broadcast Chat History\n';
    exportText += `Exported on ${new Date().toLocaleString()}\n\n`;
    
    messages.forEach(message => {
      const isSent = message.classList.contains('sent');
      const sender = message.querySelector('.message-sender');
      const content = message.querySelector('.message-content');
      const time = message.querySelector('.message-time');
      
      if (content) {
        const senderText = sender ? sender.textContent : (isSent ? 'You' : 'Unknown');
        const timeText = time ? `[${time.textContent}]` : '';
        const contentText = content.textContent;
        
        exportText += `${timeText} ${senderText}: ${contentText}\n`;
      }
    });
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    this.showToast('success', 'Export Complete', 'Chat history has been downloaded');
  }
  
  showConnectionOverlay() {
    this.elements.connectionOverlay.classList.remove('hidden');
  }
  
  hideConnectionOverlay() {
    this.elements.connectionOverlay.classList.add('hidden');
  }
  
  showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon;
    switch (type) {
      case 'success': icon = 'check-circle'; break;
      case 'error': icon = 'exclamation-circle'; break;
      case 'warning': icon = 'exclamation-triangle'; break;
      default: icon = 'info-circle';
    }
    
    toast.innerHTML = `
      <div class="toast-icon"><i class="fas fa-${icon}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    this.elements.toastContainer.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.removeToast(toast);
    });
    
    setTimeout(() => {
      this.removeToast(toast);
    }, 5000);
  }
  
  removeToast(toast) {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }
  
  autoResizeTextarea() {
    const textarea = this.elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
  }
  
  playMessageSound(isSent) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      if (isSent) {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
      } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      }

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.log('Could not play sound:', e);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const chatUI = new ChatUI(broadcastChat);
});
