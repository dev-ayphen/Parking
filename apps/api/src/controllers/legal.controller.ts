import { Request, Response } from 'express';
import { sendError } from '../utils/errors';

// Static legal documents — in production, these would be managed in a CMS
const TERMS_AND_CONDITIONS = `
# ParkSwift Terms & Conditions

## 1. Parker Terms & Conditions

### 1.1 Parking Responsibility
- You are responsible for proper parking behavior and leaving your vehicle in good condition.
- You must park within the designated parking space boundaries.
- You are responsible for any damage caused to the parking space or surrounding areas.

### 1.2 Fine & Towing Responsibility
- You are fully responsible for any fines, towing charges, or authority penalties.
- ParkSwift is not liable for any parking violations, unauthorized towing, or legal action taken by authorities.
- Always ensure you have the right to park in the selected space before booking.

### 1.3 Local Laws & Regulations
- You must follow all local parking laws, traffic regulations, and municipal rules.
- You are responsible for verifying that the parking space is legal in your jurisdiction.
- Violations of local rules remain entirely your responsibility.

### 1.4 Risk Acceptance & Verification
- You must verify the surrounding area and parking conditions before proceeding.
- You acknowledge the risk level of the parking space (Low, Medium, or High Risk).
- You agree to accept responsibility for risks associated with the parking location.

### 1.5 Platform Role Disclaimer
- ParkSwift only facilitates parking coordination between users.
- We do not guarantee the legal validity of every parking space.
- We do not monitor or control parking enforcement or local authorities.

---

## 2. Space Owner Terms & Conditions

### 2.1 Ownership & Authorization
- You must own the property or have explicit authorization from the owner.
- You are responsible for ensuring you have the legal right to rent out the parking space.
- Listing a space you do not own or have authority over is prohibited.

### 2.2 Public Obstruction
- Your parking space must not block roads, footpaths, driveways, or emergency access.
- You are responsible for ensuring the space is accessible and safe.
- Any obstruction reported to authorities remains your responsibility.

### 2.3 Legal Compliance
- You must follow all local municipal rules, zoning laws, and regulations.
- You are responsible for obtaining necessary permissions and approvals from authorities.
- You must comply with HOA rules or property management guidelines if applicable.

### 2.4 False Listings & Consequences
- Fake, misleading, or illegal listings can result in suspension or legal action.
- You must provide accurate information about the space, location, and amenities.
- Any misrepresentation may result in account ban and legal reporting to authorities.

### 2.5 Verification Disclaimer
- ParkSwift verification does not guarantee municipal legality or authority approval.
- Platform verification only confirms document authenticity, not space legality.
- You remain fully responsible for space legality and compliance.

---

## 3. Platform Disclaimer

### 3.1 Platform Role
- ParkSwift is a parking coordination and marketplace platform.
- We facilitate transactions between space owners and parkers.
- We do not own, control, or manage any physical parking spaces.

### 3.2 Space Legality
- ParkSwift does not guarantee the legal validity of any parking space.
- Local authorities may dispute the legality of a space at any time.
- Users are responsible for verifying legality before using the platform.

### 3.3 Authority Actions
- ParkSwift is not responsible for local authority actions, fines, or towing.
- We do not interfere with or prevent enforcement actions by authorities.
- Users are responsible for all consequences of parking in their chosen space.

### 3.4 Disputes & Liability
- Users are responsible for disputes arising from misuse or violations.
- ParkSwift is not liable for injuries, damage, or losses related to parking.
- All disputes must be resolved between users in accordance with local laws.

---

## 4. General Terms

### 4.1 Acceptance of Terms
By using ParkSwift, you agree to all terms and conditions outlined above.

### 4.2 Modifications
ParkSwift reserves the right to modify these terms at any time. Continued use indicates acceptance.

### 4.3 Jurisdiction
These terms are governed by Indian law. All disputes are subject to local jurisdiction.

### 4.4 Contact
For questions about these terms, contact: legal@parkswift.in
`;

const PRIVACY_POLICY = `
# ParkSwift Privacy Policy

## 1. Introduction

ParkSwift ("we," "us," or "our") operates the parking coordination platform. This Privacy Policy explains how we collect, use, disclose, and protect your information.

## 2. Information We Collect

### 2.1 Personal Information
- **Account Information**: Name, phone number, email, address, government ID
- **Vehicle Information**: License plate, vehicle type, registration documents
- **Payment Information**: Billing address, transaction history (payment processor handles card data)
- **Location Data**: Real-time GPS location during active bookings
- **Communication**: Support tickets, messages, ratings, and feedback

### 2.2 Usage Information
- **Booking Data**: Spaces booked, dates, durations, amounts paid
- **Device Information**: Device type, OS, app version, unique device identifiers
- **Log Data**: IP address, access times, pages visited, referring URL

### 2.3 Cookies & Tracking
- We use cookies to maintain sessions and remember preferences.
- Analytics tools track how you use the platform to improve services.

## 3. How We Use Your Information

### 3.1 Service Delivery
- Facilitate parking bookings and payments
- Verify user identity and prevent fraud
- Resolve disputes and provide customer support
- Send booking confirmations and notifications

### 3.2 Safety & Security
- Prevent illegal activity and enforce our terms
- Detect and prevent fraud or abuse
- Protect against hacking or data breaches
- Share information with law enforcement if required

### 3.3 Marketing & Communications
- Send updates about services, promotions, and new features
- Respond to inquiries and provide customer service
- Conduct surveys and gather feedback (only if you opt in)

### 3.4 Analytics & Improvement
- Analyze usage patterns to improve the platform
- Monitor system performance and troubleshoot issues
- Generate anonymized statistics for business insights

## 4. Information Sharing

### 4.1 With Other Users
- Space owners see your name and vehicle details when you book
- Parkers see space owner names and contact information
- Ratings and reviews are public

### 4.2 With Service Providers
- Payment processors (Razorpay) for transaction handling
- SMS providers (MSG91) for OTP delivery
- Cloud storage providers (Supabase) for document storage
- Analytics services for usage insights

### 4.3 Legal Requirements
- We disclose information if required by law or court order
- We comply with requests from law enforcement
- We protect your privacy within the bounds of legal obligations

### 4.4 Business Transfers
- If ParkSwift is acquired or merged, your data may be transferred
- We will notify you of any such change via email

## 5. Data Security

### 5.1 Security Measures
- We use HTTPS encryption for all data in transit
- Passwords are hashed and never stored in plain text
- Access to sensitive data is restricted to authorized staff
- Regular security audits are conducted

### 5.2 Limitations
- No security method is 100% secure
- We are not liable for unauthorized access due to user negligence
- Users are responsible for keeping passwords confidential

## 6. Your Rights

### 6.1 Data Access & Deletion
- You can request a copy of your personal data
- You can request deletion of your account and data (with 30-day retention for legal purposes)
- Some data may be retained for legal or compliance reasons

### 6.2 Opt-Out Options
- You can disable marketing emails in settings
- You can disable location sharing after a booking is confirmed
- You can adjust notification preferences anytime

## 7. Data Retention

- **Account Data**: Retained as long as your account is active
- **Booking History**: Retained for 3 years for legal/tax purposes
- **Support Conversations**: Retained for 1 year after resolution
- **Location Data**: Deleted after booking completion (not archived)

## 8. Children's Privacy

ParkSwift is not intended for users under 18 years old. We do not knowingly collect information from minors.

## 9. International Users

If you access ParkSwift from outside India, you acknowledge that data may be transferred to and processed in India under Indian privacy laws.

## 10. Changes to This Policy

We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notification.

## 11. Contact

For privacy concerns or data requests, contact: privacy@parkswift.in

**Last Updated**: 2026-06-11
`;

export const legalController = {
  /** GET /legal/terms-and-conditions */
  getTermsAndConditions: async (req: Request, res: Response) => {
    try {
      res.json({ success: true, content: TERMS_AND_CONDITIONS });
    } catch (error) {
      sendError(res, error);
    }
  },

  /** GET /legal/privacy-policy */
  getPrivacyPolicy: async (req: Request, res: Response) => {
    try {
      res.json({ success: true, content: PRIVACY_POLICY });
    } catch (error) {
      sendError(res, error);
    }
  },
};
