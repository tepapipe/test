/* ============================================
   BestBuddies Pet Grooming - Groomer Data Fix Script
   Fixes role mismatch and sets up groomer accounts
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, set, update, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBFIRv4kufQt_cAJ0nLTV2No_zsSOFFq_w",
  authDomain: "bestbuddiespetshop.firebaseapp.com",
  projectId: "bestbuddiespetshop",
  storageBucket: "bestbuddiespetshop.firebasestorage.app",
  messagingSenderId: "954635072456",
  appId: "1:954635072456:web:696796ead82c6dc04546fd",
  measurementId: "G-GSV3XX38CG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Groomer data to create
const groomersToCreate = [
  {
    id: "groomer-botchoy",
    name: "Botchoy",
    email: "botchoy@bestbuddies.com",
    password: "Botchoy@123",
    specialty: "Creative trims & styling",
    phone: "09123456789"
  },
  {
    id: "groomer-ejay",
    name: "Ejay",
    email: "ejay@bestbuddies.com",
    password: "Ejay@123",
    specialty: "Cat whisperer",
    phone: "09123456790"
  },
  {
    id: "groomer-jinold",
    name: "Jinold",
    email: "jinold@bestbuddies.com",
    password: "Jinold@123",
    specialty: "Senior pet handler",
    phone: "09123456791"
  },
  {
    id: "groomer-jom",
    name: "Jom",
    email: "jom@bestbuddies.com",
    password: "Jom@123",
    specialty: "Double-coat care",
    phone: "09123456792"
  },
  {
    id: "groomer-sam",
    name: "Sam",
    email: "sam.groomer@bestbuddies.com",
    password: "Sam@123",
    specialty: "Small breed specialist",
    phone: "09123456793"
  }
];

async function fixGroomerData() {
  console.log("🔧 Starting Groomer Data Fix...\n");

  try {
    // Step 1: Fix existing groomer user role
    console.log("📝 Step 1: Fixing existing groomer user role...");
    const existingGroomerRef = ref(db, "users/PRKFpx5wgsRK8RLhT3lK6RClqlW2");
    const existingGroomerSnapshot = await get(existingGroomerRef);
    
    if (existingGroomerSnapshot.exists()) {
      const userData = existingGroomerSnapshot.val();
      if (userData.role === "groomers") {
        await update(existingGroomerRef, { role: "groomer" });
        console.log("✅ Fixed existing user role: groomers → groomer\n");
      }
    }

    // Step 2: Create new groomer accounts
    console.log("📝 Step 2: Creating groomer Firebase Auth accounts...\n");
    
    for (const groomer of groomersToCreate) {
      try {
        // Check if user already exists
        const userRef = ref(db, `users/${groomer.id}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          console.log(`⏭️  Skipping ${groomer.name} - already exists`);
          continue;
        }

        // Create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          groomer.email,
          groomer.password
        );
        
        const uid = userCredential.user.uid;
        console.log(`✅ Created Auth account for ${groomer.name} (${groomer.email})`);

        // Create user profile in database
        const userProfile = {
          id: uid,
          email: groomer.email,
          name: groomer.name,
          phone: groomer.phone,
          role: "groomer",
          specialty: groomer.specialty,
          maxDailyBookings: 3,
          isBanned: false,
          warnings: 0,
          createdAt: Date.now()
        };

        const newUserRef = ref(db, `users/${uid}`);
        await set(newUserRef, userProfile);
        console.log(`✅ Created user profile for ${groomer.name}\n`);

      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`⚠️  ${groomer.name} email already in use, skipping...\n`);
        } else {
          console.error(`❌ Error creating ${groomer.name}:`, error.message, "\n");
        }
      }
    }

    console.log("✅ Groomer data fix completed!\n");
    console.log("📋 Groomer Login Credentials:");
    console.log("================================");
    groomersToCreate.forEach(groomer => {
      console.log(`\n${groomer.name}:`);
      console.log(`  Email: ${groomer.email}`);
      console.log(`  Password: ${groomer.password}`);
    });
    console.log("\n================================");
    console.log("⚠️  IMPORTANT: Change these passwords after first login!");

  } catch (error) {
    console.error("❌ Error during fix:", error);
  }
}

// Run the fix
fixGroomerData();
