# PARKSWIFT - SIGN IN FLOW

**Type:** OTP-based authentication  
**Duration:** 2-3 minutes  
**Target:** Existing users logging in  

---

## 📱 SIGN IN OVERVIEW

```
User Opens App
    ↓
Check JWT in SecureStore
    ├─ Token exists & valid → Go to Home
    └─ Token missing/expired → Go to Sign In
    ↓
User Enters Phone Number
    ↓
Backend Validates Phone
    ├─ User exists → Send OTP
    └─ User not found → Show signup option
    ↓
User Receives OTP via SMS
    ↓
User Enters OTP
    ↓
Backend Verifies OTP with MSG91
    ├─ Valid → Generate JWT
    └─ Invalid → Show error
    ↓
Store JWT in SecureStore
    ↓
Check if Profile Complete
    ├─ YES → Go to Home
    └─ NO → Go to Profile Completion
```

---

## 📍 STEP 1: PHONE NUMBER ENTRY SCREEN

### Screen Display
```
┌─────────────────────────────────────┐
│                                     │
│  ParkSwift                          │
│                                     │
│  Sign In                            │
│                                     │
│  Enter your phone number            │
│                                     │
│  [+91]  [__________]                │
│         10-digit phone              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Send OTP                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Don't have account? Sign up        │
│                                     │
└─────────────────────────────────────┘
```

### User Input Validation
```
Phone Number Validation:
├─ Length: Exactly 10 digits
├─ Format: Numeric only (0-9)
├─ Country Code: +91 (India)
├─ Examples: 9876543210, 9123456789
└─ Error Messages:
   ├─ "Enter 10-digit phone number"
   ├─ "Only numbers allowed"
   └─ "Invalid phone format"
```

### What Happens on Screen
```
User enters phone → Real-time validation
    ↓
Phone valid (10 digits) → Enable "Send OTP" button
    ↓
User taps "Send OTP" → Show loading spinner
    ↓
API call to backend
```

### What NOT to Show
```
❌ Don't validate if user exists yet
❌ Don't check database before API call
❌ Don't show error if phone not registered
   (show after OTP screen instead)
```

---

## 📞 STEP 2: BACKEND - REQUEST OTP

### API Endpoint
```
POST /api/auth/request-otp

Request Body:
{
  "phone": "9876543210"
}

Response (Success):
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600  // 10 minutes
}

Response (Error):
{
  "success": false,
  "error": "Too many attempts, try after 15 minutes"
}

Response (Error):
{
  "success": false,
  "error": "SMS service unavailable"
}
```

### Backend Operations

#### 1. Phone Validation
```
Input: "9876543210"
    ↓
Check length = 10 digits
    ↓
Check format = numeric only
    ↓
Valid ✅
```

#### 2. Rate Limiting Check
```
Key: otp_9876543210 (in Redis)

Limit: Max 5 OTP attempts per phone per 15 minutes
    ↓
If attempts ≥ 5:
├─ Return error: "Too many attempts"
├─ Lock for 15 minutes
└─ User can retry after 15 mins

Else:
├─ Increment attempt counter
├─ Expire in 15 minutes
└─ Continue
```

#### 3. Generate OTP
```
OTP Generation:
├─ Random 6-digit number
├─ Range: 100000 - 999999
├─ No repetition preferred
└─ Examples: 234567, 891023
```

#### 4. Send OTP via MSG91
```
Service: MSG91
    ↓
API Call:
├─ Auth Key: ${MSG91_API_KEY}
├─ Phone: +919876543210
├─ Message: "Your ParkSwift OTP is 234567. Valid for 10 minutes."
├─ Sender ID: PARKSWIFT
└─ Route: 4 (Promotional)

Response:
├─ Success: { type: 'success' }
└─ Failure: { type: 'fail', error: '...' }

Cost: ₹0.50 per SMS
```

#### 5. Store OTP Temporarily
```
Key: otp_verify_9876543210
Value: "234567"
Expiry: 600 seconds (10 minutes)

Storage: Redis
    ↓
Auto-delete after 10 minutes
Auto-delete after verification
```

### Error Handling
```
Scenarios:
1. Invalid phone format
   → Return: 400 Bad Request
   → Message: "Invalid phone number"

2. Rate limit exceeded
   → Return: 429 Too Many Requests
   → Message: "Too many attempts, try after 15 minutes"

3. SMS service down
   → Return: 500 Server Error
   → Message: "Failed to send OTP, try again"

4. Unknown error
   → Return: 500 Server Error
   → Message: "Server error, please try again"
```

---

## 📨 STEP 3: SMS DELIVERY

### User Receives SMS
```
From: MSG91
To: +919876543210
Time: Instant (2-3 seconds)

Message:
"Your ParkSwift OTP is 234567. Valid for 10 minutes."

Format:
├─ All digits for OTP
├─ Clear validity time
└─ App name for recognition
```

### SMS Features
```
Delivery:
├─ Success rate: 98%+
├─ Speed: 2-3 seconds
├─ Validity: 10 minutes
├─ Cost per SMS: ₹0.50

Resend:
├─ Available after timeout
├─ Max resends: Unlimited (respects rate limit)
└─ User can request new OTP
```

---

## 🔐 STEP 4: OTP ENTRY SCREEN

### Screen Display
```
┌─────────────────────────────────────┐
│                                     │
│  Verify OTP                         │
│                                     │
│  OTP sent to +91 9876543210         │
│                                     │
│  Enter 6-digit OTP:                 │
│                                     │
│  [_] [_] [_] [_] [_] [_]            │
│                                     │
│  Expires in: 09:45                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Verify OTP                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  Didn't receive? Resend OTP         │
│                                     │
│  Change phone number                │
│                                     │
└─────────────────────────────────────┘
```

### OTP Input Details
```
Format:
├─ 6 input fields (single digit each)
├─ Auto-focus next field
├─ Auto-submit on 6th digit
├─ Numeric keyboard
└─ Paste support

Validation:
├─ Length: Exactly 6 digits
├─ Format: Numeric only
└─ Error: "Enter valid 6-digit OTP"
```

### Countdown Timer
```
Start: 600 seconds (10 minutes)
    ↓
Decrement every 1 second
    ↓
Display format: MM:SS
    ↓
When ≤ 60 seconds: Show in red
    ↓
When = 0:
├─ Disable submit button
├─ Show "OTP Expired"
├─ Show "Resend OTP" button
└─ User must request new OTP
```

### Resend OTP Button
```
Appears: After timer expires OR user clicks "Resend"

Behavior:
├─ Respects rate limit (5 attempts per 15 mins)
├─ Same API call: POST /api/auth/request-otp
├─ Shows new countdown timer
└─ Confirms: "New OTP sent to ..."
```

---

## ✔️ STEP 5: BACKEND - VERIFY OTP

### API Endpoint
```
POST /api/auth/verify-otp

Request Body:
{
  "phone": "9876543210",
  "otp": "234567"
}

Response (Success):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": 123,
  "phone": "9876543210",
  "isProfileComplete": false
}

Response (Error):
{
  "success": false,
  "error": "Invalid OTP"
}

Response (Error):
{
  "success": false,
  "error": "OTP expired"
}
```

### Backend Operations

#### 1. Input Validation
```
Check phone:
├─ Format: 10 digits
└─ Valid: Continue

Check OTP:
├─ Format: 6 digits
└─ Valid: Continue
```

#### 2. Retrieve Stored OTP
```
Key: otp_verify_9876543210 (from Redis)
    ↓
If key not found:
├─ Return error: "OTP expired"
└─ Stop

If key found:
├─ Get stored OTP value
└─ Continue
```

#### 3. Compare OTPs
```
User entered: "234567"
Stored OTP:   "234567"
    ↓
Match?
├─ YES → Continue to next step
└─ NO → Return error: "Invalid OTP"
```

#### 4. Delete Used OTP
```
Delete from Redis:
├─ Key: otp_verify_9876543210
└─ Reason: Prevent reuse

Also delete:
├─ Attempt counter
└─ Reason: Clean up
```

#### 5. Check if User Exists
```
Query Database:
SELECT * FROM users WHERE phone = '9876543210'
    ↓
User exists?
├─ YES → Update last login time
└─ NO → Create new user
```

#### 6. Create New User (if not exists)
```
Insert into Users table:
├─ phone: "9876543210"
├─ isProfileComplete: false
├─ createdAt: Current timestamp
└─ updatedAt: Current timestamp

Automatically creates:
├─ User account
└─ Ready for profile completion
```

#### 7. Generate JWT Token
```
Payload:
{
  "userId": 123,
  "phone": "9876543210",
  "iat": 1715418000,
  "exp": 1716022800  // 7 days later
}

Secret: JWT_SECRET (from .env)

Algorithm: HS256

Expiry: 7 days (604800 seconds)
```

#### 8. Save Session
```
Insert into Sessions table:
├─ userId: 123
├─ token: "eyJhbGc..."
├─ expiresAt: 7 days from now
├─ ipAddress: "192.168.1.1"
├─ userAgent: "Mozilla/5.0..."
└─ createdAt: Current timestamp

Reason:
├─ Track active sessions
├─ Prevent token reuse
└─ Security audit trail
```

#### 9. Return Response
```
Response to mobile:
{
  "success": true,
  "token": "eyJhbGc...",
  "userId": 123,
  "phone": "9876543210",
  "isProfileComplete": false
}
```

---

## 💾 STEP 6: MOBILE - STORE JWT TOKEN

### SecureStore (Encrypted Local Storage)

```
Key: "jwt_token"
Value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

Storage:
├─ Location: Device encrypted storage
├─ Encryption: AES-256
├─ Accessible: Only by this app
├─ Persistent: Until logout
└─ Persists through app restarts
```

### Zustand State Management

```
Update state:
├─ token: "eyJhbGc..."
├─ user: {
│   id: 123,
│   phone: "9876543210",
│   isProfileComplete: false
│ }
└─ isAuthenticated: true

Scope: In-memory (lost on app restart)
```

---

## 🔄 STEP 7: NAVIGATION DECISION

### Check Profile Status
```
Response includes: isProfileComplete

If isProfileComplete === true:
├─ User has filled profile before
├─ Navigate to: Home Screen
└─ Show: All features

If isProfileComplete === false:
├─ New user OR profile never filled
├─ Navigate to: Profile Completion Screen
└─ Show: Profile form
```

---

## ✅ STEP 8: GO TO HOME

### Screen Transition
```
All checks passed:
├─ OTP verified ✓
├─ JWT generated ✓
├─ Token stored ✓
├─ Profile complete ✓
└─ Navigate to Home Screen
```

### Home Screen Access
```
User can now:
├─ Browse parking spaces
├─ Search by location
├─ View space details
├─ Make bookings
├─ Chat with owners
├─ Manage profile
├─ List own spaces
└─ View bookings/earnings
```

---

## 🔐 SECURITY FEATURES IN SIGN IN

### Rate Limiting
```
OTP Requests:
├─ Max 5 per phone per 15 minutes
├─ After 5: Lock for 15 minutes
└─ Prevents brute force & SMS spam

Verification Attempts:
├─ Max 5 wrong OTPs per 10 minutes
├─ After 5: Lock for 10 minutes
└─ Prevents brute force attacks
```

### OTP Security
```
Generation:
├─ Random 6-digit number
├─ Cryptographically secure
└─ No patterns

Storage:
├─ Encrypted in Redis
├─ 10-minute expiry
└─ Auto-delete after use

Transmission:
├─ Via MSG91 (encrypted)
├─ No logs in app
└─ Not sent via email
```

### JWT Token Security
```
Storage:
├─ SecureStore (encrypted)
├─ Device-only access
├─ No network transmission
└─ Auto-cleared on logout

Validation:
├─ Check signature
├─ Check expiry
├─ Check user exists
└─ Check session exists
```

### Session Tracking
```
Store:
├─ IP address
├─ User agent
├─ Device info
└─ Login time

Use:
├─ Detect suspicious activity
├─ Track multiple logins
├─ Logout from other devices
└─ Security audit
```

---

## 🕐 TIMING & EXPIRY

```
OTP:
├─ Validity: 10 minutes
├─ Resend: Available after expiry
└─ Auto-delete: After 10 mins

JWT Token:
├─ Validity: 7 days
├─ Auto-refresh: Not implemented (MVP)
├─ Re-login required: After 7 days
└─ Auto-clear: On logout

Session:
├─ Expires: Same as JWT (7 days)
├─ Database: Cleaned up after expiry
└─ Activity: Tracked during validity
```

---

## 📊 DATA FLOW DIAGRAM

```
Mobile App
    ↓
User enters phone: "9876543210"
    ↓
POST /api/auth/request-otp
    ↓
Backend validates phone ✓
    ↓
Check rate limit ✓
    ↓
Generate OTP: "234567"
    ↓
Call MSG91 API
    ↓
SMS sent to user ✓
    ↓
User receives SMS
    ↓
User enters OTP: "234567"
    ↓
POST /api/auth/verify-otp
    ↓
Backend verifies OTP ✓
    ↓
Check user exists
├─ YES: Update last login
└─ NO: Create user
    ↓
Generate JWT token
    ↓
Save session in database
    ↓
Return token + userData
    ↓
Mobile stores token in SecureStore
    ↓
Check isProfileComplete
├─ YES: Go to Home
└─ NO: Go to Profile Completion
    ↓
User is signed in ✓
```

---

## ✅ SIGN IN FLOW COMPLETE!

This covers:
- ✅ Phone entry & validation
- ✅ OTP request with rate limiting
- ✅ SMS delivery via MSG91
- ✅ OTP verification
- ✅ User creation (if new)
- ✅ JWT token generation
- ✅ Token storage (SecureStore)
- ✅ Session tracking
- ✅ Navigation to Home or Profile
- ✅ Security features

