# PARKSWIFT - COMPLETE HOME PAGE GUIDE
## SINGLE COMPREHENSIVE END-TO-END DOCUMENT

**Type:** Complete home page documentation  
**Scope:** All sections, all interactions, all menus  
**Level:** Beginner to advanced  

---

## 🏠 HOME PAGE COMPLETE LAYOUT

```
┌──────────────────────────────────────────────┐
│  ≡  🅿️ ParkSwift                [👤]  🔔   │  ← HEADER (Section 1)
├──────────────────────────────────────────────┤
│                                              │
│  Hello Raj Kumar 👋                          │  ← GREETING (Section 2)
│                                              │
│  📍 Chennai, Tamil Nadu  [Change ▼]          │  ← LOCATION (Section 3)
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  🅿️ FIND SPACE                         │ │  ← CARD 1 (Section 4)
│  │  Search & Book Parking                 │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  🏠 MY SPACES                           │ │  ← CARD 2 (Section 5)
│  │  List & Manage Your Spaces             │ │
│  └────────────────────────────────────────┘ │
│                                              │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 📍 SECTION 1: HEADER (Top Bar)

```
┌──────────────────────────────────────────────┐
│  ≡  🅿️ ParkSwift                [👤]  🔔   │
└──────────────────────────────────────────────┘

Layout (Left to Right):
├─ Hamburger menu (≡)
├─ Logo (🅿️ ParkSwift)
├─ Flexible space (grows)
├─ Avatar ([👤])
└─ Bell icon (🔔)

Height: 56px
Background: White
Border: Light gray bottom border
```

### Header Element 1: HAMBURGER MENU (≡)

```
Icon: ≡ (three horizontal lines)
Position: Top-left
Size: 24x24px
Color: #222222 (dark)
Tappable Area: 44x44px (touch-friendly)

What happens when you TAP ≡:
    ↓
Drawer slides in from LEFT side
    ↓
Animation: 300ms smooth slide
    ↓
Shows side menu with 7 items
    ↓
(See SECTION 9 for complete drawer details)
```

### Header Element 2: LOGO (🅿️ ParkSwift)

```
Icon: 🅿️ (parking symbol)
├─ Size: 24x24px
├─ Color: #dc0159 (brand red)
└─ Appearance: Bold, recognizable

Text: "ParkSwift"
├─ Size: 16px
├─ Weight: Bold
├─ Color: #222222 (dark)
└─ Font: Sans-serif

Combined: 🅿️ ParkSwift
Spacing: 8px gap between icon and text

What happens when you TAP logo:
    ↓
If on Home Page → Stay on home (no change)
    ↓
If on other page → Navigate back to Home
    ↓
(Acts as home button from any screen)
```

### Header Element 3: AVATAR ([👤])

```
Display: User's profile photo
├─ Size: 40x40px
├─ Shape: Circle
├─ Border: 2px light border
└─ If no photo: Shows initials "RK"

What happens when you TAP [👤]:
    ↓
Animation: Instant (no delay)
    ↓
Navigate to Profile Page
    ↓
Profile Page shows:
├─ Your profile photo (120x120px)
├─ Personal information
├─ Subscription status
├─ Action buttons
└─ [Back ← ] to return
    ↓
(See SECTION 8: PROFILE PAGE for details)
```

### Header Element 4: NOTIFICATION BELL (🔔)

```
Icon: 🔔 (bell)
├─ Size: 24x24px
├─ Color: #222222 (dark)
└─ Style: Regular, outlined

Badge (if notifications):
├─ Red circle (top-right of bell)
├─ Shows count: "3", "12", "99+"
├─ Background: #dc0159 (red)
├─ Text: White, 12px, bold
└─ Updates in real-time

What happens when you TAP 🔔:
    ↓
Animation: Show loading spinner (optional)
    ↓
API Call: GET /api/notifications
    ↓
Fetch all user's notifications
    ↓
Navigate to Notifications Page
    ↓
Notifications Page shows:
├─ Filter tabs: All | Unread | Read
├─ List of all notifications
│  ├─ Booking requests
│  ├─ Messages
│  ├─ Reviews
│  ├─ Payment confirmations
│  └─ System notifications
│
├─ For each notification:
│  ├─ Icon & type
│  ├─ Title/preview
│  ├─ Time received
│  ├─ Unread indicator (✓)
│  └─ Tap to open related content
│
└─ Actions:
   ├─ Mark as read
   ├─ Delete notification
   ├─ Clear all
   └─ Search notifications
    ↓
Badge count becomes 0 after viewing
    ↓
Tap [Back ← ] to return to Home
```

---

## 📍 SECTION 2: GREETING MESSAGE

```
Text: "Hello Raj Kumar 👋"

Position: Below header
Style:
├─ Font size: 20px
├─ Font weight: Bold (600)
├─ Color: #222222 (dark)
├─ Icon: 👋 (waving hand)
└─ Line height: 1.5

Time-based Greetings (optional):
├─ 5 AM - 12 PM: "Good Morning Raj Kumar 🌅"
├─ 12 PM - 5 PM: "Good Afternoon Raj Kumar ☀️"
├─ 5 PM - 9 PM: "Good Evening Raj Kumar 🌆"
└─ 9 PM - 5 AM: "Hello Raj Kumar 🌙"

Purpose:
├─ Personalized welcome
├─ Shows user is logged in
├─ Friendly greeting
└─ Updates dynamically

Data Source:
├─ firstName: From user profile
├─ Current time: Device time
└─ Updated on page load
```

---

## 📍 SECTION 3: LOCATION SECTION

```
Display:
├─ Icon: 📍 (location pin)
├─ Text: "Chennai, Tamil Nadu"
├─ Action: [Change ▼] button
└─ Position: Below greeting

What happens when you TAP [Change ▼]:
    ↓
Shows location change modal
    ↓
Modal displays:
├─ Search field: "Search for city/area..."
├─ Current location: "📍 Chennai, Tamil Nadu"
├─ Recent locations: (previously searched)
├─ [Use Current GPS Location] button
└─ Suggestions dropdown
    ↓
User can:
├─ Type location name → See suggestions
├─ Tap suggestion → Select it
├─ Tap recent → Use previous location
└─ Tap GPS button → Use current location
    ↓
Example: User types "Mumbai"
    ↓
Suggestions appear:
├─ Mumbai, Maharashtra
├─ Mumbai (NCR area)
└─ Bombay (old name)
    ↓
User taps "Mumbai, Maharashtra"
    ↓
Location updated:
├─ Home page shows: "📍 Mumbai, Maharashtra"
├─ Zustand state updated
├─ AsyncStorage saved
└─ Find Space search now filters Mumbai spaces
    ↓
Modal closes
    ↓
User sees home page with new location
    ↓
Find Space will show spaces near Mumbai
```

---

## 📍 SECTION 4: FIND SPACE CARD

```
Display:
┌────────────────────────────────────────┐
│  🅿️ FIND SPACE                         │
│  Search & Book Parking                 │
└────────────────────────────────────────┘

Components:
├─ Icon: 🅿️ (parking symbol)
│  ├─ Size: 32x32px
│  └─ Color: #dc0159 (red)
│
├─ Title: "FIND SPACE"
│  ├─ Size: 18px
│  ├─ Weight: Bold
│  └─ Color: #222222
│
└─ Subtitle: "Search & Book Parking"
   ├─ Size: 14px
   ├─ Weight: Regular
   └─ Color: #666666

Card Styling:
├─ Background: #f5f5f5 or #ffffff
├─ Border: 1px #dddddd
├─ Border-radius: 12px
├─ Padding: 20px
├─ Margin: 16px horizontal, 12px vertical
├─ Shadow: Subtle elevation (2px)
└─ Entire card is tappable

What happens when you TAP card:
    ↓
Loading spinner: "Loading spaces..."
    ↓
API Call: GET /api/spaces/search
Request includes:
├─ latitude: Current location lat
├─ longitude: Current location lng
├─ radius: 5 km
├─ limit: 20 spaces
└─ sort: "distance"
    ↓
Spaces fetched from database
    ↓
Navigate to Find Space Screen
    ↓
Find Space Screen displays:
├─ Search bar (by space name)
├─ View toggle (List/Map)
├─ Sort options (Distance/Price/Rating)
├─ Filter options (Price/Type/Distance)
│
├─ SPACES NEAR YOU:
│  ├─ Space 1: A1-Sector 5
│  │  ├─ Photo
│  │  ├─ Distance: 2.3 km
│  │  ├─ Price: ₹150/hour
│  │  ├─ Rating: ⭐ 4.8
│  │  └─ [Tap for details]
│  │
│  ├─ Space 2: B2-Fort
│  │  └─ Similar structure
│  │
│  └─ Space 3: C3-Sector 9
│     └─ Similar structure
│
└─ [Load more spaces] button
    ↓
User can:
├─ Scroll through list
├─ Tap space → View full details
├─ Change view → List or Map
├─ Filter → Narrow down options
├─ Sort → By distance/price/rating
└─ Search → By space name
    ↓
When user TAPS SPACE (e.g., A1-Sector 5):
    ↓
    Navigate to Space Details Page
    ↓
    Shows:
    ├─ Photo carousel (swipe through)
    ├─ Space name & location
    ├─ Distance from user
    ├─ Price (hourly/daily/monthly)
    ├─ Owner info & rating
    ├─ Available dates calendar
    ├─ Features list
    ├─ Reviews from other users
    └─ Buttons:
       ├─ [Book This Space]
       ├─ [Message Owner]
       └─ [Save for Later]
    ↓
    When user TAPS [Book This Space]:
    ↓
    Navigate to Booking Form
    ↓
    Form shows:
    ├─ Select date (calendar picker)
    ├─ Select time (from/to)
    ├─ Price breakdown
    │  ├─ Hours × rate
    │  ├─ Taxes
    │  └─ Total
    ├─ Car number input
    ├─ Driver name input
    ├─ Special requests (optional)
    └─ [Proceed to Payment]
    ↓
    When user TAPS [Proceed to Payment]:
    ↓
    Navigate to Payment Page (Razorpay)
    ↓
    Shows:
    ├─ Amount to pay
    ├─ Space & booking details
    ├─ Payment method options
    │  ├─ Debit/Credit Card
    │  ├─ Net Banking
    │  ├─ UPI
    │  └─ Wallet
    └─ [Complete Payment]
    ↓
    User enters payment details (Razorpay handles)
    ↓
    Payment processes
    ↓
    Success → Confirmation page:
    ├─ "✓ Booking Confirmed!"
    ├─ Booking ID: BK-12345
    ├─ Space & time details
    ├─ Amount paid
    ├─ Owner contact info
    └─ [View Booking] [Message Owner]
    ↓
    Notification sent to owner
    ↓
    User can:
    ├─ View booking in Bookings page
    ├─ Message owner
    ├─ Share booking details
    └─ Get directions to space
```

---

## 📍 SECTION 5: MY SPACES CARD

```
Display:
┌────────────────────────────────────────┐
│  🏠 MY SPACES                           │
│  List & Manage Your Spaces             │
└────────────────────────────────────────┘

Components:
├─ Icon: 🏠 (house symbol)
│  ├─ Size: 32x32px
│  └─ Color: #dc0159 (red)
│
├─ Title: "MY SPACES"
│  ├─ Size: 18px
│  ├─ Weight: Bold
│  └─ Color: #222222
│
└─ Subtitle: "List & Manage Your Spaces"
   ├─ Size: 14px
   ├─ Weight: Regular
   └─ Color: #666666

Card Styling: Same as Find Space card

What happens when you TAP card:
    ↓
Check subscription status
    ↓
Subscription Status Check:
├─ Active → Continue to My Spaces
└─ Expired → Show subscription modal
    ↓
If SUBSCRIPTION EXPIRED:
    ├─ Modal shows:
    │  ├─ "Subscription Expired"
    │  ├─ "Subscribe to list/manage spaces"
    │  ├─ Plan: ₹500/month
    │  └─ Buttons: [Subscribe] [Cancel]
    │
    └─ If user taps [Subscribe]:
       ├─ Navigate to payment
       ├─ Pay ₹500
       └─ Subscription activated
    ↓
If SUBSCRIPTION ACTIVE:
    ├─ Loading spinner
    ├─ API Call: GET /api/owner/spaces
    └─ Fetch user's spaces
    ↓
Navigate to My Spaces Screen
    ↓
My Spaces Screen shows:
├─ Header: "My Parking Spaces"
├─ Stats:
│  ├─ Total spaces: 3
│  ├─ Active bookings: 2
│  └─ Monthly earnings: ₹4,500
│
├─ SPACE LIST:
│  ├─ Space 1: A1-Sector 5
│  │  ├─ Photo thumbnail
│  │  ├─ Location
│  │  ├─ Bookings this month: 12
│  │  ├─ Earnings: ₹1,800
│  │  ├─ Status: ✓ Active
│  │  ├─ Rating: ⭐ 4.8
│  │  └─ Buttons:
│  │     ├─ [Edit]
│  │     ├─ [View Bookings]
│  │     ├─ [Analytics]
│  │     └─ [Deactivate]
│  │
│  ├─ Space 2: B2-Fort
│  │  └─ Similar structure
│  │
│  └─ Space 3: C3-Sector 9
│     └─ Similar structure
│
└─ [+ Add New Space] button
    ↓
USER OPTIONS:

A) TAP EXISTING SPACE:
    ↓
    Space Details Page shows:
    ├─ All info about the space
    ├─ Photos
    ├─ Pricing & availability
    ├─ Bookings
    ├─ Analytics & earnings
    └─ Edit/manage options
    ↓
    User can:
    ├─ Tap [Edit] → Change space details
    ├─ Tap [View Bookings] → See who booked
    ├─ Tap [Analytics] → View stats
    ├─ Tap [Deactivate] → Pause listings
    └─ Tap [Delete] → Remove space

B) TAP [+ Add New Space]:
    ↓
    Navigate to Add Space Form
    ↓
    Form fields:
    ├─ Upload 3+ photos (required)
    ├─ Space name (required)
    ├─ Address/location (required)
    ├─ Description (required)
    ├─ Space type: Covered/Open (required)
    ├─ Pricing:
    │  ├─ Hourly rate (optional)
    │  ├─ Daily rate (optional)
    │  └─ Monthly rate (optional)
    ├─ Availability dates (required)
    ├─ Features: CCTV, Security, etc. (required)
    ├─ House rules (optional)
    ├─ Cancellation policy (required)
    └─ Terms agreement (required)
    ↓
    User fills all fields
    ↓
    Validation:
    ├─ Photos: At least 3 ✓
    ├─ Details: All required filled ✓
    ├─ Pricing: At least one valid ✓
    └─ Terms: Agreed ✓
    ↓
    User taps [Submit Space for Review]
    ↓
    Photos upload to Supabase
    ↓
    API Call: POST /api/spaces
    ↓
    Space created with status: "Pending Approval"
    ↓
    Confirmation message:
    ├─ "✓ Space submitted!"
    ├─ "Status: Pending approval"
    ├─ "Review time: 24-48 hours"
    └─ [View Space] [Back to My Spaces]
    ↓
    Admin team reviews:
    ├─ Photos quality
    ├─ Details accuracy
    ├─ Location validity
    ├─ No prohibited items
    └─ Approve or Reject
    ↓
    User gets notification:
    ├─ "✓ Space approved!" (if approved)
    │  └─ Space goes LIVE
    │  └─ Users can book it
    │
    └─ "⚠️ Space needs changes" (if rejected)
       └─ Show reasons
       └─ User can edit & resubmit
    ↓
    Approved space:
    ├─ Appears in Find Space
    ├─ Users can book it
    ├─ Owner gets notifications
    ├─ Owner receives earnings
    └─ Owner can manage bookings
```

---

## 📍 SECTION 9: LEFT SIDE DRAWER MENU (≡)

### What is the Drawer?

```
The Drawer is a HIDDEN MENU that slides in from the LEFT side
when you tap the hamburger menu (≡) button.

It contains:
├─ Main navigation
├─ Account options
├─ Support options
└─ Logout button

Width: 280px or 70% of screen (whichever is smaller)
Height: Full screen height
Animation: Slides in 300ms from left
Background: White (#ffffff)
Overlay: Semi-transparent black (tapping closes drawer)
```

### How to Open Drawer

```
Step 1: Look at top-left of home page
    ↓
Step 2: See hamburger menu (≡)
    ↓
Step 3: Tap ≡
    ↓
Drawer slides in from LEFT
    ↓
Shows menu with 7 items
```

### MENU ITEMS (7 Total) - EXPLAINED IN DETAIL

---

### MENU ITEM 1: 🏠 HOME

```
Display:
├─ Icon: 🏠 (house)
├─ Text: "Home"
├─ Padding: 16px vertical, 20px horizontal
└─ Highlight: Light gray background if selected

Status:
├─ Currently on Home? → Item highlighted (light gray)
├─ Shows left border: 4px #dc0159 (red)
└─ Indicates: "You are here"

What happens when you TAP:
    ↓
If ALREADY on Home:
├─ Close drawer (slide left)
├─ Stay on home page (no change)
└─ Nothing happens (already here)

If on OTHER page:
├─ Close drawer
├─ Navigate back to Home
├─ Reload home data
└─ Show home page
    ↓
Use for: Going back to main screen
```

---

### MENU ITEM 2: 📅 BOOKINGS [Badge]

```
Display:
├─ Icon: 📅 (calendar)
├─ Text: "Bookings"
├─ Badge: Red circle on right
│  ├─ Shows count: "12"
│  ├─ Background: #dc0159 (red)
│  ├─ Text: White, bold
│  └─ Updates in real-time
├─ Padding: 16px vertical, 20px horizontal
└─ Font: 16px regular

Badge Explanation:
├─ What it shows: Number of active bookings/requests
├─ When it updates:
│  ├─ New booking request → +1
│  ├─ Booking confirmed → Updates
│  ├─ Booking cancelled → Decreases
│  └─ Viewed booking → Badge clears
│
├─ Example:
│  ├─ "12" = 12 pending items
│  ├─ "99+" = 100 or more
│  └─ No number = 0 items (no badge)

What happens when you TAP:
    ↓
Close drawer (slide left)
    ↓
Navigate to Bookings Page
    ↓
Bookings Page shows:
├─ Header: "[Back ← ] Bookings"
├─ Filter tabs:
│  ├─ All (all bookings)
│  ├─ Pending (awaiting response)
│  ├─ Confirmed (approved)
│  └─ Cancelled (cancelled)
│
├─ Booking List:
│  ├─ Booking 1: A1-Sector 5
│  │  ├─ Space name
│  │  ├─ Date & time
│  │  ├─ Status: Confirmed ✓
│  │  ├─ Amount: ₹531
│  │  └─ [View Details] [Message Owner]
│  │
│  ├─ Booking 2: B2-Fort
│  │  └─ Similar structure
│  │
│  └─ Booking 3: Pending
│     ├─ Space name
│     ├─ Status: Awaiting response
│     └─ [Accept] [Reject]
│
└─ For each booking:
   ├─ Tap → View full details
   ├─ Message owner
   ├─ Cancel booking
   ├─ Rate space/owner
   └─ Share booking info
    ↓
User can:
├─ Filter by status
├─ Search bookings
├─ View booking details
├─ Message owner
├─ Cancel booking
├─ Rate & review
└─ Get directions
    ↓
Tap [Back ← ] to return to Drawer/Home
```

---

### MENU ITEM 3: 💬 CHAT [Badge]

```
Display:
├─ Icon: 💬 (chat bubble)
├─ Text: "Chat"
├─ Badge: Red circle on right
│  ├─ Shows count: "3"
│  ├─ Background: #dc0159 (red)
│  └─ Text: White, bold
├─ Padding: 16px vertical, 20px horizontal
└─ Font: 16px regular

Badge Explanation:
├─ What it shows: Unread messages count
├─ When it updates:
│  ├─ New message received → +1
│  ├─ Message read → Decreases
│  └─ All messages read → Disappears
│
├─ Example:
│  ├─ "3" = 3 unread messages
│  ├─ "15" = 15 unread messages
│  └─ "99+" = 100+ unread messages

What happens when you TAP:
    ↓
Close drawer (slide left)
    ↓
Navigate to Chat/Messages Page
    ↓
Chat Page shows:
├─ Header: "[Back ← ] Messages [+ New]"
├─ Search conversations (optional)
│
├─ Conversations List:
│  ├─ Conversation 1: John Smith
│  │  ├─ Last message: "When will you be ready?"
│  │  ├─ Time: "2m ago"
│  │  ├─ Unread badge: ✓ (if unread)
│  │  └─ [Tap to open chat]
│  │
│  ├─ Conversation 2: Priya Sharma
│  │  ├─ Last message: "Thanks for confirming"
│  │  ├─ Time: "1h ago"
│  │  └─ [Tap to open chat]
│  │
│  └─ Conversation 3: Owner ABC
│     └─ Similar structure
│
└─ New Message Button [+ New]:
   ├─ Tap to start conversation
   ├─ Select contact/user
   └─ Start chatting
    ↓
USER ACTIONS:

When you TAP conversation:
    ↓
    Open Chat with that person
    ↓
    Shows:
    ├─ Chat header (person's name)
    ├─ Chat history (all messages)
    │  ├─ Your messages (right, blue)
    │  ├─ Their messages (left, gray)
    │  ├─ Timestamps
    │  └─ Attachments
    │
    ├─ Message input field
    │  ├─ Type message
    │  ├─ Attach file/photo
    │  └─ [Send]
    │
    └─ Options:
       ├─ Call/Video (if available)
       ├─ Share location
       ├─ Block user
       └─ Report conversation
    ↓
    Features:
    ├─ Real-time messaging (Socket.IO)
    ├─ See when other person is typing
    ├─ See when message delivered
    ├─ See when message read
    ├─ Share photos/documents
    ├─ Emoji support
    └─ Delete message option
    ↓
    Tap [Back ← ] to return to Chat list
    ↓
    Tap [Back ← ] again to return to Home
```

---

### MENU ITEM 4: 👤 PROFILE

```
Display:
├─ Icon: 👤 (person)
├─ Text: "Profile"
├─ Padding: 16px vertical, 20px horizontal
└─ Font: 16px regular

No badge (no count needed)

What happens when you TAP:
    ↓
Close drawer (slide left)
    ↓
Navigate to Profile Page
    ↓
Profile Page shows:
├─ Header: "[Back ← ] Profile [Edit ✏️]"
├─ Profile photo (120x120px)
├─ [Change Photo] button
│
├─ PERSONAL INFORMATION:
│  ├─ First Name: Raj
│  ├─ Last Name: Kumar
│  ├─ Email: raj@example.com
│  ├─ Phone: +91 9876543210 (read-only)
│  ├─ Member Since: May 11, 2024
│  └─ Overall Rating: ⭐ 4.8
│
├─ SUBSCRIPTION:
│  ├─ Status: ✓ Active
│  ├─ Plan: ₹500/month
│  ├─ Next Renewal: June 11, 2024
│  ├─ Days Remaining: 31
│  ├─ Auto-renewal: Enabled ✓
│  └─ [Renew Subscription]
│
└─ ACTIONS:
   ├─ [Edit Profile]
   └─ [Logout]
    ↓
USER OPTIONS:

Tap [Edit ✏️]:
    ├─ Edit name, email, photo
    ├─ Make changes
    └─ Tap [Save]
    ↓
Tap [Change Photo]:
    ├─ Upload new photo
    ├─ Crop to square
    └─ Save immediately
    ↓
Tap [Renew Subscription]:
    ├─ Pay ₹500
    ├─ Extend subscription
    └─ Get confirmation
    ↓
Tap [Logout]:
    ├─ Show confirmation dialog
    ├─ "Are you sure?"
    ├─ Tap [Logout] to confirm
    └─ Sign out of account
    ↓
Tap [Back ← ] to return to Drawer/Home
```

---

### MENU ITEM 5: ⚙️ SETTINGS

```
Display:
├─ Icon: ⚙️ (gear)
├─ Text: "Settings"
├─ Padding: 16px vertical, 20px horizontal
└─ Font: 16px regular

No badge (no count needed)

What happens when you TAP:
    ↓
Close drawer (slide left)
    ↓
Navigate to Settings Page
    ↓
Settings Page shows:
├─ Header: "[Back ← ] Settings"
│
├─ NOTIFICATION SETTINGS:
│  ├─ Booking alerts: [Toggle] On/Off
│  ├─ Chat notifications: [Toggle] On/Off
│  ├─ Sound: [Toggle] On/Off
│  ├─ Vibration: [Toggle] On/Off
│  └─ Quiet hours: [Start time] - [End time]
│
├─ PRIVACY SETTINGS:
│  ├─ Profile visibility: [Public / Private]
│  ├─ Show phone number: [Toggle] Yes/No
│  ├─ Show email: [Toggle] Yes/No
│  └─ Block users: [Manage blocked list]
│
├─ LANGUAGE & THEME:
│  ├─ Language: [English / Hindi / Other]
│  ├─ Theme: [Light / Dark]
│  └─ Date format: [DD/MM/YYYY / MM/DD/YYYY]
│
├─ HELP & SUPPORT:
│  ├─ [Help Center]
│  ├─ [Report a Bug]
│  ├─ [FAQ]
│  └─ [Contact Support]
│
└─ ABOUT:
   ├─ App Version: 1.0.0
   ├─ Build: 100
   ├─ [Terms & Conditions]
   ├─ [Privacy Policy]
   └─ [Rate Us on App Store]
    ↓
USER ACTIONS:

Toggle Notifications:
    ├─ On → Receive notifications
    └─ Off → Don't receive notifications
    ↓
Change Privacy:
    ├─ Public → Others can see profile
    └─ Private → Others can't see profile
    ↓
Change Language:
    ├─ English, Hindi, etc.
    └─ App UI changes language
    ↓
Change Theme:
    ├─ Light → White background
    └─ Dark → Dark background
    ↓
Access Help:
    ├─ [Help Center] → FAQ, articles, tickets
    ├─ [Report Bug] → Send bug report
    ├─ [FAQ] → Common questions
    └─ [Contact Support] → Chat with support
    ↓
Tap [Back ← ] to return to Drawer/Home
```

---

### MENU ITEM 6: ❓ HELP CENTER

```
Display:
├─ Icon: ❓ (question mark)
├─ Text: "Help Center"
├─ Sub-text: "FAQ • Articles • Help"
├─ Padding: 16px vertical, 20px horizontal
└─ Font: 16px regular

No badge (no count needed)

What happens when you TAP:
    ↓
Close drawer (slide left)
    ↓
Navigate to Help Center Hub
    ↓
Help Center Page shows:
├─ Header: "[Back ← ] Help Center [Search]"
├─ Welcome message
│
├─ Search bar:
│  └─ "Search help articles..."
│
├─ QUICK ACTION BUTTONS (6 cards):
│  ├─ ❓ View FAQ (50+ questions)
│  ├─ 📚 Browse Articles (35+ articles)
│  ├─ 🎫 My Support Tickets
│  ├─ [+ Create New Ticket]
│  ├─ 💬 Live Chat Support
│  └─ 📞 Contact Information
│
├─ POPULAR TOPICS (6 category cards):
│  ├─ 🅿️ Parking & Booking
│  ├─ 💰 Payment & Billing
│  ├─ 🏠 Listing Spaces
│  ├─ 👤 Account & Profile
│  ├─ 💬 Chat & Messages
│  └─ 🔐 Safety & Security
│
└─ CONTACT INFO:
   ├─ 📧 support@parkswift.com
   ├─ 📱 +91 1234-567-890
   └─ 🕐 Hours: 9 AM - 6 PM IST
    ↓
USER ACTIONS:

Tap [Search]:
    ├─ Search bar opens
    ├─ Type keyword
    ├─ Get results
    └─ Tap result to view
    ↓
Tap "❓ View FAQ":
    ├─ Navigate to FAQ page
    ├─ See 50+ questions
    ├─ Filter by category
    ├─ Search within FAQ
    ├─ Expand question → Read answer
    └─ Mark helpful 👍 or not helpful 👎
    ↓
Tap "📚 Browse Articles":
    ├─ Navigate to Articles page
    ├─ See 35+ articles
    ├─ Browse by 5+ categories
    ├─ Read full articles
    ├─ Table of contents
    └─ Share or create ticket if needed
    ↓
Tap "🎫 My Support Tickets":
    ├─ View all your tickets
    ├─ See status: Open, In Progress, Resolved
    ├─ Filter by status
    ├─ Tap ticket → View details
    ├─ Add replies
    ├─ Mark as resolved
    └─ Rate support quality
    ↓
Tap "[+ Create New Ticket]":
    ├─ Navigate to Create Ticket form
    ├─ Select category
    ├─ Enter title & description
    ├─ Choose priority
    ├─ Attach files
    └─ Submit → Get ticket ID
    ↓
Tap "💬 Live Chat Support":
    ├─ Open chat widget
    ├─ Chat with support team
    ├─ Real-time messaging
    ├─ Available: 9 AM - 6 PM IST
    └─ Leave message if offline
    ↓
Tap Category Card:
    ├─ Filter articles by category
    ├─ See related articles
    ├─ Quick access to topic
    └─ Back to Help Center
    ↓
Tap [Back ← ] to return to Drawer/Home
```

---

### MENU ITEM 7: 🚪 LOGOUT (Last Item - Red)

```
Display:
├─ Icon: 🚪 (door)
├─ Text: "Logout"
├─ Styling: RED COLOR (#dc0159)
├─ Padding: 16px vertical, 20px horizontal
└─ Font: 16px regular, RED

Important: Last item in menu, RED COLOR indicates DANGER

What happens when you TAP:
    ↓
Show confirmation dialog:
├─ Title: "Confirm Logout"
├─ Message: "Are you sure you want to logout?"
├─ Buttons: [Cancel] [Logout]
└─ Style: Red/warning colors on logout button
    ↓
If user taps [Cancel]:
    ├─ Dialog closes
    ├─ Stay logged in
    └─ Return to drawer/home
    ↓
If user taps [Logout]:
    ↓
    Perform logout:
    ├─ Delete JWT from SecureStore
    ├─ Clear Zustand auth store
    ├─ Clear AsyncStorage data
    ├─ Clear profile info
    ├─ API Call: POST /api/auth/logout
    └─ Close drawer
    ↓
    Navigate to Sign In screen
    ↓
    User is logged out ✓
    ↓
    Can now sign in again or sign up
```

---

## 📊 DRAWER MENU - QUICK REFERENCE TABLE

| Menu Item | Icon | Has Badge? | Goes To | Purpose |
|-----------|------|-----------|---------|---------|
| Home | 🏠 | No | Home Page | Back to main screen |
| Bookings | 📅 | Yes (count) | Bookings Page | View your bookings |
| Chat | 💬 | Yes (unread) | Messages Page | Chat with users |
| Profile | 👤 | No | Profile Page | View/edit profile |
| Settings | ⚙️ | No | Settings Page | App preferences |
| Help Center | ❓ | No | Help Hub | FAQ, tickets, chat |
| Logout | 🚪 | No | Sign In | Sign out (RED) |

---

## 🔄 COMPLETE END-TO-END HOME PAGE FLOW

```
USER OPENS APP
    ↓
Authentication check (JWT valid?)
    ├─ YES → Home Page loads
    └─ NO → Sign In Page
    ↓
HOME PAGE DISPLAYS (5 sections):
├─ Section 1: HEADER
│  ├─ ≡ Tap → Drawer opens
│  ├─ 🅿️ Logo → Back to home
│  ├─ [👤] Avatar → Profile page
│  └─ 🔔 Bell → Notifications page
│
├─ Section 2: GREETING
│  └─ "Hello Raj Kumar 👋"
│
├─ Section 3: LOCATION
│  ├─ 📍 Chennai, Tamil Nadu
│  └─ [Change ▼] → Change location
│
├─ Section 4: FIND SPACE CARD
│  └─ Tap → Browse & book spaces
│     ├─ Search spaces
│     ├─ View details
│     ├─ Book space
│     └─ Pay for booking
│
└─ Section 5: MY SPACES CARD
   └─ Tap → Manage your spaces
      ├─ View existing spaces
      ├─ Edit space details
      ├─ Add new space
      └─ Check earnings

DRAWER MENU (7 items):
├─ 🏠 Home → Stay/refresh home
├─ 📅 Bookings [badge] → View bookings
├─ 💬 Chat [badge] → Open messages
├─ 👤 Profile → View/edit profile
├─ ⚙️ Settings → App preferences
├─ ❓ Help Center → FAQ, articles, tickets
└─ 🚪 Logout → Sign out (RED)

BACKGROUND ACTIONS (Real-time):
├─ Notifications update (badges)
├─ Messages receive (badges)
├─ Booking updates (alerts)
├─ Location refresh
└─ Subscription check

USER CAN:
├─ Tap any header element → Navigate
├─ Tap Find Space card → Book parking
├─ Tap My Spaces card → List spaces
├─ Tap drawer menu items → Navigate
├─ Tap location → Change search area
├─ Get instant notifications
└─ Manage all account features
```

---

## ✅ HOME PAGE COMPLETE CHECKLIST

All Sections Covered:
- ✅ Header (4 tappable elements)
- ✅ Greeting message
- ✅ Location section
- ✅ Find Space card
- ✅ My Spaces card

Drawer Menu Covered:
- ✅ Home (1)
- ✅ Bookings (2)
- ✅ Chat (3)
- ✅ Profile (4)
- ✅ Settings (5)
- ✅ Help Center (6)
- ✅ Logout (7)

All Interactions Documented:
- ✅ Tap each header element
- ✅ Tap each card
- ✅ Tap each drawer menu item
- ✅ What appears
- ✅ What you can do
- ✅ Complete flows
- ✅ All navigation paths

---

## ✅ COMPLETE HOME PAGE DOCUMENTATION!

This single document covers:
- ✅ **HOME PAGE LAYOUT** - All 5 sections explained
- ✅ **HEADER SECTION** - All 4 elements (≡, Logo, Avatar, Bell)
- ✅ **GREETING** - Time-based messages
- ✅ **LOCATION** - Change location flow
- ✅ **FIND SPACE CARD** - Complete booking flow
- ✅ **MY SPACES CARD** - Complete listing flow
- ✅ **DRAWER MENU** - All 7 items explained in detail
  - Menu Item 1: Home
  - Menu Item 2: Bookings [badge]
  - Menu Item 3: Chat [badge]
  - Menu Item 4: Profile
  - Menu Item 5: Settings
  - Menu Item 6: Help Center
  - Menu Item 7: Logout
- ✅ **COMPLETE END-TO-END FLOW** - From opening app to all interactions
- ✅ **QUICK REFERENCE TABLE** - All menu items at a glance

**This is your complete HOME PAGE guide!** 🏠✨

