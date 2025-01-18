require('module-alias/register');

// Add this at the top of your script
const path = require('path');
require('module-alias').addAlias('~', path.join(__dirname));
require('module-alias').addAlias('librechat-data-provider', path.join(__dirname, '../packages/data-provider'));

// Now you can require modules using the '~' alias
// const Message = require('~/models/schema/messageSchema'); // Removed unused import
const userSchema = require('~/models/schema/userSchema'); // Import the schema directly

const fs = require('fs');
const mongoose = require('mongoose');
const { getMessages } = require('./models/Message'); // Path to your Message model
const { Conversation } = require('./models/Conversation'); // Path to your Conversation model

// Create a User model using the schema
const User = mongoose.model('User', userSchema);

// --- Database connection configuration ---
const mongoURI = 'mongodb://10.10.10.225:27017/LibreChat'; // Removed the extra slash

// --- Export directory ---
const exportDir = 'export'; // Set the base export directory

async function exportUserConversations(userId) {
  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

    const conversations = await Conversation.find({ user: userId }).lean();

    if (!conversations || conversations.length === 0) {
      console.log(`No conversations found for user ${userId}`);
      return;
    }

    for (const conversation of conversations) {
      const conversationTitle = conversation.title.replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize title for filenames
      const messages = await getMessages({ conversationId: conversation.conversationId });

      if (!messages || messages.length === 0) {
        console.log(`No messages found for conversation ${conversation.conversationId}`);
        continue;
      }

      const user = await User.findById(userId, 'username').lean().exec();
      const userName = user?.username ?? 'unknown_user'; // Default username if not found

      // Update the export path to include the conversation ID
      const exportPath = path.join(exportDir, userName, `${conversationTitle}--${conversation.model}-${conversation.conversationId}.json`);

      fs.mkdirSync(path.dirname(exportPath), { recursive: true });
      fs.writeFileSync(exportPath, JSON.stringify(messages, null, 2));
      console.log(`Conversation "${conversation.title}" exported to ${exportPath}`);
    }

  } catch (error) {
    console.error('Error exporting conversations:', error);
  } finally {
    mongoose.disconnect(); // Always disconnect in the 'finally' block
  }
}

async function exportAllUsers() {
  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    const users = await User.find({}, 'username _id').lean(); // Fetch all users with username and _id

    for (const user of users) {
      await exportUserConversations(user._id);
    }

  } catch (error) {
    console.error('Error fetching users or exporting conversations:', error);
  } finally {
    mongoose.disconnect();
  }
}

exportAllUsers()
  .then(() => console.log('Finished exporting conversations for all users.'))
  .catch(console.error);
