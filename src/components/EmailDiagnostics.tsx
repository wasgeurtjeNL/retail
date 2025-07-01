'use client';

import React, { useState, useEffect } from 'react';

interface EmailStatus {
  isConfigured: boolean;
  apiKeyPresent: boolean;
  apiKeyValue: string | null;
  fromEmail: string;
  fromName: string;
  templatesLoaded?: boolean;
  templateCount?: number;
}

export default function EmailDiagnostics() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testApiKey, setTestApiKey] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [configureResult, setConfigureResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load email diagnostics
  useEffect(() => {
    async function loadDiagnostics() {
      try {
        setLoading(true);
        const response = await fetch('/api/email/diagnostics');
        const data = await response.json();
        
        if (data.success && data.emailStatus) {
          setStatus(data.emailStatus);
        }
      } catch (error) {
        console.error('Error loading email diagnostics:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadDiagnostics();
  }, []);

  // Configure new test API key
  const handleConfigureApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testApiKey || testApiKey.trim().length < 10) {
      setConfigureResult({
        success: false,
        message: 'Please enter a valid API key (at least 10 characters)'
      });
      return;
    }
    
    try {
      setConfigureResult(null);
      setSendingTest(true);
      
      const response = await fetch('/api/email/diagnostics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: testApiKey }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStatus(data.status);
        setConfigureResult({
          success: true,
          message: 'API key configured successfully'
        });
        // Clear the field
        setTestApiKey('');
      } else {
        setConfigureResult({
          success: false,
          message: data.error || 'Failed to configure API key'
        });
      }
    } catch (error) {
      setConfigureResult({
        success: false,
        message: 'An error occurred while configuring the API key'
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Send test email
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      setTestResult({
        success: false,
        message: 'Please enter a valid email address'
      });
      return;
    }
    
    try {
      setTestResult(null);
      setSendingTest(true);
      
      const response = await fetch('/api/email/test-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          templateKey: 'retailer-registration-confirmation',
          email: testEmail,
          testData: {
            contactName: 'John Doe',
            businessName: 'Testbedrijf BV',
            email: 'test@example.com',
            phone: '0612345678',
          }
        }),
      });
      
      const data = await response.json();
      
      setTestResult({
        success: data.success,
        message: data.success 
          ? `Test email sent to ${testEmail}! ${data.development ? '(Simulated in development mode)' : ''}` 
          : (data.error || 'Failed to send test email')
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'An error occurred while sending the test email'
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading email diagnostics...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Email Service Diagnostics</h2>
      
      {/* Status Overview */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Current Status</h3>
        {status && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-100 text-blue-800 rounded-md border border-blue-300">
              <p className="font-bold">Email configuratie is hardcoded</p>
              <p>De volgende waarden zijn hardcoded in de applicatie:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>API Key: {status.apiKeyValue}</li>
                <li>Afzender: {status.fromEmail}</li>
                <li>Afzender naam: {status.fromName}</li>
              </ul>
              <p className="mt-2 text-sm">Deze instellingen kunnen niet worden gewijzigd via de interface.</p>
            </div>

            {/* Show rest of diagnostics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status card */}
              <div className="p-4 bg-white rounded-md shadow">
                <h3 className="font-medium mb-2">Status</h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Geconfigureerd:</span>{' '}
                    {status.isConfigured ? (
                      <span className="text-green-600">Ja</span>
                    ) : (
                      <span className="text-red-600">Nee</span>
                    )}
                  </p>
                  <p>
                    <span className="font-medium">API Key aanwezig:</span>{' '}
                    {status.apiKeyPresent ? (
                      <span className="text-green-600">Ja</span>
                    ) : (
                      <span className="text-red-600">Nee</span>
                    )}
                  </p>
                  <p>
                    <span className="font-medium">Templates:</span>{' '}
                    {status.templatesLoaded ? (
                      <span className="text-green-600">
                        Geladen ({status.templateCount})
                      </span>
                    ) : (
                      <span className="text-red-600">Niet geladen</span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Test template card */}
              <div className="p-4 bg-white rounded-md shadow">
                <h3 className="font-medium mb-2">Test Email</h3>
                <form onSubmit={handleSendTest} className="space-y-3">
                  <div>
                    <input
                      type="email"
                      placeholder="Email adres voor test"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sendingTest}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {sendingTest ? "Versturen..." : "Verstuur test email"}
                  </button>
                  
                  {testResult && (
                    <div className={`p-3 rounded mt-3 ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {testResult.message}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
        <h4 className="font-medium mb-1">Troubleshooting</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Check if the Mandrill API key is correctly configured in the .env.local file</li>
          <li>Make sure MAIL_FROM_EMAIL and MAIL_FROM_NAME are set if you want to customize them</li>
          <li>If you're using the development environment, emails are simulated (not actually sent)</li>
          <li>Check for any error messages in the server logs</li>
        </ul>
      </div>
    </div>
  );
} 