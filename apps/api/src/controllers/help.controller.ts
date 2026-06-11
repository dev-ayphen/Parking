import { Request, Response } from 'express';
import { sendError } from '../utils/errors';

// Static FAQ and Articles data — in production, this would come from a CMS or database
const FAQ_DATA = [
  {
    title: 'Booking',
    items: [
      {
        q: 'How do I book a parking space?',
        a: 'Open the ParkSwift app, search for a location, browse available spaces, select your preferred one, choose your time slot, and confirm the booking. Payment will be processed via your saved method.',
      },
      {
        q: 'Can I cancel a booking?',
        a: 'Yes, you can cancel a booking from the "My Bookings" section. Cancellation policies vary by space owner. Please note that booking fees are non-refundable — only subscription-related payments are eligible for refunds.',
      },
      {
        q: 'What happens if I overstay my booked time?',
        a: 'If you exceed your booked duration, additional charges may apply based on the space owner\'s late fee policy. You\'ll receive a notification before your session ends to extend if needed.',
      },
      {
        q: 'How do I extend my parking session?',
        a: 'You can extend your active session from the "Active Booking" screen. Tap "Extend Time" and choose the additional duration. The extra amount will be charged immediately.',
      },
    ],
  },
  {
    title: 'Space Owner',
    items: [
      {
        q: 'How do I list my parking space?',
        a: 'Go to "My Spaces" from the sidebar, tap "Add New Space", fill in details like location, type, pricing, and availability, then submit for verification. Your space will be live once approved.',
      },
      {
        q: 'How long does verification take?',
        a: 'Space verification typically takes 24-48 hours. You\'ll receive a notification once your space is approved or if additional documents are needed.',
      },
      {
        q: 'How do I manage bookings for my space?',
        a: 'All incoming bookings appear in the "My Spaces" dashboard under the Active tab. You can accept, reject, or manage sessions with OTP verification for check-in.',
      },
      {
        q: 'How do I set pricing for my space?',
        a: 'When creating or editing a listing, you can set hourly, daily, and monthly rates. Pricing must fall within the platform\'s minimum and maximum rate boundaries.',
      },
    ],
  },
  {
    title: 'Subscription',
    items: [
      {
        q: 'What subscription plans are available?',
        a: 'ParkSwift offers multiple plans for space owners — Basic (Free), Pro, and Premium. Each tier unlocks additional features like priority listing, analytics, and higher booking limits. Check the "Payments" section for current pricing.',
      },
      {
        q: 'Can I get a refund on my subscription?',
        a: 'Yes, subscription payments are eligible for refunds within 7 days of purchase if you haven\'t used any premium features. Contact support with your invoice details to initiate a refund.',
      },
      {
        q: 'How do I upgrade or downgrade my plan?',
        a: 'Go to Payments from the sidebar. Under "Choose Your Plan", select the tier you want. Upgrades take effect immediately, while downgrades apply at the end of your current billing cycle.',
      },
      {
        q: 'What payment methods are supported?',
        a: 'We support UPI, Credit/Debit Cards, Net Banking, and wallets via Razorpay. All transactions are secured with industry-standard encryption.',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        q: 'How do I reset my password?',
        a: 'ParkSwift uses OTP-based login. Simply enter your registered mobile number, request a new OTP, and you\'ll be logged in securely without needing a password.',
      },
      {
        q: 'How do I update my profile information?',
        a: 'Go to your Profile from the sidebar and tap the edit icon on any field (name, email, phone). Changes are saved instantly after editing.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes, you can request account deletion from Settings > Account > Delete Account. All your data will be permanently removed within 30 days. Active subscriptions must be cancelled first.',
      },
      {
        q: 'How do I manage my vehicles?',
        a: 'Go to "My Vehicles" from the sidebar. You can add, edit, or remove vehicles. Each vehicle requires the registration number, type, and optionally a photo.',
      },
    ],
  },
];

const ARTICLES_DATA = [
  {
    title: 'Booking',
    articles: [
      { id: 'b1', title: 'How to Book a Parking Space', snippet: 'Step-by-step guide to finding and booking a perfect parking spot near you.', readTime: '3 min' },
      { id: 'b2', title: 'Understanding Cancellation Policies', snippet: 'Learn about our cancellation and refund policies for bookings.', readTime: '4 min' },
      { id: 'b3', title: 'Extending Your Parking Session', snippet: 'How to extend your session and what charges apply for overtime.', readTime: '2 min' },
    ],
  },
  {
    title: 'Space Owner',
    articles: [
      { id: 's1', title: 'Getting Started as a Space Owner', snippet: 'Complete guide to listing your first parking space on ParkSwift.', readTime: '5 min' },
      { id: 's2', title: 'Verification Process Explained', snippet: 'What documents are needed and how long the verification takes.', readTime: '3 min' },
      { id: 's3', title: 'Managing Your Earnings', snippet: 'Track your revenue, understand payouts, and optimize pricing.', readTime: '4 min' },
      { id: 's4', title: 'OTP Verification for Check-ins', snippet: 'How the OTP-based verification system works for secure check-ins.', readTime: '2 min' },
    ],
  },
  {
    title: 'Subscription & Payments',
    articles: [
      { id: 'p1', title: 'Subscription Plans Overview', snippet: 'Compare Basic, Pro, and Premium plans and their features.', readTime: '4 min' },
      { id: 'p2', title: 'Payment Methods & Security', snippet: 'All supported payment options and how we keep your data safe.', readTime: '3 min' },
      { id: 'p3', title: 'Subscription Refund Policy', snippet: 'When and how you can get a refund on your subscription payment.', readTime: '3 min' },
    ],
  },
  {
    title: 'Account & Security',
    articles: [
      { id: 'a1', title: 'Updating Your Profile', snippet: 'How to change your name, email, phone number, and profile picture.', readTime: '2 min' },
      { id: 'a2', title: 'Managing Your Vehicles', snippet: 'Add, edit, or remove vehicles from your ParkSwift account.', readTime: '2 min' },
      { id: 'a3', title: 'Account Deletion Guide', snippet: 'Steps to permanently delete your account and what happens to your data.', readTime: '3 min' },
    ],
  },
];

export const helpController = {
  /** GET /help/faq — returns all FAQ categories and questions */
  getFaq: async (req: Request, res: Response) => {
    try {
      res.json({ success: true, faq: FAQ_DATA });
    } catch (error) {
      sendError(res, error);
    }
  },

  /** GET /help/articles — returns all articles by category */
  getArticles: async (req: Request, res: Response) => {
    try {
      res.json({ success: true, articles: ARTICLES_DATA });
    } catch (error) {
      sendError(res, error);
    }
  },
};
