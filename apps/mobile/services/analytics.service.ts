import { api } from './api';

/**
 * Client-side analytics tracking service.
 * Logs user events to backend for metrics, funnels, and user behavior analysis.
 * Batches events to reduce network overhead.
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

class AnalyticsService {
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 20; // flush after 20 events
  private readonly BATCH_INTERVAL_MS = 30000; // or every 30 seconds
  private userId: string | null = null;
  private sessionId: string = this.generateSessionId();

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize analytics (call after user logs in).
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Clear user (call on logout).
   */
  clearUserId() {
    this.userId = null;
    this.sessionId = this.generateSessionId();
    this.flushEvents(); // flush any pending events
  }

  /**
   * Track a user event.
   */
  track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        // Add context automatically
        screen: this.getCurrentScreen(),
        timestamp: Date.now(),
      },
    };

    this.eventQueue.push(analyticsEvent);

    // Flush if batch size reached
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      this.flushEvents();
    } else if (!this.batchTimer) {
      // Start batch timer if not already running
      this.batchTimer = setTimeout(() => this.flushEvents(), this.BATCH_INTERVAL_MS);
    }
  }

  /**
   * Track screen/page view.
   */
  trackScreenView(screenName: string) {
    this.track('screen_view', { screen_name: screenName });
  }

  /**
   * Track booking flow milestones.
   */
  trackBookingStarted(spaceId: number, spaceName: string) {
    this.track('booking_started', { space_id: spaceId, space_name: spaceName });
  }

  trackBookingConfirmed(spaceId: number, amount: number, duration: number) {
    this.track('booking_confirmed', {
      space_id: spaceId,
      amount,
      duration_hours: duration,
    });
  }

  trackBookingCompleted(spaceId: number, amount: number) {
    this.track('booking_completed', { space_id: spaceId, amount });
  }

  trackBookingCancelled(spaceId: number, reason?: string) {
    this.track('booking_cancelled', { space_id: spaceId, reason });
  }

  /**
   * Track search behavior.
   */
  trackSearchPerformed(query: string, resultsCount: number, filters?: any) {
    this.track('search_performed', {
      query,
      results_count: resultsCount,
      filters,
    });
  }

  trackFilterApplied(filterType: string, filterValue: string) {
    this.track('filter_applied', { filter_type: filterType, filter_value: filterValue });
  }

  /**
   * Track errors for debugging.
   */
  trackError(errorName: string, errorMessage: string, context?: any) {
    this.track('error_occurred', {
      error_name: errorName,
      error_message: errorMessage,
      context,
    });
  }

  /**
   * Track feature usage.
   */
  trackFeatureUsed(featureName: string, details?: any) {
    this.track('feature_used', { feature_name: featureName, ...details });
  }

  /**
   * Flush queued events to backend.
   */
  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = []; // clear queue immediately to avoid duplicates

    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      // Send to backend (non-blocking, fire-and-forget)
      api.post('/analytics/track', {
        events: eventsToSend,
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      }).catch((err) => {
        if (__DEV__) console.log('[ANALYTICS] Upload failed (non-critical):', err.message);
        // Don't throw — analytics failure should never block user experience
      });
    } catch (error) {
      if (__DEV__) console.log('[ANALYTICS] Flush error:', error);
    }
  }

  /**
   * Get current screen from router state (best-effort).
   * Since we can't reliably track routes from RN, this is a placeholder.
   */
  private getCurrentScreen(): string {
    // In a real app, hook into Expo Router's useSegments() hook
    // For now, return 'unknown' — implement per-screen tracking manually
    return 'unknown';
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
