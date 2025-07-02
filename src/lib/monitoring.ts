// Monitoring library voor wasstrips order workflow
// Houdt bij van order events, performance metrics en errors

interface MonitoringEvent {
  event_type: 'order_created' | 'order_updated' | 'payment_status_change' | 'error' | 'performance';
  order_id?: string;
  order_number?: string;
  user_email?: string;
  status_from?: string;
  status_to?: string;
  error_message?: string;
  performance_metric?: {
    operation: string;
    duration_ms: number;
    success: boolean;
  };
  metadata?: any;
  timestamp: string;
}

class WasstripsMonitoring {
  private events: MonitoringEvent[] = [];
  private isProduction = process.env.NODE_ENV === 'production';

  // Log een order event
  logOrderEvent(
    eventType: 'order_created' | 'order_updated' | 'payment_status_change',
    data: {
      orderId?: string;
      orderNumber?: string;
      userEmail?: string;
      statusFrom?: string;
      statusTo?: string;
      metadata?: any;
    }
  ) {
    const event: MonitoringEvent = {
      event_type: eventType,
      order_id: data.orderId,
      order_number: data.orderNumber,
      user_email: data.userEmail,
      status_from: data.statusFrom,
      status_to: data.statusTo,
      metadata: data.metadata,
      timestamp: new Date().toISOString()
    };

    this.addEvent(event);
    
    // Log naar console met duidelijke prefix
    console.log(`[WASSTRIPS-MONITOR] ${eventType.toUpperCase()}:`, {
      order: data.orderNumber || data.orderId,
      user: data.userEmail,
      change: data.statusFrom ? `${data.statusFrom} → ${data.statusTo}` : 'new',
      timestamp: event.timestamp
    });
  }

  // Log een error
  logError(
    errorMessage: string,
    context: {
      orderId?: string;
      orderNumber?: string;
      userEmail?: string;
      operation?: string;
      metadata?: any;
    }
  ) {
    const event: MonitoringEvent = {
      event_type: 'error',
      order_id: context.orderId,
      order_number: context.orderNumber,
      user_email: context.userEmail,
      error_message: errorMessage,
      metadata: {
        operation: context.operation,
        ...context.metadata
      },
      timestamp: new Date().toISOString()
    };

    this.addEvent(event);
    
    // Log naar console als error
    console.error(`[WASSTRIPS-ERROR] ${context.operation || 'Unknown'}:`, {
      error: errorMessage,
      order: context.orderNumber || context.orderId,
      user: context.userEmail,
      timestamp: event.timestamp
    });
  }

  // Log performance metrics
  logPerformance(
    operation: string,
    durationMs: number,
    success: boolean,
    context?: {
      orderId?: string;
      orderNumber?: string;
      userEmail?: string;
      metadata?: any;
    }
  ) {
    const event: MonitoringEvent = {
      event_type: 'performance',
      order_id: context?.orderId,
      order_number: context?.orderNumber,
      user_email: context?.userEmail,
      performance_metric: {
        operation,
        duration_ms: durationMs,
        success
      },
      metadata: context?.metadata,
      timestamp: new Date().toISOString()
    };

    this.addEvent(event);
    
    // Log alleen slow operations (>1000ms) of failures
    if (durationMs > 1000 || !success) {
      console.warn(`[WASSTRIPS-PERF] ${operation}:`, {
        duration: `${durationMs}ms`,
        success,
        order: context?.orderNumber || context?.orderId,
        user: context?.userEmail,
        timestamp: event.timestamp
      });
    }
  }

  // Helper functie voor timing van operaties
  async timeOperation<T>(
    operation: string,
    asyncOperation: () => Promise<T>,
    context?: {
      orderId?: string;
      orderNumber?: string;
      userEmail?: string;
      metadata?: any;
    }
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    
    try {
      const result = await asyncOperation();
      success = true;
      return result;
    } catch (error) {
      this.logError(
        error instanceof Error ? error.message : 'Unknown error',
        {
          operation,
          ...context,
          metadata: { ...context?.metadata, error }
        }
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logPerformance(operation, duration, success, context);
    }
  }

  // Voeg event toe aan in-memory store
  private addEvent(event: MonitoringEvent) {
    this.events.push(event);
    
    // Houd alleen laatste 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  // Haal recente events op voor debugging
  getRecentEvents(limit = 50): MonitoringEvent[] {
    return this.events.slice(-limit);
  }

  // Haal events op voor specifieke order
  getOrderEvents(orderNumber: string): MonitoringEvent[] {
    return this.events.filter(e => e.order_number === orderNumber);
  }

  // Haal error events op
  getRecentErrors(limit = 20): MonitoringEvent[] {
    return this.events
      .filter(e => e.event_type === 'error')
      .slice(-limit);
  }

  // Performance summary
  getPerformanceSummary(): {
    averageOrderCreation: number;
    averageOrderUpdate: number;
    slowOperations: MonitoringEvent[];
    errorRate: number;
  } {
    const perfEvents = this.events.filter(e => e.event_type === 'performance');
    const errorEvents = this.events.filter(e => e.event_type === 'error');
    
    const orderCreationTimes = perfEvents
      .filter(e => e.performance_metric?.operation === 'create_wasstrips_order')
      .map(e => e.performance_metric!.duration_ms);
    
    const orderUpdateTimes = perfEvents
      .filter(e => e.performance_metric?.operation === 'update_wasstrips_order')
      .map(e => e.performance_metric!.duration_ms);
    
    const slowOperations = perfEvents
      .filter(e => e.performance_metric!.duration_ms > 2000)
      .slice(-10);
    
    return {
      averageOrderCreation: orderCreationTimes.length > 0 
        ? Math.round(orderCreationTimes.reduce((a, b) => a + b, 0) / orderCreationTimes.length)
        : 0,
      averageOrderUpdate: orderUpdateTimes.length > 0
        ? Math.round(orderUpdateTimes.reduce((a, b) => a + b, 0) / orderUpdateTimes.length)
        : 0,
      slowOperations,
      errorRate: this.events.length > 0 
        ? Math.round((errorEvents.length / this.events.length) * 100 * 100) / 100
        : 0
    };
  }

  // Clear events (voor testing)
  clearEvents() {
    this.events = [];
  }
}

// Singleton instance
export const wasstripsMonitor = new WasstripsMonitoring();

// Convenience exports
export type { MonitoringEvent };
export { WasstripsMonitoring };
