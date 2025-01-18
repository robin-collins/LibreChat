const mongoose = require('mongoose');
const path = require('path');
require('module-alias/register');

// Define aliases for easier imports
require('module-alias').addAlias('~', path.join(__dirname));
require('module-alias').addAlias('librechat-data-provider', path.join(__dirname, '../packages/data-provider'));

// Import schemas
const Conversation = require('~/models/schema/convoSchema');
const UserSchema = require('~/models/schema/userSchema');

// Create Mongoose models
const User = mongoose.model('User', UserSchema);

// --- Database connection configuration ---
const mongoURI = 'mongodb://10.10.10.225:27017/LibreChat'; // Ensure this URI is correct

// --- Archive Configuration ---
const DAYS_THRESHOLD = 30; // Number of days to determine archiving

// Import the 'process' module to access command-line arguments
const process = require('process');

const DRY_RUN = process.argv.includes('--dry-run');

async function archiveOldConversations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB.');

    // Parse the username from command-line arguments
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Please provide a username as a command-line argument.');
      process.exit(1);
    }
    const usernamesToArchive = args;

    for (const usernameToArchive of usernamesToArchive) {
      if (!/^[a-zA-Z0-9_]+$/.test(usernameToArchive)) {
        console.error('Invalid username format. Only alphanumeric characters and underscores are allowed.');
        process.exit(1);
      }

      // Find the user by username
      const user = await User.findOne({ username: usernameToArchive }).lean();
      if (!user) {
        console.error(`User with username "${usernameToArchive}" not found.`);
        process.exit(1);
      }
      const userId = user._id;

      console.log(`Processing conversations for user: ${usernameToArchive} (ID: ${userId})`);

      // Calculate the date threshold
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - DAYS_THRESHOLD);

      // Find conversations for the specific user updated more than DAYS_THRESHOLD days ago
      const oldConversations = await Conversation.find({
        user: userId,
        updatedAt: { $lt: dateThreshold },
        isArchived: { $ne: true }, // Optional: Only update if not already archived
      }).lean();

      if (oldConversations.length === 0) {
        console.log(`No conversations to archive for user: ${usernameToArchive}.`);
        continue;
      }

      if (DRY_RUN) {
        console.log(`Dry Run: Would archive ${oldConversations.length} conversations for user: ${usernameToArchive}.`);
        continue;
      }

      console.log(`Archiving ${oldConversations.length} conversations for user: ${usernameToArchive}.`);

      // Update conversations to set isArchived to true
      const conversationIds = oldConversations.map(convo => convo._id);
      await Conversation.updateMany(
        { _id: { $in: conversationIds } },
        { $set: { isArchived: true } }, // Added trailing comma
      );

      console.log(`Archived ${oldConversations.length} conversations for user: ${usernameToArchive}.`);
    }

    console.log('Archiving process completed.');
  } catch (error) {
    console.error('Error archiving conversations:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

// Execute the archiving function
archiveOldConversations();
