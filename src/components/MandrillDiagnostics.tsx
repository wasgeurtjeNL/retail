'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Key, 
  Mail,
  ExternalLink 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailConfig {
  configured: boolean;
  apiKey: string | null;
  fromEmail: string;
  fromName: string;
  environment: string;
  hasClient: boolean;
  keyFormat: string;
}

interface ConnectionTest {
  success: boolean;
  error?: string;
  message?: string;
  details?: any;
}

export default function MandrillDiagnostics() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [connectionTest, setConnectionTest] = useState<ConnectionTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [validationKey, setValidationKey] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email/config');
      const data = await response.json();

      if (data.success) {
        setConfig(data.configuration);
        setConnectionTest(data.connection);
      } else {
        toast.error('Failed to load email configuration');
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Error loading email configuration');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      const response = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' })
      });

      const data = await response.json();
      
      if (data.success) {
        setConnectionTest(data.test);
        if (data.test.success) {
          toast.success('Mandrill connection successful!');
        } else {
          toast.error('Mandrill connection failed');
        }
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Error testing connection');
    } finally {
      setTesting(false);
    }
  };

  const validateApiKey = async () => {
    if (!validationKey.trim()) {
      toast.error('Please enter an API key to validate');
      return;
    }

    try {
      const response = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'validate-key', 
          apiKey: validationKey.trim() 
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setValidationResult(data.validation);
        if (data.validation.format) {
          toast.success('API key format is valid!');
        } else {
          toast.error('API key format is invalid');
        }
      }
    } catch (error) {
      console.error('Error validating API key:', error);
      toast.error('Error validating API key');
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      const response = await fetch('/api/email/test-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: testEmail.trim(),
          templateKey: 'retailer_welcome'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Test email sent to ${testEmail}!`);
      } else {
        toast.error(`Failed to send test email: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Error sending test email');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mandrill Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2">Loading configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mandrill Configuration Status
          </CardTitle>
          <CardDescription>
            Current Mandrill email service configuration and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Key</span>
                <Badge variant={config?.configured ? "default" : "error"}>
                  {config?.configured ? 'Configured' : 'Missing'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Key Format</span>
                <Badge variant={config?.keyFormat === 'correct' ? "default" : "error"}>
                  {config?.keyFormat || 'Unknown'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Client Initialized</span>
                <Badge variant={config?.hasClient ? "default" : "error"}>
                  {config?.hasClient ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">From Email</span>
                <span className="text-sm text-gray-600">{config?.fromEmail}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">From Name</span>
                <span className="text-sm text-gray-600">{config?.fromName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Environment</span>
                <span className="text-sm text-gray-600">{config?.environment}</span>
              </div>
            </div>
          </div>

          {config?.apiKey && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Masked API Key</span>
              </div>
              <code className="text-xs bg-white px-2 py-1 rounded border">
                {config.apiKey}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Connection Test
          </CardTitle>
          <CardDescription>
            Test the connection to Mandrill API servers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              onClick={testConnection} 
              disabled={testing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>

            {connectionTest && (
              <div className="flex items-center gap-2">
                {connectionTest.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  connectionTest.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {connectionTest.success ? 'Connected' : 'Failed'}
                </span>
              </div>
            )}
          </div>

          {connectionTest && !connectionTest.success && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-900 mb-1">Connection Failed</h4>
                  <p className="text-sm text-red-800 mb-3">{connectionTest.error}</p>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-900">Troubleshooting:</p>
                    <ul className="text-xs text-red-800 space-y-1">
                      <li>• Check your MANDRILL_API_KEY in .env.local</li>
                      <li>• Ensure the key starts with "md-"</li>
                      <li>• Verify your Mandrill account is active</li>
                      <li>• Check if the API key has sending permissions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Key Validator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Validator
          </CardTitle>
          <CardDescription>
            Validate the format of a Mandrill API key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="md-xxxxxxxxxxxxxxxxxx"
              value={validationKey}
              onChange={(e) => setValidationKey(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={validateApiKey} variant="outline">
              Validate
            </Button>
          </div>

          {validationResult && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Format Valid:</span>
                  <Badge variant={validationResult.format ? "default" : "error"}>
                    {validationResult.format ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Correct Prefix:</span>
                  <Badge variant={validationResult.prefix ? "default" : "error"}>
                    {validationResult.prefix ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Length:</span>
                  <Badge variant={validationResult.length === 26 ? "default" : "error"}>
                    {validationResult.length}
                  </Badge>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Recommendations:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  {validationResult.recommendations?.map((rec: string, index: number) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Test Email
          </CardTitle>
          <CardDescription>
            Send a test email to verify the configuration works
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="your-email@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button onClick={sendTestEmail}>
              Send Test
            </Button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800">
                <p className="font-medium mb-1">Note:</p>
                <p>This will send a real email using the current Mandrill configuration. Make sure you have a valid API key configured.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help & Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Help & Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <a 
              href="https://mailchimp.com/developer/transactional/guides/quick-start/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Mandrill API Quick Start Guide
            </a>
            
            <a 
              href="https://mailchimp.com/developer/transactional/api/users/ping/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Mandrill API Reference
            </a>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Environment Variable Setup:</h4>
              <code className="text-xs bg-white px-2 py-1 rounded border block">
                MANDRILL_API_KEY=md-your-api-key-here
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 