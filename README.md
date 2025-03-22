# 🌐 WebSocket Broadcast Server

<div align="center">
  
  ![3D Server Visualization](https://user-images.githubusercontent.com/assets/broadcast-server-3d.gif)

  A real-time communication system built with WebSockets allowing multiple clients to connect, send messages, and have those messages instantly broadcasted to all connected users.

  [![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
  [![Python](https://img.shields.io/badge/Python-3.7+-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
  [![WebSockets](https://img.shields.io/badge/WebSockets-Enabled-green?style=for-the-badge&logo=websocket&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

</div>

## 🚀 Overview

This project features both terminal-based and web-based interfaces for seamless communication. Multiple users can connect simultaneously and enjoy real-time messaging with modern features.

> 💡 **Inspiration**: This project was inspired by [roadmap.sh's broadcast server project](https://roadmap.sh/projects/broadcast-server)

## ✨ Features

- **Real-time Messaging**: Instant message delivery to all connected clients
- **Web Interface**: Modern, responsive chat UI with multiple features
- **Terminal Client**: Connect via command line for lightweight usage
- **Dual Mode**: Single script runs both server and terminal client
- **Message History**: New connections receive recent message history
- **User Notifications**: Desktop notifications for new messages
- **Typing Indicators**: See when others are typing messages
- **User Status**: Join/leave notifications and user presence
- **Username Customization**: Change your display name anytime
- **Error Handling**: Robust reconnection and error management


## 🔧 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/TheRealSaiTama/BroadCastServer.git
   cd BroadCastServer
   ```

2. Install dependencies:
   ```bash
   pip install websockets colorama aiohttp
   ```

## 📚 Usage

### Starting the Server

Start both the WebSocket server and web interface with:

```bash
python broadcast_server.py start
```

- WebSocket server will run on `ws://localhost:8765`
- Web interface will be available at `http://localhost:8000`

### Using the Web Interface

1. Visit `http://localhost:8000` in your browser
2. Set your username in the sidebar
3. Start sending messages!

### Connecting via Terminal

Connect to the server as a terminal client with:

```bash
python broadcast_server.py connect
```

Type messages to send, and use "quit" or "exit" to disconnect.

## 💬 Web Interface Features

- **Message Timestamps**: Toggle timestamp visibility
- **Desktop Notifications**: Get notified of new messages
- **Message Sounds**: Audio feedback for messages
- **Export Chat**: Save your conversation history
- **Clear Messages**: Reset your chat view
- **Responsive Design**: Works on desktop and mobile
- **Light/Dark Mode**: Toggle between themes

## 🔄 Architecture

- **Python Backend**: Handles WebSocket connections and message routing
- **HTML/CSS/JS Frontend**: Responsive, feature-rich chat interface
- **WebSockets**: Bidirectional communication for real-time messages
- **Asyncio**: Non-blocking I/O for efficient operation
- **Error Recovery**: Automatic reconnection on connection loss

## 🛠 Code Structure

- `broadcast_server.py`: Main server and terminal client
- `static/index.html`: Web interface structure
- `static/css/styles.css`: Styling for web interface
- `static/js/chat.js`: WebSocket communication logic
- `static/js/ui.js`: UI interactions and features

## 📝 License

This project is licensed under the MIT License. Feel free to use and modify it for your own purposes.

## 👤 Author

Built by [TheRealSaiTama](https://github.com/TheRealSaiTama)
