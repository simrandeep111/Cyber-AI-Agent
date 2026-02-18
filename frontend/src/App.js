import React, { useState } from 'react';
import Graph from './Graph';
import ChatBox from './ChatBox';

function App() {
  const [activeTab, setActiveTab] = useState("analyze");
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadLog = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'An error occurred.');
      } else {
        setAnalysis(data);
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-100 to-gray-200 p-8">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-blue-700">
        Cybersecurity AI Agent
      </h1>
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Tabs */}
        <div className="flex">
          <button
            className={`w-1/2 py-4 text-lg font-semibold ${
              activeTab === "analyze"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setActiveTab("analyze")}
          >
            Log Analysis
          </button>
          <button
            className={`w-1/2 py-4 text-lg font-semibold ${
              activeTab === "chat"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setActiveTab("chat")}
          >
            Chat with Agent
          </button>
        </div>

        {/* Log Analysis Tab */}
        {activeTab === "analyze" && (
          <div className="p-6">
            <div className="mb-4">
              <input
                type="file"
                accept=".log,.txt"
                onChange={handleFileChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={uploadLog}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded transition duration-300"
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Upload & Analyze Log'}
            </button>
            {error && (
              <p className="mt-4 text-center text-red-500">{error}</p>
            )}
            {analysis && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">
                  Analysis Report
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded shadow-sm">
                    <p><strong>Timestamp:</strong> {analysis.timestamp}</p>
                    <p><strong>Risk Score:</strong> {analysis.risk_score}%</p>
                    <p><strong>Threat Level:</strong> {analysis.threat_level}</p>
                  </div>
                  <div className="p-4 border rounded shadow-sm">
                    <h3 className="text-xl font-semibold mb-2">Warnings</h3>
                    <ul className="list-disc pl-5">
                      <li>Critical: {analysis.warnings.critical}</li>
                      <li>High: {analysis.warnings.high}</li>
                      <li>Medium: {analysis.warnings.medium}</li>
                    </ul>
                  </div>
                </div>
                {/* Graph */}
                <div className="mt-8">
                  <h3 className="text-2xl font-semibold text-blue-700 mb-4 text-center">
                    Risk Trend Graph
                  </h3>
                  {analysis.trends && analysis.trends.labels && analysis.trends.labels.length > 0 ? (
                    <Graph trendData={analysis.trends} />
                  ) : (
                    <p className="text-center">No trend data available.</p>
                  )}
                </div>
                {/* Info Banner */}
                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded text-center">
                  <p className="text-green-700">
                    All systems are operating within safe parameters. Remember to analyze your logs monthly to stay ahead of potential risks.
                  </p>
                </div>
                {/* Mitigations */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-bold text-blue-800 mb-2">Mitigation Suggestions</h4>
                  <ul className="list-disc pl-5">
                    {analysis.actions && analysis.actions.map((action, index) => (
                      <li key={index}>
                        <span className="font-semibold">{action.priority}:</span> {action.action}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Detailed Report */}
                <div className="mt-8 p-6 border-t">
                  <h4 className="text-2xl font-semibold text-blue-700 mb-2">Detailed Report</h4>
                  <p className="whitespace-pre-line text-gray-800">{analysis.report}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <div className="p-6">
            <ChatBox
              chatLog={chatLog}
              setChatLog={setChatLog}
              logContext={analysis ? analysis.raw_analysis : ""}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
