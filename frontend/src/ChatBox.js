import React, { useState } from 'react';

function ChatBox({ chatLog, setChatLog, logContext }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async () => {
    if (!message.trim()) return;
    const userMessage = { sender: "user", text: message };
    setChatLog((prev) => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, log_context: logContext })
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        // Add the agent's response to chatLog
        setChatLog((prev) => [...prev, { sender: "agent", text: data.response }]);
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  // Function to format bullet point responses
  const formatBulletPoints = (text) => {
    if (!text) return '';
    // Split by new lines and render each bullet point separately
    return text.split('\n').map((line, i) => (
      line.trim() ? (
        <div key={i} className="mb-1">{line}</div>
      ) : null
    ));
  };

  return (
    <div className="flex flex-col h-96 border rounded-lg shadow-inner">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {chatLog.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 ${msg.sender === "agent" ? "text-left" : "text-right"}`}
          >
            <div
              className={`inline-block px-4 py-2 rounded-lg ${
                msg.sender === "agent"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {msg.sender === "agent" ? (
                <div className="text-left whitespace-pre-line">
                  {formatBulletPoints(msg.text)}
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && <p className="text-center text-red-500 p-2">{error}</p>}

      {/* Input box */}
      <div className="p-4 bg-white border-t flex">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-l-lg p-2 focus:outline-none"
          placeholder="Ask your cybersecurity question based on the uploaded log..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
        />
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 rounded-r-lg"
          onClick={sendMessage}
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default ChatBox;