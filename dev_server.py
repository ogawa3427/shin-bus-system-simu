#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
import threading
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import websockets
import asyncio

PORT = 8000
WS_PORT = 8001

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, notify_callback):
        self.notify_callback = notify_callback
        self.last_notify = 0
        self.debounce_time = 0.3

    def on_modified(self, event):
        if event.is_directory:
            return

        if event.src_path.endswith(('.html', '.js', '.json', '.css')):
            current_time = time.time()
            if current_time - self.last_notify > self.debounce_time:
                self.last_notify = current_time
                self.notify_callback()

class HotReloadServer:
    def __init__(self):
        self.clients = set()
        self.observer = None
        self.ws_server = None

    def add_client(self, websocket):
        self.clients.add(websocket)

    def remove_client(self, websocket):
        self.clients.discard(websocket)

    async def notify_clients(self):
        if self.clients:
            message = json.dumps({'type': 'reload'})
            disconnected = set()
            for client in self.clients:
                try:
                    await client.send(message)
                except:
                    disconnected.add(client)
            self.clients -= disconnected

    def notify_sync(self):
        asyncio.run_coroutine_threadsafe(self.notify_clients(), self.loop)

    async def start_websocket_server(self):
        async def websocket_handler(websocket):
            self.add_client(websocket)
            try:
                await websocket.wait_closed()
            finally:
                self.remove_client(websocket)

        self.ws_server = await websockets.serve(
            websocket_handler,
            'localhost',
            WS_PORT
        )

    def start_file_watcher(self):
        event_handler = FileChangeHandler(self.notify_sync)
        self.observer = Observer()
        self.observer.schedule(
            event_handler,
            path=str(Path.cwd()),
            recursive=False
        )
        self.observer.start()

    def stop(self):
        if self.observer:
            self.observer.stop()
            self.observer.join()
        if self.ws_server:
            self.ws_server.close()

class HTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    project_root = None

    def translate_path(self, path):
        if self.project_root is None:
            return super().translate_path(path)
        
        # クエリパラメータを除去
        path = path.split('?')[0]
        
        # パスを解析
        path_parts = [p for p in path.strip('/').split('/') if p]
        
        # ルートのindex.htmlへのアクセス
        if not path_parts:
            return str(self.project_root / 'index.html')
        
        # hirosaka1/ へのアクセス
        if path_parts[0] == 'hirosaka1':
            if len(path_parts) == 1:
                # hirosaka1/ へのアクセスは index.html を返す
                return str(self.project_root / 'hirosaka1' / 'index.html')
            else:
                # hirosaka1/xxx へのアクセス
                file_path = self.project_root / 'hirosaka1' / '/'.join(path_parts[1:])
                return str(file_path)
        
        # ルートのファイルへのアクセス
        file_path = self.project_root / '/'.join(path_parts)
        return str(file_path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        pass

def run_websocket_server(hot_reload):
    hot_reload.loop = asyncio.new_event_loop()
    asyncio.set_event_loop(hot_reload.loop)
    hot_reload.loop.run_until_complete(hot_reload.start_websocket_server())
    hot_reload.loop.run_forever()

def main():
    # プロジェクトルートを取得（移動しない）
    project_root = Path(__file__).parent
    
    hot_reload = HotReloadServer()

    ws_thread = threading.Thread(
        target=run_websocket_server,
        args=(hot_reload,),
        daemon=True
    )
    ws_thread.start()

    time.sleep(0.5)

    hot_reload.start_file_watcher()

    # プロジェクトルートをクラス変数に設定
    HTTPRequestHandler.project_root = project_root
    
    with socketserver.TCPServer(("", PORT), HTTPRequestHandler) as httpd:
        print(f"Development server started: http://localhost:{PORT}")
        print(f"WebSocket server: ws://localhost:{WS_PORT}")
        print("Watching for file changes... (Ctrl+C to stop)")
        print(f"  - Root: http://localhost:{PORT}/")
        print(f"  - Hirosaka1: http://localhost:{PORT}/hirosaka1/")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server...")
            hot_reload.stop()
            httpd.shutdown()

if __name__ == '__main__':
    main()
