#!/usr/bin/env python3
import asyncio
import json
import logging
import os
import random
import signal
import sys
import time
from typing import Set, Dict, Optional, Any, List

import aiohttp
from aiohttp import web
import websockets
from colorama import Fore, Style, init as colorama_init
from websockets.server import WebSocketServerProtocol
from websockets.exceptions import ConnectionClosed

colorama_init(autoreset=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

WS_HOST = "localhost"
WS_PORT = 8765
WS_SERVER_URL = f"ws://{WS_HOST}:{WS_PORT}"

WEB_HOST = "localhost"
WEB_PORT = 8000
WEB_SERVER_URL = f"http://{WEB_HOST}:{WEB_PORT}"

connected_clients: Set[WebSocketServerProtocol] = set()
client_ids: Dict[WebSocketServerProtocol, Dict[str, Any]] = {}

message_history: List[Dict[str, Any]] = []
MAX_HISTORY_LENGTH = 50

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

async def handle_client(websocket: WebSocketServerProtocol) -> None:
    client_id = str(random.randint(10000, 99999))
    client_type = "terminal"
    username = f"User-{client_id[:3]}"
    
    connected_clients.add(websocket)
    client_ids[websocket] = {
        "id": client_id,
        "type": client_type,
        "username": username,
        "connected_at": time.time()
    }
    
    await send_client_info(websocket)
    
    if message_history:
        try:
            history_message = json.dumps({
                "type": "history",
                "messages": message_history
            })
            await websocket.send(history_message)
        except Exception as e:
            logging.error(f"Error sending history to client {client_id}: {e}")
    
    await broadcast_user_event(client_id, "join")
    
    logging.info(f"Client {client_id} ({username}) connected")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                
                if data.get("type") == "chat":
                    content = data.get("content", "")
                    
                    if "username" in data and data["username"] != username:
                        old_username = username
                        username = data["username"]
                        client_ids[websocket]["username"] = username
                        logging.info(f"Client {client_id} changed username from {old_username} to {username}")
                        
                        await broadcast_user_event(client_id, "rename", {
                            "old_username": old_username,
                            "new_username": username
                        })
                    
                    if client_ids[websocket]["type"] == "terminal":
                        client_ids[websocket]["type"] = "web"
                    
                    msg_obj = {
                        "id": str(random.randint(100000, 999999)),
                        "type": "chat",
                        "sender_id": client_id,
                        "sender_name": username,
                        "content": content,
                        "timestamp": time.time()
                    }
                    
                    message_history.append(msg_obj)
                    if len(message_history) > MAX_HISTORY_LENGTH:
                        message_history.pop(0)
                    
                    logging.info(f"Broadcasting message from {username} ({client_id}): {content}")
                    await broadcast_message_to_all(json.dumps(msg_obj), websocket)
                    
                elif data.get("type") == "typing":
                    typing_data = {
                        "type": "typing",
                        "sender_id": client_id,
                        "sender_name": username,
                        "is_typing": data.get("is_typing", True)
                    }
                    await broadcast_message_to_all(json.dumps(typing_data), websocket)
                    
            except json.JSONDecodeError:
                client_ids[websocket]["type"] = "terminal"
                
                logging.info(f"Broadcasting message from Client {client_id}: {message}")
                
                terminal_msg = f"{client_id}:{message}"
                
                msg_obj = {
                    "id": str(random.randint(100000, 999999)),
                    "type": "chat",
                    "sender_id": client_id,
                    "sender_name": username,
                    "content": message,
                    "timestamp": time.time()
                }
                
                message_history.append(msg_obj)
                if len(message_history) > MAX_HISTORY_LENGTH:
                    message_history.pop(0)
                
                await broadcast_hybrid_message(terminal_msg, json.dumps(msg_obj), websocket)
                
    except ConnectionClosed:
        logging.info(f"Connection closed for Client {client_id}")
    except Exception as e:
        logging.error(f"Error handling client {client_id}: {e}")
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
        
        if websocket in client_ids:
            leaving_username = client_ids[websocket].get("username", f"User-{client_id[:3]}")
            del client_ids[websocket]
        
        await broadcast_user_event(client_id, "leave")
        
        logging.info(f"Client {client_id} ({leaving_username}) disconnected")


async def broadcast_message_to_all(message: str, sender: Optional[WebSocketServerProtocol] = None) -> None:
    if connected_clients:
        await asyncio.gather(
            *[client.send(message) for client in connected_clients if client != sender],
            return_exceptions=True
        )


async def broadcast_hybrid_message(terminal_msg: str, web_msg: str, sender: WebSocketServerProtocol) -> None:
    tasks = []
    
    for client in connected_clients:
        if client == sender:
            continue
            
        if client in client_ids and client_ids[client]["type"] == "web":
            tasks.append(client.send(web_msg))
        else:
            tasks.append(client.send(terminal_msg))
    
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


async def send_client_info(websocket: WebSocketServerProtocol) -> None:
    if websocket not in client_ids:
        return
        
    client_info = client_ids[websocket]
    
    active_users = []
    for client, info in client_ids.items():
        if client != websocket:
            active_users.append({
                "id": info["id"],
                "username": info["username"],
                "type": info["type"]
            })
    
    welcome_data = {
        "type": "welcome",
        "client": {
            "id": client_info["id"],
            "username": client_info["username"]
        },
        "active_users": active_users
    }
    
    try:
        await websocket.send(json.dumps(welcome_data))
    except Exception as e:
        logging.error(f"Error sending welcome to client {client_info['id']}: {e}")


async def broadcast_user_event(client_id: str, event_type: str, data: Dict[str, Any] = None) -> None:
    username = f"User-{client_id[:3]}"
    for info in client_ids.values():
        if info["id"] == client_id:
            username = info["username"]
            break
    
    event_data = {
        "type": "user_event",
        "event": event_type,
        "user": {
            "id": client_id,
            "username": username
        }
    }
    
    if data:
        event_data.update(data)
    
    await broadcast_message_to_all(json.dumps(event_data))


async def start_websocket_server() -> None:
    async with websockets.serve(handle_client, WS_HOST, WS_PORT):
        logging.info(f"WebSocket server started on {WS_SERVER_URL}")
        
        stop = asyncio.Future()
        await stop


async def handle_index(request):
    return web.FileResponse(os.path.join(STATIC_DIR, 'index.html'))


async def start_web_server() -> web.AppRunner:
    app = web.Application()
    
    app.router.add_get('/', handle_index)
    app.router.add_static('/static', STATIC_DIR)
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, WEB_HOST, WEB_PORT)
    await site.start()
    
    logging.info(f"Web server started on {WEB_SERVER_URL}")
    return runner


async def start_server() -> None:
    os.makedirs(STATIC_DIR, exist_ok=True)
    
    web_runner = await start_web_server()
    
    loop = asyncio.get_event_loop()
    
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(shutdown(web_runner)))
    
    try:
        await start_websocket_server()
    finally:
        await shutdown(web_runner)


async def shutdown(web_runner: web.AppRunner) -> None:
    logging.info("Shutting down servers...")
    await web_runner.cleanup()


async def send_messages(websocket: WebSocketServerProtocol, client_id: str) -> None:
    print(f"Type a message (or 'quit' to exit): ")
    while True:
        message = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
        message = message.strip()
        
        if message.lower() in ('quit', 'exit'):
            print(f"{Fore.YELLOW}Disconnecting from server...")
            break
            
        if message:
            try:
                await websocket.send(message)
                timestamp = time.strftime("%H:%M:%S")
                print(f"{Fore.GREEN}[{timestamp}] Sent: {message}")
            except Exception as e:
                print(f"{Fore.RED}Error sending message: {e}")
                break


async def receive_messages(websocket: WebSocketServerProtocol) -> None:
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                
                if data.get("type") == "chat":
                    timestamp = time.strftime("%H:%M:%S")
                    sender_name = data.get("sender_name", f"User-{data.get('sender_id', '???')[:3]}")
                    print(f"{Fore.BLUE}[{timestamp}] {sender_name}: {data.get('content', '')}")
                elif data.get("type") == "welcome":
                    client_info = data.get("client", {})
                    active_users = data.get("active_users", [])
                    print(f"{Fore.CYAN}Connected as {client_info.get('username')} (ID: {client_info.get('id')})")
                    if active_users:
                        print(f"{Fore.CYAN}Active users: {', '.join(user.get('username') for user in active_users)}")
                elif data.get("type") == "user_event":
                    event = data.get("event")
                    user = data.get("user", {})
                    username = user.get("username", f"User-{user.get('id', '???')[:3]}")
                    
                    if event == "join":
                        print(f"{Fore.YELLOW}{username} has joined the chat")
                    elif event == "leave":
                        print(f"{Fore.YELLOW}{username} has left the chat")
                    elif event == "rename":
                        old_name = data.get("old_username", "Unknown")
                        print(f"{Fore.YELLOW}{old_name} is now known as {username}")
                
            except json.JSONDecodeError:
                try:
                    sender_id, content = message.split(':', 1)
                    timestamp = time.strftime("%H:%M:%S")
                    print(f"{Fore.BLUE}[{timestamp}] Client {sender_id}: {content}")
                except ValueError:
                    print(f"{Fore.BLUE}Received: {message}")
    except ConnectionClosed:
        print(f"{Fore.YELLOW}Connection to server closed")
    except Exception as e:
        print(f"{Fore.RED}Error receiving messages: {e}")


async def start_client() -> None:
    client_id = str(random.randint(10000, 99999))
    
    print(f"Connecting to server at {WS_SERVER_URL}...")
    
    try:
        async with websockets.connect(WS_SERVER_URL) as websocket:
            print(f"{Fore.GREEN}Connected to server as Client {client_id}")
            
            receive_task = asyncio.create_task(receive_messages(websocket))
            send_task = asyncio.create_task(send_messages(websocket, client_id))
            
            done, pending = await asyncio.wait(
                [receive_task, send_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in pending:
                task.cancel()
                
    except ConnectionRefusedError:
        print(f"{Fore.RED}Error: Could not connect to server at {WS_SERVER_URL}")
        print(f"{Fore.YELLOW}Make sure the server is running with 'python broadcast_server.py start'")
    except Exception as e:
        print(f"{Fore.RED}Error: {e}")


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in ["start", "connect"]:
        print("Usage:")
        print("  python broadcast_server.py start    - Start the server")
        print("  python broadcast_server.py connect  - Connect to the server as a client")
        print(f"  Visit {WEB_SERVER_URL} in a browser for the web interface")
        sys.exit(1)
        
    command = sys.argv[1]
    
    try:
        if command == "start":
            print(f"{Fore.CYAN}Starting broadcast server...")
            print(f"{Fore.CYAN}WebSocket server: {WS_SERVER_URL}")
            print(f"{Fore.CYAN}Web interface: {WEB_SERVER_URL}")
            asyncio.run(start_server())
        elif command == "connect":
            asyncio.run(start_client())
    except KeyboardInterrupt:
        print(f"{Fore.YELLOW}Process interrupted. Exiting...")
    except Exception as e:
        print(f"{Fore.RED}Unexpected error: {e}")


if __name__ == "__main__":
    main()
