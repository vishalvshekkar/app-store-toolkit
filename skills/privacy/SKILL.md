---
name: appcraft:privacy
description: Analyze code to help generate App Privacy nutrition labels
arguments:
  - name: path
    description: "Path to source code directory to analyze (defaults to project root)"
    required: false
user_invocable: true
---

# /appcraft:privacy

You are analyzing the app's source code to help generate the App Privacy "nutrition label" required by Apple.

## Background

Apple requires all apps to declare their privacy practices via "App Privacy" labels in App Store Connect. These labels cover:
- **Data Collection**: What data types the app collects
- **Data Use**: How collected data is used (analytics, advertising, product personalization, etc.)
- **Data Linking**: Whether data is linked to the user's identity
- **Data Tracking**: Whether data is used for cross-app tracking

## Steps

### 1. Determine Source Path

Use `$ARGUMENTS` for a custom path, or default to the current project root.

### 2. Scan Source Code

Search the codebase for patterns indicating data collection:

**Contact Info:**
- Email: `NSContactsUsageDescription`, email fields, contact forms
- Phone: phone number inputs, `CNContact`
- Address: address fields, location permissions for address

**Health & Fitness:**
- `HealthKit`, `HKHealthStore`, workout data

**Financial:**
- Payment APIs, `StoreKit`, credit card fields, `PKPayment`

**Location:**
- `CLLocationManager`, `CoreLocation`, `MapKit`, GPS coordinates
- Precise vs approximate location

**Sensitive Info:**
- Biometric data: `LocalAuthentication`, `LAContext`, Face ID, Touch ID

**Contacts:**
- `CNContactStore`, address book access

**User Content:**
- Photos: `PHPhotoLibrary`, `UIImagePicker`, camera access
- Files: document pickers, file uploads
- Audio/Video: microphone, camera recording

**Browsing History:**
- `WKWebView`, `SFSafariViewController`, URL tracking

**Search History:**
- Search bar inputs, search analytics

**Identifiers:**
- `identifierForVendor`, `advertisingIdentifier`, IDFA
- Device fingerprinting patterns
- User IDs, account creation

**Usage Data:**
- Analytics SDKs: Firebase, Amplitude, Mixpanel, Segment
- Crash reporting: Crashlytics, Sentry, Bugsnag
- Custom analytics events

**Diagnostics:**
- Crash logs, performance data
- `MetricKit`, diagnostic reports

**Third-Party SDKs:**
Check `Podfile`, `Package.swift`, `Cartfile`, `build.gradle` for:
- Facebook SDK (tracking, advertising)
- Google Analytics / Firebase (analytics)
- Ad networks (AdMob, etc.)
- Attribution SDKs (AppsFlyer, Adjust, Branch)

### 3. Categorize Findings

Organize findings into Apple's privacy categories:
1. **Contact Info**: Name, Email, Phone, Physical Address
2. **Health & Fitness**: Health, Fitness
3. **Financial Info**: Payment Info, Credit Info
4. **Location**: Precise Location, Coarse Location
5. **Sensitive Info**: Sensitive Info (racial, biometric, etc.)
6. **Contacts**: Contacts
7. **User Content**: Emails/Messages, Photos/Videos, Audio, Gameplay, Customer Support, Other
8. **Browsing History**: Browsing History
9. **Search History**: Search History
10. **Identifiers**: User ID, Device ID
11. **Usage Data**: Product Interaction, Advertising Data
12. **Diagnostics**: Crash Data, Performance Data

### 4. Present Results

```
App Privacy Analysis
═══════════════════════════════════════════════════

Data Types Detected:
────────────────────
 Location (Precise)
   Source: CoreLocation usage in LocationManager.swift:23
   Purpose: Likely App Functionality
   Linked to Identity: Review needed

 Identifiers (Device ID)
   Source: UIDevice.identifierForVendor in Analytics.swift:45
   Purpose: Likely Analytics
   Linked to Identity: Likely No

 Diagnostics (Crash Data)
   Source: Sentry SDK in Podfile
   Purpose: App Functionality (crash reporting)
   Linked to Identity: Likely No

 Usage Data (Product Interaction)
   Source: Firebase Analytics in Podfile
   Purpose: Analytics
   Linked to Identity: Review needed

Not Detected (likely not collected):
────────────────────
 Contact Info, Health & Fitness, Financial Info,
 Sensitive Info, Contacts, User Content,
 Browsing History, Search History

═══════════════════════════════════════════════════
IMPORTANT: This is an automated analysis. You MUST
review these findings and verify with your actual
data practices before submitting to App Store Connect.
═══════════════════════════════════════════════════
```

### 5. Provide Guidance

For each detected data type:
- Explain what Apple expects you to declare
- Note whether it's typically "linked to identity" or not
- Suggest the most common "purpose" category
- Flag any third-party SDKs that require additional declarations

Always include the disclaimer that this is an automated analysis and must be manually verified.
