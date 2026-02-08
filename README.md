📘 Community Family & Student Management App

A React + Firebase web application designed to manage family data and student educational information within a community.

This system supports:

Family registration

Student data management

Multi-member family access

Secure login & role-based access

Invite family members using PIN

🚀 Main Purpose

This app helps a community:

Maintain a central student database

Support education planning & scholarships

Track family educational profiles

Enable multi-parent access to the same family data

🏗 Tech Stack
Layer	Technology
Frontend	React + Tailwind CSS
Auth	Firebase Authentication
Database	Firebase Realtime Database
Storage	localForage (offline draft saving)
Hosting	Firebase Hosting
👨‍👩‍👧 System Architecture
1️⃣ Family-Based Model

All students are stored under a Family.

families
  └── familyId
       ├── familyPin
       ├── familyContacts
       ├── members
       └── students

🔐 Authentication System

Users log in using:

Method	Use Case
Google Login	Gmail users (passwordless)
Email + Password	Non-Gmail users

After login, system checks:

Is user already part of a family?

If yes → Dashboard

If no → Registration

📄 Major Features
🧾 Student Registration Form

Paper-style mobile form

Multi-page flip-book UI

Local auto-save using localForage

Student + family data collection

👨‍👩‍👧 Family Section

Import contacts from device (Android)

Add/edit family members

Validation on mobile numbers

🎓 Students Page

View all children

Edit student details

Add new student

Delete student

👤 Profile Page

Family PIN display

Regenerate PIN

View family contacts

View joined members

Invite link generation

🔗 Join Family via PIN

Invite link: /join?familyId=...

User logs in

Enters 4-digit PIN

Added as family member

🧭 Navigation Logic
User Type	Redirect
Not logged in	Login / Registration
Registered	Dashboard
Invited	Join Page
New user	Registration
📦 Project Structure
src
 ├── components
 │   ├── Navbar
 │   ├── StudentPaperField
 │   ├── StudentFamilySection
 │   └── PrivateRoute
 │
 ├── pages
 │   ├── StudentFormPage
 │   ├── DashboardPage
 │   ├── StudentsPage
 │   ├── ProfilePage
 │   ├── JoinFamilyPage
 │   └── LoginPage
 │
 ├── services
 │   └── studentSubmitService.js
 │
 ├── utils
 │   └── studentStorage.js
 │
 └── firebase.js

⚙ Environment Variables

.env

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

🔄 App Flow
Login → Registration → Create Family → Dashboard
          ↓
     Invite Members → Join via PIN → Shared Family

🔒 Security

Firebase Authentication

Family membership verification

PIN-based joining

Role system (owner/member)

📌 Future Improvements

Admin panel

Scholarship filters

Student performance tracking

Notifications

Multi-language support

🧑‍💻 Developed For

shree Visa Osaval Kedavani Mandal (Borsad-valvod-Padara-Vatadara).
