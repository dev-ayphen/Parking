import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const LEGAL_DOCS = [
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    version: '1.0.0',
    content: `# ParkSwift Terms & Conditions

## 1. Acceptance of Terms
By using ParkSwift, you agree to be bound by these Terms & Conditions. If you do not agree, do not use the platform.

## 2. Platform Role
ParkSwift is a parking coordination platform that connects space owners with drivers (parkers). We do not own, operate, or control any parking spaces listed on the platform.

## 3. Space Legality
ParkSwift does not guarantee the legal validity of every parking space. It is the responsibility of space owners to ensure their listing complies with local municipal rules and regulations.

## 4. User Responsibilities
- Parkers are responsible for proper parking behavior
- Parkers are responsible for fines, towing, or authority penalties incurred
- Parkers must follow local parking laws and restrictions
- Parkers must verify surroundings before parking

## 5. Authority Actions
Local authority actions, fines, towing, or penalties remain the user's responsibility. ParkSwift will not be liable for any such actions.

## 6. Disputes
Users are responsible for resolving disputes arising from the misuse of the platform. ParkSwift may mediate but is not obligated to do so.

## 7. Changes to Terms
ParkSwift reserves the right to update these Terms at any time. Continued use of the platform constitutes acceptance of the updated Terms.`,
    isActive: true,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    version: '1.0.0',
    content: `# ParkSwift Privacy Policy

## 1. Information We Collect
- Phone number (required for authentication)
- Name and email (for profile)
- Location data (for finding nearby spaces)
- Booking history and transaction data

## 2. How We Use Your Information
- To provide and improve the ParkSwift service
- To connect parkers with space owners
- To send booking confirmations and notifications
- To ensure platform safety and compliance

## 3. Data Sharing
We do not sell your personal data. We share data only with:
- Space owners (to facilitate bookings)
- Payment processors (for transactions)
- Legal authorities (when required by law)

## 4. Data Retention
Your data is retained as long as your account is active. You may request data deletion at any time through the app settings.

## 5. Your Rights
- Access your personal data
- Correct inaccurate data
- Request data deletion
- Opt out of marketing communications

## 6. Contact
For privacy concerns, contact us at privacy@parkswift.com`,
    isActive: true,
  },
  {
    slug: 'owner-terms',
    title: 'Owner Terms & Conditions',
    version: '1.0.0',
    content: `# ParkSwift Owner Terms & Conditions

## 1. Ownership Responsibility
By listing a parking space on ParkSwift, you confirm that:
- You are the owner of the property, or
- You have explicit written authorization from the property owner to sublet or share the parking space

Providing false information may lead to immediate suspension and legal reporting.

## 2. Public Obstruction
Your listed parking space must not:
- Block public roads, footpaths, or pedestrian areas
- Obstruct emergency vehicle access
- Violate any municipal parking regulations
- Create traffic hazards or obstruct neighbouring properties

## 3. Legal Compliance
You are solely responsible for:
- Following all local municipal rules and bylaws related to your parking space
- Obtaining any permits or approvals required by local authorities
- Ensuring your space does not violate any HOA, apartment society, or residential rules

## 4. False Listings
Listing fake, illegal, or unauthorized parking spaces will result in:
- Immediate suspension of your account
- Removal of all your listings
- Possible reporting to local authorities

## 5. Verification Disclaimer
ParkSwift's document verification process is a good-faith review only. Platform verification does not guarantee municipal or legal validity of your parking space. You remain fully responsible for legal compliance.

## 6. Revenue & Commission
ParkSwift charges a platform commission on each booking. Rates are displayed in your dashboard and may be updated with prior notice.`,
    isActive: true,
  },
  {
    slug: 'parker-terms',
    title: 'Parker Terms & Conditions',
    version: '1.0.0',
    content: `# ParkSwift Parker Terms & Conditions

## 1. Parking Responsibility
As a parker using ParkSwift, you are responsible for:
- Parking your vehicle properly within the designated space
- Not blocking access to other vehicles, entrances, or emergency routes
- Following any instructions provided by the space owner

## 2. Fine & Towing Responsibility
You accept full responsibility for:
- Any fines, penalties, or towing charges incurred due to improper parking
- Violations of local traffic or parking regulations
- Any damage caused to the parking space or surrounding property

## 3. Local Rules
You must:
- Familiarize yourself with and follow all local parking laws
- Respect restricted parking zones, timings, and permit requirements
- Not park in spaces designated for other purposes (e.g., disabled, emergency)

## 4. Risk Acceptance
Before parking, you must:
- Verify the surroundings and ensure the space is suitable
- Confirm the space is free from obstructions and access restrictions
- Understand that ParkSwift does not guarantee the condition or safety of the space

## 5. Platform Role
ParkSwift is a coordination platform only. We:
- Connect parkers with space owners
- Do not physically inspect or guarantee any parking space
- Are not responsible for disputes between parkers and space owners
- Do not collect payment — all payments are made directly between parties

## 6. Open Roadside Spaces
For spaces marked as "Open Frontage Area" or high-risk, additional caution is required:
- Verify that parking is permitted by local authorities
- Do not obstruct traffic or public access
- All risks associated with open roadside parking are borne by you`,
    isActive: true,
  },
  {
    slug: 'platform-disclaimer',
    title: 'Platform Disclaimer',
    version: '1.0.0',
    content: `# ParkSwift Platform Disclaimer

## Platform Role
ParkSwift is a parking coordination platform. We facilitate connections between parking space owners and drivers (parkers). We do not own, operate, manage, or control any parking spaces listed on the platform.

## Space Legality
ParkSwift does not guarantee the legal validity of every parking space listed on the platform. While we conduct a document verification process, this is a good-faith review and does not constitute legal approval or municipal endorsement of any parking space.

## Authority Actions
Any actions taken by local authorities, municipalities, traffic police, or other regulatory bodies — including fines, towing, notices, or penalties — remain the sole responsibility of the relevant user (space owner or parker). ParkSwift will not be liable for any such actions or their consequences.

## Disputes
Users are responsible for resolving disputes arising from the use or misuse of the platform. ParkSwift may, at its sole discretion, assist in mediation but is not obligated to do so. All transactions and arrangements are directly between users.

## Limitation of Liability
To the fullest extent permitted by law, ParkSwift shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use of the platform, including but not limited to parking violations, property damage, personal injury, or financial loss.`,
    isActive: true,
  },
  {
    slug: 'abuse-policy',
    title: 'Abuse & Suspension Policy',
    version: '1.0.0',
    content: `# ParkSwift Abuse & Suspension Policy

## Parker Abuse
Users booking parking are prohibited from:
- Creating fake or duplicate bookings without intent to use the space
- Damaging the parking space or surrounding property
- Repeated booking cancellations (more than 3 within 7 days)
- Illegal parking in restricted areas despite warnings
- Harassment, threats, or abusive behavior toward space owners
- Uploading false vehicle information

Consequences:
- First offense: Written warning
- Second offense: Temporary suspension (7 days)
- Third offense: Temporary suspension (30 days)
- Persistent violations: Permanent account ban

## Owner Abuse
Space owners listing on ParkSwift must not:
- Create fake or fraudulent parking space listings
- List unsafe areas known to have high theft or damage
- Demand offline cash payments to bypass platform
- Provide misleading information about space location or condition
- Allow spaces to be used for illegal activities
- Harass or threaten parkers with fake complaints

Consequences:
- First offense: Written warning + listing review
- Second offense: Temporary suspension (7 days) + all listings removed
- Third offense: Temporary suspension (30 days) + mandatory compliance review
- Persistent violations: Permanent account ban

## Dispute Resolution Process
1. Report abuse through the app or support portal
2. Admin reviews complaint and evidence
3. If founded: corrective action or suspension applied
4. User can appeal within 7 days of action

## Emergency Suspension
ParkSwift reserves the right to immediately suspend accounts involved in:
- Criminal activity (theft, fraud, harassment)
- Repeated violations despite prior warnings
- Coordinated abuse by multiple accounts

## Appeal Process
- Temporary suspensions can be appealed after 24 hours
- Permanent bans can be appealed once per year
- Appeals must include new evidence or changed circumstances

## Account Reactivation
After temporary suspension:
- User must acknowledge policy violation
- User must agree to terms improvement
- System tracks behavior for 90 days
- Repeat violations during observation period result in permanent ban`,
    isActive: true,
  },
];

async function main() {
  console.log('Seeding legal documents...');

  for (const doc of LEGAL_DOCS) {
    await db.legalDocument.upsert({
      where: { slug: doc.slug },
      update: {
        title: doc.title,
        version: doc.version,
        content: doc.content,
        isActive: doc.isActive,
      },
      create: {
        slug: doc.slug,
        title: doc.title,
        version: doc.version,
        content: doc.content,
        isActive: doc.isActive,
      },
    });
    console.log(`  ✅ Upserted: ${doc.slug} — ${doc.title}`);
  }

  console.log('\n✅ Legal documents seeded successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
