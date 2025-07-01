"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "react-hot-toast";
import { FaEye, FaEdit, FaRegCreditCard, FaCheck, FaTimes, FaShippingFast, FaSpinner, FaFilter, FaEnvelope, FaCaretDown } from 'react-icons/fa';
import { formatDate, formatCurrency } from '@/lib/utils';
import { UserCircleIcon, CheckCircleIcon, XCircleIcon, ClockIcon, BanknotesIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { ChevronDownIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

// Type definities voor statuswaarden en betalingsmethoden
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'delivered' | 'processing' | 'shipped' | 'canceled';
export type PaymentStatus = 'not_started' | 'awaiting_payment' | 'pending' | 'paid' | 'failed' | 'expired';
export type PaymentOption = 'online' | 'invoice' | 'direct';
export type ShippingProvider = 'postnl' | 'dhl';
export type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled';
export type PaymentMethod = 'stripe' | 'invoice' | 'bank_transfer';

// Interface voor de emailconfiguratie
interface EmailConfig {
  subject: string;
  body: string;
}

export interface WasstripsApplication {
  id: string;
  name?: string;
  companyName?: string;
  businessName?: string; // Oude veldnaam
  email: string;
  phone: string;
  contactName?: string;
  contactPhone?: string;
  taxId?: string;
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  requestedPackages?: string;
  status: ApplicationStatus;
  createdAt?: string;
  updatedAt?: string;
  invoiceNumber?: string;
  trackingNumber?: string;
  paymentStatus: PaymentStatus;
  isPaid: boolean;
  paymentOptionSent?: boolean;
  paymentLinkSentAt?: string;
  paymentDueDate?: string;
  selectedPaymentOption?: PaymentOption | null;
  paymentDirectLink?: string;
  paymentInvoiceLink?: string;
  paymentDate?: string;
  notes: string;
  dontSendEmails?: boolean;
  needsShipment?: boolean;
  lastUpdated?: string;
  appliedAt: string;
  trackingCode?: string;
  shippingProvider?: ShippingProvider;
  fulfillmentStatus?: FulfillmentStatus;
  paymentMethod?: PaymentMethod;
  total?: number;
  conversations?: any[];
}

// Alias voor backwards compatibiliteit (moet alleen bestaan als een type)
type WasstripsApplicationStatus = ApplicationStatus;

// Payment status mapping voor UI elementen
const PAYMENT_STATUSES = {
  not_started: { label: 'Niet gestart', color: 'bg-yellow-100 text-yellow-800' },
  awaiting_payment: { label: 'Wacht op betaling', color: 'bg-yellow-100 text-yellow-800' },
  pending: { label: 'In afwachting', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Betaald', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Mislukt', color: 'bg-red-100 text-red-800' },
  expired: { label: 'Verlopen', color: 'bg-orange-100 text-orange-800' },
};

// Fulfillment status definities voor UI
const FULFILLMENT_STATUSES = {
  'pending': { label: 'In behandeling', color: 'yellow' },
  'processing': { label: 'In verwerking', color: 'blue' },
  'shipped': { label: 'Verzonden', color: 'indigo' },
  'delivered': { label: 'Afgeleverd', color: 'green' },
  'canceled': { label: 'Geannuleerd', color: 'red' },
};

// Constants and configuration
const APPLICATION_FEE = 49.95;
const PAYMENT_VALID_DAYS = 14;

export default function WasstripsApplicationsPage() {
  const [applications, setApplications] = useState<WasstripsApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "paid">("all");
  const [selectedApplication, setSelectedApplication] = useState<WasstripsApplication | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailText, setEmailText] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingApplication, setEditingApplication] = useState<WasstripsApplication | null>(null);
  const [selectedFulfillmentStatus, setSelectedFulfillmentStatus] = useState<string>('pending');
  const [trackingCode, setTrackingCode] = useState<string>('');
  const [shippingProvider, setShippingProvider] = useState<ShippingProvider>('postnl');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  // New state for multi-select functionality
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [sendingBulkPaymentLinks, setSendingBulkPaymentLinks] = useState(false);
  // New state for payment options modal
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [currentPaymentApplication, setCurrentPaymentApplication] = useState<WasstripsApplication | null>(null);
  const [isShowingPaymentOptions, setIsShowingPaymentOptions] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  
  const router = useRouter();

  // Fix the email config state
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    subject: '',
    body: ''
  });

  // Helper function for formatting currency
  const formatAmount = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) {
      return '€0,00';
    }
    return '€' + amount.toFixed(2).replace('.', ',');
  };

  // Toast helper functions
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast(message);
    }
  };

  // Helper function for updating applications
  const updateApplication = async (updatedApp: WasstripsApplication, currentApps: WasstripsApplication[], setAppsFn: React.Dispatch<React.SetStateAction<WasstripsApplication[]>>) => {
    // Update state onmiddellijk (optimistic update)
    const updatedApps = currentApps.map(app => 
      app.id === updatedApp.id ? updatedApp : app
    );
    
    setAppsFn(updatedApps);
    
    try {
      // Update naar de API
      const response = await fetch('/api/wasstrips-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedApp),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      return updatedApps;
    } catch (error) {
      console.error('Fout bij het bijwerken van aanvraag:', error);
      toast.error('Kon de aanvraag niet bijwerken. Probeer het later opnieuw.');
      
      // Terugdraaien van de wijziging bij een fout
      const originalApps = [...currentApps];
      setAppsFn(originalApps);
      return originalApps;
    }
  };

  // API email simulation
  const sendEmailViaApi = async (emailData: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    fromName?: string;
    replyTo?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    // For development purposes, just log the email data and show success
    console.log('Sending email via API:', emailData);
    
    // In a real implementation, this would call an API endpoint
    // For now, simulate success
    toast.success(`Email zou verzonden zijn naar ${emailData.to}`);
    
    return { success: true };
  };
  
  // Function to open application details
  const openApplicationDetail = (id: string) => {
    const application = applications.find(app => app.id === id);
    if (application) {
      console.log('Opening application details:', application);
      setSelectedApplication(application);
      // In a real app, you would open a modal or navigate to a details page
    } else {
      toast.error('Aanvraag niet gevonden');
    }
  };

  // Function to edit an application
  const handleEditApplication = (applicationOrId: WasstripsApplication | string) => {
    // Allow either application object or ID to be passed
    let application: WasstripsApplication | undefined;
    
    if (typeof applicationOrId === 'string') {
      // If ID was passed, look up the application
      application = applications.find(app => app.id === applicationOrId);
      if (!application) {
        toast.error('Aanvraag niet gevonden');
        return;
      }
    } else {
      // If application object was passed, use it directly
      application = applicationOrId;
    }
    
    setEditingApplication(application);
    setSelectedFulfillmentStatus(application.fulfillmentStatus || 'pending');
    setTrackingCode(application.trackingCode || '');
    setShippingProvider(application.shippingProvider || 'postnl');
    setOrderNotes(application.notes || '');
    // Open een modal of ander UI element om de bestelling te bewerken
    document.getElementById('editOrderModal')?.classList.remove('hidden');
  };

  // Function to delete an application via API
  const handleDeleteApplication = async (id: string) => {
    if (confirm("Weet u zeker dat u deze aanvraag wilt verwijderen?")) {
      try {
        // Optimistische update
        const updatedApps = applications.filter(app => app.id !== id);
        setApplications(updatedApps);
        
        // Verwijder via de API
        const response = await fetch(`/api/wasstrips-applications?id=${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.success) {
          toast.success('Aanvraag succesvol verwijderd');
        } else {
          throw new Error(result.error || 'Onbekende fout bij het verwijderen');
        }
      } catch (error) {
        console.error('Fout bij het verwijderen van aanvraag:', error);
        toast.error('Kon de aanvraag niet verwijderen. Probeer het later opnieuw.');
        
        // Laad de applicaties opnieuw bij een fout
        loadApplications();
      }
    }
  };

  // Improve row click handling
  const handleRowClick = (id: string, event: React.MouseEvent<HTMLTableRowElement>) => {
    // Zorg ervoor dat we alleen reageren als er op de rij zelf is geklikt, niet op knoppen binnenin
    const target = event.target as HTMLElement;
    if (target.tagName !== 'BUTTON' && !target.closest('button') && target.tagName !== 'INPUT' && !target.closest('input')) {
      // Toggle selectie
      if (selectedApplications.includes(id)) {
        setSelectedApplications(selectedApplications.filter(appId => appId !== id));
      } else {
        setSelectedApplications([...selectedApplications, id]);
      }
    }
  };

  // Save application changes
  const saveApplicationChanges = () => {
    if (!editingApplication) return;
    
    setIsSaving(true);
    
    try {
      // Update de bestelling met de nieuwe waarden
      const updatedApplications = applications.map(app => {
        if (app.id === editingApplication.id) {
          const updatedApp = {
            ...app,
            fulfillmentStatus: selectedFulfillmentStatus as FulfillmentStatus,
            trackingCode: trackingCode,
            shippingProvider: shippingProvider,
            notes: orderNotes,
            lastUpdated: new Date().toISOString()
          };
          
          // Update status indien nodig op basis van fulfillment status
          if (selectedFulfillmentStatus === 'shipped') {
            updatedApp.status = 'processing';
          } else if (selectedFulfillmentStatus === 'delivered') {
            updatedApp.status = 'delivered';
          } else if (selectedFulfillmentStatus === 'canceled') {
            updatedApp.status = 'canceled';
          }
          
          return updatedApp;
        }
        return app;
      });
      
      // Update state en localStorage
      setApplications(updatedApplications);
      localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
      
      // Sluit het modal en reset bewerking state
      document.getElementById('editOrderModal')?.classList.add('hidden');
      setEditingApplication(null);
      setIsSaving(false);
      
      toast.success('Bestelling succesvol bijgewerkt');
    } catch (error) {
      console.error('Fout bij het bijwerken van bestelling:', error);
      toast.error('Er is een fout opgetreden bij het bijwerken van de bestelling');
      setIsSaving(false);
    }
  };
  
  // Function to handle selection of individual applications - moved inside component scope
  const handleSelectApplication = (applicationId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedApplications([...selectedApplications, applicationId]);
    } else {
      setSelectedApplications(selectedApplications.filter(id => id !== applicationId));
    }
  };

  // Function to handle selection of all applications - moved inside component scope
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      // Select all visible applications that are not paid
      const filteredAppIds = filteredApplications
        .filter(app => !app.isPaid)
        .map(app => app.id);
      setSelectedApplications(filteredAppIds);
    } else {
      // Deselect all
      setSelectedApplications([]);
    }
  };

  // Show the payment options for a specific application
  const handleShowPaymentOptions = (applicationId: string) => {
    const application = applications.find(app => app.id === applicationId);
    if (application) {
      setCurrentPaymentApplication(application);
      setShowPaymentOptionsModal(true);
      setSelectedApplications([applicationId]);
    } else {
      toast.error('Aanvraag niet gevonden');
    }
  };

  // Handle bulk sending of payment options
  const handleSendBulkPaymentOptions = async () => {
    if (selectedApplications.length === 0) {
      toast.error('Selecteer ten minste één aanvraag om betalingsopties te verzenden');
      return;
    }
    
    setIsProcessingPayment(true);
    try {
      // Update selected applications with payment option flags
      const updatedApplications = applications.map(app => {
        if (selectedApplications.includes(app.id)) {
          const now = new Date();
          const paymentDueDate = new Date(now);
          paymentDueDate.setDate(paymentDueDate.getDate() + 14); // 14 dagen betalingstermijn
          
          return {
            ...app,
            paymentOptionSent: true,
            paymentLinkSentAt: now.toISOString(),
            // Remove any existing payment option choice to force retailer to choose
            selectedPaymentOption: null,
            // Add payment due date for invoice option
            paymentDueDate: paymentDueDate.toISOString(),
            notes: app.notes + `\n[${now.toLocaleString()}] Betalingsopties verzonden naar klant.`
          };
        }
        return app;
      });
      
      // Save to localStorage
      setApplications(updatedApplications);
      localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Betalingsopties verstuurd naar ${selectedApplications.length} aanvragen. Retailers kunnen nu zelf hun betaalmethode kiezen.`);
      setIsShowingPaymentOptions(false);
      setSelectedApplications([]);
      
      // Schedule payment reminders
      schedulePaymentReminders(updatedApplications.filter(app => selectedApplications.includes(app.id)));
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het verzenden van betalingsopties');
      console.error(error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Add function to schedule payment reminders
  const schedulePaymentReminders = (apps: WasstripsApplication[]) => {
    // In een echte implementatie zou dit via een API gebeuren
    // Voor demo doeleinden simuleren we dit met localStorage
    
    const existingReminders = JSON.parse(localStorage.getItem('paymentReminders') || '[]');
    const newReminders = [...existingReminders];
    
    apps.forEach(app => {
      if (!app.paymentDueDate) return;
      
      const dueDate = new Date(app.paymentDueDate);
      
      // Bereken wanneer de 4-dagen herinnering moet worden verstuurd
      const fourDayReminderDate = new Date(dueDate);
      fourDayReminderDate.setDate(dueDate.getDate() - 4);
      
      // Bereken wanneer de 1-dag herinnering moet worden verstuurd
      const oneDayReminderDate = new Date(dueDate);
      oneDayReminderDate.setDate(dueDate.getDate() - 1);
      
      // Voeg herinneringen toe aan de lijst
      newReminders.push({
        applicationId: app.id,
        email: app.email,
        type: '4-day',
        sendDate: fourDayReminderDate.toISOString(),
        sent: false,
        dueDate: app.paymentDueDate
      });
      
      newReminders.push({
        applicationId: app.id,
        email: app.email,
        type: '1-day',
        sendDate: oneDayReminderDate.toISOString(),
        sent: false,
        dueDate: app.paymentDueDate
      });
    });
    
    // Sla de herinneringen op
    localStorage.setItem('paymentReminders', JSON.stringify(newReminders));
    console.log('Betalingsherinneringen ingepland:', newReminders);
  };
  
  // Check for payment reminders that need to be sent
  useEffect(() => {
    const checkPaymentReminders = () => {
      const reminders = JSON.parse(localStorage.getItem('paymentReminders') || '[]');
      if (reminders.length === 0) return;
      
      const now = new Date();
      const updatedReminders = [...reminders];
      let remindersSent = false;
      
      updatedReminders.forEach(reminder => {
        // Controleer of de herinnering al verstuurd is
        if (reminder.sent) return;
        
        // Controleer of het tijd is om de herinnering te versturen
        const sendDate = new Date(reminder.sendDate);
        if (sendDate <= now) {
          // Markeer als verstuurd
          reminder.sent = true;
          remindersSent = true;
          
          // Zoek de bijbehorende applicatie op
          const app = applications.find(a => a.id === reminder.applicationId);
          if (app && !app.isPaid) {
            // Stuur de herinnering via de emailfunctie
            const daysRemaining = reminder.type === '4-day' ? 4 : 1;
            sendPaymentReminderEmail(app, daysRemaining);
            
            // Update de notities van de applicatie
            const updatedApplications = applications.map(a => {
              if (a.id === app.id) {
                return {
                  ...a,
                  notes: a.notes + `\n[${now.toLocaleString()}] ${daysRemaining}-dagen betalingsherinnering verstuurd.`
                };
              }
              return a;
            });
            
            setApplications(updatedApplications);
            localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
          }
        }
      });
      
      // Sla de bijgewerkte herinneringen op als er iets verstuurd is
      if (remindersSent) {
        localStorage.setItem('paymentReminders', JSON.stringify(updatedReminders));
      }
    };
    
    // Check direct en stel een interval in om elke 30 minuten te controleren
    checkPaymentReminders();
    const intervalId = setInterval(checkPaymentReminders, 30 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [applications]);
  
  // Add function to send payment reminder email
  const sendPaymentReminderEmail = async (application: WasstripsApplication, daysRemaining: number) => {
    if (!application.email) return;
    
    const urgencyLevel = daysRemaining <= 1 ? 'DRINGEND' : 'Belangrijk';
    const emailSubject = `${urgencyLevel}: Herinnering betaling Wasstrips bestelling - ${application.id}`;
    const dueDate = application.paymentDueDate 
      ? new Date(application.paymentDueDate).toLocaleDateString('nl-NL')
      : 'binnenkort';
    
    const emailBody = `
      Beste ${application.contactName},
      
      Dit is een herinnering voor de betaling van uw Wasstrips bestelling (${application.id}).
      
      ${daysRemaining <= 1 
        ? 'DRINGEND: U heeft nog slechts 1 dag om de betaling te voldoen!' 
        : `U heeft nog ${daysRemaining} dagen om de betaling te voldoen.`}
      
      Uiterste betaaldatum: ${dueDate}
      
      Ga naar uw dashboard om direct te betalen of kies een betaalmethode:
      https://wasgeurtje.nl/retailer-dashboard/orders
      
      Als u vragen heeft over uw bestelling of betaling, neem dan contact met ons op.
      
      Met vriendelijke groet,
      Het Wasgeurtje Team
    `;
    
    // Simuleer het versturen van de email (in een echte implementatie zou dit de email API aanroepen)
    console.log(`Betalingsherinnering verstuurd aan ${application.email}:`, {
      subject: emailSubject,
      body: emailBody
    });
    
    // Simuleer het resultaat van de email API
    return { success: true };
  };

  // Function to load applications (needed for processPayment)
  const loadApplications = async () => {
    setIsLoading(true);
    try {
      // Probeer eerst uit wasstrips-applications
      const storedApplications = localStorage.getItem('wasstrips-applications');
      let appList: WasstripsApplication[] = [];
      
      if (storedApplications) {
        appList = JSON.parse(storedApplications);
      }
      
      // Probeer ook uit wasstrips-admin-applications (nieuwe key)
      const storedAdminApplications = localStorage.getItem('wasstrips-admin-applications');
      if (storedAdminApplications) {
        const adminApps = JSON.parse(storedAdminApplications);
        
        // Voeg admin apps toe, maar vermijd duplicaten op basis van ID
        adminApps.forEach((adminApp: WasstripsApplication) => {
          if (!appList.some(app => app.id === adminApp.id)) {
            appList.push(adminApp);
          }
        });
      }
      
      if (appList.length > 0) {
        console.log(`[DEBUG] Geladen aanvragen: ${appList.length}`);
        
        // Sorteer op meest recente eerst (obv appliedAt datum)
        appList.sort((a, b) => 
          new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
        );
        
        setApplications(appList);
        
        // Bewaar de gecombineerde lijst in beide opslaglocaties
        localStorage.setItem('wasstrips-applications', JSON.stringify(appList));
        localStorage.setItem('wasstrips-admin-applications', JSON.stringify(appList));
      } else {
        // Initialize with empty array if no data
        localStorage.setItem('wasstrips-applications', JSON.stringify([]));
        localStorage.setItem('wasstrips-admin-applications', JSON.stringify([]));
        setApplications([]);
      }
    } catch (error) {
      console.error("Error loading applications:", error);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Functie om de betaling te verwerken
  const processPayment = async (method: PaymentMethod) => {
    if (selectedApplications.length === 0) return;
    
    setIsProcessingPayment(true);
    try {
      // Implementeer hier de betalingslogica
      console.log(`Processing payment with method: ${method} for applications:`, selectedApplications);
      
      // Reset na succesvolle verwerking
      setSelectedApplications([]);
      setIsShowingPaymentOptions(false);
      
      // Herlaad applicaties om status updates te zien
      await loadApplications();
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Load applications from storage
  useEffect(() => {
    // Functie om aanvragen te laden
    const loadApplications = async () => {
      setIsLoading(true);
      try {
        // Probeer eerst uit wasstrips-applications
        const storedApplications = localStorage.getItem('wasstrips-applications');
        let appList: WasstripsApplication[] = [];
        
        if (storedApplications) {
          appList = JSON.parse(storedApplications);
        }
        
        // Probeer ook uit wasstrips-admin-applications (nieuwe key)
        const storedAdminApplications = localStorage.getItem('wasstrips-admin-applications');
        if (storedAdminApplications) {
          const adminApps = JSON.parse(storedAdminApplications);
          
          // Voeg admin apps toe, maar vermijd duplicaten op basis van ID
          adminApps.forEach((adminApp: WasstripsApplication) => {
            if (!appList.some(app => app.id === adminApp.id)) {
              appList.push(adminApp);
            }
          });
        }
        
        if (appList.length > 0) {
          console.log(`[DEBUG] Geladen aanvragen: ${appList.length}`);
          
          // Sorteer op meest recente eerst (obv appliedAt datum)
          appList.sort((a, b) => 
            new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
          );
          
          setApplications(appList);
          
          // Bewaar de gecombineerde lijst in beide opslaglocaties
          localStorage.setItem('wasstrips-applications', JSON.stringify(appList));
          localStorage.setItem('wasstrips-admin-applications', JSON.stringify(appList));
        } else {
          // Initialize with empty array if no data
          localStorage.setItem('wasstrips-applications', JSON.stringify([]));
          localStorage.setItem('wasstrips-admin-applications', JSON.stringify([]));
          setApplications([]);
        }
      } catch (error) {
        console.error("Error loading applications:", error);
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Laad gegevens direct
    loadApplications();

    // Periodiek controleren op nieuwe aanvragen (elke 5 seconden)
    const intervalId = setInterval(() => {
      loadApplications();
    }, 5000);

    // Set up an event listener to refresh data when a new application is added
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wasstripsApplication' || e.key === 'wasstrips-applications' || e.key === 'wasstrips-admin-applications' || e.key === 'wasstrips-customer-application') {
        // When a new application is submitted, sync it with our admin list
        try {
          if (e.key === 'wasstripsApplication' && e.newValue) {
            const newApplication = JSON.parse(e.newValue);
            if (newApplication.applied) {
              syncApplicationFromCustomer(newApplication);
            }
          } else {
            // Direct reload from applications list
            console.log(`[DEBUG] Storage event voor ${e.key}, data wordt opnieuw geladen`);
            loadApplications();
          }
        } catch (error) {
          console.error("Error processing storage event:", error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Check for existing customer applications that we haven't processed yet
    syncExistingApplications();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  // Laad aanvragen via de API
  useEffect(() => {
    // Functie om aanvragen te laden vanaf de API
    const loadApplications = async () => {
      setIsLoading(true);
      try {
        // Haal data op van de API
        const response = await fetch('/api/wasstrips-applications');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`[DEBUG] Geladen aanvragen: ${data.length}`);
          
          // Sorteer op meest recente eerst (obv appliedAt datum)
          data.sort((a, b) => 
            new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
          );
          
          setApplications(data);
        } else {
          // Geen data gevonden of een lege array
          console.log('[DEBUG] Geen aanvragen gevonden in de API');
          setApplications([]);
        }
      } catch (error) {
        console.error("Error loading applications:", error);
        toast.error("Kon aanvragen niet laden. Probeer het later opnieuw.");
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Laad gegevens direct
    loadApplications();

    // Periodiek controleren op nieuwe aanvragen (elke 5 seconden)
    const intervalId = setInterval(() => {
      loadApplications();
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Sync any existing customer applications with our admin list
  const syncExistingApplications = () => {
    try {
      const customerApplication = localStorage.getItem('wasstripsApplication');
      if (customerApplication) {
        const application = JSON.parse(customerApplication);
        if (application.applied) {
          syncApplicationFromCustomer(application);
        }
      }
    } catch (error) {
      console.error("Error syncing existing applications:", error);
    }
  };

  // Sync a customer application to our admin list
  const syncApplicationFromCustomer = (customerApp: any) => {
    if (!customerApp.email || !customerApp.appliedAt) return;

    const existingApps = JSON.parse(localStorage.getItem('wasstrips-applications') || '[]');
    
    // Check if this application is already in our list
    const exists = existingApps.some((app: WasstripsApplication) => 
      app.email === customerApp.email && 
      app.appliedAt === customerApp.appliedAt
    );

    if (!exists) {
      // Get retailer info from localStorage if available
      let retailerInfo: {
        businessName?: string;
        contactName?: string;
        email?: string;
        phone?: string;
      } = {};
      try {
        const registrationData = localStorage.getItem('registrationData');
        if (registrationData) {
          retailerInfo = JSON.parse(registrationData);
        }
      } catch (error) {
        console.error("Error parsing registration data:", error);
      }

      // Create a new application entry
      const newApplication: WasstripsApplication = {
        id: `WS-${Date.now()}`,
        businessName: retailerInfo.businessName || customerApp.businessName || 'Onbekend bedrijf',
        contactName: retailerInfo.contactName || customerApp.contactName || 'Onbekende contactpersoon',
        email: retailerInfo.email || customerApp.email || 'geen@email.com',
        phone: retailerInfo.phone || customerApp.phone || 'Geen telefoonnummer',
        address: customerApp.address || "",
        status: "pending",
        appliedAt: customerApp.appliedAt,
        notes: "",
        isPaid: false,
        paymentStatus: 'not_started',
        paymentMethod: 'invoice',
        total: 199.95,
        trackingCode: "",
        shippingProvider: 'postnl',
        fulfillmentStatus: 'pending',
        paymentDueDate: ""
      };

      // Add to the applications list
      const updatedApps = [...existingApps, newApplication];
      localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApps));
      localStorage.setItem('wasstrips-admin-applications', JSON.stringify(updatedApps));
      setApplications(updatedApps);

      // Send confirmation email - always send this for new applications
      sendApplicationConfirmationEmail(newApplication);
      
      // Show toast notification
      toast.success('Nieuwe aanvraag ontvangen en bevestigingsmail verstuurd!');
    }
  };

  // Add a function to send status update email to customer
  const sendStatusEmail = (application: WasstripsApplication) => {
    if (!application.email) return;
    
    let subject = '';
    let body = '';
    
    // Customize email based on application status
    switch(application.status) {
      case 'approved':
        subject = `Uw Wasstrips aanvraag ${application.id} is goedgekeurd`;
        body = `Beste ${application.contactName},\n\nUw aanvraag voor Wasstrips is goedgekeurd. U ontvangt binnenkort een betaallink om uw bestelling af te ronden.\n\nMet vriendelijke groet,\nHet Wasstrips Team`;
        break;
      case 'rejected':
        subject = `Uw Wasstrips aanvraag ${application.id} kon niet worden goedgekeurd`;
        body = `Beste ${application.contactName},\n\nHelaas kunnen we uw aanvraag voor Wasstrips op dit moment niet goedkeuren. Voor meer informatie kunt u contact met ons opnemen.\n\nMet vriendelijke groet,\nHet Wasstrips Team`;
        break;
      case 'processing':
        subject = `Uw Wasstrips bestelling ${application.id} wordt verwerkt`;
        body = `Beste ${application.contactName},\n\nUw Wasstrips bestelling wordt nu verwerkt. U ontvangt een verzendbevestiging zodra uw bestelling onderweg is.\n\nMet vriendelijke groet,\nHet Wasstrips Team`;
        break;
      case 'delivered':
        subject = `Uw Wasstrips bestelling ${application.id} is geleverd`;
        body = `Beste ${application.contactName},\n\nUw Wasstrips bestelling is geleverd! We hopen dat u tevreden bent met uw aankoop.\n\nMet vriendelijke groet,\nHet Wasstrips Team`;
        break;
      default:
        subject = `Update voor uw Wasstrips aanvraag ${application.id}`;
        body = `Beste ${application.contactName},\n\nEr is een update voor uw Wasstrips aanvraag. De huidige status is: ${application.status}.\n\nMet vriendelijke groet,\nHet Wasstrips Team`;
    }
    
    // Call email API (simulated for now)
    console.log('Sending status email', {
      to: application.email,
      subject,
      body
    });
    
    // Return success for now
    return true;
  };

  // Update the application status function to handle the correct types
  const updateApplicationStatus = (application: WasstripsApplication, newStatus: WasstripsApplicationStatus) => {
    const updatedApplication = {
      ...application,
      status: newStatus,
      lastUpdated: new Date().toISOString()
    };
    
    // Update the application in state and localStorage
    updateApplication(updatedApplication, applications, setApplications);
    
    // Send notification email based on new status
    sendStatusEmail(updatedApplication);
    
    toast.success(`Aanvraag status gewijzigd naar ${newStatus}`);
  };

  // Delete application
  const deleteApplication = async (id: string) => {
    if (confirm("Weet u zeker dat u deze aanvraag wilt verwijderen?")) {
      try {
        // Optimistische update
        const updatedApps = applications.filter(app => app.id !== id);
        setApplications(updatedApps);
        
        // Verwijder via de API
        const response = await fetch(`/api/wasstrips-applications?id=${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.success) {
          toast.success('Aanvraag succesvol verwijderd');
        } else {
          throw new Error(result.error || 'Onbekende fout bij het verwijderen');
        }
      } catch (error) {
        console.error('Fout bij het verwijderen van aanvraag:', error);
        toast.error('Kon de aanvraag niet verwijderen. Probeer het later opnieuw.');
        
        // Laad de applicaties opnieuw bij een fout
        loadApplications();
      }
    }
  };

  // Filter applications based on active tab
  const filteredApplications = applications.filter(app => {
    if (statusFilter === "all") return true;
    if (statusFilter === "paid") return app.isPaid;
    return app.status === statusFilter;
  });

  // Select an application for email sending
  const selectApplicationForEmail = (app: WasstripsApplication) => {
    setSelectedApplication(app);
    
    // Pre-populate email fields based on status
    let subject = "";
    let text = "";
    
    if (app.status === "pending") {
      subject = `Uw Wasstrips aanvraag is ontvangen - ${app.id}`;
      text = `Beste ${app.contactName},

Hartelijk dank voor uw aanmelding voor onze exclusieve Wasstrips!

Uw aanvraag met referentienummer ${app.id} is bij ons in goede orde ontvangen en wordt momenteel verwerkt.

Om uw plek in de wachtrij te garanderen, vragen wij u vriendelijk om de aanbetaling van 10% (minimaal €30) zo spoedig mogelijk te voldoen. U kunt dit doen via de betaallink die u heeft ontvangen.

Na ontvangst van uw betaling zullen wij uw aanvraag prioriteren op basis van de volgorde van ontvangst.

Heeft u vragen? Aarzel dan niet om contact met ons op te nemen.

Met vriendelijke groet,
Het Wasgeurtje Team`;
    } else if (app.status === "approved") {
      subject = `Goed nieuws! Uw Wasstrips aanvraag is goedgekeurd - ${app.id}`;
      text = `Beste ${app.contactName},

Goed nieuws! Uw aanvraag voor Wasstrips met referentienummer ${app.id} is goedgekeurd.

Wij hebben uw aanbetaling in goede orde ontvangen en uw bestelling is nu in behandeling. U ontvangt binnenkort informatie over de levering van uw Wasstrips.

Als u vragen heeft over uw bestelling, aarzel dan niet om contact met ons op te nemen.

Met vriendelijke groet,
Het Wasgeurtje Team`;
    } else if (app.status === "processing") {
      subject = `Update: Uw Wasstrips bestelling wordt verwerkt - ${app.id}`;
      text = `Beste ${app.contactName},

Wij zijn bezig met het verwerken van uw Wasstrips bestelling met referentienummer ${app.id}.

Uw bestelling heeft prioriteit gekregen en zal binnenkort worden verzonden. Wij streven ernaar om uw bestelling zo snel mogelijk bij u te leveren.

U ontvangt een bevestiging met track & trace informatie zodra uw pakket is verzonden.

Met vriendelijke groet,
Het Wasgeurtje Team`;
    } else if (app.status === "delivered") {
      subject = `Uw Wasstrips bestelling is geleverd - ${app.id}`;
      text = `Beste ${app.contactName},

Uw Wasstrips bestelling met referentienummer ${app.id} is geleverd.

Wij hopen dat u tevreden bent met uw aankoop. Heeft u vragen over het gebruik van Wasstrips of wilt u een nabestelling plaatsen? Neem dan contact met ons op.

Met vriendelijke groet,
Het Wasgeurtje Team`;
    }
    
    setEmailSubject(subject);
    setEmailText(text);
  };

  // Update the function to generate a payment link that gets sent to the customer
  const generatePaymentLink = (application: WasstripsApplication) => {
    if (!application.email) {
      toast.error('Geen e-mailadres beschikbaar voor deze aanvraag');
      return;
    }

    // Create a payment link with the application data
    const paymentLink = `https://yourwebsite.com/pay?id=${application.id}&amount=${application.total || 499}&name=${encodeURIComponent(application.businessName || application.companyName || 'Wasgeurtje Retailer')}`;
    
    // Copy to clipboard for admin to share manually
    navigator.clipboard.writeText(paymentLink);
    
    // Update the application with payment details
    const updatedApplications = applications.map((app) => {
      if (app.id === application.id) {
        return {
          ...app,
          paymentStatus: 'not_started' as PaymentStatus,
          paymentMethod: 'invoice' as PaymentMethod,
          paymentDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          notes: app.notes + `\n[${new Date().toLocaleString()}] Betaallink gegenereerd en gemaild naar klant.`
        };
      }
      return app;
    });
    
    setApplications(updatedApplications);
    localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
    
    // Automatically send an email with the payment link to the customer
    sendPaymentLinkEmail(application, paymentLink);
    
    toast.success('Betaallink gegenereerd, naar klipbord gekopieerd en per e-mail verzonden naar klant');
  };

  // Add a new function to send the payment link email
  const sendPaymentLinkEmail = (application: WasstripsApplication, paymentLink: string) => {
    // In a real implementation, this would use your email API
    console.log(`Sending payment link email to ${application.email}`);
    
    const emailSubject = `Betaallink voor uw Wasstrips aanvraag - ${application.id}`;
    const emailBody = `
      Beste ${application.contactName},
      
      Bedankt voor uw aanvraag voor Wasstrips. Uw aanvraag met ID ${application.id} is goedgekeurd.
      
      Om uw bestelling af te ronden, kunt u nu betalen via de onderstaande link:
      ${paymentLink}
      
      De betaling dient binnen 7 dagen te worden voldaan.
      
      Na ontvangst van uw betaling zullen we uw Wasstrips zo snel mogelijk verzenden.
      
      Met vriendelijke groet,
      Het Wasstrips Team
    `;
    
    // Here we would actually call the email API, but for now we'll simulate it
    setTimeout(() => {
      console.log('Email sent successfully', {
        to: application.email,
        subject: emailSubject,
        body: emailBody
      });
      
      // Update application to reflect email was sent
      const updatedApplications = applications.map((app) => {
        if (app.id === application.id) {
          return {
            ...app,
            notes: app.notes + `\n[${new Date().toLocaleString()}] Betaallink e-mail verzonden.`
          };
        }
        return app;
      });
      
      setApplications(updatedApplications);
      localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
    }, 1000);
  };

  // Update the email sending function to actually send emails
  const sendStatusUpdateEmail = (application: WasstripsApplication) => {
    if (!application || !application.email) {
      toast.error('Geen e-mailadres beschikbaar voor deze aanvraag');
      return;
    }
    
    let emailSubject = '';
    let emailBody = '';
    
    // Customize email based on application status
    if (application.status === 'approved') {
      emailSubject = `Uw Wasstrips aanvraag ${application.id} is goedgekeurd`;
      emailBody = `
        Beste ${application.contactName},
        
        Goed nieuws! Uw aanvraag voor Wasstrips met ID ${application.id} is goedgekeurd.
        
        U kunt binnenkort een betaallink verwachten om uw bestelling af te ronden.
        
        Met vriendelijke groet,
        Het Wasstrips Team
      `;
    } else if (application.status === 'processing') {
      emailSubject = `Uw Wasstrips aanvraag ${application.id} wordt verwerkt`;
      emailBody = `
        Beste ${application.contactName},
        
        Uw betaling voor Wasstrips met ID ${application.id} is ontvangen en we zijn bezig met het verwerken van uw bestelling.
        
        U ontvangt een verzendbevestiging zodra uw bestelling onderweg is.
        
        Met vriendelijke groet,
        Het Wasstrips Team
      `;
    } else if (application.status === 'delivered') {
      emailSubject = `Uw Wasstrips bestelling ${application.id} is verzonden`;
      emailBody = `
        Beste ${application.contactName},
        
        Uw Wasstrips bestelling met ID ${application.id} is verzonden!
        
        ${application.trackingCode ? `U kunt uw zending volgen met tracking code: ${application.trackingCode}` : ''}
        
        We horen graag wat u van het product vindt.
        
        Met vriendelijke groet,
        Het Wasstrips Team
      `;
    } else if (application.isPaid) {
      emailSubject = `Betaling bevestigd voor uw Wasstrips aanvraag ${application.id}`;
      emailBody = `
        Beste ${application.contactName},
        
        We hebben uw betaling voor Wasstrips met ID ${application.id} ontvangen.
        
        Uw bestelling wordt nu verwerkt en u ontvangt binnenkort een verzendbevestiging.
        
        Met vriendelijke groet,
        Het Wasstrips Team
      `;
    } else {
      emailSubject = `Update over uw Wasstrips aanvraag ${application.id}`;
      emailBody = `
        Beste ${application.contactName},
        
        Dit is een update over uw Wasstrips aanvraag met ID ${application.id}.
        
        De status van uw aanvraag is: ${application.status}.
        
        Als u vragen heeft, kunt u altijd contact met ons opnemen.
        
        Met vriendelijke groet,
        Het Wasstrips Team
      `;
    }
    
    // Here we would actually call the email API, but for now we'll simulate it
    console.log('Sending status email', {
      to: application.email,
      subject: emailSubject,
      body: emailBody
    });
    
    setTimeout(() => {
      console.log('Email sent successfully');
      
      // Update application to reflect email was sent
      const updatedApplications = applications.map((app) => {
        if (app.id === application.id) {
          return {
            ...app,
            notes: app.notes + `\n[${new Date().toLocaleString()}] Status update e-mail verzonden.`
          };
        }
        return app;
      });
      
      setApplications(updatedApplications);
      localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
      
      toast.success('Status update e-mail verzonden');
    }, 1000);
  };

  // Update the handleUpdateStatus function to automatically send email notifications
  const handleUpdateStatus = (applicationId: string, newStatus: WasstripsApplicationStatus) => {
    const updatedApplications = applications.map((app) => {
      if (app.id === applicationId) {
        const updatedApp = {
          ...app,
          status: newStatus,
          lastUpdated: new Date().toISOString()
        };
        
        // Automatically send an email notification when status changes
        setTimeout(() => sendStatusUpdateEmail(updatedApp), 500);
        
        return updatedApp;
      }
      return app;
    });
    
    setApplications(updatedApplications);
    localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
    
    toast.success(`Status bijgewerkt naar ${newStatus}`);
  };

  // Ensure the sendCustomEmail function properly updates the application history and UI
  const sendCustomEmail = async () => {
    if (!selectedApplication) {
      toast.error('Geen applicatie geselecteerd voor email');
      return;
    }

    if (!emailSubject || !emailText) {
      toast.error('Onderwerp en inhoud zijn verplicht');
      return;
    }

    setSendingEmail(true);

    const result = await sendEmailViaApi({
      to: selectedApplication.email,
      subject: emailSubject,
      html: emailText.replace(/\n/g, '<br>'),
      text: emailText,
      replyTo: 'info@wasgeurtje.nl'
    });

    setSendingEmail(false);

    if (result.success) {
      // Record the email in the application's conversation history
      const updatedApplications = applications.map(app => {
        if (app.id === selectedApplication.id) {
          const conversations = app.conversations || [];
          return {
            ...app,
            conversations: [
              ...conversations,
              {
                date: new Date().toISOString(),
                subject: emailSubject,
                content: emailText,
                type: 'email' as const,
                direction: 'outbound' as const
              }
            ],
            lastUpdated: new Date().toISOString()
          };
        }
        return app;
      });

      // Update state and localStorage
      setApplications(updatedApplications);
      localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
      
      // Close modal and reset form
      setSelectedApplication(null);
      setEmailSubject('');
      setEmailText('');
      
      // Show success toast
      toast.success(`Email verzonden naar ${selectedApplication.email}`);
    } else {
      toast.error(`Fout bij versturen email: ${result.error || 'Onbekende fout'}`);
    }
  };

  // Replace the sendApplicationConfirmationEmail function
  const sendApplicationConfirmationEmail = async (application: WasstripsApplication) => {
    const subject = 'Bedankt voor je Wasstrips aanvraag - Wasgeurtje.nl';
    const content = `
Beste ${application.contactName},

Bedankt voor je aanvraag voor de Wasstrips. We hebben je aanvraag ontvangen en zullen deze zo snel mogelijk beoordelen.

Details van je aanvraag:
- Naam: ${application.contactName}
- Email: ${application.email}
- Telefoon: ${application.phone || 'Niet opgegeven'}
- Totaalbedrag: €${formatAmount(application.total || 499)}

Je ontvangt binnen 1-2 werkdagen een update over de status van je aanvraag.

Met vriendelijke groet,
Team Wasgeurtje.nl
  `;

    const result = await sendEmailViaApi({
      to: application.email,
      subject,
      html: content.replace(/\n/g, '<br>'),
      text: content,
      replyTo: 'info@wasgeurtje.nl'
    });

    if (result.success) {
      // Record the email in the application's conversation history
      const updatedApplications = applications.map(app => {
        if (app.id === application.id) {
          return {
            ...app,
            conversations: [
              ...(app.conversations || []),
              {
                date: new Date().toISOString(),
                subject,
                content,
                type: 'confirmation' as const,
                direction: 'outbound' as const
              }
            ]
          };
        }
        return app;
      });

      setApplications(updatedApplications);
      localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
      return true;
    } else {
      console.error('Error sending confirmation email:', result.error);
      return false;
    }
  };

  // Functie om de betaalstatus van een aanvraag te bepalen
  const getPaymentStatus = (application: WasstripsApplication): 'not_started' | 'awaiting_payment' | 'paid' | 'failed' | 'expired' | 'pending' => {
    if (application.isPaid) return 'paid';
    if (application.paymentStatus) return application.paymentStatus;
    
    // Standaard terugvallen op not_started als er geen specifieke status is
    return 'not_started';
  };

  // Functie om de visuele betaalstatus badge weer te geven
  const getPaymentStatusBadge = (application: WasstripsApplication) => {
    const status = getPaymentStatus(application);
    
    // Bereken dagen tot vervaldatum indien beschikbaar
    let daysRemaining: number | null = null;
    if (application.paymentDueDate) {
      const today = new Date();
      const dueDate = new Date(application.paymentDueDate);
      const diffTime = dueDate.getTime() - today.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Betaald
          </span>
        );
      case 'pending':
        if (application.selectedPaymentOption === 'invoice') {
        return (
          <div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
                Op factuur (kan verzonden worden)
            </span>
            {daysRemaining !== null && daysRemaining > 0 && (
              <div className="text-sm mt-1.5 text-gray-600 font-medium">
                  Betaaltermijn: nog {daysRemaining} {daysRemaining === 1 ? 'dag' : 'dagen'}
              </div>
            )}
            {daysRemaining !== null && daysRemaining < 0 && (
              <div className="text-sm mt-1.5 text-red-600 font-medium">
                  Factuur {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dag' : 'dagen'} over tijd
              </div>
            )}
          </div>
        );
        } else if (application.selectedPaymentOption === 'direct') {
          return (
            <div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Directe betaling in afwachting
              </span>
              <div className="text-sm mt-1.5 text-gray-600 font-medium">
                Verzenden na ontvangst betaling
              </div>
            </div>
          );
        } else {
          return (
            <div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                In afwachting van keuze
              </span>
            </div>
          );
        }
      case 'expired':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
            <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Factuur verlopen
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Betaling mislukt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Geen betaalstatus
          </span>
        );
    }
  };

  // Functie om een betaling te starten voor een Wasstrips aanvraag
  const handlePayNow = async (application: WasstripsApplication) => {
    setIsLoading(true);
    
    try {
      // Genereer betaallink URL (dit zou normaal via Stripe API gaan)
      const paymentUrl = `/payment/${application.id}?amount=${application.total || 499}&description=Wasstrips+aanvraag+${application.id}`;
      
      // Kopieer de betaallink naar clipboard
      await navigator.clipboard.writeText(window.location.origin + paymentUrl);
      
      // Update de applicatie om te noteren dat er een betaallink is gegenereerd
      const now = new Date().toLocaleString();
      const updatedNotes = application.notes 
        ? `${application.notes}\n${now}: Betaallink gegenereerd en gekopieerd naar clipboard`
        : `${now}: Betaallink gegenereerd en gekopieerd naar clipboard`;
        
      const updatedApplication = {
        ...application,
        notes: updatedNotes
      };
      
      // Update de application in state en localStorage
      updateApplication(updatedApplication, applications, setApplications);
      
      toast.success(
        <div>
          <p>Betaallink is gegenereerd en gekopieerd naar clipboard</p>
          <button 
            onClick={() => window.open(paymentUrl, '_blank')}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Open betaalpagina
          </button>
        </div>,
        { duration: 5000 }
      );
      
    } catch (error) {
      console.error('Fout bij genereren betaallink:', error);
      toast.error('Er is een fout opgetreden bij het genereren van de betaallink');
    } finally {
      setIsLoading(false);
    }
  };

  // Code voor update tracking info
  const updateTrackingCode = (application: WasstripsApplication, trackingCode: string) => {
    const updatedApplication = {
      ...application,
      trackingCode: trackingCode,
      fulfillmentStatus: 'shipped' as FulfillmentStatus,
      lastUpdated: new Date().toISOString()
    };
    
    // Update de application in state en localStorage
    updateApplication(updatedApplication, applications, setApplications);
    
    // Send tracking update email
    sendTrackingUpdateEmail(updatedApplication);
    
    toast.success(`Tracking code bijgewerkt en e-mail verzonden naar ${application.email}`);
  };
  
  // Verstuur een e-mail met tracking informatie
  const sendTrackingUpdateEmail = async (application: WasstripsApplication, trackingCode: string = '', provider: 'postnl' | 'dhl' = 'postnl') => {
    // Use the application's tracking code and provider if not explicitly provided
    const trackCode = trackingCode || application.trackingCode || '';
    const shipProvider = provider || application.shippingProvider || 'postnl';
    
    if (!trackCode) {
      toast.error("Geen tracking code beschikbaar om te versturen");
      return false;
    }
    
    const providerName = shipProvider === 'postnl' ? 'PostNL' : 'DHL';
    const trackingUrl = shipProvider === 'postnl' 
      ? `https://jouw.postnl.nl/track-and-trace/${trackCode}/NL` 
      : `https://www.dhl.com/nl-nl/home/tracking/tracking-parcel.html?submit=1&tracking-id=${trackCode}`;
    
    const subject = `Uw Wasstrips bestelling is verzonden - Track & Trace Code - ${application.id}`;
    const text = `Beste ${application.contactName},

Goed nieuws! Uw Wasstrips bestelling met referentienummer ${application.id} is verzonden.

U kunt uw pakket volgen met de volgende gegevens:
Tracking code: ${trackCode}
Bezorgdienst: ${providerName}
Track & trace link: ${trackingUrl}

We verwachten dat uw pakket binnen 1-3 werkdagen bij u wordt afgeleverd. Houd uw e-mail en telefoon in de gaten voor updates van de bezorgdienst.

Heeft u nog vragen over uw bestelling? Neem dan gerust contact met ons op.

Met vriendelijke groet,
Het Wasgeurtje Team`;

    // Send the email via our API function
    const result = await sendEmailViaApi({
      to: application.email,
      subject,
      html: text.replace(/\n/g, '<br>'),
      text,
      replyTo: 'info@wasgeurtje.nl'
    });
    
    if (result.success) {
      // Update de applicatie met een notitie over de tracking informatie
      const updatedApps = applications.map(app => {
        if (app.id === application.id) {
          const now = new Date().toLocaleString();
          const newNotes = app.notes 
            ? `${app.notes}\n\n${now}: Tracking code ${trackCode} (${providerName}) ingesteld en e-mail verzonden.`
            : `${now}: Tracking code ${trackCode} (${providerName}) ingesteld en e-mail verzonden.`;
          
          // Add to conversation history
          const conversations = app.conversations || [];
          return { 
            ...app,
            notes: newNotes,
            conversations: [
              ...conversations,
              {
                date: new Date().toISOString(),
                subject,
                content: text,
                type: 'status_update' as const,
                direction: 'outbound' as const
              }
            ],
            lastUpdated: new Date().toISOString()
          };
        }
        return app;
      });
      
      localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApps));
      setApplications(updatedApps);
      return true;
    } else {
      toast.error(`Fout bij versturen email naar ${application.email}`);
      return false;
    }
  };

  // Helper functie om applicaties op te slaan in localStorage
  const saveApplicationsToLocalStorage = (apps: WasstripsApplication[]) => {
    localStorage.setItem('wasstrips-applications', JSON.stringify(apps));
  };

  // Sluit het bewerkingsvenster
  const handleCloseModal = () => {
    setEditingApplication(null);
    setSelectedFulfillmentStatus('pending');
    setTrackingCode('');
    setShippingProvider('postnl');
    setOrderNotes('');
    // Close the modal
    document.getElementById('editOrderModal')?.classList.add('hidden');
  };

  // Sla de bewerkingen op
  const handleSaveApplication = async () => {
    if (!editingApplication) return;
    
    setIsSaving(true);
    
    try {
      const updatedApplications = applications.map(app => {
        if (app.id === editingApplication.id) {
          const updatedApp = {
            ...app,
            fulfillmentStatus: selectedFulfillmentStatus as 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled',
            trackingCode: trackingCode,
            shippingProvider: shippingProvider,
            notes: orderNotes,
            // Update de status ook wanneer het relevant is
            status: selectedFulfillmentStatus === 'delivered' ? 'delivered' as WasstripsApplicationStatus : app.status
          };
          
          // Als we de status wijzigen naar 'shipped', stuur dan een e-mail met tracking info
          if (selectedFulfillmentStatus === 'shipped' && trackingCode && 
              (app.fulfillmentStatus !== 'shipped' || app.trackingCode !== trackingCode)) {
            sendTrackingUpdateEmail(updatedApp, trackingCode, shippingProvider);
          }
          
          return updatedApp;
        }
        return app;
      });
      
      saveApplicationsToLocalStorage(updatedApplications);
      setApplications(updatedApplications);
      handleCloseModal();
      
    } catch (error) {
      console.error('Error updating application:', error);
      alert('Er is een fout opgetreden bij het opslaan van de wijzigingen.');
    } finally {
      setIsSaving(false);
    }
  };

  // Update the function to process payment option choice
  const handleProcessPaymentOption = async (option: 'direct' | 'invoice') => {
    if (!currentPaymentApplication) return;
    
    // Update application with selection
    const updatedApplication = {
      ...currentPaymentApplication,
      selectedPaymentOption: option,
      paymentMethod: option === 'direct' ? 'stripe' as PaymentMethod : 'invoice' as PaymentMethod,
      lastUpdated: new Date().toISOString()
    };
    
    // Update in state and localStorage
    const updatedApplications = applications.map(app => 
      app.id === updatedApplication.id ? updatedApplication : app
    );
    
    setApplications(updatedApplications);
    localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
    
    // Create payment links or invoice based on option
    if (option === 'direct') {
      // Logic to create Stripe payment link
      generatePaymentLink(updatedApplication);
    } else {
      // Logic to generate invoice
      createInvoice(updatedApplication);
    }
    
    // Close modal
    setShowPaymentOptionsModal(false);
    setCurrentPaymentApplication(null);
    
    toast.success(`Betaalmethode ingesteld op: ${option === 'direct' ? 'Direct betalen' : 'Betalen op rekening'}`);
  };

  // Update the function to create an invoice with proper types
  const createInvoice = (application: WasstripsApplication) => {
    // Generate an invoice number
    const invoiceNumber = `INV-${application.id}-${Date.now().toString().slice(-6)}`;
    
    // Update application with invoice details
      const updatedApplications = applications.map(app => {
        if (app.id === application.id) {
          return {
            ...app,
          invoiceNumber,
          paymentMethod: 'invoice' as PaymentMethod,
          paymentStatus: 'pending' as PaymentStatus,
          // Zet direct op processing voor verzending
          fulfillmentStatus: 'processing' as FulfillmentStatus,
          status: 'processing' as ApplicationStatus,
          paymentDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
          notes: app.notes + `\n[${new Date().toLocaleString()}] Factuur #${invoiceNumber} aangemaakt. Klaar voor verzending.`
          };
        }
        return app;
      });
      
      setApplications(updatedApplications);
    localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
    
    // Send invoice email
    sendInvoiceEmail(application, invoiceNumber);
    
    toast.success(`Factuur #${invoiceNumber} aangemaakt en verzonden naar ${application.email}. Bestelling is klaar voor verzending.`);
  };

  // Add a function to send invoice email
  const sendInvoiceEmail = (application: WasstripsApplication, invoiceNumber: string) => {
    if (!application.email) return;
    
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('nl-NL');
    const emailSubject = `Factuur #${invoiceNumber} voor uw Wasstrips bestelling`;
    const emailBody = `
      Beste ${application.contactName},
      
      Bedankt voor uw bestelling van Wasstrips.
      
      Hierbij ontvangt u de factuur #${invoiceNumber} voor uw bestelling.
      
      Factuurbedrag: €${formatAmount(application.total || 0)}
      Betalingstermijn: 14 dagen
      Uiterste betaaldatum: ${dueDate}
      
      U kunt betalen via bankoverschrijving naar:
      
      IBAN: NL12 RABO 0123 4567 89
      T.n.v.: Wasgeurtje BV
      Onder vermelding van: ${invoiceNumber}
      
      **GOED NIEUWS**: Uw bestelling wordt al direct verzonden! U heeft 14 dagen de tijd om de factuur te betalen.
      
      Met vriendelijke groet,
      Het Wasstrips Team
    `;
    
    // Here we would call the email API
    console.log('Sending invoice email', {
      to: application.email,
      subject: emailSubject,
      body: emailBody
    });
  };

  // Render PaymentOptionsModal component
  const PaymentOptionsModal = () => {
    if (!showPaymentOptionsModal || !currentPaymentApplication) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Selecteer betaalmethode</h3>
            <button
              onClick={() => setShowPaymentOptionsModal(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Voor retailer: <span className="font-medium text-gray-900">{currentPaymentApplication.businessName}</span>
            </p>
            <p className="text-sm text-gray-600">
              Bestelling: <span className="font-medium text-gray-900">{currentPaymentApplication.id}</span>
            </p>
          </div>
          
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleProcessPaymentOption('direct')}
              className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-md py-3 px-4 hover:bg-blue-50 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-2 mr-3">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Direct betalen</p>
                  <p className="text-sm text-gray-500">Via iDeal, creditcard of PayPal</p>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <button
              onClick={() => handleProcessPaymentOption('invoice')}
              className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-md py-3 px-4 hover:bg-blue-50 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <div className="bg-amber-100 rounded-full p-2 mr-3">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Betalen op rekening</p>
                  <p className="text-sm text-gray-500">Factuur met betalingstermijn van 14 dagen</p>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-md">
            <p>Let op: Producten worden pas verzonden na ontvangst van betaling.</p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        {/* Verbeterde header met beschrijving en acties */}
        <div className="bg-white shadow rounded-lg px-6 py-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl font-bold text-gray-900">Wasstrips Aanvragen</h1>
              <p className="mt-1 text-sm text-gray-500">
                Beheer en verwerk aanvragen voor het exclusieve Wasstrips product
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  // Testdata toevoegen voor ontwikkeling
                  const testData: WasstripsApplication[] = [
                    {
                      id: `WS-${Date.now()}`,
                      businessName: 'Wasserij De Spetter',
                      contactName: 'Pieter van Dam',
                      email: 'info@despetter.nl',
                      phone: '0612345678',
                      address: "Wasserijstraat 45, Amsterdam",
                      status: "pending",
                      appliedAt: new Date().toISOString(),
                      notes: "",
                      isPaid: false,
                      paymentStatus: 'pending',
                      paymentMethod: 'stripe',
                      total: 199.95,
                      trackingCode: "",
                      shippingProvider: 'postnl',
                      fulfillmentStatus: 'pending',
                      paymentDueDate: ""
                    },
                    {
                      id: `WS-${Date.now() + 1}`,
                      businessName: 'Wasmachine Outlet Oost',
                      contactName: 'Sandra Bergkamp',
                      email: 'sandra@wasoutlet.nl',
                      phone: '0687654321',
                      address: "Outletlaan 789, Utrecht",
                      status: "approved",
                      appliedAt: new Date().toISOString(),
                      notes: "VIP klant, prioriteit geven",
                      isPaid: true,
                      paymentStatus: 'paid',
                      paymentMethod: 'stripe',
                      total: 199.95,
                      trackingCode: "",
                      shippingProvider: 'postnl',
                      fulfillmentStatus: 'pending',
                      paymentDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
                    }
                  ];
                  
                  // Combineer met bestaande data of maak nieuwe array
                  const existingData = JSON.parse(localStorage.getItem('wasstrips-applications') || '[]');
                  const updatedData = [...existingData, ...testData];
                  
                  // Sla op en werk state bij
                  localStorage.setItem('wasstrips-applications', JSON.stringify(updatedData));
                  setApplications(updatedData);
                }}
                className="flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Test aanvragen toevoegen
              </button>
              <Link
                href="/dashboard"
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Terug naar Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Verbeterde tab en filter balk */}
        <div className="mb-6 bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setStatusFilter("all")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  statusFilter === "all"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Alle ({applications.length})
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  statusFilter === "pending"
                    ? "border-yellow-500 text-yellow-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                In afwachting ({applications.filter(a => a.status === "pending").length})
              </button>
              <button
                onClick={() => setStatusFilter("approved")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  statusFilter === "approved"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Goedgekeurd ({applications.filter(a => a.status === "approved").length})
              </button>
              <button
                onClick={() => setStatusFilter("processing")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  statusFilter === "processing"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                In behandeling ({applications.filter(a => a.status === "processing").length})
              </button>
              <button
                onClick={() => setStatusFilter("delivered")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  statusFilter === "delivered"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Geleverd ({applications.filter(a => a.status === "delivered").length})
              </button>
              <button
                onClick={() => setStatusFilter("paid")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  statusFilter === "paid"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Betaald ({applications.filter(a => a.isPaid).length})
              </button>
            </nav>
          </div>

          {filteredApplications.length === 0 ? (
            // Verbeterde lege staat met illustratie en instructies
            <div className="text-center py-12 px-6 bg-white">
              <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Geen aanvragen gevonden</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
                Er zijn nog geen Wasstrips aanvragen voor deze categorie. Aanvragen verschijnen hier automatisch wanneer retailers het aanvraagformulier op de website invullen.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    // Testdata toevoegen voor ontwikkeling
                    const testData: WasstripsApplication[] = [
                      {
                        id: `WS-${Date.now()}`,
                        businessName: 'Wasserij De Spetter',
                        contactName: 'Pieter van Dam',
                        email: 'info@despetter.nl',
                        phone: '0612345678',
                        address: "Wasserijstraat 45, Amsterdam",
                        status: "pending",
                        appliedAt: new Date().toISOString(),
                        notes: "",
                        isPaid: false,
                        paymentStatus: 'pending',
                        paymentMethod: 'stripe',
                        total: 199.95,
                        trackingCode: "",
                        shippingProvider: 'postnl',
                        fulfillmentStatus: 'pending',
                        paymentDueDate: ""
                      },
                      {
                        id: `WS-${Date.now() + 1}`,
                        businessName: 'Wasmachine Outlet Oost',
                        contactName: 'Sandra Bergkamp',
                        email: 'sandra@wasoutlet.nl',
                        phone: '0687654321',
                        address: "Outletlaan 789, Utrecht",
                        appliedAt: new Date().toISOString(),
                        isPaid: true,
                        status: "approved",
                        notes: "VIP klant, prioriteit geven",
                        paymentStatus: 'paid',
                        total: 199.95
                      }
                    ];
                    
                    // Combineer met bestaande data of maak nieuwe array
                    const existingData = JSON.parse(localStorage.getItem('wasstrips-applications') || '[]');
                    const updatedData = [...existingData, ...testData];
                    
                    // Sla op en werk state bij
                    localStorage.setItem('wasstrips-applications', JSON.stringify(updatedData));
                    setApplications(updatedData);
                  }}
                  className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 mx-auto"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Voeg testdata toe
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {/* Empty header for checkbox */}
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bedrijf
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Betaalstatus
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Track & Trace
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((application) => {
                    const isSelectable = !application.isPaid && 
                      !application.paymentOptionSent && 
                      (application.status === 'approved' || application.status === 'pending');
                    
                    return (
                      <tr 
                        key={application.id} 
                        onClick={(e) => handleRowClick(application.id, e)}
                        className={`${selectedApplications.includes(application.id) ? 'bg-blue-50' : ''} hover:bg-gray-50 cursor-pointer`}
                      >
                        <td className="px-3 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedApplications.includes(application.id)}
                            onChange={(e) => handleSelectApplication(application.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()} // Voorkom bubbelen om te voorkomen dat de hele rij wordt geselecteerd
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {application.id}
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {application.businessName}
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{application.contactName}</div>
                          <div className="text-sm text-gray-500">{application.email}</div>
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(application.appliedAt)}
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {/* Existing status badge code */}
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {application.paymentOptionSent && !application.isPaid && (
                            <div className="mb-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Betaalopties verzonden
                              </span>
                            </div>
                          )}
                          {application.selectedPaymentOption && (
                            <div className="mb-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                application.selectedPaymentOption === 'direct' 
                                  ? 'bg-cyan-100 text-cyan-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {application.selectedPaymentOption === 'direct' ? 'Directe betaling' : 'Op rekening'}
                        </span>
                            </div>
                          )}
                          {getPaymentStatusBadge(application)}
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {/* Existing tracking code display */}
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openApplicationDetail(application.id)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                            >
                              <FaEye className="w-3 h-3 mr-1" />
                              Details
                            </button>

                            <button
                              onClick={() => handleEditApplication(application.id)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-indigo-500 text-xs font-medium rounded text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none"
                            >
                              <FaEdit className="w-3 h-3 mr-1" />
                              Bewerken
                            </button>
                            
                          <button
                              onClick={() => handleDeleteApplication(application.id)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-red-500 text-xs font-medium rounded text-white bg-red-500 hover:bg-red-600 focus:outline-none"
                            >
                              <FaTimes className="w-3 h-3 mr-1" />
                              Verwijderen
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Add the bulk actions bar with select all checkbox and send button */}
        <div className="bg-white shadow rounded-lg mb-4 p-4 sticky top-16 z-10">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                    <input
                  type="checkbox"
                  id="select-all"
                  onChange={handleSelectAll}
                  checked={selectedApplications.length > 0 && selectedApplications.length === filteredApplications.filter(app => 
                    !app.isPaid && 
                    !app.paymentOptionSent && 
                    (app.status === 'approved' || app.status === 'pending')).length}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
                  Selecteer alle
                </label>
                  </div>

              <div className="text-sm text-gray-500">
                {selectedApplications.length > 0 ? `${selectedApplications.length} geselecteerd` : ''}
              </div>
                  </div>

                    <button
              onClick={handleSendBulkPaymentOptions}
              disabled={selectedApplications.length === 0 || sendingBulkPaymentLinks}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                selectedApplications.length === 0 || sendingBulkPaymentLinks ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {sendingBulkPaymentLinks ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verzenden...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Betaalverzoek versturen
                </>
              )}
                    </button>
                  </div>
                </div>
        
        {/* Render the payment options modal */}
        <PaymentOptionsModal />
      </div>

      {/* Edit Order Modal - add this near the end of the component, before the final closing tags */}
      <div id="editOrderModal" className="hidden fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Bestelling bewerken
                    </h3>
                
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="fulfillmentStatus" className="block text-sm font-medium text-gray-700">Status</label>
                    <select 
                      id="fulfillmentStatus" 
                      value={selectedFulfillmentStatus} 
                      onChange={(e) => setSelectedFulfillmentStatus(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    >
                      {Object.entries(FULFILLMENT_STATUSES).map(([value, { label }]) => (
                        <option key={value} value={value} className="text-gray-900">{label}</option>
                      ))}
                    </select>
                </div>

                  <div>
                    <label htmlFor="trackingCode" className="block text-sm font-medium text-gray-700">Tracking Code</label>
                    <input
                      type="text"
                      id="trackingCode" 
                      value={trackingCode} 
                      onChange={(e) => setTrackingCode(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                      placeholder="Voer tracking code in"
                    />
                  </div>

                  <div>
                    <label htmlFor="shippingProvider" className="block text-sm font-medium text-gray-700">Verzendmethode</label>
                    <select 
                      id="shippingProvider" 
                      value={shippingProvider} 
                      onChange={(e) => setShippingProvider(e.target.value as 'postnl' | 'dhl')}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    >
                      <option value="postnl" className="text-gray-900">PostNL</option>
                      <option value="dhl" className="text-gray-900">DHL</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notities</label>
                    <textarea
                      id="notes" 
                      value={orderNotes} 
                      onChange={(e) => setOrderNotes(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                      placeholder="Voeg notities toe over deze bestelling"
                    ></textarea>
                  </div>
                </div>
              </div>
                  </div>

            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                onClick={saveApplicationChanges}
                disabled={isSaving}
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isSaving ? 'Opslaan...' : 'Wijzigingen opslaan'}
                    </button>
                    <button
                      type="button"
                onClick={() => {
                  document.getElementById('editOrderModal')?.classList.add('hidden');
                  setEditingApplication(null);
                }}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              </div>
      </div>
    </div>
  );
}