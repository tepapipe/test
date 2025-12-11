# 🔧 Groomer Login Fix Guide

## Problem Summary
Your groomers can't login because:
1. **Role mismatch**: Database has `"groomers"` but code expects `"groomer"`
2. **No Firebase Auth accounts**: Groomers don't have email/password in Firebase Authentication
3. **Missing user profiles**: Groomer accounts not properly set up in the users collection

---

## ✅ Solution: 3 Steps

### **Step 1: Fix Existing Groomer User Role** (5 minutes)

Go to [Firebase Console](https://console.firebase.google.com/) → Realtime Database

Find this user:
```
users → PRKFpx5wgsRK8RLhT3lK6RClqlW2
```

Change:
```json
"role": "groomers"  // ❌ OLD
```

To:
```json
"role": "groomer"   // ✅ NEW
```

---

### **Step 2: Create Groomer Firebase Auth Accounts** (10 minutes)

Go to [Firebase Console](https://console.firebase.google.com/) → Authentication

Click **"Add user"** and create these accounts:

#### Groomer 1: Botchoy
- **Email**: `botchoy@bestbuddies.com`
- **Password**: `Botchoy@123`

#### Groomer 2: Ejay
- **Email**: `ejay@bestbuddies.com`
- **Password**: `Ejay@123`

#### Groomer 3: Jinold
- **Email**: `jinold@bestbuddies.com`
- **Password**: `Jinold@123`

#### Groomer 4: Jom
- **Email**: `jom@bestbuddies.com`
- **Password**: `Jom@123`

#### Groomer 5: Sam (New Account)
- **Email**: `sam.groomer@bestbuddies.com`
- **Password**: `Sam@123`

---

### **Step 3: Create User Profiles in Database** (10 minutes)

Go to [Firebase Console](https://console.firebase.google.com/) → Realtime Database

For **each groomer**, add a new user profile:

#### For Botchoy:
1. Click on `users` folder
2. Click **"+"** to add new child
3. Enter the **UID** from Firebase Auth (copy from Authentication tab)
4. Add this data:

```json
{
  "id": "UID_FROM_AUTH",
  "email": "botchoy@bestbuddies.com",
  "name": "Botchoy",
  "phone": "09123456789",
  "role": "groomer",
  "specialty": "Creative trims & styling",
  "maxDailyBookings": 3,
  "isBanned": false,
  "warnings": 0,
  "createdAt": 1765347760679
}
```

#### For Ejay:
```json
{
  "id": "UID_FROM_AUTH",
  "email": "ejay@bestbuddies.com",
  "name": "Ejay",
  "phone": "09123456790",
  "role": "groomer",
  "specialty": "Cat whisperer",
  "maxDailyBookings": 3,
  "isBanned": false,
  "warnings": 0,
  "createdAt": 1765347760679
}
```

#### For Jinold:
```json
{
  "id": "UID_FROM_AUTH",
  "email": "jinold@bestbuddies.com",
  "name": "Jinold",
  "phone": "09123456791",
  "role": "groomer",
  "specialty": "Senior pet handler",
  "maxDailyBookings": 3,
  "isBanned": false,
  "warnings": 0,
  "createdAt": 1765347760679
}
```

#### For Jom:
```json
{
  "id": "UID_FROM_AUTH",
  "email": "jom@bestbuddies.com",
  "name": "Jom",
  "phone": "09123456792",
  "role": "groomer",
  "specialty": "Double-coat care",
  "maxDailyBookings": 3,
  "isBanned": false,
  "warnings": 0,
  "createdAt": 1765347760679
}
```

#### For Sam (New):
```json
{
  "id": "UID_FROM_AUTH",
  "email": "sam.groomer@bestbuddies.com",
  "name": "Sam",
  "phone": "09123456793",
  "role": "groomer",
  "specialty": "Small breed specialist",
  "maxDailyBookings": 3,
  "isBanned": false,
  "warnings": 0,
  "createdAt": 1765347760679
}
```

---

## 🧪 Test Groomer Login

1. Go to your login page: `login.html`
2. Try logging in with:
   - **Email**: `botchoy@bestbuddies.com`
   - **Password**: `Botchoy@123`
3. Should redirect to `groomer-dashboard.html` ✅

---

## 📋 Groomer Credentials Summary

| Name | Email | Password |
|------|-------|----------|
| Botchoy | botchoy@bestbuddies.com | Botchoy@123 |
| Ejay | ejay@bestbuddies.com | Ejay@123 |
| Jinold | jinold@bestbuddies.com | Jinold@123 |
| Jom | jom@bestbuddies.com | Jom@123 |
| Sam | sam.groomer@bestbuddies.com | Sam@123 |

⚠️ **IMPORTANT**: Change these passwords after first login for security!

---

## 🔍 How to Find UID in Firebase Auth

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Authentication**
3. Find the user you created
4. Click on the user row
5. Copy the **UID** from the top right
6. Use this UID as the key in the `users` collection

---

## ✅ Verification Checklist

- [ ] Fixed existing groomer role from "groomers" to "groomer"
- [ ] Created 5 Firebase Auth accounts for groomers
- [ ] Created user profiles in database for all 5 groomers
- [ ] All user profiles have `"role": "groomer"`
- [ ] Tested login with at least one groomer account
- [ ] Groomer redirects to groomer-dashboard.html

---

## 🆘 Still Having Issues?

If groomers still can't login after these steps:

1. **Check browser console** (F12) for error messages
2. **Verify role is exactly** `"groomer"` (not "groomers", "staff", etc.)
3. **Confirm email matches** between Auth and Database
4. **Check Firebase rules** allow read/write to users collection
5. **Clear browser cache** and try again

---

## 📝 Notes

- The existing Sam user (PRKFpx5wgsRK8RLhT3lK6RClqlW2) with role "groomers" needs the role fixed
- New Sam account uses different email (sam.groomer@bestbuddies.com) to avoid conflicts
- All groomers should change their passwords on first login
- Specialty field is optional but helps with groomer profiles
