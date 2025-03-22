class BroadcastChat {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.clientId = null;
    this.username = null;
    this.activeUsers = [];
    this.typingTimeout = null;
    this.isTyping = false;
    this.callbacks = {
      onConnect: () => {},
      onDisconnect: () => {},
      onMessage: () => {},
      onUserJoin: () => {},
      onUserLeave: () => {},
      onUserRename: () => {},
      onTypingStart: () => {},
      onTypingStop: () => {},
      onHistoryReceived: () => {},
      onError: () => {}
    };
    this.init();
  }
  
  init() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = 8765;
    this.wsUrl = `${protocol}//${host}:${port}`;
    this.connect();
  }
  
  connect() {
    try {
      this.socket = new WebSocket(this.wsUrl);
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.callbacks.onError(error);
      this.scheduleReconnect();
    }
  }
  
  handleOpen() {
    console.log('Connected to WebSocket server');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.callbacks.onConnect();
  }
  
  handleClose(event) {
    console.log('Disconnected from WebSocket server:', event.code, event.reason);
    this.connected = false;
    this.callbacks.onDisconnect(event);
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }
  
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);
      switch (data.type) {
        case 'welcome':
          this.handleWelcomeMessage(data);
          break;
        case 'chat':
          this.callbacks.onMessage(data);
          break;
        case 'history':
          this.callbacks.onHistoryReceived(data.messages);
          break;
        case 'user_event':
          this.handleUserEvent(data);
          break;
        case 'typing':
          this.handleTypingIndicator(data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }
  
  handleError(error) {
    console.error('WebSocket error:', error);
    this.callbacks.onError(error);
  }
  
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      
      console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);
      
      setTimeout(() => {
        console.log(`Reconnecting... (Attempt ${this.reconnectAttempts})`);
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnect attempts reached. Please refresh the page.');
    }
  }
  
  handleWelcomeMessage(data) {
    this.clientId = data.client.id;
    this.username = data.client.username;
    this.activeUsers = data.active_users || [];
    
    console.log(`Connected as ${this.username} (ID: ${this.clientId})`);
    console.log('Active users:', this.activeUsers);
  }
  
  handleUserEvent(data) {
    const { event, user } = data;
    
    switch (event) {
      case 'join':
        this.activeUsers.push(user);
        this.callbacks.onUserJoin(user);
        break;
      case 'leave':
        this.activeUsers = this.activeUsers.filter(u => u.id !== user.id);
        this.callbacks.onUserLeave(user);
        break;
      case 'rename':
        const oldUsername = data.old_username;
        const userIndex = this.activeUsers.findIndex(u => u.id === user.id);
        
        if (userIndex !== -1) {
          this.activeUsers[userIndex].username = user.username;
        }
        
        this.callbacks.onUserRename(user, oldUsername);
        break;
    }
  }
  
  handleTypingIndicator(data) {
    if (data.sender_id === this.clientId) return;
    
    if (data.is_typing) {
      this.callbacks.onTypingStart(data.sender_id, data.sender_name);
    } else {
      this.callbacks.onTypingStop(data.sender_id);
    }
  }
  
  sendMessage(content) {
    if (!this.connected || !content.trim()) return false;
    
    const message = {
      type: 'chat',
      content: content,
      username: this.username
    };
    
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      this.callbacks.onError(error);
      return false;
    }
  }
  
  sendTypingIndicator(isTyping) {
    if (!this.connected || this.isTyping === isTyping) return;
    
    this.isTyping = isTyping;
    
    const data = {
      type: 'typing',
      is_typing: isTyping
    };
    
    try {
      this.socket.send(JSON.stringify(data));
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }
  
  updateUsername(newUsername) {
    if (!this.connected || !newUsername.trim() || newUsername === this.username) return false;
    
    this.username = newUsername;
    
    const message = {
      type: 'chat',
      content: '',
      username: newUsername
    };
    
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error updating username:', error);
      this.callbacks.onError(error);
      return false;
    }
  }
  
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }
  
  disconnect() {
    if (this.socket && this.connected) {
      this.socket.close(1000, 'User disconnected');
    }
  }
}

const broadcastChat = new BroadcastChat();
