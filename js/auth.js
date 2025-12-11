/* ============================================
   BestBuddies Pet Grooming - Authentication
   ============================================ */

import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { getCurrentUser, setCurrentUser, clearCurrentUser, getUsers, saveUsers } from "./firebase-db.js";

// Get Firebase Auth
function getFirebaseAuth() {
  return window.firebaseAuth;
}

function getFirebaseDatabase() {
  return window.firebaseDatabase;
}

// Signup function - Firebase only
async function signup(event) {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const gender = document.getElementById('gender').value;
  const password = document.getElementById('password').value;
  const role = 'customer'; // All signups are customers

  // Validation
  if (!name || !email || !phone || !password) {
    customAlert.warning('Missing Information', 'Please fill in all required fields');
    return;
  }

  // Validate phone number - only numbers allowed
  if (!/^\d+$/.test(phone)) {
    customAlert.warning('Invalid Phone Number', 'Phone number must contain only numbers');
    return;
  }

  if (password.length < 6) {
    customAlert.warning('Weak Password', 'Password must be at least 6 characters');
    return;
  }

  try {
    const auth = getFirebaseAuth();

    if (!auth) {
      customAlert.error('Firebase Error', 'Firebase Auth is not initialized');
      return;
    }

    // Use Firebase Auth for signup
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✓ Firebase Auth signup successful for:', user.email);

    // Create user profile in Firebase Database
    const db = getFirebaseDatabase();
    if (!db) {
      customAlert.error('Firebase Error', 'Firebase Database is not initialized');
      return;
    }

    const userProfile = {
      id: user.uid,
      name: name,
      email: email,
      phone: phone,
      gender: gender || null,
      role: role,
      warnings: 0,
      isBanned: false,
      createdAt: Date.now()
    };

    const userRef = ref(db, `users/${user.uid}`);
    await set(userRef, userProfile);

    console.log('✓ User profile created in Firebase:', userProfile);

    // Set current user
    setCurrentUser(userProfile);

    // Check for return URL (for browse-first booking flow)
    const urlParams = new URLSearchParams(window.location.search);
    const returnPage = urlParams.get('return') || 'customer-dashboard.html';

    // Redirect
    redirect(returnPage);
  } catch (error) {
    console.error('Signup error:', error);
    let errorMessage = 'An error occurred during signup. Please try again.';

    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered. Please login instead.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please use a stronger password.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    customAlert.error('Signup Error', errorMessage);
  }
}

// Login function - Firebase only
async function login(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Validation
  if (!email || !password) {
    customAlert.warning('Missing Information', 'Please enter both email and password');
    return;
  }

  try {
    const auth = getFirebaseAuth();

    if (!auth) {
      customAlert.error('Firebase Error', 'Firebase Auth is not initialized');
      return;
    }

    // Use Firebase Auth for login
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('Firebase Auth login successful for:', user.email);

    // Get user profile from Firebase Database
    const db = getFirebaseDatabase();
    if (!db) {
      customAlert.error('Firebase Error', 'Firebase Database is not initialized');
      return;
    }

    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const userProfile = snapshot.val();
      userProfile.id = user.uid;
      console.log('✓ Login: User profile loaded from Firebase:', userProfile);
      setCurrentUser(userProfile);
    } else {
      // User authenticated but profile doesn't exist - create it
      const userProfile = {
        id: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0] || 'User',
        role: 'customer',
        warnings: 0,
        isBanned: false,
        createdAt: Date.now()
      };
      console.log('✓ Login: Creating new user profile in Firebase:', userProfile);
      await set(userRef, userProfile);
      setCurrentUser(userProfile);
    }

    // Check for return URL (for browse-first booking flow)
    const urlParams = new URLSearchParams(window.location.search);
    const returnPage = urlParams.get('return');

    if (returnPage) {
      redirect(returnPage);
    } else {
      // Get user role to determine redirect
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.role === 'admin') {
        redirect('admin-dashboard.html');
      } else if (currentUser && (currentUser.role === 'groomer' || currentUser.role === 'groomers' || currentUser.role === 'staff')) {
        redirect('groomer-dashboard.html');
      } else {
        redirect('customer-dashboard.html');
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = 'Invalid email or password';

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email. Please sign up first.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password. Please try again.';
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password. Please check and try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    customAlert.error('Login Failed', errorMessage);
  }
}

// Logout function
async function logout(event) {
  // Prevent default link behavior if event is provided
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  try {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
      console.log('Firebase Auth signout successful');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }

  // Clear all user data from localStorage
  clearCurrentUser();

  // Clear any cached Firebase user data
  const auth = getFirebaseAuth();
  if (auth && auth.currentUser) {
    localStorage.removeItem(`firebase_user_${auth.currentUser.uid}`);
  }

  // Clear all localStorage items related to current user
  localStorage.removeItem('currentUser');

  console.log('Logout complete, redirecting to index...');

  // Use window.location for reliable redirect
  window.location.href = 'index.html';
}

// Require login - redirect if not logged in
async function requireLogin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('login.html');
    return false;
  }
  return true;
}

// Require admin - redirect if not admin
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('login.html');
    return false;
  }
  if (user.role !== 'admin') {
    redirect('customer-dashboard.html');
    return false;
  }
  return true;
}

// Require groomer - redirect if not groomer
async function requireGroomer() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('login.html');
    return false;
  }
  if (user.role !== 'groomer' && user.role !== 'groomers' && user.role !== 'staff') {
    redirect('customer-dashboard.html');
    return false;
  }
  return true;
}

// Alias for backward compatibility
const requireStaff = requireGroomer;

// Make auth functions globally available
window.requireLogin = requireLogin;
window.requireAdmin = requireAdmin;
window.requireGroomer = requireGroomer;
window.requireStaff = requireStaff;

// Make logout function globally available for onclick handlers
window.logout = logout;

// Helper function to prompt for phone and address using custom alert
async function promptForPhoneAndAddress(userProfile) {
  return new Promise((resolve) => {
    // Create a modal with form inputs for phone and address
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const formContent = document.createElement('div');
    formContent.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 8px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    formContent.innerHTML = `
      <h2 style="margin: 0 0 1rem 0; font-size: 1.5rem;">Complete Your Profile</h2>
      <p style="color: #666; margin-bottom: 1.5rem;">Please provide your phone number and address</p>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Phone Number *</label>
        <input type="text" id="promptPhone" inputmode="numeric" pattern="[0-9]+" placeholder="Enter phone number (numbers only)" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 1rem;">
        <small style="color: #e74c3c; display: none;" id="phoneError">Phone number must contain only numbers</small>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Address *</label>
        <input type="text" id="promptAddress" placeholder="Enter your address" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 1rem;">
      </div>
      
      <div style="display: flex; gap: 1rem;">
        <button id="submitProfileBtn" style="flex: 1; padding: 0.75rem; background: #000; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Submit</button>
        <button id="skipProfileBtn" style="flex: 1; padding: 0.75rem; background: #ddd; color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Skip</button>
      </div>
    `;

    modal.appendChild(formContent);
    document.body.appendChild(modal);

    const phoneInput = document.getElementById('promptPhone');
    const addressInput = document.getElementById('promptAddress');
    const phoneError = document.getElementById('phoneError');
    const submitBtn = document.getElementById('submitProfileBtn');
    const skipBtn = document.getElementById('skipProfileBtn');

    // Validate phone input in real-time
    phoneInput.addEventListener('input', (e) => {
      if (!/^\d*$/.test(e.target.value)) {
        e.target.value = e.target.value.replace(/[^\d]/g, '');
      }
    });

    submitBtn.addEventListener('click', () => {
      const phone = phoneInput.value.trim();
      const address = addressInput.value.trim();

      if (!phone) {
        phoneError.style.display = 'block';
        phoneError.textContent = 'Phone number is required';
        return;
      }

      if (!/^\d+$/.test(phone)) {
        phoneError.style.display = 'block';
        phoneError.textContent = 'Phone number must contain only numbers';
        return;
      }

      if (!address) {
        customAlert.warning('Missing Address', 'Please enter your address');
        return;
      }

      // Update profile
      userProfile.phone = phone;
      userProfile.address = address;

      // Remove modal and resolve
      document.body.removeChild(modal);
      resolve();
    });

    skipBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve();
    });

    // Focus on phone input
    setTimeout(() => phoneInput.focus(), 100);
  });
}

// Google Sign-In handler (exposed globally for inline onclick in HTML)
async function handleGoogleSignIn() {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      customAlert.error('Firebase not initialized.');
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Save/retrieve profile in Realtime Database (or fallback)
    const db = getFirebaseDatabase();
    if (db) {
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userProfile = snapshot.val();
        userProfile.id = user.uid;
        setCurrentUser(userProfile);
      } else {
        const newProfile = {
          id: user.uid,
          email: user.email,
          name: user.displayName || (user.email ? user.email.split('@')[0] : 'Customer'),
          phone: '',
          address: '',
          gender: null,
          role: 'customer',
          warnings: 0,
          isBanned: false,
          createdAt: Date.now()
        };
        
        // Prompt for phone number and address
        await promptForPhoneAndAddress(newProfile);
        
        await set(userRef, newProfile);
        setCurrentUser(newProfile);
      }
    } else {
      // Local fallback
      const users = await getUsers();
      let existing = users.find(u => u.email === user.email);
      if (existing) {
        setCurrentUser(existing);
      } else {
        const newUser = {
          id: user.uid,
          name: user.displayName || (user.email ? user.email.split('@')[0] : 'Customer'),
          email: user.email,
          phone: '',
          address: '',
          gender: null,
          role: 'customer',
          createdAt: Date.now(),
          warnings: 0
        };
        
        // Prompt for phone number and address
        await promptForPhoneAndAddress(newUser);

        users.push(newUser);
        await saveUsers(users);
        setCurrentUser(newUser);
      }
    }

    // Redirect after sign-in
    const urlParams = new URLSearchParams(window.location.search);
    const returnPage = urlParams.get('return');
    if (returnPage) {
      redirect(returnPage);
    } else {
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.role === 'admin') {
        redirect('admin-dashboard.html');
      } else {
        redirect('customer-dashboard.html');
      }
    }
  } catch (error) {
    console.error('Google Sign-In error:', error);
    let msg = 'Google Sign-In failed. Please try again.';
    if (error && error.code) msg += ` (${error.code})`;
    customAlert.error('Sign-In Error', msg);
  }
}

// expose globally for HTML onclick
window.handleGoogleSignIn = handleGoogleSignIn;

// Facebook Sign-In handler (exposed globally for inline onclick in HTML)
async function handleFacebookSignIn() {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      customAlert.error('Firebase not initialized.');
      return;
    }

    const provider = new FacebookAuthProvider();
    // Request email permission explicitly
    provider.addScope('email');

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Save/retrieve profile in Realtime Database (or fallback)
    const db = getFirebaseDatabase();
    if (db) {
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userProfile = snapshot.val();
        userProfile.id = user.uid;
        setCurrentUser(userProfile);
      } else {
        const newProfile = {
          id: user.uid,
          email: user.email,
          name: user.displayName || (user.email ? user.email.split('@')[0] : 'Customer'),
          phone: '',
          address: '',
          gender: null,
          role: 'customer',
          warnings: 0,
          isBanned: false,
          createdAt: Date.now()
        };
        
        // Prompt for phone number and address
        await promptForPhoneAndAddress(newProfile);
        
        await set(userRef, newProfile);
        setCurrentUser(newProfile);
      }
    } else {
      // Local fallback
      const users = await getUsers();
      let existing = users.find(u => u.email === user.email);
      if (existing) {
        setCurrentUser(existing);
      } else {
        const newUser = {
          id: user.uid,
          name: user.displayName || (user.email ? user.email.split('@')[0] : 'Customer'),
          email: user.email,
          phone: '',
          address: '',
          gender: null,
          role: 'customer',
          createdAt: Date.now(),
          warnings: 0
        };
        
        // Prompt for phone number and address
        await promptForPhoneAndAddress(newUser);

        users.push(newUser);
        await saveUsers(users);
        setCurrentUser(newUser);
      }
    }

    // Redirect after sign-in
    const urlParams = new URLSearchParams(window.location.search);
    const returnPage = urlParams.get('return');
    if (returnPage) {
      redirect(returnPage);
    } else {
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.role === 'admin') {
        redirect('admin-dashboard.html');
      } else {
        redirect('customer-dashboard.html');
      }
    }
  } catch (error) {
    console.error('Facebook Sign-In error:', error);
    let msg = 'Facebook Sign-In failed. Please try again.';
    if (error && error.code) msg += ` (${error.code})`;
    customAlert.error('Sign-In Error', msg);
  }
}

// expose globally for HTML onclick
window.handleFacebookSignIn = handleFacebookSignIn;

// Initialize login form
document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', login);
  }

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', signup);
  }
});
