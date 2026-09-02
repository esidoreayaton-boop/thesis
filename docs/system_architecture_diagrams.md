# Smart Barangay Governance & Public Health System Architecture

This document presents the complete architectural specification for the system, including the **Entity Relationship Diagram (ERD)**, **Data Flow Diagrams (DFD Level 0 & Level 1)**, **Use Case Diagram**, and **Process Flowcharts**.

---

## 1. Entity Relationship Diagram (ERD)

The following diagram illustrates the relational data model of the MySQL database (`smart_db`), including primary keys (`PK`), foreign keys (`FK`), and entity cardinalities.

```mermaid
erDiagram
    USERS ||--o| RESIDENTS : "links via email"
    USERS ||--o{ ACTIVITY_LOGS : "generates"
    USERS ||--o{ MESSAGES : "sends/receives"
    RESIDENTS ||--o{ DOCUMENT_REQUESTS : "submits"
    DOCUMENT_CATEGORIES ||--o{ DOCUMENT_REQUESTS : "classifies"
    RESIDENTS ||--o{ HEALTH_APPOINTMENTS : "books"
    CLINIC_SCHEDULES ||--o{ HEALTH_APPOINTMENTS : "schedules"
    RESIDENTS ||--o{ MATERNAL_RECORDS : "tracks maternal care"
    RESIDENTS ||--o{ CHILD_HEALTH_RECORDS : "mothers"
    CHILD_HEALTH_RECORDS ||--o{ IMMUNIZATIONS : "receives"
    RESIDENTS ||--o{ SMS_NOTIFICATIONS : "receives alerts"

    USERS {
        int id PK
        string name
        string email UK "1 Gmail per Account"
        string password_hash
        string role "superadmin, admin, staff, bhw, nurse, resident"
        string status "Active, Archived"
        string verification_status "Verified, Unverified, Pending_Review, Rejected"
        string civil_status
        string phone
        string address
        string barangay "Pianing, Anticala, Bit-os, etc."
        datetime last_login
        timestamp created_at
    }

    RESIDENTS {
        int id PK
        string first_name
        string middle_name
        string last_name
        date date_of_birth
        string gender "Male, Female, Other"
        string civil_status "Single, Married, Widowed, Separated"
        string address
        string phone
        string email "matches users.email"
        string barangay "territorial boundary"
        longtext submitted_id "Optional/Recommended ID photo"
        datetime submitted_at
        string verification_status "Verified, Unverified, Pending_Review, Rejected"
        text rejection_reason "Correction reason if rejected"
        string years_of_residency
        timestamp created_at
    }

    DOCUMENT_REQUESTS {
        int id PK
        string request_code UK "Format: DOC-XXXXXXXX"
        int resident_id FK
        string resident_name
        string email
        string document_type "Clearance, Residency, Indigency, etc."
        string purpose
        string barangay "scoping to local admin"
        string status "Pending, Processing, Ready for Pickup, Completed, Rejected"
        json extra_fields "Purok, Age, Civil Status, etc."
        datetime requested_at
        datetime processed_at
        string processed_by
        text remarks
    }

    DOCUMENT_CATEGORIES {
        int id PK
        string name
        string description
        decimal fee
        string processing_time
        string requirements
        boolean is_active
    }

    HEALTH_APPOINTMENTS {
        int id PK
        string appointment_code UK "Format: APT-YYYY-XXX"
        int resident_id FK
        string resident_name
        string resident_phone
        string resident_email
        string barangay
        string service_type "Prenatal, Immunization, Family Planning, PMC"
        date preferred_date
        string preferred_time
        date scheduled_date
        string scheduled_time
        string status "Pending, Approved, Completed, Cancelled, Rescheduled"
        text bhw_notes
        text resident_notes
        string attending_bhw
        timestamp created_at
    }

    CLINIC_SCHEDULES {
        int id PK
        string title
        string service_type
        string day_of_week
        string time_slot
        string location
        int slots_available
        string bhw_in_charge
        string status "Active, Cancelled"
        string barangay
        string created_by
    }

    MATERNAL_RECORDS {
        int id PK
        int resident_id FK
        string mother_name
        int age
        string pregnancy_status "Prenatal - 1st/2nd/3rd Trimester, Postnatal"
        date expected_due_date
        date last_visit
        date next_visit
        string risk_level "Low, Moderate, High"
        text notes
        timestamp created_at
    }

    CHILD_HEALTH_RECORDS {
        int id PK
        string child_name
        int mother_id FK
        string mother_name
        date date_of_birth
        string gender "Male, Female"
        decimal weight_kg
        decimal height_cm
        string blood_type
        timestamp created_at
    }

    IMMUNIZATIONS {
        int id PK
        string child_name
        string parent_phone
        string vaccine_name "BCG, HepB, Pentavalent, OPV, IPV, PCV, MMR"
        int dose_number
        string status "Completed, Scheduled, Overdue"
        date date_administered
        date due_date
        int days_overdue
        string administered_by
        timestamp created_at
    }

    ACTIVITY_LOGS {
        int id PK
        string user_name
        string user_role
        string action
        string action_type "General, Document, Health, Security, Verification"
        string barangay
        text details
        datetime timestamp
    }

    MESSAGES {
        int id PK
        string sender_name
        string sender_role "superadmin, admin, staff, bhw, resident"
        string recipient_name
        string recipient_role "admin, staff, bhw, all"
        string barangay
        text message
        datetime timestamp
    }

    SMS_NOTIFICATIONS {
        int id PK
        string recipient_name
        string recipient_phone
        string type "Immunization Reminder, Document Ready, Announcement"
        text message
        string status "Sent, Failed, Pending"
        datetime sent_at
    }

    FAQ_KNOWLEDGE {
        int id PK
        string topic
        text keywords
        text response
    }
```

---

## 2. Data Flow Diagrams (DFD)

### 2.1 Context Level 0 DFD (System Boundary)

```mermaid
graph TD
    subgraph External_Entities["External Stakeholders & Services"]
        R["Resident"]
        BA["Barangay Administrator"]
        HW["Healthcare Worker (Nurse / BHW)"]
        SA["Super Administrator"]
        EJS["EmailJS / Gmail Service"]
        SMS["SMS Notification Gateway"]
    end

    SYS(("Smart Barangay Governance & Public Health System"))

    %% Resident Flows
    R -->|"Registration Data (Optional ID), Document & Clinic Requests, Profile Updates"| SYS
    SYS -->|"In-App Status, Tracking Codes, Verification Alerts, Appointment Schedules"| R

    %% Barangay Admin Flows
    BA -->|"Applicant Approval/Rejection, Document Status Updates, Staff Management"| SYS
    SYS -->|"Pending Registrations Queue, Clearance Requests, Territorial Stats"| BA

    %% Health Worker Flows
    HW -->|"Clinic Schedules, Consultation Vitals, Immunization & Maternal Logs"| SYS
    SYS -->|"Patient Profiles, Appointment Queue, Health Analytics"| HW

    %% Super Admin Flows
    SA -->|"Barangay Admin Provisioning, System Audits, Cross-Barangay Oversight"| SYS
    SYS -->|"Consolidated System Metrics, Global Activity Logs, Account States"| SA

    %% External Notification Services
    SYS -->|"Automated Email Dispatches (Approval, Rejection Reason, Ready for Pickup)"| EJS
    EJS -->|"Inbox Delivery to Resident Gmail"| R
    SYS -->|"SMS Alerts (Discrepancy Notice, Due Vaccines, Pickup Notice)"| SMS
    SMS -->|"Cellular SMS to Resident Mobile"| R
```

---

### 2.2 Level 1 DFD (Decomposed Sub-Processes)

```mermaid
graph TD
    subgraph Entities["Stakeholders"]
        Resident["Resident"]
        Admin["Barangay Administrator"]
        Nurse["Nurse / BHW"]
        SuperAdmin["Super Admin"]
    end

    subgraph Data_Stores["System Data Stores"]
        DS1[("D1: Users & Auth Store")]
        DS2[("D2: Residents Demographic Registry")]
        DS3[("D3: Document Requests & Categories")]
        DS4[("D4: Health Schedules & Appointments")]
        DS5[("D5: Audit & Notification Records")]
    end

    subgraph Sub_Processes["Core Sub-Processes"]
        P1["1.0 Resident Registration & Identity Verification"]
        P2["2.0 Civil Document Request & Archival Lifecycle"]
        P3["3.0 Clinic Scheduling & Community Health Care"]
        P4["4.0 Multi-Channel Notification Dispatcher"]
        P5["5.0 Administrative Scoping & System Auditing"]
    end

    %% Process 1.0
    Resident -->|"Account Info & Optional ID Photo"| P1
    P1 -->|"Create User Record"| DS1
    P1 -->|"Register Demographic Record"| DS2
    Admin -->|"Approve / Reject ID with Reason"| P1
    P1 -->|"Verification Decision"| P4

    %% Process 2.0
    Resident -->|"Request Clearance/Certificate"| P2
    DS2 -.->|"Validate Resident Verification Status"| P2
    P2 -->|"Create Request (DOC-XXXXXXXX)"| DS3
    Admin -->|"Update Status: Processing -> Ready for Pickup -> Completed"| P2
    P2 -->|"Status Progression"| DS3
    P2 -->|"Document Status Trigger"| P4

    %% Process 3.0
    Nurse -->|"Publish Clinic Schedules"| P3
    P3 -->|"Save Schedule Slots"| DS4
    Resident -->|"Book Health Appointment"| P3
    P3 -->|"Store Appointment (APT-YYYY-XXX)"| DS4
    Nurse -->|"Record Consultation, Maternal Care, Vaccine"| P3
    P3 -->|"Appointment Status Trigger"| P4

    %% Process 4.0
    P4 -->|"Store In-App Bell Notification"| DS5
    P4 -->|"Dispatch Gmail via EmailJS (service_6nk2ylj)"| Resident
    P4 -->|"Dispatch SMS via Gateway"| Resident

    %% Process 5.0
    Admin -->|"Dashboard Queries (Silent 30s Polling)"| P5
    SuperAdmin -->|"System Maintenance & Role Control"| P5
    P5 -->|"Fetch Scoped Barangay Data"| DS2
    P5 -->|"Fetch Scoped Document Records"| DS3
    P5 -->|"Log Admin Activity"| DS5
```

---

## 3. Use Case Diagram

```mermaid
graph LR
    subgraph Actors["System Actors"]
        R(("Resident"))
        BA(("Barangay Admin"))
        BHW(("Nurse / BHW"))
        SA(("Super Admin"))
    end

    subgraph Portal_Resident["Resident Portal"]
        UC1["Create Account (Optional ID)"]
        UC2["Sign In (1 Gmail Account)"]
        UC3["Upload / Remove ID in Profile"]
        UC4["Submit Document Request"]
        UC5["Track Document Status"]
        UC6["Book Clinic Appointment"]
        UC7["View Maternal & Vaccine Records"]
        UC8["View Read-Only In-App Notifications"]
        UC9["Receive Gmail & SMS Alerts"]
        UC10["Consult FAQ Chatbot"]
    end

    subgraph Portal_Admin["Barangay Admin Portal"]
        UC11["Review Pending Resident Registrations"]
        UC12["Approve Resident Verification"]
        UC13["Reject Applicant with Specific Discrepancy Reason"]
        UC14["Process Document (Pending -> Processing -> Ready -> Completed)"]
        UC15["Archive Claimed Documents"]
        UC16["Manage Staff & BHW Accounts"]
        UC17["View Scoped Barangay Analytics & Reports"]
        UC18["Send Broadcast / Notice SMS"]
    end

    subgraph Portal_Health["Health Center Portal"]
        UC19["Publish Clinic Schedules"]
        UC20["Confirm / Reschedule Appointments"]
        UC21["Record Consultation Vitals & Diagnoses"]
        UC22["Manage Maternal Care Records"]
        UC23["Log Child Immunization Administered"]
        UC24["Track Vaccine Inventory"]
    end

    subgraph Portal_SuperAdmin["Super Administrator"]
        UC25["Cross-Barangay Executive Oversight"]
        UC26["Enforce 1 Admin Per Barangay Rule"]
        UC27["Audit Global System Activity Logs"]
        UC28["Soft-Delete / Restore Accounts"]
    end

    %% Resident Connections
    R --> UC1
    R --> UC2
    R --> UC3
    R --> UC4
    R --> UC5
    R --> UC6
    R --> UC7
    R --> UC8
    R --> UC9
    R --> UC10

    %% Barangay Admin Connections
    BA --> UC2
    BA --> UC11
    BA --> UC12
    BA --> UC13
    BA --> UC14
    BA --> UC15
    BA --> UC16
    BA --> UC17
    BA --> UC18

    %% Health Worker Connections
    BHW --> UC2
    BHW --> UC19
    BHW --> UC20
    BHW --> UC21
    BHW --> UC22
    BHW --> UC23
    BHW --> UC24

    %% Super Admin Connections
    SA --> UC2
    SA --> UC25
    SA --> UC26
    SA --> UC27
    SA --> UC28
```

---

## 4. System Flowcharts

### 4.1 Flowchart 1: Resident Registration & Civic Verification (with Optional ID Flow)

```mermaid
flowchart TD
    Start([Resident Opens Registration Form]) --> InputDetails[Fill In Personal Details: Name, DOB, Gender, Civil Status, Purok, Barangay, Phone, Gmail]
    InputDetails --> CheckGmail{1 Gmail per Account: Is Email Already Registered?}
    CheckGmail -- Yes --> ErrorEmail[Show Error: Email Already Registered] --> InputDetails
    CheckGmail -- No --> HasID{Does Resident Have ID Photo Ready?}
    
    HasID -- Yes --> AttachID[Attach Government ID Photo and Select ID Type]
    HasID -- No --> SkipID[Skip Photo Upload - Proceed via Optional ID Flow]
    
    AttachID --> SubmitWithID[Submit Registration Request]
    SkipID --> SubmitWithoutID[Submit Registration Request with submitted_id = NULL]
    
    SubmitWithID --> SetPending[Account Created: verification_status = 'Pending_Review']
    SubmitWithoutID --> SetPendingNoID[Account Created: verification_status = 'Pending_Review']
    
    SetPending --> ResidentAccess[Resident Can Sign In & Access Portal]
    SetPendingNoID --> ResidentAccess
    
    ResidentAccess --> NeedsVerification{Resident Requests Clearance Document?}
    NeedsVerification -- No --> UsePublicFeatures[Can View Community Announcements, Healthcare Schedules, FAQ Chatbot]
    NeedsVerification -- Yes --> CheckStatus{Is Resident Verified?}
    
    CheckStatus -- Verified --> SubmitDoc[Submit Official Document Request]
    CheckStatus -- Not Verified --> CheckIDOnRecord{Is ID Photo on Record?}
    
    CheckIDOnRecord -- No --> UploadFromProfile[Resident Uploads ID in Profile Settings] --> AdminQueue
    CheckIDOnRecord -- Yes --> AdminQueue[Application in Admin Review Queue]
    
    AdminQueue --> AdminReview{Admin Reviews Submitted ID Details}
    AdminReview -- Valid --> AdminApprove[Admin Approves Resident]
    AdminReview -- Discrepancy Found --> AdminReject[Admin Rejects with Reason: e.g. Blurry Photo, Name Mismatch]
    
    AdminApprove --> NotifyApproved[Dispatch In-App 'Verified' Badge + Welcome Email to Resident's Gmail]
    NotifyApproved --> EndApproved([Resident Fully Verified: Clearance Requests Unlocked])
    
    AdminReject --> NotifyRejected[Dispatch In-App Notice + EmailJS Correction Notice to Gmail]
    NotifyRejected --> ShowBanner[Resident Sees Dismissible Red Verification Notice on Portal]
    ShowBanner --> CorrectID[Resident Re-submits Corrected ID via Profile Settings / Resubmit Modal]
    CorrectID --> AdminQueue
```

---

### 4.2 Flowchart 2: Civil Document Request & Archival Lifecycle

```mermaid
flowchart TD
    DocStart([Resident Initiates Document Request]) --> CheckElig{Is Account Verified?}
    CheckElig -- No --> BlockDoc[Show Warning: Verification Required by Barangay Admin] --> EndBlock([Blocked])
    CheckElig -- Yes --> CheckDup{Does Active Request for Same Document Type Exist in Pending/Processing?}
    CheckDup -- Yes --> BlockDup[Show Warning: Existing Request in Progress with Request Code] --> EndBlock
    CheckDup -- No --> FillPurpose[Select Document Type & State Purpose]
    
    FillPurpose --> AutoPopulate[System Auto-Extracts Purok, Address, Age, Civil Status from Profile]
    AutoPopulate --> SubmitRequest[Resident Confirms Submission]
    
    SubmitRequest --> GenCode[Generate Unique Official Tracking Code: DOC-XXXXXXXX]
    GenCode --> SaveDoc[Store Record with Status = 'Pending']
    SaveDoc --> DispatchSubmitNotif[Dispatch In-App Notice + Gmail Confirmation with Tracking Code]
    
    DispatchSubmitNotif --> AdminTable[Request Appears in Admin Clearance Processing Table]
    
    AdminTable --> AdminAction{Barangay Admin Takes Action}
    
    AdminAction -- Process --> SetProcessing[Update Status to 'Processing']
    SetProcessing --> NotifyProcessing[Notify Resident: Document is Being Prepared]
    SetProcessing --> AdminPrint[Admin Verifies Records, Generates Official Certificate with Signatures & Seal]
    
    AdminPrint --> SetReady[Update Status to 'Ready for Pickup']
    SetReady --> DispatchReadyNotif[Dispatch In-App Indigo Badge + Urgent EmailJS Notice to Resident's Gmail]
    
    DispatchReadyNotif --> ResidentClaim[Resident Visits Barangay Hall: Presents Valid ID & Pays Fee]
    ResidentClaim --> SetCompleted[Admin Marks Status as 'Completed']
    
    SetCompleted --> MoveArchive[Document Removed from Active Table and Moved to Permanent Archive]
    MoveArchive --> DispatchCompleteNotif[Dispatch In-App Emerald Badge + Completion Email to Gmail]
    DispatchCompleteNotif --> EndSuccess([Document Issuance Complete])
    
    AdminAction -- Reject --> SetRejected[Admin Cancels Request with Reason]
    SetRejected --> DispatchRejectNotif[Dispatch Cancellation Notice to In-App & Gmail]
    DispatchRejectNotif --> EndCancel([Document Cancelled])
```

---

### 4.3 Flowchart 3: Health Center Appointment & Clinic Scheduling Flow

```mermaid
flowchart TD
    NurseStart([Nurse / BHW Logs In]) --> PublishSchedule[Create / Update Weekly Clinic Schedule: Service, Day, Time, Location, Available Slots]
    PublishSchedule --> SaveSched[(Store in clinic_schedules Table)]
    
    SaveSched --> ResPortal[Resident Views Community Health Center Portal]
    ResPortal --> SelectService[Resident Selects Health Service: Prenatal, Immunization, Family Planning, PMC]
    SelectService --> SelectDate[Resident Picks Preferred Date & Time Window]
    SelectDate --> SubmitApt[Submit Booking Request]
    
    SubmitApt --> GenAptCode[Generate Appointment Code: APT-YYYY-XXX]
    GenAptCode --> SaveApt[(Store in health_appointments with Status = 'Pending')]
    SaveApt --> AlertNurse[Appointment Appears in Nurse Health Dashboard Queue]
    
    AlertNurse --> NurseReview{Nurse Reviews Appointment Slot}
    NurseReview -- Confirm --> SetApproved[Nurse Confirms Scheduled Date, Time & Attending BHW]
    NurseReview -- Reschedule --> SetResched[Nurse Assigns New Available Slot with BHW Notes]
    
    SetApproved --> NotifyResidentApt[Dispatch In-App Appointment Confirmation + Email/SMS Alert]
    SetResched --> NotifyResidentApt
    
    NotifyResidentApt --> PatientEncounter[Patient Arrives at Barangay Health Center on Scheduled Date]
    PatientEncounter --> RecordVitals[Health Worker Records Vitals: BP, Weight, Temp, Diagnosis]
    
    RecordVitals --> ServiceSpecific{Service Category?}
    ServiceSpecific -- Maternal Care --> UpdateMaternal[Log Gestational Age, Next Checkup Date, Risk Level in maternal_records]
    ServiceSpecific -- Child Immunization --> UpdateVaccine[Record Vaccine Administered, Dose Number, Due Date in immunizations]
    ServiceSpecific -- General / Other --> UpdateGeneral[Record Consultation Notes]
    
    UpdateMaternal --> MarkDone[Mark Health Appointment as 'Completed']
    UpdateVaccine --> MarkDone
    UpdateGeneral --> MarkDone
    
    MarkDone --> ArchiveVisit[Encounter Logged in Patient 360 Full History Profile]
    ArchiveVisit --> EndHealth([Health Encounter Complete])
```

---

### 4.4 Flowchart 4: Dual-Channel Notification & Gmail Pipeline

```mermaid
flowchart TD
    Trigger([System Event Triggered: Account Decision, Document Status Change, Health Appointment]) --> GetRecipient[Extract Resident Email, Name, Barangay, Status Badge, Reference Code]
    GetRecipient --> ValidateEmail{Does Resident Have Valid Gmail Address?}
    
    ValidateEmail -- No --> InAppOnly[Store Notification in Persistent notificationStore Only]
    
    ValidateEmail -- Yes --> UnifiedDispatcher[Execute dispatchResidentNotification Helper]
    
    UnifiedDispatcher --> Branch1[Channel 1: In-App Notification Center]
    UnifiedDispatcher --> Branch2[Channel 2: External Gmail Delivery via EmailJS]
    
    Branch1 --> SaveStore[Append to resident_notifications_history with Read-Only Badge and Timestamp]
    SaveStore --> BellBadge[Update Notification Bell Counter in Resident Portal]
    
    Branch2 --> LoadConfig[Retrieve EmailJS Configuration: Service ID = service_6nk2ylj, Template ID = service_6nk2ylj]
    LoadConfig --> BuildTemplate[Populate Template Parameters: name, to_email, title, message, status, request_code, barangay, time]
    
    BuildTemplate --> SendSDK{Send via @emailjs/browser SDK}
    SendSDK -- Success --> LogEmail[Log: Email Dispatched Successfully]
    SendSDK -- Fail / Timeout --> FallbackREST{Attempt Fallback via EmailJS REST API Endpoint}
    
    FallbackREST -- Success --> LogEmail
    FallbackREST -- Fail --> WarnFail[Log Warning: Delivery Failed, In-App Notification Intact]
    
    LogEmail --> ResidentInbox[Resident Receives Official Barangay Notification in Personal Gmail Inbox]
    BellBadge --> EndNotif([Notification Pipeline Complete])
    WarnFail --> EndNotif
```
