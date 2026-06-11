# PARKSWIFT - SIGN UP FLOW

**Type:** OTP-based registration  
**Duration:** 2-3 minutes  
**Target:** New users creating accounts  
**Note:** Sign Up is automatic after OTP verification (no separate signup screen)

---

## 📱 SIGN UP OVERVIEW

```
New User Opens App
    ↓
Check JWT in SecureStore
    ├─ Token doesn't exist (new user)
    └─ Go to Sign In Screen
    ↓
User Enters Phone Number (10 digits)
    ↓
Backend Checks if User Exists
    ├─ User exists → Send OTP for login
    └─ User not found → New user path
    ↓
User Receives OTP via SMS
    ↓
User Enters OTP
    ↓
Backend Verifies OTP
    ↓
**AUTOMATIC USER CREATION** ← This is Sign Up
    ├─ Create new Users account
    ├─ Create ParkerProfile
    ├─ Create OwnerProfile
    ├─ Set isProfileComplete = false
    └─ Mark as new user
    ↓
Generate JWT Token
    ↓
Store Token in SecureStore
    ↓
Navigate to Profile Completion Screen ← User fills details
    ↓
User completes profile
    ↓
Navigate to Home
    ↓
**Sign Up Complete** ✅
```

---

## 🔑 KEY DIFFERENCE: Sign In vs Sign Up

```
┌─────────────────────────────────────────────────────────┐
│ Aspect              │ Sign In    │ Sign Up              │
├─────────────────────────────────────────────────────────┤
│ User Status         │ Existing   │ New                  │
│ Phone Entry         │ Same       │ Same                 │
│ OTP Flow            │ Same       │ Same                 │
│ After OTP Verify    │            │                      │
│   - Create User?    │ NO         │ YES                  │
│   - Create Profiles │ NO         │ YES (both)           │
│   - Navigation      │ Home       │ Profile Complete     │
│   - Next Step       │ Use app    │ Fill profile         │
└─────────────────────────────────────────────────────────┘
```

---

## 📍 STEP 1: SIGN IN SCREEN (Same for Both)

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
│  (Routes to same phone entry)       │
│                                     │
└─────────────────────────────────────┘
```

### What Happens
```
New user taps "Don't have account? Sign up"
    ↓
Routes to same phone number screen
    ↓
Enters phone: "9876543210"
    ↓
Backend called (request-otp)
    ↓
Same OTP flow regardless
```

---

## 📞 STEP 2: BACKEND - REQUEST OTP (Same for Both)

### API Endpoint
```
POST /api/auth/request-otp

Request Body:
{
  "phone": "9876543210"
}

Response:
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

### Backend Operations
```
1. Validate phone format ✓
2. Check rate limit ✓
3. Generate 6-digit OTP ✓
4. Send via MSG91 ✓
5. Store OTP in Redis ✓

Note: At this stage, backend doesn't know if new or existing user
      Decision made during verification
```

---

## 🔐 STEP 3: OTP ENTRY SCREEN (Same for Both)

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

---

## ✔️ STEP 4: BACKEND - VERIFY OTP (Different for Sign Up)

### API Endpoint
```
POST /api/auth/verify-otp

Request Body:
{
  "phone": "9876543210",
  "otp": "234567"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": 123,
  "phone": "9876543210",
  "isProfileComplete": false,
  "isNewUser": true  ← NEW - indicates sign up
}
```

### Backend Operations

#### 1. Input Validation
```
Validate phone format ✓
Validate OTP format ✓
```

#### 2. Verify OTP
```
Query Redis for stored OTP
    ↓
Compare with user input
    ↓
Match? Continue
Delete OTP from Redis
```

#### 3. **CHECK IF USER EXISTS** (Key Decision Point)
```
Query Database:
SELECT * FROM users WHERE phone = '9876543210'
    ↓
User found?
├─ YES (Sign In):
│   ├─ Existing user
│   ├─ Update: lastLoginAt
│   ├─ Set: isNewUser = false
│   └─ Continue to token generation
│
└─ NO (Sign Up):
    ├─ New user
    ├─ **Create new account**
    └─ **Create profiles**
```

#### 4. **NEW USER - AUTO ACCOUNT CREATION**

##### Create Users Account
```
INSERT INTO users:
├─ phone: "9876543210"
├─ firstName: NULL (empty)
├─ lastName: NULL (empty)
├─ email: NULL (empty)
├─ photoUrl: NULL (empty)
├─ isProfileComplete: false ← Mark incomplete
├─ createdAt: NOW()
└─ updatedAt: NOW()

Result: userId = 123 (auto-increment)
```

##### Automatically Create Parker Profile
```
INSERT INTO parker_profiles:
├─ userId: 123
├─ totalBookings: 0
├─ totalSpent: 0
├─ averageRating: 0
└─ createdAt: NOW()

Reason:
├─ All users can search for parking
├─ Profile created upfront
└─ Stats initialized
```

##### Automatically Create Owner Profile
```
INSERT INTO owner_profiles:
├─ userId: 123
├─ totalSpaces: 0
├─ totalEarnings: 0
├─ averageRating: 0
├─ verificationStatus: "PENDING"
└─ createdAt: NOW()

Reason:
├─ All users can list spaces
├─ Profile created upfront
├─ Stats initialized
├─ Verification pending approval
```

#### 5. Generate JWT Token
```
Payload:
{
  "userId": 123,
  "phone": "9876543210",
  "iat": 1715418000,
  "exp": 1716022800
}

Secret: JWT_SECRET from .env
Expiry: 7 days
```

#### 6. Save Session
```
INSERT INTO sessions:
├─ userId: 123
├─ token: "eyJhbGc..."
├─ expiresAt: 7 days from now
├─ ipAddress: "192.168.1.1"
├─ userAgent: "Mozilla/5.0..."
└─ createdAt: NOW()
```

#### 7. Return Response with NEW USER Flag
```
Response:
{
  "success": true,
  "token": "eyJhbGc...",
  "userId": 123,
  "phone": "9876543210",
  "isProfileComplete": false,
  "isNewUser": true  ← Signal to mobile
}
```

---

## 💾 STEP 5: MOBILE - STORE TOKEN & DETECT NEW USER

### Store JWT Token
```
SecureStore:
├─ Key: "jwt_token"
├─ Value: "eyJhbGc..."
└─ Encrypted: Yes

Zustand State:
├─ token: "eyJhbGc..."
├─ user.id: 123
├─ user.phone: "9876543210"
├─ user.isProfileComplete: false
├─ isNewUser: true ← NEW FLAG
└─ isAuthenticated: true
```

### Detect Sign Up vs Sign In
```
Response includes: isNewUser field

if isNewUser === true:
├─ **SIGN UP PATH**
├─ Show onboarding/welcome message (optional)
├─ Show profile completion as required step
└─ Enforce profile completion

if isNewUser === false:
├─ **SIGN IN PATH**
├─ Skip onboarding
├─ Check isProfileComplete
│  ├─ true → Go to Home
│  └─ false → Go to Profile Complete (unlikely)
└─ Continue normally
```

---

## 🔄 STEP 6: NAVIGATION DECISION (Sign Up Specific)

### For New Users
```
Response from verify-otp:
{
  "isNewUser": true,
  "isProfileComplete": false
}
    ↓
**ALWAYS** navigate to Profile Completion Screen
    ↓
Don't allow skipping
    ↓
Must fill: First Name, Last Name, Email
    ↓
Optional: Photo
```

### For Existing Users
```
Response from verify-otp:
{
  "isNewUser": false,
  "isProfileComplete": true/false
}
    ↓
if isProfileComplete === true:
├─ Navigate to Home
└─ Skip profile screen

else:
├─ Navigate to Profile Completion
└─ Show as required (rare edge case)
```

---

## 📝 STEP 7: SIGN UP SUMMARY - WHAT HAPPENS AUTOMATICALLY

### Automatic Account Creation
```
When OTP verified:
├─ ✅ Users account created
├─ ✅ ParkerProfile created
├─ ✅ OwnerProfile created
├─ ✅ JWT token generated
├─ ✅ Session saved in database
└─ ✅ User is now registered

No manual form needed!
No API call for signup!
Everything automatic in verify-otp!
```

### What User Needs to Do Next
```
After automatic account creation:
    ↓
User navigates to Profile Completion
    ↓
Fill: First Name (required)
Fill: Last Name (required)
Fill: Email (required)
Fill: Photo (optional)
    ↓
Profile completion saves user details
    ↓
Then navigate to Home
```

---

## 📊 NEW USER CREATION FLOW

```
User enters phone: "9876543210"
    ↓
User enters OTP: "234567"
    ↓
POST /api/auth/verify-otp
    ↓
Backend checks: User exists?
    ├─ NO (New user)
    │   ├─ INSERT INTO users ✅
    │   ├─ INSERT INTO parker_profiles ✅
    │   ├─ INSERT INTO owner_profiles ✅
    │   ├─ Generate JWT ✅
    │   ├─ Save session ✅
    │   └─ Return: { isNewUser: true, isProfileComplete: false }
    │
    └─ YES (Existing)
        └─ Update lastLoginAt, return normally

Mobile receives response
    ↓
if isNewUser === true:
├─ Store token in SecureStore
├─ Set Zustand state
└─ **Navigate to Profile Completion Screen**
    ↓
User fills: Name, Email, Photo
    ↓
Profile saved
    ↓
Navigate to Home
    ↓
**Sign Up Complete** ✅
```

---

## 🔐 SECURITY IN SIGN UP

### Rate Limiting
```
OTP Requests: Max 5 per phone per 15 mins
OTP Attempts: Max 5 per 10 mins
    ↓
Prevents:
├─ OTP spam
├─ Brute force
└─ Abuse
```

### No Data Exposure
```
Don't expose in responses:
├─ Whether phone exists
├─ User details of existing users
├─ Account status
└─ Other user info

Always respond:
├─ "OTP sent" (even if new)
├─ "Invalid OTP" (don't say expired vs wrong)
└─ Generic messages
```

### Account Creation Security
```
Automatic creation is safe because:
├─ OTP already verified ✓
├─ Phone ownership confirmed ✓
├─ Rate limiting in place ✓
├─ IP + User agent tracked ✓
└─ Session logged ✓
```

---

## 💾 DATABASE OPERATIONS IN SIGN UP

### Users Table
```
INSERT INTO users
├─ id: AUTO_INCREMENT
├─ phone: "9876543210" (UNIQUE)
├─ firstName: NULL
├─ lastName: NULL
├─ email: NULL
├─ photoUrl: NULL
├─ isProfileComplete: false
├─ createdAt: CURRENT_TIMESTAMP
├─ updatedAt: CURRENT_TIMESTAMP
└─ Result: userId = 123
```

### ParkerProfiles Table
```
INSERT INTO parker_profiles
├─ id: AUTO_INCREMENT
├─ userId: 123 (FOREIGN KEY)
├─ totalBookings: 0
├─ totalSpent: 0
├─ averageRating: 0
├─ createdAt: CURRENT_TIMESTAMP
└─ Purpose: Track Parker stats
```

### OwnerProfiles Table
```
INSERT INTO owner_profiles
├─ id: AUTO_INCREMENT
├─ userId: 123 (FOREIGN KEY)
├─ totalSpaces: 0
├─ totalEarnings: 0
├─ averageRating: 0
├─ verificationStatus: "PENDING"
├─ createdAt: CURRENT_TIMESTAMP
└─ Purpose: Track Owner stats
```

### Sessions Table
```
INSERT INTO sessions
├─ id: AUTO_INCREMENT
├─ userId: 123
├─ token: "eyJhbGc..."
├─ expiresAt: +7 days
├─ ipAddress: "192.168.1.1"
├─ userAgent: "Mozilla/5.0..."
├─ createdAt: CURRENT_TIMESTAMP
└─ Purpose: Session tracking
```

---

## 📊 SIGN UP vs SIGN IN COMPARISON

```
┌─────────────────────────────────────────────────────────┐
│ Step              │ Sign In        │ Sign Up            │
├─────────────────────────────────────────────────────────┤
│ 1. Phone entry    │ Enter phone    │ Enter phone        │
│ 2. Request OTP    │ API call       │ API call (same)    │
│ 3. Receive SMS    │ OTP in SMS     │ OTP in SMS         │
│ 4. Enter OTP      │ Enter OTP      │ Enter OTP          │
│ 5. Verify OTP     │ API call       │ API call           │
│ 6. User check     │ User exists    │ User NOT exists    │
│ 7. DB operations  │ None/update    │ **Create all** ←   │
│ 8. Profiles       │ Already exist  │ Auto-created ←     │
│ 9. JWT generated  │ Yes            │ Yes                │
│ 10. Token stored  │ SecureStore    │ SecureStore        │
│ 11. Navigation    │ Check profile  │ Profile Complete   │
│ 12. Next step     │ Home or Profile│ **Must fill** ←    │
└─────────────────────────────────────────────────────────┘
```

---

## ⏱️ TIMING

```
Step 1: Phone entry     → 30 seconds
Step 2: OTP request     → 1 second (API)
Step 3: SMS delivery    → 2-3 seconds
Step 4: User enters OTP → 30 seconds
Step 5: OTP verify      → 1 second (API)
Step 6: Profile screen  → 5-10 minutes
────────────────────────────────────
Total: ~6-10 minutes
```

---

## ✅ SIGN UP FLOW COMPLETE!

This covers:
- ✅ Phone entry (shared with Sign In)
- ✅ OTP request (shared with Sign In)
- ✅ OTP verification (different for new users)
- ✅ Automatic user account creation
- ✅ Automatic Parker profile creation
- ✅ Automatic Owner profile creation
- ✅ JWT token generation
- ✅ Token storage
- ✅ Detection of new user
- ✅ Navigation to Profile Completion
- ✅ Security features

**Next: User completes profile** → Profile Completion Flow

