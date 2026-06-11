# PARKSWIFT - PROFILE COMPLETION FLOW

**Type:** User profile setup  
**When:** After Sign Up (for new users)  
**Duration:** 3-5 minutes  
**Mandatory Fields:** First Name, Last Name, Email  
**Optional Fields:** Photo

---

## 📱 PROFILE COMPLETION OVERVIEW

```
User Completes Sign Up
    ↓
Redirects to Profile Completion Screen
    ↓
User Sees Form with 4 Fields
    ├─ First Name (required)
    ├─ Last Name (required)
    ├─ Email (required)
    └─ Photo (optional)
    ↓
User Fills Required Fields
    ↓
User Optionally Adds Photo
    ├─ Can skip with "Skip for now"
    └─ Can add later from profile settings
    ↓
User Taps "Complete Profile"
    ↓
Frontend Validates All Fields
    ├─ First Name: 2-50 chars, letters only
    ├─ Last Name: 1-50 chars, letters only
    ├─ Email: Valid email format
    └─ Check if email already exists
    ↓
Upload Photo to Supabase (if provided)
    ↓
Send to Backend API
    ↓
Backend Validates Again
    ↓
Update Users Table
    ↓
Upload Photo to Cloud Storage
    ↓
Set isProfileComplete = true
    ↓
Navigate to Home Screen
    ↓
User Can Now Access Full App
```

---

## 📍 STEP 1: PROFILE COMPLETION SCREEN

### Screen Display
```
┌─────────────────────────────────────────┐
│                                         │
│  Complete Your Profile                  │
│                                         │
│  You can find parking and               │
│  list your spaces!                      │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Profile Photo (Optional)        │  │
│  │                                  │  │
│  │      [+ Add Photo]               │  │
│  │       (or crop from camera)      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Phone Number (Read-only)               │
│  ┌──────────────────────────────────┐  │
│  │ +91 9876543210                   │  │
│  └──────────────────────────────────┘  │
│                                         │
│  First Name (Required) *                │
│  ┌──────────────────────────────────┐  │
│  │ [e.g., Raj]                      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Last Name (Required) *                 │
│  ┌──────────────────────────────────┐  │
│  │ [e.g., Kumar]                    │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Email Address (Required) *             │
│  ┌──────────────────────────────────┐  │
│  │ [raj@example.com]                │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Complete Profile                │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Can add photo later [Skip]             │
│                                         │
└─────────────────────────────────────────┘
```

### Form Layout Details
```
1. Profile Photo Section (Top - Optional)
   ├─ Square image display
   ├─ Tap to add/change photo
   ├─ Can crop to square
   └─ Can skip

2. Phone Display (Read-only)
   ├─ Pre-filled from OTP
   ├─ Shows +91 prefix
   ├─ Can't be edited
   └─ For reference only

3. Input Fields (Required)
   ├─ First Name
   ├─ Last Name
   ├─ Email
   └─ All with placeholder text

4. Submit Button
   ├─ "Complete Profile"
   ├─ Disabled until all required fields filled
   └─ Shows loading state

5. Skip Option
   ├─ "Can add photo later"
   ├─ Links to skip photo step
   └─ Allows profile to complete
```

---

## 🖼️ STEP 2: OPTIONAL - ADD PROFILE PHOTO

### Photo Selection Flow
```
User taps "Add Photo" button
    ↓
Shows options:
├─ Take photo (camera)
└─ Choose from gallery
    ↓
User selects option
    ↓
Image picker opens
    ↓
User selects image
    ↓
Crop to square (1:1 ratio)
    ↓
User confirms
    ↓
Image stored in app memory (temp)
```

### Photo Requirements
```
Format:
├─ JPG, PNG, JPEG
└─ WebP (optional)

Size Limits:
├─ Max file size: 5MB
├─ Max dimensions: 4000x4000px
└─ Auto-resize if larger

Aspect Ratio:
├─ Preferably 1:1 (square)
├─ Will be cropped to square
└─ Display as circle in app

Quality:
├─ Compression: 80% JPEG quality
├─ Auto-optimization
└─ Result: ~100-300KB
```

### What Happens with Photo
```
User selects photo
    ↓
Compress locally (mobile)
├─ Resize to max 1200x1200px
├─ Compress to 80% quality
└─ Save to temp file

Display preview
├─ Show compressed version
├─ Allow crop adjustment
└─ Get confirmation

Ready to upload
├─ File ready to send
├─ Will upload with form submission
└─ No separate upload
```

### Skip Photo
```
User taps "Can add photo later"
    ↓
Profile photo field becomes optional
    ↓
Photo field cleared
    ↓
User can continue without photo
    ↓
User can add photo from settings later
```

---

## ✏️ STEP 3: FILL REQUIRED FIELDS

### Field 1: Phone Number (Pre-filled, Read-only)

```
Display:
├─ Label: "Phone Number"
├─ Value: "+91 9876543210"
├─ Editable: NO
├─ Background: Light gray (read-only style)
└─ Purpose: Reference, already verified

Why pre-filled?
├─ Already verified via OTP
├─ No need to enter again
├─ Prevents duplicate registration
└─ Always linked to this account
```

### Field 2: First Name (Required)

```
Display:
├─ Label: "First Name (Required) *"
├─ Placeholder: "e.g., Raj"
├─ Input type: Text
├─ Keyboard: Default
└─ Max length: 50 characters

Validation Rules:
├─ Min length: 2 characters
├─ Max length: 50 characters
├─ Allowed: Letters (a-z, A-Z) and spaces
├─ Not allowed: Numbers, special chars
└─ Pattern: /^[a-zA-Z ]+$/

Error Messages:
├─ Empty: "First name is required"
├─ Too short: "First name must be at least 2 characters"
├─ Too long: "First name must be less than 50 characters"
├─ Invalid chars: "Only letters and spaces allowed"
└─ Shown: Below field in red

Examples:
├─ ✅ "Raj"
├─ ✅ "John"
├─ ✅ "Maria Anne"
├─ ❌ "R" (too short)
├─ ❌ "Raj123" (numbers)
└─ ❌ "Raj-Kumar" (hyphen not allowed)
```

### Field 3: Last Name (Required)

```
Display:
├─ Label: "Last Name (Required) *"
├─ Placeholder: "e.g., Kumar"
├─ Input type: Text
├─ Keyboard: Default
└─ Max length: 50 characters

Validation Rules:
├─ Min length: 1 character
├─ Max length: 50 characters
├─ Allowed: Letters (a-z, A-Z) and spaces
├─ Not allowed: Numbers, special chars
└─ Pattern: /^[a-zA-Z ]+$/

Error Messages:
├─ Empty: "Last name is required"
├─ Too long: "Last name must be less than 50 characters"
├─ Invalid chars: "Only letters and spaces allowed"
└─ Shown: Below field in red

Examples:
├─ ✅ "Kumar"
├─ ✅ "Smith"
├─ ✅ "Garcia Lopez"
├─ ❌ "" (empty)
├─ ❌ "Kumar123" (numbers)
└─ ❌ "Kumar_Singh" (underscore)
```

### Field 4: Email (Required)

```
Display:
├─ Label: "Email Address (Required) *"
├─ Placeholder: "your.email@example.com"
├─ Input type: Email
├─ Keyboard: Email (shows @)
└─ Max length: 100 characters

Validation Rules:
├─ Format: Valid email (xyz@domain.com)
├─ Min length: 5 characters
├─ Max length: 100 characters
├─ Pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
└─ Uniqueness: Check if already used (API)

Error Messages:
├─ Empty: "Email is required"
├─ Invalid format: "Enter a valid email address"
├─ Too long: "Email must be less than 100 characters"
├─ Already exists: "This email is already registered"
└─ Shown: Below field in red

Examples:
├─ ✅ "user@gmail.com"
├─ ✅ "name.surname@company.co.uk"
├─ ✅ "test+alias@example.com"
├─ ❌ "usermail" (no @)
├─ ❌ "user@" (no domain)
└─ ❌ "user @example.com" (space)
```

---

## ✅ STEP 4: FRONTEND VALIDATION

### Pre-Submit Validation (Real-time)

```
As user types:
├─ First Name:
│  └─ Check length, allowed chars
├─ Last Name:
│  └─ Check length, allowed chars
├─ Email:
│  └─ Check format (basic)
└─ Show error message below field

Error Display:
├─ Color: Red (#dc0159 or red)
├─ Font size: Small (12px)
├─ Appear: Below input field
├─ Clear: When user corrects
└─ Prevent: Form submission if error
```

### Submit Button State

```
Button Logic:
├─ Enable when:
│  ├─ First Name: ✓ (2-50 chars, letters only)
│  ├─ Last Name: ✓ (1-50 chars, letters only)
│  ├─ Email: ✓ (valid format)
│  └─ All required fields filled
│
└─ Disable when:
   ├─ Any required field empty
   ├─ Any field has validation error
   ├─ Photo is being uploaded
   └─ API request in progress
```

### Validation Schema (Zod)

```
Validation Flow:
├─ First Name:
│  ├─ Type: string
│  ├─ Min: 2, Max: 50
│  ├─ Pattern: /^[a-zA-Z ]+$/
│  └─ Error: Custom message
│
├─ Last Name:
│  ├─ Type: string
│  ├─ Min: 1, Max: 50
│  ├─ Pattern: /^[a-zA-Z ]+$/
│  └─ Error: Custom message
│
├─ Email:
│  ├─ Type: email
│  ├─ Min: 5, Max: 100
│  ├─ Pattern: Email format
│  └─ Error: Custom message
│
└─ Photo:
   ├─ Type: file (optional)
   ├─ Max size: 5MB
   ├─ Formats: jpg, png, jpeg
   └─ Error: Custom message
```

---

## 📤 STEP 5: SUBMIT FORM

### Form Submission Process

```
User taps "Complete Profile" button
    ↓
Trigger validation (schema check)
    ↓
Validation passes?
├─ NO → Show errors, don't submit
└─ YES → Continue
    ↓
Show loading state
├─ Button text: "Saving Profile..."
├─ Button disabled: true
└─ Spinner: Show
    ↓
Prepare form data
├─ firstName: "Raj"
├─ lastName: "Kumar"
├─ email: "raj@example.com"
└─ photo: File object (if selected)
    ↓
Get JWT from SecureStore
    ↓
Prepare multipart/form-data
├─ Add all fields
├─ Add file if photo selected
└─ Encode binary data
    ↓
Send API request
├─ Endpoint: POST /api/auth/complete-profile
├─ Headers: Authorization: Bearer {token}
├─ Body: FormData
└─ Timeout: 30 seconds
    ↓
Handle response
```

### API Call Details

```
Endpoint: POST /api/auth/complete-profile

Headers:
├─ Content-Type: multipart/form-data
├─ Authorization: Bearer eyJhbGc...
└─ User-Agent: (automatic)

Form Data:
├─ firstName: "Raj"
├─ lastName: "Kumar"
├─ email: "raj@example.com"
└─ photo: <binary file data> (optional)

Request Size:
├─ Without photo: ~200 bytes
├─ With photo: ~100KB - 5MB
└─ Upload time: 1-10 seconds
```

---

## 🖥️ STEP 6: BACKEND - PROCESS PROFILE

### API Endpoint

```
POST /api/auth/complete-profile

Request Headers:
├─ Authorization: Bearer eyJhbGc...
├─ Content-Type: multipart/form-data
└─ Content-Length: (auto)

Request Body (multipart):
├─ firstName: "Raj"
├─ lastName: "Kumar"
├─ email: "raj@example.com"
└─ photo: <file binary>

Response (Success):
{
  "success": true,
  "message": "Profile completed successfully",
  "user": {
    "id": 123,
    "firstName": "Raj",
    "lastName": "Kumar",
    "email": "raj@example.com",
    "phone": "9876543210",
    "photoUrl": "user-123-profile-1715418000.jpg",
    "isProfileComplete": true,
    "isParker": true,
    "isOwner": true
  }
}

Response (Error):
{
  "success": false,
  "error": "Email already registered"
}
```

### Backend Operations

#### 1. Authenticate Request
```
Extract JWT from Authorization header
    ↓
Verify JWT signature
    ↓
Check if token expired
    ↓
Get userId from payload
    ↓
Valid? Continue, Invalid? Return 401
```

#### 2. Input Validation
```
Validate firstName:
├─ Required? Yes
├─ Length: 2-50
├─ Pattern: /^[a-zA-Z ]+$/
└─ Error? Return 400

Validate lastName:
├─ Required? Yes
├─ Length: 1-50
├─ Pattern: /^[a-zA-Z ]+$/
└─ Error? Return 400

Validate email:
├─ Required? Yes
├─ Format: Valid email
├─ Already exists? Check DB
└─ Error? Return 400

Validate photo:
├─ Optional? Yes
├─ Size: Max 5MB
├─ Format: jpg, png, jpeg
└─ Error? Return 400
```

#### 3. Check Email Uniqueness
```
Query Database:
SELECT * FROM users WHERE email = 'raj@example.com' AND id != 123
    ↓
Email found?
├─ YES → Return error: "Email already registered"
└─ NO → Continue
```

#### 4. Upload Photo to Supabase (if provided)

```
If photo file exists:
    ↓
    Generate filename:
    ├─ Format: {userId}-profile-{timestamp}.jpg
    ├─ Example: 123-profile-1715418000.jpg
    └─ Path: user-profiles/{filename}
    ↓
    Compress image:
    ├─ Max dimensions: 1200x1200px
    ├─ Quality: 80%
    └─ Format: JPEG
    ↓
    Upload to Supabase:
    ├─ Bucket: "user-profiles"
    ├─ File: Binary data
    ├─ Content-Type: image/jpeg
    └─ Public: Yes (via URL)
    ↓
    Get public URL:
    ├─ Format: https://..../user-profiles/123-profile-1715418000.jpg
    └─ Store for database
    ↓
    Catch errors:
    ├─ Upload failed? Return error
    ├─ Invalid file? Return error
    └─ Size exceeded? Return error
```

#### 5. Update Users Table
```
UPDATE users SET
├─ firstName: 'Raj'
├─ lastName: 'Kumar'
├─ email: 'raj@example.com'
├─ photoUrl: 'user-123-profile-1715418000.jpg' (or NULL if no photo)
├─ isProfileComplete: true
├─ updatedAt: CURRENT_TIMESTAMP
WHERE id = 123
    ↓
Query executed
    ↓
Check rows affected
├─ 1 row → Success
├─ 0 rows → User not found (error)
└─ Error? Return 500
```

#### 6. Return Success Response
```
Response:
{
  "success": true,
  "message": "Profile completed successfully",
  "user": {
    "id": 123,
    "firstName": "Raj",
    "lastName": "Kumar",
    "email": "raj@example.com",
    "phone": "9876543210",
    "photoUrl": "user-123-profile-1715418000.jpg",
    "isProfileComplete": true,
    "isParker": true,
    "isOwner": true
  }
}
```

---

## 💾 STEP 7: MOBILE - UPDATE STATE

### Store Updated User Data

```
Update Zustand State:
├─ user.firstName: "Raj"
├─ user.lastName: "Kumar"
├─ user.email: "raj@example.com"
├─ user.photoUrl: "user-123-profile-1715418000.jpg"
├─ user.isProfileComplete: true
├─ user.isParker: true
├─ user.isOwner: true
└─ authStore updated ✓

Update AsyncStorage:
├─ Optionally cache user data
├─ For quick access
└─ Reduces API calls
```

### Hide Loading State
```
Loading spinner: Hide
Button text: "Complete Profile"
Button disabled: false
Form: Disabled during load, enabled after
```

### Show Success (Optional)
```
Toast notification:
├─ Message: "Profile completed successfully!"
├─ Type: Success
├─ Duration: 2-3 seconds
└─ Color: Green
```

---

## 🏠 STEP 8: NAVIGATE TO HOME

### Navigation Logic
```
Profile saved successfully
    ↓
Check response.success === true
    ↓
YES → Navigate to Home
NO → Show error message
    ↓
Navigation: navigation.replace('Home')
├─ Replace: Not push (can't go back)
├─ Clear stack: Yes
└─ Go to: (tabs) → home
    ↓
Home screen loads
    ↓
User sees:
├─ Search parking spaces
├─ List own spaces
├─ View profile
├─ View bookings
├─ Other features
    ↓
**Profile Completion Done** ✅
```

---

## 📊 DATABASE AFTER COMPLETION

### Users Table
```
Before:
├─ id: 123
├─ phone: "9876543210"
├─ firstName: NULL
├─ lastName: NULL
├─ email: NULL
├─ photoUrl: NULL
├─ isProfileComplete: false

After:
├─ id: 123
├─ phone: "9876543210"
├─ firstName: "Raj" ← UPDATED
├─ lastName: "Kumar" ← UPDATED
├─ email: "raj@example.com" ← UPDATED
├─ photoUrl: "user-123-profile-1715418000.jpg" ← UPDATED
├─ isProfileComplete: true ← UPDATED
└─ updatedAt: 2024-05-11T10:35:00Z ← UPDATED
```

### Supabase Storage
```
Bucket: user-profiles
File created:
├─ Path: user-profiles/123-profile-1715418000.jpg
├─ Size: ~150KB (compressed)
├─ Format: JPEG
└─ URL: https://.../user-profiles/123-profile-1715418000.jpg
```

---

## ⏱️ TIMING

```
User fills form:           1-2 minutes
Photo selection/crop:      1-2 minutes
Form submission:           1-2 seconds
Photo upload to cloud:     2-5 seconds (depending on size)
Backend processing:        1-2 seconds
Database update:           <1 second
Navigation to Home:        Instant
────────────────────────────────────
Total:                     3-5 minutes
```

---

## 🔐 SECURITY IN PROFILE COMPLETION

### Data Validation
```
Frontend + Backend:
├─ All fields validated on both ends
├─ Prevents invalid data
├─ Sanitizes special characters
└─ Rejects invalid formats
```

### Photo Security
```
File validation:
├─ Check file type (magic bytes)
├─ Check file size
├─ Scan for malware (optional)
├─ Compress to remove metadata
└─ Store in secure bucket
```

### Email Security
```
Email verification:
├─ Check format (regex)
├─ Check uniqueness (database)
├─ No duplicate emails
├─ Can be used for verification email (future)
└─ Can be used for password recovery (future)
```

### Authentication
```
JWT required:
├─ Only authenticated users can complete profile
├─ Prevents unauthorized access
├─ Links profile to verified phone number
└─ One profile per user
```

---

## ✅ PROFILE COMPLETION FIELDS SUMMARY

```
┌────────────────────────────────────────────┐
│ Field        │ Type   │ Required │ Editable │
├────────────────────────────────────────────┤
│ Phone        │ Text   │ YES      │ NO       │
│ First Name   │ Text   │ YES      │ YES      │
│ Last Name    │ Text   │ YES      │ YES      │
│ Email        │ Email  │ YES      │ YES      │
│ Photo        │ Image  │ NO       │ YES      │
└────────────────────────────────────────────┘
```

---

## ✅ PROFILE COMPLETION FLOW COMPLETE!

This covers:
- ✅ Screen layout & design
- ✅ Optional photo upload
- ✅ Form fields & validation rules
- ✅ Real-time validation
- ✅ Form submission
- ✅ Photo compression & upload
- ✅ Backend processing
- ✅ Database updates
- ✅ Cloud storage
- ✅ State management
- ✅ Navigation to Home
- ✅ Security features
- ✅ Error handling
- ✅ User experience

**User is now fully signed up and ready to use the app!** 🚀

