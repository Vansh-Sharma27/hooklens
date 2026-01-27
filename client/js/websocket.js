class WebSocketClient {
  constructor(endpointId, onMessage, onStatusChange) {
    this.endpointId = endpointId;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.isConnecting = false;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.onStatusChange?.('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.onStatusChange?.('connected');

      this.ws.send(
        JSON.stringify({
          type: 'SUBSCRIBE',
          endpointId: this.endpointId
        })
      );
    };

    this.ws.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        this.onMessage?.(message);
      } catch (error) {
        console.error('Invalid WebSocket message', error);
      }
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.onStatusChange?.('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = error => {
      console.error('WebSocket error:', error);
      this.isConnecting = false;
    };
  }

  scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts += 1;
    this.onStatusChange?.('reconnecting');
    setTimeout(() => this.connect(), delay);
  }

  updateEndpoint(endpointId) {
    this.endpointId = endpointId;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'SUBSCRIBE',
          endpointId: this.endpointId
        })
      );
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default WebSocketClient;
